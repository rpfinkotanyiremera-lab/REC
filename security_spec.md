# Remera EcoCare — Phase 1 Security Specification

## 1. Data Invariants
1. **Identity Integrity**: A `/users/{userId}` document may only exist for `userId == uid`, and non-admins can only create their own profile with `uid == request.auth.uid` and `email == request.auth.token.email`.
2. **No Self-Assigned Privilege Escalation**: A non-bootstrap user cannot create or update their `/users/{userId}` document to `role == 'admin'` or `role == 'hso'` or `status == 'active'` unless a verified `/provisionedAccounts/{accountId}` record created by an Admin explicitly grants that exact `role`, `status`, and `assignedCell`.
3. **PII Isolation**: Email addresses and telephone numbers are stored exclusively in `/users/{userId}` and `/provisionedAccounts/{accountId}`, never in `/staffDirectory/{entryId}`. Only the profile owner (`isOwner(userId)`) or an Admin (`isAdmin()`) may read `/users/{userId}`.
4. **Immutable Audit Trail**: `/auditLogs/{logId}` records are append-only; updates and deletes are unconditionally denied for all roles.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps on creates and updates must strictly equal `request.time`.
6. **Path Variable Hardening**: All single-document operations enforce `isValidId(docId)` (`^[a-zA-Z0-9_-]+$`, max 128 chars).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Promotion to Admin**: Non-admin creates `/users/attackerUid` with `role: "admin", status: "active"`. -> **Expected: PERMISSION_DENIED**
2. **Role Mutation on Self-Update**: Team Leader updates `/users/leaderUid` changing `role: "hso"`. -> **Expected: PERMISSION_DENIED**
3. **Shadow Field Injection**: User updates `/users/leaderUid` with `{ fullName: "Valid Name", phone: "0788000000", isVerifiedAdmin: true, updatedAt: serverTimestamp }`. -> **Expected: PERMISSION_DENIED**
4. **Cross-User PII Read**: HSO officer calls `getDoc(doc(db, 'users', 'otherLeaderUid'))`. -> **Expected: PERMISSION_DENIED**
5. **Cross-User PII List**: Team Leader calls `getDocs(collection(db, 'users'))`. -> **Expected: PERMISSION_DENIED**
6. **Email Spoof Without Verification**: User with `email_verified: false` attempts to read or write `/users/{uid}`. -> **Expected: PERMISSION_DENIED**
7. **Admin Marker Forgery**: Non-admin attempts `setDoc(doc(db, 'admins', 'attackerUid'), { uid: 'attackerUid', grantedAt: serverTimestamp })`. -> **Expected: PERMISSION_DENIED**
8. **Provisioned Account Hijack**: Attacker attempts to claim `/provisionedAccounts/target_id` where `email != request.auth.token.email`. -> **Expected: PERMISSION_DENIED**
9. **Announcement Forgery by Team Leader**: Team Leader attempts to create `/announcements/fake1` posing as Admin. -> **Expected: PERMISSION_DENIED**
10. **Audit Log Tampering**: Any user (including Admin) attempts to update or delete `/auditLogs/log1`. -> **Expected: PERMISSION_DENIED**
11. **Oversized String / Resource Poisoning**: Authenticated user submits `fullName` of 5,000 characters or invalid `docId` with `/` or spaces. -> **Expected: PERMISSION_DENIED**
12. **Client-Forged Timestamp**: Authenticated user submits `createdAt: new Date('2020-01-01')` instead of `serverTimestamp()`. -> **Expected: PERMISSION_DENIED**
