import type { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  emailToDocId,
  normalizeEmail,
  sanitizeText,
  SCHEMA_LIMITS,
} from '../lib/validation';
import {
  REMERA_DEFAULT_CELLS,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from '../types/ecocare';

const BOOTSTRAP_ADMIN_EMAIL = 'rpfinkotanyiremera@gmail.com';

export async function bootstrapOrFetchUserProfile(
  authUser: FirebaseUser,
): Promise<UserProfile> {
  const uid = authUser.uid;
  const email = normalizeEmail(authUser.email || '');
  const userPath = `users/${uid}`;

  let existingSnap;
  try {
    existingSnap = await getDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSnap.exists()) {
    const profile = existingSnap.data() as UserProfile;
    if (email === BOOTSTRAP_ADMIN_EMAIL && profile.role === 'admin') {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        if (!adminSnap.exists()) {
          const batch = writeBatch(db);
          batch.set(doc(db, 'admins', uid), {
            uid,
            grantedAt: serverTimestamp(),
          });
          await batch.commit();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
      }
    }
    return profile;
  }

  const fallbackName = sanitizeText(
    authUser.displayName || email.split('@')[0] || 'Remera Staff',
    SCHEMA_LIMITS.FULL_NAME_MAX,
  );
  const safeName =
    fallbackName.length >= SCHEMA_LIMITS.FULL_NAME_MIN
      ? fallbackName
      : 'Remera Staff';

  const provId = emailToDocId(email);
  let provSnap;
  try {
    provSnap = await getDoc(doc(db, 'provisionedAccounts', provId));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `provisionedAccounts/${provId}`);
  }

  if (provSnap.exists()) {
    const provData = provSnap.data();
    if (provData.claimedUid === '' && normalizeEmail(provData.email) === email) {
      const batch = writeBatch(db);
      const newProfile: Record<string, unknown> = {
        uid,
        email,
        fullName: sanitizeText(provData.fullName || safeName, SCHEMA_LIMITS.FULL_NAME_MAX),
        phone: sanitizeText(provData.phone || '', SCHEMA_LIMITS.PHONE_MAX),
        role: provData.role as UserRole,
        status: provData.status as UserStatus,
        assignedCell: sanitizeText(provData.assignedCell || '', SCHEMA_LIMITS.CELL_MAX),
        assignedVillage: sanitizeText(provData.assignedVillage || '', SCHEMA_LIMITS.VILLAGE_MAX),
        teamName: sanitizeText(provData.teamName || '', SCHEMA_LIMITS.TEAM_MAX),
        provisionedAccountId: provId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(doc(db, 'users', uid), newProfile);
      batch.update(doc(db, 'provisionedAccounts', provId), {
        claimedUid: uid,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'staffDirectory', provId), {
        isClaimed: true,
        updatedAt: serverTimestamp(),
      });

      if (provData.role === 'admin' && provData.status === 'active') {
        batch.set(doc(db, 'admins', uid), {
          uid,
          grantedAt: serverTimestamp(),
        });
      }

      if (provData.status === 'active') {
        const logRef = doc(collection(db, 'auditLogs'));
        batch.set(logRef, {
          action: 'ACCOUNT_CLAIMED',
          summary: sanitizeText(
            `${newProfile.fullName} signed in and activated pre-registered ${provData.role} account.`,
            SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
          ),
          actorId: uid,
          actorName: newProfile.fullName,
          actorRole: provData.role,
          targetEntity: `users/${uid}`,
          sectorCode: 'remera',
          createdAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, userPath);
      }

      const fresh = await getDoc(doc(db, 'users', uid));
      return fresh.data() as UserProfile;
    }
  }

  // Bootstrap administrator or uninvited pending registration
  const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL;
  const batch = writeBatch(db);
  const createdRole: UserRole = isBootstrap ? 'admin' : 'team_leader';
  const createdStatus: UserStatus = isBootstrap ? 'active' : 'pending';
  const assignedCell = isBootstrap ? 'Remera Sector' : '';
  const teamName = isBootstrap ? 'Sector Administration' : '';
  const displayTitle = isBootstrap
    ? sanitizeText(authUser.displayName || 'Sector Administrator', SCHEMA_LIMITS.FULL_NAME_MAX)
    : safeName;

  batch.set(doc(db, 'users', uid), {
    uid,
    email,
    fullName: displayTitle,
    phone: '',
    role: createdRole,
    status: createdStatus,
    assignedCell,
    assignedVillage: '',
    teamName,
    provisionedAccountId: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'staffDirectory', uid), {
    entryId: uid,
    fullName: displayTitle,
    role: createdRole,
    status: createdStatus,
    assignedCell,
    assignedVillage: '',
    teamName,
    sectorCode: 'remera',
    isClaimed: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (isBootstrap) {
    batch.set(doc(db, 'admins', uid), {
      uid,
      grantedAt: serverTimestamp(),
    });
    const logRef = doc(collection(db, 'auditLogs'));
    batch.set(logRef, {
      action: 'SYSTEM_BOOTSTRAP',
      summary: sanitizeText(
        `${displayTitle} initialized primary Remera EcoCare System Administrator account.`,
        SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
      ),
      actorId: uid,
      actorName: displayTitle,
      actorRole: 'admin',
      targetEntity: `users/${uid}`,
      sectorCode: 'remera',
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  const createdSnap = await getDoc(doc(db, 'users', uid));
  return createdSnap.data() as UserProfile;
}

export async function createProvisionedAccount(
  admin: UserProfile,
  input: {
    email: string;
    fullName: string;
    phone: string;
    role: UserRole;
    status: 'active' | 'inactive';
    assignedCell: string;
    assignedVillage: string;
    teamName: string;
  },
): Promise<void> {
  const email = normalizeEmail(input.email);
  const docId = emailToDocId(email);
  const fullName = sanitizeText(input.fullName, SCHEMA_LIMITS.FULL_NAME_MAX);
  const phone = sanitizeText(input.phone, SCHEMA_LIMITS.PHONE_MAX);
  const assignedCell = sanitizeText(input.assignedCell, SCHEMA_LIMITS.CELL_MAX);
  const assignedVillage = sanitizeText(input.assignedVillage, SCHEMA_LIMITS.VILLAGE_MAX);
  const teamName = sanitizeText(input.teamName, SCHEMA_LIMITS.TEAM_MAX);

  const existingProv = await getDoc(doc(db, 'provisionedAccounts', docId));
  if (existingProv.exists()) {
    throw new Error('An account with this email address is already registered in Remera EcoCare.');
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'provisionedAccounts', docId), {
    email,
    fullName,
    phone,
    role: input.role,
    status: input.status,
    assignedCell,
    assignedVillage,
    teamName,
    claimedUid: '',
    createdBy: admin.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'staffDirectory', docId), {
    entryId: docId,
    fullName,
    role: input.role,
    status: input.status,
    assignedCell,
    assignedVillage,
    teamName,
    sectorCode: 'remera',
    isClaimed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'auditLogs'));
  batch.set(logRef, {
    action: 'USER_REGISTERED',
    summary: sanitizeText(
      `Registered ${fullName} as ${input.role.replace('_', ' ')}${assignedCell ? ` in ${assignedCell}` : ''}.`,
      SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
    ),
    actorId: admin.uid,
    actorName: sanitizeText(admin.fullName, SCHEMA_LIMITS.FULL_NAME_MAX),
    actorRole: admin.role,
    targetEntity: `provisionedAccounts/${docId}`,
    sectorCode: 'remera',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `provisionedAccounts/${docId}`);
  }
}

export async function updateManagedUserAccount(
  admin: UserProfile,
  target: {
    source: 'claimed' | 'provisioned';
    id: string;
    uid?: string;
    provisionedAccountId: string;
    previousRole: UserRole;
    previousStatus: UserStatus;
  },
  updates: {
    fullName: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    assignedCell: string;
    assignedVillage: string;
    teamName: string;
  },
): Promise<void> {
  const fullName = sanitizeText(updates.fullName, SCHEMA_LIMITS.FULL_NAME_MAX);
  const phone = sanitizeText(updates.phone, SCHEMA_LIMITS.PHONE_MAX);
  const assignedCell = sanitizeText(updates.assignedCell, SCHEMA_LIMITS.CELL_MAX);
  const assignedVillage = sanitizeText(updates.assignedVillage, SCHEMA_LIMITS.VILLAGE_MAX);
  const teamName = sanitizeText(updates.teamName, SCHEMA_LIMITS.TEAM_MAX);

  const batch = writeBatch(db);

  if (target.source === 'claimed' && target.uid) {
    const userRef = doc(db, 'users', target.uid);
    batch.update(userRef, {
      fullName,
      phone,
      role: updates.role,
      status: updates.status,
      assignedCell,
      assignedVillage,
      teamName,
      updatedAt: serverTimestamp(),
    });

    const dirId = target.provisionedAccountId || target.uid;
    batch.update(doc(db, 'staffDirectory', dirId), {
      fullName,
      role: updates.role,
      status: updates.status,
      assignedCell,
      assignedVillage,
      teamName,
      updatedAt: serverTimestamp(),
    });

    if (target.provisionedAccountId) {
      const provStatus = updates.status === 'pending' ? 'active' : updates.status;
      batch.update(doc(db, 'provisionedAccounts', target.provisionedAccountId), {
        fullName,
        phone,
        role: updates.role,
        status: provStatus,
        assignedCell,
        assignedVillage,
        teamName,
        updatedAt: serverTimestamp(),
      });
    }

    if (updates.role === 'admin' && updates.status === 'active') {
      batch.set(doc(db, 'admins', target.uid), {
        uid: target.uid,
        grantedAt: serverTimestamp(),
      });
    } else if (target.uid !== admin.uid) {
      batch.delete(doc(db, 'admins', target.uid));
    }
  } else {
    const provStatus = updates.status === 'pending' ? 'active' : updates.status;
    batch.update(doc(db, 'provisionedAccounts', target.id), {
      fullName,
      phone,
      role: updates.role,
      status: provStatus,
      assignedCell,
      assignedVillage,
      teamName,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'staffDirectory', target.id), {
      fullName,
      role: updates.role,
      status: provStatus,
      assignedCell,
      assignedVillage,
      teamName,
      updatedAt: serverTimestamp(),
    });
  }

  const logRef = doc(collection(db, 'auditLogs'));
  const changeNote =
    target.previousRole !== updates.role
      ? `reassigned role from ${target.previousRole} to ${updates.role}`
      : target.previousStatus !== updates.status
        ? `changed status to ${updates.status}`
        : 'updated account assignment';

  batch.set(logRef, {
    action: 'USER_UPDATED',
    summary: sanitizeText(
      `Updated ${fullName}: ${changeNote}${assignedCell ? ` (${assignedCell})` : ''}.`,
      SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
    ),
    actorId: admin.uid,
    actorName: sanitizeText(admin.fullName, SCHEMA_LIMITS.FULL_NAME_MAX),
    actorRole: admin.role,
    targetEntity: target.source === 'claimed' ? `users/${target.uid}` : `provisionedAccounts/${target.id}`,
    sectorCode: 'remera',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, target.source === 'claimed' ? `users/${target.uid}` : `provisionedAccounts/${target.id}`);
  }
}

export async function deleteManagedAccount(
  admin: UserProfile,
  target: {
    source: 'claimed' | 'provisioned';
    id: string;
    uid?: string;
    provisionedAccountId: string;
    fullName: string;
  },
): Promise<void> {
  if (target.uid === admin.uid) {
    throw new Error('You cannot remove your own active administrator account.');
  }

  const batch = writeBatch(db);
  if (target.source === 'claimed' && target.uid) {
    batch.delete(doc(db, 'users', target.uid));
    batch.delete(doc(db, 'admins', target.uid));
    const dirId = target.provisionedAccountId || target.uid;
    batch.delete(doc(db, 'staffDirectory', dirId));
    if (target.provisionedAccountId) {
      batch.delete(doc(db, 'provisionedAccounts', target.provisionedAccountId));
    }
  } else {
    batch.delete(doc(db, 'provisionedAccounts', target.id));
    batch.delete(doc(db, 'staffDirectory', target.id));
  }

  const logRef = doc(collection(db, 'auditLogs'));
  batch.set(logRef, {
    action: 'USER_REMOVED',
    summary: sanitizeText(
      `Removed account record for ${target.fullName}.`,
      SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
    ),
    actorId: admin.uid,
    actorName: sanitizeText(admin.fullName, SCHEMA_LIMITS.FULL_NAME_MAX),
    actorRole: admin.role,
    targetEntity: target.source === 'claimed' ? `users/${target.uid}` : `provisionedAccounts/${target.id}`,
    sectorCode: 'remera',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, target.source === 'claimed' ? `users/${target.uid}` : `provisionedAccounts/${target.id}`);
  }
}

export async function updateOwnProfile(
  user: UserProfile,
  input: { fullName: string; phone: string },
): Promise<void> {
  const fullName = sanitizeText(input.fullName, SCHEMA_LIMITS.FULL_NAME_MAX);
  const phone = sanitizeText(input.phone, SCHEMA_LIMITS.PHONE_MAX);
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', user.uid), {
    fullName,
    phone,
    updatedAt: serverTimestamp(),
  });

  const dirId = user.provisionedAccountId || user.uid;
  batch.update(doc(db, 'staffDirectory', dirId), {
    fullName,
    updatedAt: serverTimestamp(),
  });

  if (user.status === 'active') {
    const logRef = doc(collection(db, 'auditLogs'));
    batch.set(logRef, {
      action: 'PROFILE_UPDATED',
      summary: sanitizeText(
        `${fullName} updated their contact profile.`,
        SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
      ),
      actorId: user.uid,
      actorName: fullName,
      actorRole: user.role,
      targetEntity: `users/${user.uid}`,
      sectorCode: 'remera',
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
  }
}

export async function publishAnnouncement(
  admin: UserProfile,
  input: {
    title: string;
    message: string;
    targetAudience: 'all' | 'team_leaders' | 'hso';
    priority: 'normal' | 'urgent';
  },
): Promise<void> {
  const title = sanitizeText(input.title, SCHEMA_LIMITS.ANNOUNCEMENT_TITLE_MAX);
  const message = sanitizeText(input.message, SCHEMA_LIMITS.ANNOUNCEMENT_MSG_MAX);
  const authorName = sanitizeText(admin.fullName, SCHEMA_LIMITS.FULL_NAME_MAX);

  const batch = writeBatch(db);
  const annRef = doc(collection(db, 'announcements'));
  batch.set(annRef, {
    title,
    message,
    targetAudience: input.targetAudience,
    priority: input.priority,
    sectorCode: 'remera',
    authorId: admin.uid,
    authorName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'auditLogs'));
  batch.set(logRef, {
    action: 'ANNOUNCEMENT_PUBLISHED',
    summary: sanitizeText(
      `Published sector announcement: "${title}" (${input.priority}).`,
      SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
    ),
    actorId: admin.uid,
    actorName: authorName,
    actorRole: admin.role,
    targetEntity: `announcements/${annRef.id}`,
    sectorCode: 'remera',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `announcements/${annRef.id}`);
  }
}

export async function deleteAnnouncement(
  admin: UserProfile,
  announcementId: string,
  title: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'announcements', announcementId));

  const logRef = doc(collection(db, 'auditLogs'));
  batch.set(logRef, {
    action: 'ANNOUNCEMENT_REMOVED',
    summary: sanitizeText(
      `Archived announcement "${title}".`,
      SCHEMA_LIMITS.AUDIT_SUMMARY_MAX,
    ),
    actorId: admin.uid,
    actorName: sanitizeText(admin.fullName, SCHEMA_LIMITS.FULL_NAME_MAX),
    actorRole: admin.role,
    targetEntity: `announcements/${announcementId}`,
    sectorCode: 'remera',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `announcements/${announcementId}`);
  }
}

export async function initializeStarterSectorCells(admin: UserProfile): Promise<void> {
  const batch = writeBatch(db);

  for (const cell of REMERA_DEFAULT_CELLS) {
    const cellId = cell.code.toLowerCase();
    batch.set(doc(db, 'sectorCells', cellId), {
      name: cell.name,
      code: cell.code,
      villageCount: cell.villageCount,
      status: 'active',
      sectorCode: 'remera',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const logRef = doc(collection(db, 'auditLogs'));
  batch.set(logRef, {
    action: 'SECTOR_CELLS_INITIALIZED',
    summary: 'Initialized Remera Sector administrative cells (Nyarutarama, Nyabisindu, Rukiri I, Rukiri II).',
    actorId: admin.uid,
    actorName: sanitizeText(admin.fullName, SCHEMA_LIMITS.FULL_NAME_MAX),
    actorRole: admin.role,
    targetEntity: 'sectorCells',
    sectorCode: 'remera',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'sectorCells');
  }
}
