import React, { useState } from 'react';
import { ClipboardList, Download, Search, Lock } from 'lucide-react';
import { AuditEntry, UserAccount } from '../types';
import {
  fmtTs,
  generatePdfBlob,
  generateExcelBlob,
  generateCsvBlob,
  downloadFile
} from '../utils/helpers';

interface AuditLogTabProps {
  auditLog: AuditEntry[];
  companies: string[];
  currentUser: UserAccount;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({
  auditLog,
  companies,
  currentUser,
  onShowToast
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');

  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const scopedUnits = companies.filter(inScope);

  const filtered = auditLog
    .filter(a => a.unit === 'All' || inScope(a.unit))
    .filter(a => {
      if (actionFilter !== 'All' && a.action !== actionFilter) return false;
      if (unitFilter !== 'All' && a.unit !== unitFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        const diffText = a.changes.map(c => `${c.field} ${c.from} ${c.to}`).join(' ');
        const match = [a.user, a.action, a.entity, a.entityId, a.unit, a.summary, diffText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
        if (!match) return false;
      }

      return true;
    })
    .sort((a, b) => b.ts - a.ts);

  const actionTypes = ['All', 'Created', 'Updated', 'Deleted', 'Review', 'Notify', 'Export', 'Admin', 'Access'];

  const getActionBadge = (act: string) => {
    switch (act) {
      case 'Created': return 'badge-green';
      case 'Updated': return 'badge-blue';
      case 'Deleted': return 'badge-red';
      case 'Review': return 'badge-amber';
      case 'Notify': return 'badge-blue';
      case 'Export': return 'badge-gray';
      case 'Admin': return 'badge-gray';
      case 'Access': return 'badge-amber';
      default: return 'badge-gray';
    }
  };

  const handleExportPdf = () => {
    if (!filtered.length) {
      onShowToast('No audit entries to export.', 'error');
      return;
    }

    const columns = ['Timestamp', 'User', 'Action', 'Entity', 'Unit', 'Summary', 'Changes'];
    const rows = filtered.map(a => [
      fmtTs(a.ts),
      a.user,
      a.action,
      a.entityId ? `${a.entity} (${a.entityId})` : a.entity,
      a.unit || '-',
      a.summary,
      a.changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join('; ') || '-'
    ]);

    const blob = generatePdfBlob({
      title: 'Bitopi Group — Compliance Audit Log',
      metaLine: `Generated: ${new Date().toLocaleString('en-GB')} | Total: ${filtered.length} entries`,
      columns,
      rows
    });

    if (blob) {
      downloadFile('BLMS_Audit_Log.pdf', blob);
      onShowToast('Downloaded BLMS_Audit_Log.pdf', 'success');
    }
  };

  const handleExportExcel = () => {
    if (!filtered.length) {
      onShowToast('No audit entries to export.', 'error');
      return;
    }

    const columns = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Unit', 'Summary', 'Field Changes'];
    const rows = filtered.map(a => [
      fmtTs(a.ts),
      a.user,
      a.action,
      a.entity,
      a.entityId || '',
      a.unit || '',
      a.summary,
      a.changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join('; ')
    ]);

    const blob = generateExcelBlob('Audit Trail', columns, rows);
    if (blob) {
      downloadFile('BLMS_Audit_Log.xlsx', blob);
      onShowToast('Downloaded BLMS_Audit_Log.xlsx', 'success');
    }
  };

  const handleExportCsv = () => {
    if (!filtered.length) {
      onShowToast('No audit entries to export.', 'error');
      return;
    }

    const columns = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Unit', 'Summary', 'Field Changes'];
    const rows = filtered.map(a => [
      fmtTs(a.ts),
      a.user,
      a.action,
      a.entity,
      a.entityId || '',
      a.unit || '',
      a.summary,
      a.changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join('; ')
    ]);

    const blob = generateCsvBlob(columns, rows);
    downloadFile('BLMS_Audit_Log.csv', blob);
    onShowToast('Downloaded BLMS_Audit_Log.csv', 'success');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[var(--brand)]" />
          <span className="card-title">Audit Log — Immutable Compliance Activity Trail</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] w-[160px] focus:outline-hidden"
            />
          </div>

          <button
            onClick={handleExportPdf}
            className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3 text-[var(--brand)]" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="p-3 bg-[var(--color-background-secondary)]/50 border-b border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
        <span>Read-only append-only record of compliance events and field diffs before → after. Entries cannot be altered or removed.</span>
      </div>

      {/* Filter Row */}
      <div className="px-4 py-2 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-[var(--color-text-secondary)] font-medium">Action:</span>
        {actionTypes.map(act => (
          <button
            key={act}
            onClick={() => setActionFilter(act)}
            className={`px-2 py-0.5 rounded-full text-xs transition-colors cursor-pointer ${
              actionFilter === act
                ? 'bg-[var(--brand)] text-white font-medium'
                : 'bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)]'
            }`}
          >
            {act}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[var(--color-text-secondary)]">Unit:</span>
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="px-2 py-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] text-xs"
          >
            <option value="All">All Units</option>
            {scopedUnits.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {filtered.length} event(s)
          </span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="blms-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Operator / User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Unit</th>
              <th>Event Summary & Changes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                  No audit log entries found matching current filters.
                </td>
              </tr>
            ) : (
              filtered.map(a => (
                <tr key={a.id}>
                  <td className="text-[11px] font-mono whitespace-nowrap">{fmtTs(a.ts)}</td>
                  <td className="text-xs font-medium whitespace-nowrap">{a.user}</td>
                  <td>
                    <span className={`badge ${getActionBadge(a.action)}`}>
                      {a.action}
                    </span>
                  </td>
                  <td className="text-xs">
                    <span className="font-medium text-[var(--color-text-primary)]">{a.entity}</span>
                    {a.entityId && (
                      <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono">{a.entityId}</div>
                    )}
                  </td>
                  <td>
                    {a.unit ? <span className="badge badge-blue">{a.unit}</span> : '-'}
                  </td>
                  <td className="text-xs max-w-md">
                    <div className="font-medium text-[var(--color-text-primary)] leading-snug">{a.summary}</div>
                    {a.changes?.length > 0 && (
                      <div className="mt-1 space-y-0.5 p-1.5 rounded bg-[var(--color-background-secondary)] text-[11px]">
                        {a.changes.map((c, i) => (
                          <div key={i} className="text-[var(--color-text-secondary)]">
                            <span className="font-semibold text-[var(--color-text-primary)]">{c.field}:</span>{' '}
                            <span className="line-through opacity-70">{c.from || '—'}</span> →{' '}
                            <span className="font-semibold text-[var(--brand)]">{c.to || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
