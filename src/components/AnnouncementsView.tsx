import { useMemo, useState, type FormEvent } from 'react';
import { Megaphone, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateAnnouncementInput } from '../lib/validation';
import { deleteAnnouncement, publishAnnouncement } from '../services/ecocareService';
import type { Announcement } from '../types/ecocare';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  loading: boolean;
}

function formatDate(ts?: { toDate: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return ts.toDate().toLocaleDateString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const AUDIENCE_LABELS: Record<Announcement['targetAudience'], string> = {
  all: 'All Remera Staff',
  team_leaders: 'Team Leaders',
  hso: 'HSO Officers',
};

export function AnnouncementsView({ announcements, loading }: AnnouncementsViewProps) {
  const { profile, activeViewRole } = useAuth();
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'team_leaders' | 'hso'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'team_leaders' | 'hso'>('all');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isActualAdmin = profile?.role === 'admin' && activeViewRole === 'admin';

  const visibleAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      if (activeViewRole === 'team_leader' && a.targetAudience === 'hso') return false;
      if (activeViewRole === 'hso' && a.targetAudience === 'team_leaders') return false;
      if (audienceFilter !== 'all' && a.targetAudience !== audienceFilter) return false;
      return true;
    });
  }, [announcements, activeViewRole, audienceFilter]);

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const validationError = validateAnnouncementInput({ title, message });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await publishAnnouncement(profile, {
        title,
        message,
        targetAudience,
        priority,
      });
      setTitle('');
      setMessage('');
      setTargetAudience('all');
      setPriority('normal');
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Sector Announcements</h1>
          <p className="text-sm text-gray-600 mt-1">
            Official operational notices and hygiene directives for Remera Sector teams.
          </p>
        </div>

        {isActualAdmin && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-gray-100">
          <div className="flex items-center gap-1 p-1 bg-[#F8FAF9] border border-gray-200 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Notices' },
                { id: 'team_leaders', label: 'Team Leaders' },
                { id: 'hso', label: 'HSO Officers' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAudienceFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  audienceFilter === tab.id
                    ? 'bg-white text-[#166534] shadow-xs border border-gray-200/80'
                    : 'text-gray-600 hover:text-[#1F2937]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500 font-mono tabular-nums">
            {visibleAnnouncements.length} notice{visibleAnnouncements.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : visibleAnnouncements.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone className="w-8 h-8 text-[#15803D] mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-[#1F2937] mb-1">
              No sector announcements yet
            </h2>
            <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
              {isActualAdmin
                ? 'Publish your first sector-wide directive to coordinate Team Leaders and HSO officers.'
                : 'Sector notices published by the Administrator will appear here.'}
            </p>
            {isActualAdmin && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publish First Announcement</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleAnnouncements.map((item) => (
              <article key={item.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span
                        className={
                          item.priority === 'urgent'
                            ? 'font-semibold text-amber-700'
                            : 'font-semibold text-[#15803D]'
                        }
                      >
                        {item.priority === 'urgent' ? 'Urgent Directive' : 'Standard Notice'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{AUDIENCE_LABELS[item.targetAudience]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#1F2937]">{item.title}</h2>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {item.message}
                    </p>
                    <p className="text-xs text-gray-500 pt-1">
                      Issued by <span className="font-medium text-[#1F2937]">{item.authorName}</span>
                    </p>
                  </div>

                  {isActualAdmin && profile && (
                    <button
                      type="button"
                      onClick={() => void deleteAnnouncement(profile, item.id, item.title)}
                      className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Publish Announcement Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">
                  Publish Sector Announcement
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Send operational instructions to Remera Sector staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Umuganda Monthly Sanitation Coordination"
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) =>
                      setTargetAudience(e.target.value as 'all' | 'team_leaders' | 'hso')
                    }
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#15803D]"
                  >
                    <option value="all">All Remera Staff</option>
                    <option value="team_leaders">Team Leaders</option>
                    <option value="hso">HSO Officers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
                    className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#15803D]"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                  Directive Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write clear instructions for cell teams and hygiene officers..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D]"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {submitting ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
