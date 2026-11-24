import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  History,
  UserCog,
  LogOut,
  Menu,
  X,
  Leaf,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_SHORT_LABELS, type AppView, type UserRole } from '../types/ecocare';

interface AppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  children: ReactNode;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: typeof LayoutDashboard;
  allowedRoles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['admin', 'team_leader', 'hso'],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    allowedRoles: ['admin'],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    allowedRoles: ['admin', 'team_leader', 'hso'],
  },
  {
    id: 'history',
    label: 'Activity History',
    icon: History,
    allowedRoles: ['admin', 'hso'],
  },
  {
    id: 'profile',
    label: 'Profile & Settings',
    icon: UserCog,
    allowedRoles: ['admin', 'team_leader', 'hso'],
  },
];

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  const { profile, activeViewRole, setActiveViewRole, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!profile) return null;

  const isActualAdmin = profile.role === 'admin';
  const visibleNav = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(activeViewRole),
  );

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === currentView)?.label || 'Dashboard';

  const handleSelectNav = (view: AppView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  const handleRolePreviewChange = (role: UserRole) => {
    setActiveViewRole(role);
    const targetAllowed = NAV_ITEMS.find((n) => n.id === currentView)?.allowedRoles.includes(role);
    if (!targetAllowed) {
      onNavigate('dashboard');
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#166534] text-white">
      <div className="px-5 py-5 border-b border-white/15 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 text-[#DCFCE7]" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm tracking-tight block truncate">
              REMERA ECOCARE
            </span>
            <span className="text-[11px] text-[#DCFCE7]/90 block truncate">
              Remera Sector Portal
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-white text-[#166534] shadow-xs'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/15">
        <div className="mb-3 px-1">
          <p className="text-sm font-semibold text-white truncate">{profile.fullName}</p>
          <p className="text-xs text-[#DCFCE7]/85 truncate">
            {ROLE_SHORT_LABELS[profile.role]}
            {profile.assignedCell ? ` · ${profile.assignedCell}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[82vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-700 hover:bg-gray-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-[#166534] whitespace-nowrap hidden sm:inline">
                Remera EcoCare
              </span>
              <span className="text-gray-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#1F2937] truncate">
                {currentNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isActualAdmin && (
              <div className="hidden md:flex items-center gap-1.5 bg-[#F8FAF9] border border-gray-200 rounded-lg p-1">
                <span className="inline-flex items-center gap-1 px-2 text-[11px] font-medium text-gray-500 whitespace-nowrap">
                  <Eye className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>View as</span>
                </span>
                {(['admin', 'team_leader', 'hso'] as UserRole[]).map((roleOption) => {
                  const selected = activeViewRole === roleOption;
                  return (
                    <button
                      key={roleOption}
                      type="button"
                      onClick={() => handleRolePreviewChange(roleOption)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selected
                          ? 'bg-[#166534] text-white'
                          : 'text-gray-600 hover:text-[#1F2937] hover:bg-white'
                      }`}
                    >
                      {ROLE_SHORT_LABELS[roleOption]}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-[#DCFCE7] text-[#166534] font-bold text-xs flex items-center justify-center shrink-0">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="text-xs font-semibold text-[#1F2937] block whitespace-nowrap">
                  {profile.fullName}
                </span>
                <span className="text-[11px] text-gray-500 block whitespace-nowrap">
                  {ROLE_SHORT_LABELS[profile.role]}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Admin Preview Mode Notice (when viewing as Team Leader or HSO) */}
        {isActualAdmin && activeViewRole !== 'admin' && (
          <div className="bg-[#DCFCE7] border-b border-[#15803D]/20 px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#166534]">
            <span>
              Role Preview Active: Inspecting the{' '}
              <strong>{ROLE_SHORT_LABELS[activeViewRole]}</strong> workspace and authorized navigation.
            </span>
            <button
              type="button"
              onClick={() => handleRolePreviewChange('admin')}
              className="font-semibold underline hover:no-underline whitespace-nowrap cursor-pointer"
            >
              Return to Admin View
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
