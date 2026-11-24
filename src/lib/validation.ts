import type { UserRole, UserStatus } from '../types/ecocare';

/**
 * Volumetric & pattern constraints synchronized verbatim with firebase-blueprint.json
 */
export const SCHEMA_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  CELL_CODE_PATTERN: /^[A-Z0-9_-]+$/,
  ID_MAX: 128,
  EMAIL_MIN: 5,
  EMAIL_MAX: 160,
  FULL_NAME_MIN: 2,
  FULL_NAME_MAX: 100,
  PHONE_MAX: 30,
  CELL_MAX: 80,
  VILLAGE_MAX: 80,
  TEAM_MAX: 80,
  ANNOUNCEMENT_TITLE_MIN: 3,
  ANNOUNCEMENT_TITLE_MAX: 140,
  ANNOUNCEMENT_MSG_MIN: 5,
  ANNOUNCEMENT_MSG_MAX: 2000,
  AUDIT_ACTION_MAX: 80,
  AUDIT_SUMMARY_MAX: 300,
} as const;

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, SCHEMA_LIMITS.EMAIL_MAX);
}

export function emailToDocId(email: string): string {
  const normalized = normalizeEmail(email);
  const encoded = normalized
    .replace(/@/g, '_at_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return encoded.slice(0, SCHEMA_LIMITS.ID_MAX);
}

export function isValidEmailFormat(email: string): boolean {
  const trimmed = normalizeEmail(email);
  if (trimmed.length < SCHEMA_LIMITS.EMAIL_MIN || trimmed.length > SCHEMA_LIMITS.EMAIL_MAX) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateUserFormInput(input: {
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  assignedCell: string;
  assignedVillage: string;
  teamName: string;
}): string | null {
  const fullName = input.fullName.trim();
  if (fullName.length < SCHEMA_LIMITS.FULL_NAME_MIN || fullName.length > SCHEMA_LIMITS.FULL_NAME_MAX) {
    return `Full name must be between ${SCHEMA_LIMITS.FULL_NAME_MIN} and ${SCHEMA_LIMITS.FULL_NAME_MAX} characters.`;
  }
  if (!isValidEmailFormat(input.email)) {
    return 'Please enter a valid institutional or Google email address.';
  }
  if (input.phone.trim().length > SCHEMA_LIMITS.PHONE_MAX) {
    return `Phone number must be at most ${SCHEMA_LIMITS.PHONE_MAX} characters.`;
  }
  if (input.assignedCell.trim().length > SCHEMA_LIMITS.CELL_MAX) {
    return `Assigned cell must be at most ${SCHEMA_LIMITS.CELL_MAX} characters.`;
  }
  if (input.assignedVillage.trim().length > SCHEMA_LIMITS.VILLAGE_MAX) {
    return `Assigned village must be at most ${SCHEMA_LIMITS.VILLAGE_MAX} characters.`;
  }
  if (input.teamName.trim().length > SCHEMA_LIMITS.TEAM_MAX) {
    return `Team name must be at most ${SCHEMA_LIMITS.TEAM_MAX} characters.`;
  }
  return null;
}

export function validateAnnouncementInput(input: {
  title: string;
  message: string;
}): string | null {
  const title = input.title.trim();
  const message = input.message.trim();
  if (
    title.length < SCHEMA_LIMITS.ANNOUNCEMENT_TITLE_MIN ||
    title.length > SCHEMA_LIMITS.ANNOUNCEMENT_TITLE_MAX
  ) {
    return `Announcement title must be between ${SCHEMA_LIMITS.ANNOUNCEMENT_TITLE_MIN} and ${SCHEMA_LIMITS.ANNOUNCEMENT_TITLE_MAX} characters.`;
  }
  if (
    message.length < SCHEMA_LIMITS.ANNOUNCEMENT_MSG_MIN ||
    message.length > SCHEMA_LIMITS.ANNOUNCEMENT_MSG_MAX
  ) {
    return `Announcement message must be between ${SCHEMA_LIMITS.ANNOUNCEMENT_MSG_MIN} and ${SCHEMA_LIMITS.ANNOUNCEMENT_MSG_MAX} characters.`;
  }
  return null;
}
