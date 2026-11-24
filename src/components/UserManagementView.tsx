import { useMemo, useState, type FormEvent } from 'react';
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateUserFormInput } from '../lib/validation';
import {
  createProvisionedAccount,
  deleteManagedAccount,
  updateManagedUserAccount,
} from '../services/ecocareService';
import {
  REMERA_DEFAULT_CELLS,
  ROLE_SHORT_LABELS,
  STATUS_LABELS,
  type ProvisionedAccount,
  type SectorCell,
  type UnifiedManagedAccount,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from '../types/ecocare';

interface UserManagementViewProps {
  users: UserProfile[];
  provisionedAccounts: ProvisionedAccount[];
  sectorCells: SectorCell[];
  loading: boolean;
  externalCreateOpen: boolean;
  onCloseExternalCreate: () => void;
}

type FilterTab = 'all' | 'admin' | 'team_leader' | 'hso' | 'pending';

interface FormState {
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  assignedCell: string;
  assignedVillage: string;
  teamName: string;
}

const EMPTY_FORM: FormState = {
  email: '',
  fullName: '',
  phone: '',
  role: 'team_leader',
  status: 'active',
  assignedCell: 'Nyarutarama',
  assignedVillage: '',
  teamName: '',
};

export function UserManagementView({
  users,
  provisionedAccounts,
  sectorCells,
  loading,
  externalCreateOpen,
  onCloseExternalCreate,
}: UserManagementViewProps) {
  const { profile } = useAuth();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [localCreateOpen, setLocalCreateOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<UnifiedManagedAccount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UnifiedManagedAccount | null>(null);

  const cellOptions = useMemo(() => {
    const names =
      sectorCells.length > 0
        ? sectorCells.map((c) => c.name)
        : REMERA_DEFAULT_CELLS.map((c) => c.name);
    return ['Remera Sector', ...names];
  }, [sectorCells]);

  const unifiedAccounts: UnifiedManagedAccount[] = useMemo(() => {
    const claimedList: UnifiedManagedAccount[] = users.map((u) => ({
      source: 'claimed',
      id: u.uid,
      uid: u.uid,
      provisionedAccountId: u.provisionedAccountId || '',
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      status: u.status,
      assignedCell: u.assignedCell,
      assignedVillage: u.assignedVillage,
      teamName: u.teamName,
      isClaimed: true,
      updatedAt: u.updatedAt,
    }));

    const unclaimedProvisioned: UnifiedManagedAccount[] = provisionedAccounts
      .filter((p) => !p.claimedUid)
      .map((p) => ({
        source: 'provisioned',
        id: p.id,
        provisionedAccountId: p.id,
        email: p.email,
        fullName: p.fullName,
        phone: p.phone,
        role: p.role,
        status: p.status,
        assignedCell: p.assignedCell,
        assignedVillage: p.assignedVillage,
        teamName: p.teamName,
        isClaimed: false,
        updatedAt: p.updatedAt,
      }));

    return [...claimedList, ...unclaimedProvisioned];
  }, [users, provisionedAccounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedAccounts.filter((acc) => {
      if (filterTab === 'pending' && acc.status !== 'pending') return false;
      if (
        (filterTab === 'admin' || filterTab === 'team_leader' || filterTab === 'hso') &&
        acc.role !== filterTab
      ) {
        return false;
      }
      if (!q) return true;
      return (
        acc.fullName.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.assignedCell.toLowerCase().includes(q) ||
        acc.teamName.toLowerCase().includes(q)
      );
    });
  }, [unifiedAccounts, filterTab, searchQuery]);

  const isCreateModalOpen = localCreateOpen || externalCreateOpen;

  const openCreateModal = () => {
    setEditingTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setLocalCreateOpen(true);
  };

  const openEditModal = (account: UnifiedManagedAccount) => {
    setLocalCreateOpen(false);
    onCloseExternalCreate();
    setEditingTarget(account);
    setForm({
      email: account.email,
      fullName: account.fullName,
      phone: account.phone,
      role: account.role,
      status: account.status,
      assignedCell: account.assignedCell,
      assignedVillage: account.assignedVillage,
      teamName: account.teamName,
    });
    setFormError(null);
  };

  const closeModals = () => {
    setLocalCreateOpen(false);
    onCloseExternalCreate();
    setEditingTarget(null);
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const validationError = validateUserFormInput(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingTarget) {
        await updateManagedUserAccount(
          profile,
          {
            source: editingTarget.source,
            id: editingTarget.id,
            uid: editingTarget.uid,
            provisionedAccountId: editingTarget.provisionedAccountId,
            previousRole: editingTarget.role,
            previousStatus: editingTarget.status,
          },
          {
            fullName: form.fullName,
            phone: form.phone,
            role: form.role,
            status: form.status,
            assignedCell: form.assignedCell,
            assignedVillage: form.assignedVillage,
            teamName: form.teamName,
          },
        );
      } else {
        await createProvisionedAccount(profile, {
          email: form.email,
          fullName: form.fullName,
          phone: form.phone,
          role: form.role,
          status: form.status === 'inactive' ? 'inactive' : 'active',
          assignedCell: form.assignedCell,
          assignedVillage: form.assignedVillage,
          teamName: form.teamName,
        });
      }
      closeModals();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to save user account.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!profile || !confirmDelete) return;
    setSubmitting(true);
    try {
      await deleteManagedAccount(profile, {
        source: confirmDelete.source,
        id: confirmDelete.id,
        uid: confirmDelete.uid,
        provisionedAccountId: confirmDelete.provisionedAccountId,
        fullName: confirmDelete.fullName,
      });
      setConfirmDelete(null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to delete account.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = unifiedAccounts.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">
            User & Role Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Register Team Leaders and HSO officers, assign cell jurisdictions, and approve
            account access across Remera Sector.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New User</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#F8FAF9] border border-gray-200 rounded-lg overflow-x-auto">
            {(
              [
                { id: 'all', label: `All (${unifiedAccounts.length})` },
                { id: 'admin', label: 'Admins' },
                { id: 'team_leader', label: 'Team Leaders' },
                { id: 'hso', label: 'HSO Officers' },
                { id: 'pending', label: `Pending (${pendingCount})` },
              ] as Array<{ id: FilterTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-white text-[#166534] shadow-xs border border-gray-200/80'
                    : 'text-gray-600 hover:text-[#1F2937]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, or cell..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAF9] border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D] focus:bg-white"
            />
          </div>
        </div>

        {/* High-Density Accounts Table */}
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-11 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#1F2937] mb-1">
              No matching accounts found
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {searchQuery
                ? 'Try clearing your search filter or switching role tabs.'
                : 'Register your first Team Leader or HSO officer to assign cell responsibilities.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register User</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-[#F8FAF9] text-[11px] font-semibold text-gray-500">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Location & Team</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredAccounts.map((acc) => {
                  const isSelf = acc.uid === profile?.uid;
                  return (
                    <tr key={`${acc.source}-${acc.id}`} className="hover:bg-[#F8FAF9]">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1F2937]">{acc.fullName}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {acc.email}
                          {acc.phone ? ` · ${acc.phone}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-[#1F2937]">
                          {ROLE_SHORT_LABELS[acc.role]}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {acc.isClaimed ? 'Verified Sign-in' : 'Pre-registered'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#1F2937] block">
                          {acc.assignedCell || 'Unassigned'}
                          {acc.assignedVillage ? ` · ${acc.assignedVillage}` : ''}
                        </span>
                        {acc.teamName && (
                          <span className="text-xs text-gray-500 block">
                            {acc.teamName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {acc.status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{STATUS_LABELS.active}</span>
                          </span>
                        )}
                        {acc.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{STATUS_LABELS.pending}</span>
                          </span>
                        )}
                        {acc.status === 'inactive' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{STATUS_LABELS.inactive}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1F2937] bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(acc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-gray-200 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              aria-label={`Remove ${acc.fullName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {(isCreateModalOpen || editingTarget) && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">
                  {editingTarget ? 'Edit User & Role Assignment' : 'Register New Staff Account'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingTarget
                    ? 'Update role, cell assignment, or account status.'
                    : 'Pre-registered accounts automatically activate when the user signs in with Google.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModals}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g., Jean Paul Habimana"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingTarget)}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="officer@remera.gov.rw or gmail.com"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D] disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Assigned Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#15803D]"
                  >
                    <option value="team_leader">Team Leader</option>
                    <option value="hso">HSO (Sector Hygiene Officer)</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#15803D]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Assigned Cell
                  </label>
                  <select
                    value={form.assignedCell}
                    onChange={(e) => setForm({ ...form, assignedCell: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#15803D]"
                  >
                    <option value="">Unassigned</option>
                    {cellOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Assigned Village (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.assignedVillage}
                    onChange={(e) => setForm({ ...form, assignedVillage: e.target.value })}
                    placeholder="e.g., Amahoro"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Team Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.teamName}
                    onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                    placeholder="e.g., Nyabisindu Clean Team A"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+250 788 000 000"
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Saving...'
                    : editingTarget
                      ? 'Save Changes'
                      : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 shadow-lg">
            <h2 className="text-base font-bold text-[#1F2937] mb-2">
              Remove User Account
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-[#1F2937]">
                {confirmDelete.fullName}
              </span>{' '}
              ({confirmDelete.email}) from Remera EcoCare?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {submitting ? 'Removing...' : 'Remove Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
