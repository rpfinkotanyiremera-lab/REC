import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { ROLE_SHORT_LABELS, type AuditLog } from '../types/ecocare';

interface ActivityHistoryViewProps {
  auditLogs: AuditLog[];
  loading: boolean;
}

function formatDateTime(ts?: { toDate: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return ts.toDate().toLocaleString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityHistoryView({ auditLogs, loading }: ActivityHistoryViewProps) {
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (log) =>
        log.summary.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q),
    );
  }, [auditLogs, search]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">Activity & Governance History</h1>
          <p className="text-sm text-gray-600 mt-1">
            Immutable audit record of account registrations, role assignments, and sector directives.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAF9] border border-gray-200 rounded-lg focus:outline-none focus:border-[#15803D] focus:bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <History className="w-8 h-8 text-[#15803D] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#1F2937]">No matching records</p>
            <p className="text-xs text-gray-500 mt-1">
              System actions are permanently logged here as they occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-[#F8FAF9] text-[11px] font-semibold text-gray-500">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAF9]">
                    <td className="py-3 px-4 font-mono text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#166534] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-[#1F2937]">{log.actorName}</span>
                      <span className="text-xs text-gray-500 ml-1.5">
                        · {ROLE_SHORT_LABELS[log.actorRole]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
