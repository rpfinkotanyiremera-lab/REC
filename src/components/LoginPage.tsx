import { useState } from 'react';
import { ShieldCheck, Users, ClipboardCheck, AlertCircle, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col lg:flex-row">
      {/* Left Institutional Authentication Column */}
      <div className="flex-1 flex flex-col justify-between bg-white px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#166534] flex items-center justify-center text-white shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#1F2937] block leading-tight">
                REMERA ECOCARE
              </span>
              <span className="text-xs font-medium text-[#15803D]">
                Smart Hygiene, Cleaner Communities
              </span>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 hidden sm:inline">
            Remera Sector · Kigali
          </span>
        </header>

        <main className="my-12 max-w-md w-full mx-auto lg:mx-0">
          <p className="text-xs font-semibold tracking-wide text-[#15803D] mb-3">
            Remera Sector Environmental Portal
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1F2937] leading-tight mb-4">
            Centralized hygiene coordination for cleaner neighborhoods
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-8">
            Sign in with your authorized institutional Google account to access your
            role-assigned dashboard, coordinate hygiene teams, and uphold accountability
            across Remera Sector.
          </p>

          {authError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-red-800">
                <p className="font-medium">Sign-in notice</p>
                <p className="mt-0.5 text-red-700">{authError}</p>
              </div>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-xs font-medium text-red-700 hover:underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166534] cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
              />
            </svg>
            <span>{signingIn ? 'Verifying Credentials...' : 'Sign in with Google'}</span>
          </button>

          <div className="mt-8 pt-8 border-t border-gray-200 space-y-4">
            <h2 className="text-xs font-semibold text-gray-500">
              Authorized Institutional Roles
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#15803D] mt-0.5 shrink-0" />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold text-[#1F2937]">System Administrator</span>
                  <span className="mx-1.5 text-gray-400">·</span>
                  <span>Full sector oversight, user accounts, role assignments, and governance.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-[#15803D] mt-0.5 shrink-0" />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold text-[#1F2937]">Team Leader</span>
                  <span className="mx-1.5 text-gray-400">·</span>
                  <span>Cell and village team coordination, activity tracking, and field updates.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ClipboardCheck className="w-4 h-4 text-[#15803D] mt-0.5 shrink-0" />
                <div className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold text-[#1F2937]">Sector Hygiene Officer (HSO)</span>
                  <span className="mx-1.5 text-gray-400">·</span>
                  <span>Sector-wide monitoring, compliance supervision, and cleanliness standards.</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
          <span>Remera Sector Administration · Gasabo District, Kigali</span>
          <span>Secure Role-Based Access</span>
        </footer>
      </div>

      {/* Right Civic Photography Showcase Column */}
      <div className="lg:w-[48%] xl:w-[50%] relative min-h-[320px] lg:min-h-screen bg-[#166534] overflow-hidden">
        {!imgError ? (
          <img
            src="/src/assets/images/remera_civic_greenery_1795516783375.jpg"
            alt="Clean tree-lined boulevard and landscaped civic greenery in Remera Sector, Kigali"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#166534] via-[#15803D] to-[#14532D] flex items-center justify-center">
            <Leaf className="w-24 h-24 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#052e16]/90 via-[#166534]/35 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end p-8 sm:p-12 lg:p-14 text-white">
          <div className="max-w-md">
            <p className="text-xs font-medium text-[#DCFCE7] mb-2">
              Nyarutarama · Nyabisindu · Rukiri I · Rukiri II
            </p>
            <p className="text-xl sm:text-2xl font-semibold leading-snug text-white mb-3">
              Promoting community unity, transparency, and sustainable environmental stewardship.
            </p>
            <p className="text-sm text-white/85 leading-relaxed">
              Every registered Team Leader and Sector Hygiene Officer operates with clear
              geographical accountability across Remera Sector.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
