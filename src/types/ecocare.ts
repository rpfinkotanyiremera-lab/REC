import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'team_leader' | 'hso';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type AppView = 'dashboard' | 'users' | 'announcements' | 'history' | 'profile';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  assignedCell: string;
  assignedVillage: string;
  teamName: string;
  provisionedAccountId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ProvisionedAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
  assignedCell: string;
  assignedVillage: string;
  teamName: string;
  claimedUid: string;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StaffDirectoryEntry {
  entryId: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  assignedCell: string;
  assignedVillage: string;
  teamName: string;
  sectorCode: 'remera';
  isClaimed: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'team_leaders' | 'hso';
  priority: 'normal' | 'urgent';
  sectorCode: 'remera';
  authorId: string;
  authorName: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AuditLog {
  id: string;
  action: string;
  summary: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  targetEntity: string;
  sectorCode: 'remera';
  createdAt?: Timestamp | null;
}

export interface SectorCell {
  id: string;
  name: string;
  code: string;
  villageCount: number;
  status: 'active' | 'inactive';
  sectorCode: 'remera';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface UnifiedManagedAccount {
  source: 'claimed' | 'provisioned';
  id: string;
  uid?: string;
  provisionedAccountId: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  assignedCell: string;
  assignedVillage: string;
  teamName: string;
  isClaimed: boolean;
  updatedAt?: Timestamp | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'System Administrator',
  team_leader: 'Team Leader',
  hso: 'Sector Hygiene Officer (HSO)',
};

export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  team_leader: 'Team Leader',
  hso: 'HSO',
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending Approval',
};

export const REMERA_DEFAULT_CELLS: Array<{ name: string; code: string; villageCount: number }> = [
  { name: 'Nyarutarama', code: 'REM-NYAR', villageCount: 6 },
  { name: 'Nyabisindu', code: 'REM-NYAB', villageCount: 5 },
  { name: 'Rukiri I', code: 'REM-RUK1', villageCount: 7 },
  { name: 'Rukiri II', code: 'REM-RUK2', villageCount: 6 },
];
