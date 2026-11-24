import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Leaf } from 'lucide-react';
import { ActivityHistoryView } from './components/ActivityHistoryView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './components/LoginPage';
import { PendingApprovalView } from './components/PendingApprovalView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { RoleDashboards } from './components/RoleDashboards';
import { UserManagementView } from './components/UserManagementView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import type {
  Announcement,
  AppView,
  AuditLog,
  ProvisionedAccount,
  SectorCell,
  StaffDirectoryEntry,
  UserProfile,
} from './types/ecocare';

function AuthenticatedWorkspace() {
  const { profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [registerModalRequested, setRegisterModalRequested] = useState(false);

  const [staffDirectory, setStaffDirectory] = useState<StaffDirectoryEntry[]>([]);
  const [sectorCells, setSectorCells] = useState<SectorCell[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [provisionedAccounts, setProvisionedAccounts] = useState<ProvisionedAccount[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isActive = profile?.status === 'active';
  const isAdmin = profile?.role === 'admin' && isActive;

  useEffect(() => {
    if (!profile || !isActive) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    const unsubStaff = onSnapshot(
      query(collection(db, 'staffDirectory'), where('sectorCode', '==', 'remera')),
      (snap) => {
        setStaffDirectory(snap.docs.map((d) => d.data() as StaffDirectoryEntry));
        setLoadingData(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'staffDirectory'),
    );

    const unsubCells = onSnapshot(
      query(collection(db, 'sectorCells'), where('sectorCode', '==', 'remera')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SectorCell, 'id'>),
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setSectorCells(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sectorCells'),
    );

    const unsubAnnouncements = onSnapshot(
      query(collection(db, 'announcements'), where('sectorCode', '==', 'remera')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Announcement, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
        );
        setAnnouncements(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'announcements'),
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'auditLogs'), where('sectorCode', '==', 'remera')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditLog, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
        );
        setAuditLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs'),
    );

    let unsubUsers = () => {};
    let unsubProv = () => {};

    if (isAdmin) {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          setUsers(snap.docs.map((d) => d.data() as UserProfile));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'users'),
      );

      unsubProv = onSnapshot(
        collection(db, 'provisionedAccounts'),
        (snap) => {
          setProvisionedAccounts(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ProvisionedAccount, 'id'>),
            })),
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'provisionedAccounts'),
      );
    }

    return () => {
      unsubStaff();
      unsubCells();
      unsubAnnouncements();
      unsubLogs();
      unsubUsers();
      unsubProv();
    };
  }, [profile?.uid, isActive, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-6">
        <div className="w-11 h-11 rounded-xl bg-[#166534] text-white flex items-center justify-center mb-3">
          <Leaf className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-[#1F2937]">Loading Remera EcoCare...</p>
      </div>
    );
  }

  if (!profile) {
    return <LoginPage />;
  }

  if (profile.status !== 'active') {
    return <PendingApprovalView />;
  }

  const handleOpenRegisterUser = () => {
    setCurrentView('users');
    setRegisterModalRequested(true);
  };

  return (
    <AppShell currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'dashboard' && (
        <RoleDashboards
          staffDirectory={staffDirectory}
          sectorCells={sectorCells}
          announcements={announcements}
          auditLogs={auditLogs}
          loadingData={loadingData}
          onNavigate={setCurrentView}
          onOpenRegisterUser={handleOpenRegisterUser}
        />
      )}

      {currentView === 'users' && isAdmin && (
        <UserManagementView
          users={users}
          provisionedAccounts={provisionedAccounts}
          sectorCells={sectorCells}
          loading={loadingData}
          externalCreateOpen={registerModalRequested}
          onCloseExternalCreate={() => setRegisterModalRequested(false)}
        />
      )}

      {currentView === 'announcements' && (
        <AnnouncementsView announcements={announcements} loading={loadingData} />
      )}

      {currentView === 'history' && (profile.role === 'admin' || profile.role === 'hso') && (
        <ActivityHistoryView auditLogs={auditLogs} loading={loadingData} />
      )}

      {currentView === 'profile' && <ProfileSettingsView />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedWorkspace />
      </AuthProvider>
    </ErrorBoundary>
  );
}
