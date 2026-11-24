import { Clock, ShieldOff, RefreshCw, LogOut, Leaf } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types/ecocare';

export function PendingApprovalView() {
  const { profile, refreshProfile, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  if (!profile) return null;

  const isInactive = profile.status === 'inactive';

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between p-6">
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#166534] flex items-center justify-center text-white">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold text-[#1F2937] block leading-tight">
              REMERA ECOCARE
            </span>
            <span className="text-xs text-[#15803D] font-medium">
              Smart Hygiene, Cleaner Communities
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      <main className="max-w-lg w-full mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-xs my-10">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center mb-5 ${
            isInactive ? 'bg-red-50 text-red-700' : 'bg-[#DCFCE7] text-[#166534]'
          }`}
        >
          {isInactive ? <ShieldOff className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
        </div>

        <h1 className="text-xl font-bold text-[#1F2937] mb-2">
          {isInactive
            ? 'Account Access Suspended'
            : 'Account Pending Administrator Approval'}
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {isInactive
            ? 'Your Remera EcoCare account is currently marked as inactive by the Sector Administrator. Contact the Remera Sector office if you believe this is an error.'
            : 'Your Google account has been authenticated, and your registration request is queued for verification. An Administrator must assign your official role and Remera cell before you can enter the workspace.'}
        </p>

        <dl className="border-t border-b border-gray-100 py-4 space-y-2.5 text-sm mb-6">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Registered Name</dt>
            <dd className="font-medium text-[#1F2937] text-right">{profile.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Email Address</dt>
            <dd className="font-mono text-xs text-[#1F2937] text-right">{profile.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Current Role</dt>
            <dd className="font-medium text-[#1F2937] text-right">
              {ROLE_LABELS[profile.role]}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Account Status</dt>
            <dd
              className={`font-medium text-right ${
                isInactive ? 'text-red-700' : 'text-amber-700'
              }`}
            >
              {isInactive ? 'Inactive' : 'Pending Verification'}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <span>Use Different Account</span>
          </button>
        </div>
      </main>

      <footer className="max-w-3xl w-full mx-auto text-center text-xs text-gray-500 pb-2">
        Remera EcoCare · Remera Sector Environmental Management
      </footer>
    </div>
  );
}
