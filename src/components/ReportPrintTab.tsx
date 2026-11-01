import React, { useState } from 'react';
import { Printer, Download, Search, FileText } from 'lucide-react';
import { LicenseEntry, UserAccount } from '../types';
import {
  daysUntil,
  statusColor,
  statusLabel,
  pct,
  generatePdfBlob,
  generateExcelBlob,
  downloadFile
} from '../utils/helpers';

interface ReportPrintTabProps {
  licenses: LicenseEntry[];
  companies: string[];
  licenseTypes: string[];
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

export const ReportPrintTab: React.FC<ReportPrintTabProps> = ({
  licenses,
  companies,
  licenseTypes,
  currentUser,
  globalAlertThreshold,
  licenseThresholds,
  onShowToast
}) => {
  const [scopeUnit, setScopeUnit] = useState('All');
  const [period, setPeriod] = useState<'All' | 'Month' | 'Year' | 'Overdue' | 'Custom'>('All');
  const [statusScope, setStatusScope] = useState('All');
  const [typeScope, setTypeScope] = useState('All');
  const [catScope, setCatScope] = useState('All');
  const [searchScope, setSearchScope] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [includeSummary, setIncludeSummary] = useState(true);

  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const myLicenses = licenses.filter(l => inScope(l.company));
  const scopedUnits = companies.filter(inScope);

  const today = new Date();
  const curYear = today.getFullYear();
  const curMonth = today.getMonth();

  // Filter rows for schedule
  const filteredRows = myLicenses.filter(l => {
    if (scopeUnit !== 'All' && l.company !== scopeUnit) return false;
    if (typeScope !== 'All' && l.type !== typeScope) return false;
    if (catScope !== 'All' && l.category !== catScope) return false;

    const days = daysUntil(l.till);
    const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
    if (statusScope !== 'All' && sl !== statusScope) return false;

    // Period match
    if (period === 'Overdue') {
      if (days === null || days >= 0) return false;
    } else if (period === 'Month') {
      if (!l.till) return false;
      const d = new Date(l.till);
      if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) return false;
    } else if (period === 'Year') {
      if (!l.till) return false;
      const d = new Date(l.till);
      if (d.getFullYear() !== curYear) return false;
    } else if (period === 'Custom') {
      if (!l.till) return false;
      if (customFrom && l.till < customFrom) return false;
      if (customTo && l.till > customTo) return false;
    }

    if (searchScope) {
      const q = searchScope.toLowerCase();
      const match = [l.id, l.company, l.type, l.name, l.number, l.comments, l.action]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Calculate stats for summary
  const totalInScope = filteredRows.length;
  let vCount = 0;
  let eCount = 0;
  let xCount = 0;
  const typeMap: Record<string, { type: string; count: number }> = {};

  filteredRows.forEach(l => {
    const d = daysUntil(l.till);
    const s = statusLabel(d, l.status, l.type, globalAlertThreshold, licenseThresholds);
    if (s === 'Expired') xCount++;
    else if (s === 'Expiring Soon') eCount++;
    else vCount++;

    if (!typeMap[l.type]) typeMap[l.type] = { type: l.type, count: 0 };
    typeMap[l.type].count++;
  });

  const generatedDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Export handlers
  const handleExportPdf = () => {
    if (!filteredRows.length) {
      onShowToast('No records match the current filters to export.', 'error');
      return;
    }

    const columns = ['L No', 'Type', 'Unit', 'License Name', 'Lic No', 'Valid From', 'Valid Till', 'Status', 'Status Category', 'Action'];
    const rows = filteredRows.map(l => [
      l.id,
      l.type,
      l.company,
      l.name,
      l.number || '-',
      l.from || '-',
      l.till || '-',
      statusLabel(daysUntil(l.till), l.status, l.type, globalAlertThreshold, licenseThresholds),
      l.category === 'One-time' ? 'One-time (Permanent)' : 'Renewal (Periodic Expiry)',
      l.action
    ]);

    const summaryLines = includeSummary
      ? [
          `Overall: ${totalInScope} record(s) — Valid: ${vCount} (${pct(vCount, totalInScope)}), Expiring: ${eCount} (${pct(eCount, totalInScope)}), Expired: ${xCount} (${pct(xCount, totalInScope)})`,
          'Breakdown: ' + Object.values(typeMap).map(t => `${t.type}: ${t.count}`).join(' | ')
        ]
      : [];

    const blob = generatePdfBlob({
      title: 'Bitopi Group — Business Licenses Print Schedule',
      metaLine: `Generated: ${generatedDateStr} | Scope: ${scopeUnit} | Period: ${period} | Status: ${statusScope} | Total: ${totalInScope}`,
      summaryLines,
      columns,
      rows
    });

    if (blob) {
      downloadFile('BLMS_License_Print_Schedule.pdf', blob);
      onShowToast('Downloaded BLMS_License_Print_Schedule.pdf', 'success');
    }
  };

  const handleExportExcel = () => {
    if (!filteredRows.length) {
      onShowToast('No records match the current filters to export.', 'error');
      return;
    }

    const columns = ['L No', 'Type', 'Unit', 'License Name', 'Lic No', 'Valid From', 'Valid Till', 'Status', 'Status Category', 'Comments', 'Action'];
    const rows = filteredRows.map(l => [
      l.id,
      l.type,
      l.company,
      l.name,
      l.number || '-',
      l.from || '-',
      l.till || '-',
      statusLabel(daysUntil(l.till), l.status, l.type, globalAlertThreshold, licenseThresholds),
      l.category === 'One-time' ? 'One-time (Permanent)' : 'Renewal (Periodic Expiry)',
      l.comments || '',
      l.action
    ]);

    const blob = generateExcelBlob('Print Schedule', columns, rows);
    if (blob) {
      downloadFile('BLMS_License_Print_Schedule.xlsx', blob);
      onShowToast('Downloaded BLMS_License_Print_Schedule.xlsx', 'success');
    }
  };


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Print Schedule Generator Card */}
      <div className="card border-[var(--brand)] shadow-sm">
        <div className="card-header bg-[var(--color-background-primary)]">
          <div className="flex items-center gap-2">
            <span className="card-title text-[var(--brand)]">
              <Printer className="w-4 h-4" /> Direct Print Schedule Generator
            </span>
          </div>
          <span className="badge badge-blue text-xs font-semibold py-1 px-2.5">
            {totalInScope} record(s) in selected print scope
          </span>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Target Unit Scope */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Target Unit Scope:</label>
              <select
                value={scopeUnit}
                onChange={e => setScopeUnit(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
              >
                <option value="All">All Factory Units (Consolidated)</option>
                {scopedUnits.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Period Filter Tabs */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Period Filter:</label>
              <div className="flex p-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-xs">
                {(['All', 'Month', 'Year', 'Overdue', 'Custom'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer text-center ${
                      period === p
                        ? 'bg-[var(--brand)] text-white shadow-xs'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Scope */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Status Scope:</label>
              <select
                value={statusScope}
                onChange={e => setStatusScope(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
              >
                <option value="All">All Statuses</option>
                <option value="Valid">Valid</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* Type of License */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Type of License:</label>
              <select
                value={typeScope}
                onChange={e => setTypeScope(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] truncate"
              >
                <option value="All">All Types</option>
                {licenseTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Controls & Custom Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            {period === 'Custom' && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Custom Expiration Date Range:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                  <span className="text-xs text-[var(--color-text-tertiary)]">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Search Scope:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchScope}
                  onChange={e => setSearchScope(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Status Category:</label>
              <select
                value={catScope}
                onChange={e => setCatScope(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
              >
                <option value="All">All Categories</option>
                <option value="Renewal">Renewal (Periodic Expiry)</option>
                <option value="One-time">One-time (Permanent)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 py-1">
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={e => setIncludeSummary(e.target.checked)}
                  className="rounded border-[var(--color-border-secondary)] accent-[var(--brand)]"
                />
                Include type summary in print
              </label>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-2 flex-wrap sm:col-span-2 md:col-span-1 justify-end">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Print or Save as PDF via Browser"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={handleExportPdf}
                className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
                title="Export PDF Document"
              >
                <Download className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
                title="Export Excel Workbook"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Printable Area */}
      <div className="card" id="genPrintableArea">

        {includeSummary && totalInScope > 0 && (
          <div className="p-4 bg-[var(--color-background-secondary)]/40 border-b border-[var(--color-border-tertiary)] text-xs space-y-1">
            <div className="font-semibold text-[var(--color-text-primary)]">Summary Compliance Metrics:</div>
            <div className="text-[var(--color-text-secondary)]">
              Valid: <b className="text-[#3B6D11]">{vCount} ({pct(vCount, totalInScope)})</b> | Expiring Soon: <b className="text-[#854F0B]">{eCount} ({pct(eCount, totalInScope)})</b> | Expired: <b className="text-[#A32D2D]">{xCount} ({pct(xCount, totalInScope)})</b>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table className="blms-table">
            <thead>
              <tr>
                <th>L No</th>
                <th>Type</th>
                <th>Unit</th>
                <th>License Name</th>
                <th>Lic. No.</th>
                <th>Valid From</th>
                <th>Valid Till</th>
                <th>Status</th>
                <th>Status Category</th>
                <th>Comments</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                    No license records match the selected unit, period and status.
                  </td>
                </tr>
              ) : (
                filteredRows.map(l => {
                  const days = daysUntil(l.till);
                  const sc = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
                  const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);

                  const pillBg =
                    sc === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                    sc === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                    sc === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

                  return (
                    <tr key={l.id}>
                      <td className="text-[11px] font-mono text-[var(--color-text-secondary)]">{l.id}</td>
                      <td><span className="tag text-[10px]">{l.type}</span></td>
                      <td><span className="badge badge-blue">{l.company}</span></td>
                      <td className="font-semibold text-xs">{l.name}</td>
                      <td className="text-[11px] font-mono">{l.number || '-'}</td>
                      <td className="text-xs">{l.from || '-'}</td>
                      <td className="text-xs">{l.till || '-'}</td>
                      <td><span className={`status-pill ${pillBg} text-[10px]`}>{sl}</span></td>
                      <td><span className={`badge ${l.category === 'One-time' ? 'badge-amber' : 'badge-blue'} text-[10px]`}>{l.category === 'One-time' ? 'One-time (Permanent)' : 'Renewal (Periodic Expiry)'}</span></td>
                      <td className="text-xs max-w-[140px] truncate">{l.comments || '-'}</td>
                      <td><span className="badge badge-gray text-[10px]">{l.action || '-'}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
