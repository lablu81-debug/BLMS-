import React, { useState } from 'react';
import { Database, Plus, Search, Paperclip, X } from 'lucide-react';
import { LicenseEntry, UserAccount, AttachedDoc } from '../types';
import { daysUntil, statusColor, statusLabel } from '../utils/helpers';

interface MasterDataTabProps {
  licenses: LicenseEntry[];
  companies: string[];
  licenseTypes: string[];
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
  onNavigateToNewEntry: () => void;
  onViewDocs: (docs: AttachedDoc[], title: string) => void;
}

export const MasterDataTab: React.FC<MasterDataTabProps> = ({
  licenses,
  companies,
  licenseTypes,
  currentUser,
  globalAlertThreshold,
  licenseThresholds,
  onNavigateToNewEntry,
  onViewDocs
}) => {
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState('All');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');
  const [category, setCategory] = useState('All');

  const inScope = (comp: string) => currentUser.units === 'All' || currentUser.units.includes(comp);
  const myLicenses = licenses.filter(l => inScope(l.company));
  const scopedUnits = companies.filter(inScope);

  const filtered = myLicenses.filter(l => {
    if (unit !== 'All' && l.company !== unit) return false;
    if (type !== 'All' && l.type !== type) return false;
    if (category !== 'All' && l.category !== category) return false;

    const days = daysUntil(l.till);
    const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
    if (status !== 'All' && sl !== status) return false;

    if (search) {
      const q = search.toLowerCase();
      const match = [l.id, l.company, l.type, l.name, l.number, l.comments, l.action]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
      if (!match) return false;
    }

    return true;
  });

  const isFiltering = search || unit !== 'All' || type !== 'All' || status !== 'All' || category !== 'All';

  const clearFilters = () => {
    setSearch('');
    setUnit('All');
    setType('All');
    setStatus('All');
    setCategory('All');
  };

  const canAdd = currentUser.role === 'Administrator' || currentUser.role === 'Operator / Contributor';

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span className="card-title">
            <Database className="w-4 h-4 text-[var(--brand)]" />
            Master Data — Operations Registry ("Your Entries")
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search master data..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] w-[160px] focus:outline-hidden"
            />
          </div>

          {canAdd && (
            <button
              onClick={onNavigateToNewEntry}
              className="px-3 py-1 text-xs font-semibold rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="px-4 py-2 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/50 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-[var(--color-text-secondary)] font-medium">Filters:</span>

        <select
          value={unit}
          onChange={e => setUnit(e.target.value)}
          className="px-2 py-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
        >
          <option value="All">All Units</option>
          {scopedUnits.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-2 py-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] max-w-[150px] truncate"
        >
          <option value="All">All Types</option>
          {licenseTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-2 py-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
        >
          <option value="All">All Statuses</option>
          <option value="Valid">Valid</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Expired">Expired</option>
        </select>

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-2 py-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
        >
          <option value="All">All Categories</option>
          <option value="Renewal">Renewal (Periodic Expiry)</option>
          <option value="One-time">One-time (Permanent)</option>
        </select>

        {isFiltering && (
          <button
            onClick={clearFilters}
            className="px-2 py-0.5 rounded bg-[var(--color-background-tertiary)] hover:bg-[var(--color-border-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}

        <span className="ml-auto text-[11px] text-[var(--color-text-secondary)]">
          {filtered.length} record(s) listed
        </span>
      </div>

      <div className="table-wrap">
        <table className="blms-table">
          <thead>
            <tr>
              <th>L No</th>
              <th>Type</th>
              <th>Unit</th>
              <th>License Name</th>
              <th>Lic No</th>
              <th>Valid From</th>
              <th>Valid Till</th>
              <th>Status</th>
              <th>Status Category</th>
              <th>Comments</th>
              <th>Action</th>
              <th>Docs</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                  No records found in master registry.
                </td>
              </tr>
            ) : (
              filtered.map(l => {
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
                    <td>
                      {l.docs?.length ? (
                        <button
                          type="button"
                          onClick={() => onViewDocs(l.docs || [], `${l.name} (${l.id})`)}
                          className="px-2 py-0.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--brand)] flex items-center gap-1 cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{l.docs.length}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
