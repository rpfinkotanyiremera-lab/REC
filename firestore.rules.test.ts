/**
 * Remera EcoCare — Dirty Dozen Security Rule Verification Suite
 * Documents and validates the 12 adversarial payloads against the Remera EcoCare
 * Firestore schema invariants prior to rules deployment.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actorRole: 'anonymous' | 'unverified' | 'team_leader' | 'hso' | 'admin';
  payload: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Promotion to Admin on User Create',
    collectionPath: '/users/attacker_uid',
    operation: 'create',
    actorRole: 'team_leader',
    payload: {
      uid: 'attacker_uid',
      email: 'attacker@example.com',
      fullName: 'Attacker User',
      phone: '',
      role: 'admin',
      status: 'active',
      assignedCell: 'Remera Sector',
      assignedVillage: '',
      teamName: '',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidPendingSignup() requires role == "team_leader" && status == "pending"',
  },
  {
    id: 2,
    name: 'Role Mutation on Self-Update',
    collectionPath: '/users/leader_uid',
    operation: 'update',
    actorRole: 'team_leader',
    payload: { role: 'hso' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'affectedKeys().hasOnly(["fullName", "phone", "updatedAt"])',
  },
  {
    id: 3,
    name: 'Shadow Field Injection',
    collectionPath: '/users/leader_uid',
    operation: 'update',
    actorRole: 'team_leader',
    payload: { fullName: 'Updated Name', phone: '+250788000000', isSuperAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidUser() hasOnly() + affectedKeys().hasOnly(["fullName", "phone", "updatedAt"])',
  },
  {
    id: 4,
    name: 'Cross-User PII Read',
    collectionPath: '/users/other_uid',
    operation: 'get',
    actorRole: 'hso',
    payload: {},
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'allow get: if isSignedIn() && isVerified() && (isOwner(userId) || isAdmin())',
  },
  {
    id: 5,
    name: 'Cross-User PII List',
    collectionPath: '/users',
    operation: 'list',
    actorRole: 'team_leader',
    payload: {},
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'allow list: if isAdmin()',
  },
  {
    id: 6,
    name: 'Unverified Email Access',
    collectionPath: '/users/unverified_uid',
    operation: 'create',
    actorRole: 'unverified',
    payload: { uid: 'unverified_uid', email: 'rpfinkotanyiremera@gmail.com' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerified() requires request.auth.token.email_verified == true',
  },
  {
    id: 7,
    name: 'Admin Marker Forgery',
    collectionPath: '/admins/attacker_uid',
    operation: 'create',
    actorRole: 'hso',
    payload: { uid: 'attacker_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'match /admins/{userId} allow write: if isAdmin()',
  },
  {
    id: 8,
    name: 'Provisioned Account Hijack',
    collectionPath: '/provisionedAccounts/target_email_doc',
    operation: 'update',
    actorRole: 'team_leader',
    payload: { claimedUid: 'attacker_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'existing().email == request.auth.token.email',
  },
  {
    id: 9,
    name: 'Announcement Forgery by Non-Admin',
    collectionPath: '/announcements/ann_001',
    operation: 'create',
    actorRole: 'team_leader',
    payload: { title: 'Fake Directive', message: 'Unauthorized notice' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'match /announcements/{announcementId} allow create: if isAdmin()',
  },
  {
    id: 10,
    name: 'Audit Log Tampering',
    collectionPath: '/auditLogs/log_001',
    operation: 'delete',
    actorRole: 'admin',
    payload: {},
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'match /auditLogs/{logId} allow update, delete: if false',
  },
  {
    id: 11,
    name: 'Oversized String Resource Poisoning',
    collectionPath: '/users/leader_uid',
    operation: 'update',
    actorRole: 'team_leader',
    payload: { fullName: 'A'.repeat(5000) },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'data.fullName.size() >= 2 && data.fullName.size() <= 100',
  },
  {
    id: 12,
    name: 'Client-Forged Timestamp',
    collectionPath: '/announcements/ann_002',
    operation: 'create',
    actorRole: 'admin',
    payload: { title: 'Notice', createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time && incoming().updatedAt == request.time',
  },
];
