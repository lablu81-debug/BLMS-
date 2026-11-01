import React, { useState } from 'react';
import { Bell, Download, Search, CheckCircle2 } from 'lucide-react';
import { NotificationRecord, UserAccount } from '../types';
import { fmtTs, generateCsvBlob, downloadFile } from '../utils/helpers';

interface NotificationLogTabProps {
  notificationLog: NotificationRecord[];
  companies: string[];
  currentUser: UserAccount;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

export const NotificationLogTab: React.FC<NotificationLogTabProps> = ({
  notificationLog,
  companies,
  currentUser,
  onShowToast
}) => {
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('All');
  const [viaFilter, setViaFilter] = useState<'All' | 'Automatic' | 'Manual'>('All');

  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const scopedUnits = companies.filter(inScope);

  const filtered = notificationLog
    .filter(n => inScope(n.unit))
    .filter(n => {
      if (unitFilter !== 'All' && n.unit !== unitFilter) return false;
      if (viaFilter === 'Automatic' && n.via !== 'auto') return false;
      if (viaFilter === 'Manual' && n.via !== 'manual') return false;

      if (search) {
        const q = search.toLowerCase();
        const match = [n.licId, n.unit, n.name, n.stage, n.label, n.by, n.till]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
        if (!match) return false;
      }

      return true;
    })
    .sort((a, b) => b.at - a.at);

  const handleExportCsv = () => {
    if (!filtered.length) {
      onShowToast('No notification log rows to export.', 'error');
      return;
    }

    const cols = ['Timestamp', 'L No', 'Unit', 'License Name', 'Notice Stage', 'Valid Till', 'Sent Via', 'Sent By'];
    const rows = filtered.map(n => [
      fmtTs(n.at),
      n.licId,
      n.unit,
      n.name,
      n.label || n.stage,
      n.till || '-',
      n.via === 'auto' ? 'Automatic Email' : 'Manual Delivery',
      n.by
    ]);

    const blob = generateCsvBlob(cols, rows);
    downloadFile('BLMS_Notification_Log.csv', blob);
    onShowToast('Exported BLMS_Notification_Log.csv', 'success');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--brand)]" />
          <span className="card-title">Notification Delivery & Reminders Log</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] w-[160px] focus:outline-hidden"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="px-4 py-2 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/50 flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--color-text-secondary)] font-medium">Unit:</span>
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="px-2 py-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
          >
            <option value="All">All Units</option>
            {scopedUnits.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[var(--color-text-secondary)] font-medium">Sent via:</span>
          {(['All', 'Automatic', 'Manual'] as const).map(v => (
            <button
              key={v}
              onClick={() => setViaFilter(v)}
              className={`px-2 py-0.5 rounded-full text-xs transition-colors cursor-pointer ${
                viaFilter === v
                  ? 'bg-[var(--brand)] text-white font-medium'
                  : 'bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px] text-[var(--color-text-secondary)]">
          {filtered.length} notice(s) recorded
        </span>
      </div>

      <div className="table-wrap">
        <table className="blms-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>L No</th>
              <th>Unit</th>
              <th>License Name</th>
              <th>Notice Stage</th>
              <th>Valid Till</th>
              <th>Delivery Channel</th>
              <th>Executed By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                  No notification notices recorded yet under these filters.
                </td>
              </tr>
            ) : (
              filtered.map((n, i) => (
                <tr key={i}>
                  <td className="text-[11px] font-mono whitespace-nowrap">{fmtTs(n.at)}</td>
                  <td className="text-[11px] font-mono text-[var(--color-text-secondary)]">{n.licId}</td>
                  <td><span className="badge badge-blue">{n.unit}</span></td>
                  <td className="font-semibold text-xs">{n.name}</td>
                  <td>
                    <span className={`badge ${n.stage === 'EXPIRED' ? 'badge-red' : 'badge-amber'}`}>
                      {n.label || n.stage}
                    </span>
                  </td>
                  <td className="text-xs">{n.till || '-'}</td>
                  <td>
                    {n.via === 'auto' ? (
                      <span className="badge badge-green">Automatic Email</span>
                    ) : (
                      <span className="badge badge-gray">Manual Delivery</span>
                    )}
                  </td>
                  <td className="text-xs">{n.by}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
