import { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserCheck,
  MapPin,
  Megaphone,
  ArrowRight,
  Clock,
  CheckCircle2,
  Building2,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initializeStarterSectorCells } from '../services/ecocareService';
import {
  ROLE_SHORT_LABELS,
  type Announcement,
  type AppView,
  type AuditLog,
  type SectorCell,
  type StaffDirectoryEntry,
} from '../types/ecocare';

interface RoleDashboardsProps {
  staffDirectory: StaffDirectoryEntry[];
  sectorCells: SectorCell[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
  loadingData: boolean;
  onNavigate: (view: AppView) => void;
  onOpenRegisterUser: () => void;
}

function formatTimestamp(ts?: { toDate: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return ts.toDate().toLocaleDateString('en-RW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RoleDashboards({
  staffDirectory,
  sectorCells,
  announcements,
  auditLogs,
  loadingData,
  onNavigate,
  onOpenRegisterUser,
}: RoleDashboardsProps) {
  const { profile, activeViewRole } = useAuth();
  const [seedingCells, setSeedingCells] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  if (!profile) return null;

  const totalUsers = staffDirectory.length;
  const activeAdmins = staffDirectory.filter(
    (s) => s.role === 'admin' && s.status === 'active',
  ).length;
  const activeTeamLeaders = staffDirectory.filter(
    (s) => s.role === 'team_leader' && s.status === 'active',
  ).length;
  const activeHsos = staffDirectory.filter(
    (s) => s.role === 'hso' && s.status === 'active',
  ).length;
  const pendingAccounts = staffDirectory.filter((s) => s.status === 'pending').length;
  const activeCellsCount = sectorCells.filter((c) => c.status === 'active').length;
  const totalVillages = sectorCells.reduce((sum, c) => sum + (c.villageCount || 0), 0);

  const handleInitializeCells = async () => {
    setSeedingCells(true);
    setSeedError(null);
    try {
      await initializeStarterSectorCells(profile);
    } catch (error) {
      setSeedError(
        error instanceof Error ? error.message : 'Unable to initialize sector cells.',
      );
    } finally {
      setSeedingCells(false);
    }
  };

  // Role-filtered announcements
  const relevantAnnouncements = announcements.filter((a) => {
    if (activeViewRole === 'admin') return true;
    if (a.targetAudience === 'all') return true;
    if (activeViewRole === 'team_leader' && a.targetAudience === 'team_leaders') return true;
    if (activeViewRole === 'hso' && a.targetAudience === 'hso') return true;
    return false;
  });

  // Cell breakdown computed strictly from real Firestore records
  const cellRosterSummary = sectorCells.map((cell) => {
    const assignedStaff = staffDirectory.filter(
      (s) => s.assignedCell.toLowerCase() === cell.name.toLowerCase() && s.status === 'active',
    );
    const leadersCount = assignedStaff.filter((s) => s.role === 'team_leader').length;
    const hsoCount = assignedStaff.filter((s) => s.role === 'hso').length;
    return {
      cell,
      leadersCount,
      hsoCount,
      totalAssigned: assignedStaff.length,
    };
  });

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white border border-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-white border border-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role-Specific Welcome Banner */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-[#15803D] mb-1">
            {activeViewRole === 'admin'
              ? 'System Administration Workspace'
              : activeViewRole === 'hso'
                ? 'Sector Hygiene Supervision Workspace'
                : 'Team Coordinator Workspace'}
          </p>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">
            {activeViewRole === 'admin'
              ? 'Remera Sector Hygiene Command Center'
              : activeViewRole === 'hso'
                ? 'Sector-Wide Hygiene Oversight & Readiness'
                : profile.assignedCell
                  ? `${profile.assignedCell} Cell Coordination`
                  : 'Team Leader Coordination Overview'}
          </h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            {activeViewRole === 'admin'
              ? 'Manage authorized roles, onboard Team Leaders and HSO officers, and coordinate Remera Sector directives.'
              : activeViewRole === 'hso'
                ? 'Monitor cell coverage, review active Team Leaders across Remera Sector, and track sector directives.'
                : 'Review your assigned Remera geographical area, monitor team directives, and maintain accurate field contact details.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeViewRole === 'admin' && (
            <>
              <button
                type="button"
                onClick={onOpenRegisterUser}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register User</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-[#1F2937] border border-gray-200 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Megaphone className="w-4 h-4 text-[#15803D]" />
                <span>Publish Notice</span>
              </button>
            </>
          )}

          {activeViewRole === 'hso' && (
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Review Activity History</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {activeViewRole === 'team_leader' && (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Update Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* KPI Metrics Grid (Light Green Surface Cards with Tabular Numerals) */}
      <section aria-label="Key Sector Statistics">
        {activeViewRole === 'admin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Registered Accounts</span>
                <Users className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {totalUsers}
              </p>
              <p className="text-xs text-gray-600 mt-1.5 tabular-nums">
                {activeAdmins} Admin · {pendingAccounts} Pending
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Active Team Leaders</span>
                <UserCheck className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {activeTeamLeaders}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Cell and village coordinators
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">HSO Officers</span>
                <ShieldCheck className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {activeHsos}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Sector-wide hygiene supervisors
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Remera Cells</span>
                <MapPin className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {activeCellsCount}
              </p>
              <p className="text-xs text-gray-600 mt-1.5 tabular-nums">
                {totalVillages} villages mapped
              </p>
            </div>
          </div>
        )}

        {activeViewRole === 'hso' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Cells Under Supervision</span>
                <MapPin className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {activeCellsCount}
              </p>
              <p className="text-xs text-gray-600 mt-1.5 tabular-nums">
                {totalVillages} villages in Remera Sector
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Active Team Leaders</span>
                <UserCheck className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {activeTeamLeaders}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Coordinating cell sanitation
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">HSO Supervision Team</span>
                <ShieldCheck className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {activeHsos}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Active sector hygiene officers
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Sector Directives</span>
                <Megaphone className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {relevantAnnouncements.length}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Active notices & instructions
              </p>
            </div>
          </div>
        )}

        {activeViewRole === 'team_leader' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Assigned Cell</span>
                <MapPin className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-xl font-bold text-[#1F2937] truncate">
                {profile.assignedCell || 'Unassigned'}
              </p>
              <p className="text-xs text-gray-600 mt-1.5 truncate">
                {profile.assignedVillage
                  ? `Village: ${profile.assignedVillage}`
                  : 'Remera Sector Jurisdiction'}
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Assigned Team</span>
                <Building2 className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-xl font-bold text-[#1F2937] truncate">
                {profile.teamName || 'Pending Team Link'}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Hygiene coordination unit
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Sector Team Leaders</span>
                <Users className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {activeTeamLeaders}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Peer coordinators in Remera
              </p>
            </div>

            <div className="bg-[#DCFCE7]/55 border border-[#15803D]/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#166534]">Team Directives</span>
                <Megaphone className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-3xl font-bold text-[#1F2937] font-mono tabular-nums">
                {relevantAnnouncements.length}
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                Notices requiring attention
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Main Content Split: Role Distribution / Cell Coverage + Announcements & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns */}
        <div className="lg:col-span-7 space-y-6">
          {/* Role Breakdown & Cell Coverage Card */}
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-[#1F2937]">
                  {activeViewRole === 'team_leader'
                    ? 'Remera Sector Cell Structure'
                    : 'Cell & Role Coverage Breakdown'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live administrative personnel distribution across Remera Sector cells
                </p>
              </div>
              {activeViewRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('users')}
                  className="text-xs font-semibold text-[#15803D] hover:text-[#166534] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <span>Manage Accounts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {seedError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                {seedError}
              </p>
            )}

            {sectorCells.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
                <MapPin className="w-8 h-8 text-[#15803D] mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-[#1F2937] mb-1">
                  Remera Sector Cells Not Yet Initialized
                </h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto mb-4">
                  {activeViewRole === 'admin'
                    ? 'Initialize the four administrative cells of Remera Sector (Nyarutarama, Nyabisindu, Rukiri I, Rukiri II) to track Team Leader and HSO assignments.'
                    : 'The Sector Administrator has not yet initialized the administrative cell registry.'}
                </p>
                {activeViewRole === 'admin' && (
                  <button
                    type="button"
                    onClick={handleInitializeCells}
                    disabled={seedingCells}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {seedingCells
                        ? 'Initializing Cells...'
                        : 'Initialize Remera Sector Cells'}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500">
                      <th className="py-2.5 pr-4">Cell Name</th>
                      <th className="py-2.5 px-3 text-right">Villages</th>
                      <th className="py-2.5 px-3 text-right">Team Leaders</th>
                      <th className="py-2.5 pl-3 text-right">HSO Officers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {cellRosterSummary.map(({ cell, leadersCount, hsoCount }) => (
                      <tr key={cell.id} className="hover:bg-[#F8FAF9] transition-colors">
                        <td className="py-3 pr-4">
                          <span className="font-semibold text-[#1F2937] block">
                            {cell.name}
                          </span>
                          <span className="text-xs font-mono text-gray-500">
                            {cell.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-gray-700">
                          {cell.villageCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#166534] font-semibold">
                          {leadersCount}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono tabular-nums text-gray-700">
                          {hsoCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Live Role Composition Bar */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span className="font-medium text-[#1F2937]">Active Role Distribution</span>
                <span className="font-mono tabular-nums">
                  {activeAdmins + activeTeamLeaders + activeHsos} Active Personnel
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden flex">
                {totalUsers > 0 && (
                  <>
                    <div
                      style={{
                        width: `${(activeTeamLeaders / Math.max(totalUsers, 1)) * 100}%`,
                      }}
                      className="bg-[#15803D] transition-all"
                      title={`Team Leaders: ${activeTeamLeaders}`}
                    />
                    <div
                      style={{
                        width: `${(activeHsos / Math.max(totalUsers, 1)) * 100}%`,
                      }}
                      className="bg-[#166534] transition-all"
                      title={`HSO Officers: ${activeHsos}`}
                    />
                    <div
                      style={{
                        width: `${(activeAdmins / Math.max(totalUsers, 1)) * 100}%`,
                      }}
                      className="bg-[#86EFAC] transition-all"
                      title={`Admins: ${activeAdmins}`}
                    />
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-gray-600 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#15803D]" />
                  <span>Team Leaders ({activeTeamLeaders})</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#166534]" />
                  <span>HSO ({activeHsos})</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#86EFAC]" />
                  <span>Admins ({activeAdmins})</span>
                </span>
              </div>
            </div>
          </section>

          {/* Phase 1 Architecture Readiness Card */}
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1F2937] mb-1">
              Platform Foundation & Rollout Scope
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Phase 1 establishes secure identity, role-based access control, and user governance
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#DCFCE7]/40 border border-[#15803D]/15">
                <div className="flex items-center gap-2 font-semibold text-[#166534] mb-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Phase 1 Active: System Foundation</span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Authenticated Google sign-in, 3-tier RBAC, user provisioning, role dashboards,
                  announcements, and immutable audit history.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-gray-200">
                <div className="flex items-center gap-2 font-semibold text-[#1F2937] mb-1">
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Upcoming Phases Ready</span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Database schema structured for Phase 2 villages/teams, Phase 3 hygiene tasks,
                  Phase 4 HSO inspections, and Phase 5 PDF/Excel reports.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right 5 Columns: Announcements & Recent Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          {/* Latest Announcements */}
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-[#1F2937]">Sector Announcements</h2>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="text-xs font-semibold text-[#15803D] hover:text-[#166534] whitespace-nowrap cursor-pointer"
              >
                View All
              </button>
            </div>

            {relevantAnnouncements.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                No announcements have been published yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {relevantAnnouncements.slice(0, 3).map((item) => (
                  <article key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-1">
                      <span
                        className={
                          item.priority === 'urgent'
                            ? 'font-semibold text-amber-700'
                            : 'font-medium text-[#15803D]'
                        }
                      >
                        {item.priority === 'urgent' ? 'Urgent Notice' : 'Sector Directive'}
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#1F2937] mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity History (Admin & HSO) */}
          {(activeViewRole === 'admin' || activeViewRole === 'hso') && (
            <section className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-[#1F2937]">Recent Governance Log</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className="text-xs font-semibold text-[#15803D] hover:text-[#166534] whitespace-nowrap cursor-pointer"
                >
                  Full Log
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500">
                  No governance events recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-xs font-medium text-[#1F2937] leading-snug">
                        {log.summary}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                        <span>{log.actorName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ROLE_SHORT_LABELS[log.actorRole]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatTimestamp(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
