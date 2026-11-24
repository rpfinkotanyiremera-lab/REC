import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { bootstrapOrFetchUserProfile } from '../services/ecocareService';
import type { UserProfile, UserRole } from '../types/ecocare';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  activeViewRole: UserRole;
  setActiveViewRole: (role: UserRole) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeViewRole, setActiveViewRole] = useState<UserRole>('admin');

  const syncProfile = useCallback(async (user: FirebaseUser) => {
    setLoading(true);
    setAuthError(null);
    try {
      const resolved = await bootstrapOrFetchUserProfile(user);
      setProfile(resolved);
      setActiveViewRole(resolved.role);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Unable to load your Remera EcoCare profile.';
      setAuthError(msg);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (!user.emailVerified) {
        setAuthError('Your Google account email must be verified before accessing Remera EcoCare.');
        setProfile(null);
        setLoading(false);
        return;
      }
      void syncProfile(user);
    });
    return () => unsubscribe();
  }, [syncProfile]);

  useEffect(() => {
    if (!firebaseUser || !profile) {
      return;
    }
    const path = `users/${firebaseUser.uid}`;
    const unsubscribe = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const updated = snapshot.data() as UserProfile;
          setProfile(updated);
          if (updated.role !== 'admin') {
            setActiveViewRole(updated.role);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      },
    );
    return () => unsubscribe();
  }, [firebaseUser, profile?.uid]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing authentication.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Browser blocked the sign-in popup. Please allow popups for this site and try again.');
      } else {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Authentication failed. Please try again.',
        );
      }
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) {
      await syncProfile(firebaseUser);
    }
  }, [firebaseUser, syncProfile]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        activeViewRole: profile?.role === 'admin' ? activeViewRole : (profile?.role ?? 'team_leader'),
        setActiveViewRole,
        signInWithGoogle,
        logout,
        refreshProfile,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
