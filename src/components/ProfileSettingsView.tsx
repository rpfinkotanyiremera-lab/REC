import { useState, type FormEvent } from 'react';
import { CheckCircle2, Shield, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SCHEMA_LIMITS } from '../lib/validation';
import { updateOwnProfile } from '../services/ecocareService';
import { ROLE_LABELS, STATUS_LABELS } from '../types/ecocare';

export function ProfileSettingsView() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!profile) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (
      trimmedName.length < SCHEMA_LIMITS.FULL_NAME_MIN ||
      trimmedName.length > SCHEMA_LIMITS.FULL_NAME_MAX
    ) {
      setError(
        `Full name must be between ${SCHEMA_LIMITS.FULL_NAME_MIN} and ${SCHEMA_LIMITS.FULL_NAME_MAX} characters.`,
      );
      return;
    }
    if (phone.trim().length > SCHEMA_LIMITS.PHONE_MAX) {
      setError(`Phone number must be at most ${SCHEMA_LIMITS.PHONE_MAX} characters.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSavedNotice(false);
    try {
      await updateOwnProfile(profile, { fullName: trimmedName, phone });
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-bold text-[#1F2937]">Account Profile & Role Details</h1>
        <p className="text-sm text-gray-600 mt-1">
          View your assigned Remera Sector jurisdiction and keep your contact information current.
        </p>
      </div>

      {/* Institutional Role Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Assigned Role</p>
            <p className="text-sm font-bold text-[#1F2937]">{ROLE_LABELS[profile.role]}</p>
            <p className="text-xs text-[#15803D] mt-0.5">
              Status: {STATUS_LABELS[profile.status]}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Assigned Jurisdiction</p>
            <p className="text-sm font-bold text-[#1F2937]">
              {profile.assignedCell || 'Remera Sector'}
              {profile.assignedVillage ? ` · ${profile.assignedVillage}` : ''}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {profile.teamName || 'Sector Staff'}
            </p>
          </div>
        </div>
      </div>

      {/* Editable Contact Form */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-5"
      >
        <h2 className="text-base font-bold text-[#1F2937]">Personal Contact Details</h2>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        {savedNotice && (
          <div className="p-3 rounded-lg bg-[#DCFCE7] border border-[#15803D]/20 text-xs text-[#166534] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile details updated successfully.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
              Verified Google Email
            </label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full px-3.5 py-2 text-sm bg-gray-100 text-gray-600 border border-gray-200 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
              Telephone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250 788 000 000"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Contact Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
