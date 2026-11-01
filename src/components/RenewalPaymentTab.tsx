import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ExternalLink,
  CheckCircle,
  Search,
  Filter,
  X,
  AlertTriangle,
  AlertOctagon,
  ArrowUpDown
} from 'lucide-react';
import { LicenseEntry, PaymentLink, UserAccount } from '../types';
import { daysUntil, statusColor, statusLabel } from '../utils/helpers';

interface RenewalPaymentTabProps {
  licenses: LicenseEntry[];
  paymentLinks: PaymentLink[];
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
}

export const RenewalPaymentTab: React.FC<RenewalPaymentTabProps> = ({
  licenses,
  paymentLinks,
  currentUser,
  globalAlertThreshold,
  licenseThresholds
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState<'All' | 'Expiring Soon' | 'Expired' | 'WithPortal' | 'NoPortal'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'expiry_asc' | 'expiry_desc' | 'company' | 'name' | 'type'>('expiry_asc');

  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);

  const getPortalForLicense = (type: string): PaymentLink | undefined => {
    return paymentLinks.find(p => p.types?.includes(type));
  };

  // Base licenses within authorized unit scope that are Expiring Soon or Expired
  const baseDueLicenses = useMemo(() => {
    return licenses
      .filter(l => inScope(l.company))
      .filter(l => {
        const days = daysUntil(l.till);
        const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
        return sl === 'Expiring Soon' || sl === 'Expired';
      });
  }, [licenses, currentUser.units, globalAlertThreshold, licenseThresholds]);

  // Distinct options for filters
  const availableUnits = useMemo(() => {
    return Array.from(new Set(licenses.filter(l => inScope(l.company)).map(l => l.company))).sort();
  }, [licenses, currentUser.units]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(baseDueLicenses.map(l => l.type))).sort();
  }, [baseDueLicenses]);

  // Overall counts for summary
  const totalDueCount = baseDueLicenses.length;
  const expiredDueCount = baseDueLicenses.filter(l => {
    const days = daysUntil(l.till);
    return statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds) === 'Expired';
  }).length;
  const expiringDueCount = totalDueCount - expiredDueCount;

  // Filtered and sorted licenses
  const filteredDue = useMemo(() => {
    const result = baseDueLicenses.filter(l => {
      // Unit filter
      if (unitFilter !== 'All' && l.company !== unitFilter) return false;

      // Type filter
      if (typeFilter !== 'All' && l.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'All' && l.category !== categoryFilter) return false;

      const days = daysUntil(l.till);
      const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
      const portal = getPortalForLicense(l.type);

      // Urgency / Portal filter
      if (urgencyFilter === 'Expiring Soon' && sl !== 'Expiring Soon') return false;
      if (urgencyFilter === 'Expired' && sl !== 'Expired') return false;
      if (urgencyFilter === 'WithPortal' && !portal) return false;
      if (urgencyFilter === 'NoPortal' && portal) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const portalName = portal?.name?.toLowerCase() || '';
        const match = [
          l.id,
          l.company,
          l.type,
          l.name,
          l.number,
          l.comments,
          l.action,
          portalName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
        if (!match) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const daysA = daysUntil(a.till) ?? 999999;
      const daysB = daysUntil(b.till) ?? 999999;

      if (sortBy === 'expiry_asc') return daysA - daysB;
      if (sortBy === 'expiry_desc') return daysB - daysA;
      if (sortBy === 'company') return a.company.localeCompare(b.company);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      return daysA - daysB;
    });

    return result;
  }, [
    baseDueLicenses,
    unitFilter,
    typeFilter,
    categoryFilter,
    urgencyFilter,
    searchQuery,
    sortBy,
    paymentLinks,
    globalAlertThreshold,
    licenseThresholds
  ]);

  const isFiltering =
    searchQuery !== '' ||
    unitFilter !== 'All' ||
    typeFilter !== 'All' ||
    urgencyFilter !== 'All' ||
    categoryFilter !== 'All' ||
    sortBy !== 'expiry_asc';

  const handleClearFilters = () => {
    setSearchQuery('');
    setUnitFilter('All');
    setTypeFilter('All');
    setUrgencyFilter('All');
    setCategoryFilter('All');
    setSortBy('expiry_asc');
  };

  return (
    <div className="card shadow-xs">
      {/* Header */}
      <div className="card-header flex-wrap gap-2.5">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[var(--brand)]" />
          <span className="card-title">Licenses Needing Renewal Payment</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-amber text-xs font-semibold py-1 px-2.5">
            {totalDueCount} license{totalDueCount !== 1 ? 's' : ''} due for renewal
          </span>
          {expiredDueCount > 0 && (
            <span className="badge bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800 text-xs font-semibold py-1 px-2 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3 text-red-600" />
              {expiredDueCount} expired
            </span>
          )}
          {expiringDueCount > 0 && (
            <span className="badge bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-semibold py-1 px-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              {expiringDueCount} expiring soon
            </span>
          )}
        </div>
      </div>

      {/* Guidance Sub-banner */}
      <div className="p-3 bg-[var(--color-background-secondary)]/50 border-b border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)]">
        Direct quick-access links to official government treasury & online fee payment portals for licenses approaching expiration or overdue.
      </div>

      {/* FILTERING CONTROLS TOOLBAR */}
      <div className="p-4 bg-[var(--color-background-primary)] border-b border-[var(--color-border-tertiary)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
          {/* 1. Search Query */}
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Search Licenses:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search name, L No, portal..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] focus:bg-[var(--color-background-primary)]"
              />
            </div>
          </div>

          {/* 2. Target Unit Scope */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Factory Unit:</label>
            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
            >
              <option value="All">All Units</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* 3. Type of License */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Type of License:</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] truncate"
            >
              <option value="All">All Types ({availableTypes.length})</option>
              {availableTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 4. Urgency & Payment Portal Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Urgency & Portal:</label>
            <select
              value={urgencyFilter}
              onChange={e => setUrgencyFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
            >
              <option value="All">All Due Statuses</option>
              <option value="Expired">Expired (Critical)</option>
              <option value="Expiring Soon">Expiring Soon (Urgent)</option>
              <option value="WithPortal">Portal Available</option>
              <option value="NoPortal">No Portal Linked</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Sort By:</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
            >
              <option value="expiry_asc">Expiry: Soonest / Overdue</option>
              <option value="expiry_desc">Expiry: Furthest First</option>
              <option value="company">Factory Unit (A-Z)</option>
              <option value="name">License Name (A-Z)</option>
              <option value="type">License Type (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter status & clear row */}
        <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            Showing <b className="text-[var(--color-text-primary)]">{filteredDue.length}</b> of{' '}
            <b className="text-[var(--color-text-primary)]">{totalDueCount}</b> renewal records needing payment
          </div>

          {isFiltering && (
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-tertiary)] text-[var(--color-text-primary)] flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <X className="w-3 h-3 text-red-500" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLE OF DUE LICENSES */}
      <div className="table-wrap">
        <table className="blms-table">
          <thead>
            <tr>
              <th>L No</th>
              <th>Unit</th>
              <th>License Name</th>
              <th>Type of License</th>
              <th>Valid Till</th>
              <th>Status</th>
              <th>Status Category</th>
              <th>Action Required</th>
              <th>Government Portal</th>
            </tr>
          </thead>
          <tbody>
            {filteredDue.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                  {isFiltering ? (
                    <div className="space-y-2">
                      <Filter className="w-6 h-6 text-[var(--color-text-tertiary)] mx-auto opacity-70" />
                      <div>No renewal payment records match your active filter criteria.</div>
                      <button
                        onClick={handleClearFilters}
                        className="text-xs font-semibold text-[var(--brand)] hover:underline cursor-pointer"
                      >
                        Reset all filters
                      </button>
                    </div>
                  ) : (
                    <div>
                      <CheckCircle className="w-6 h-6 text-[#3B6D11] mx-auto mb-2 opacity-80" />
                      No licenses are currently expiring or expired. All renewal payments are up to date!
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredDue.map(l => {
                const days = daysUntil(l.till);
                const sc = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
                const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
                const portal = getPortalForLicense(l.type);

                const pillBg =
                  sc === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                  sc === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                  sc === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

                const dayText =
                  days !== null
                    ? days < 0
                      ? `${Math.abs(days)}d overdue`
                      : `${days}d left`
                    : '';

                return (
                  <tr key={l.id} className="hover:bg-[var(--color-background-secondary)]/40 transition-colors">
                    <td className="text-[11px] font-mono text-[var(--color-text-secondary)] font-medium">
                      {l.id}
                    </td>
                    <td><span className="badge badge-blue">{l.company}</span></td>
                    <td>
                      <div className="font-semibold text-xs text-[var(--color-text-primary)]">
                        {l.name}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                        {l.number || 'No license number'}
                      </div>
                    </td>
                    <td><span className="tag text-[10px]">{l.type}</span></td>
                    <td className="text-xs font-mono font-medium">{l.till || '-'}</td>
                    <td>
                      <span className={`status-pill ${pillBg} text-[10px]`}>{sl}</span>
                      {dayText && (
                        <div className="text-[9px] text-[var(--color-text-secondary)] mt-0.5 font-medium">
                          {dayText}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${l.category === 'One-time' ? 'badge-amber' : 'badge-blue'} text-[10px]`}>
                        {l.category === 'One-time' ? 'One-time (Permanent)' : 'Renewal (Periodic Expiry)'}
                      </span>
                    </td>
                    <td><span className="badge badge-gray text-[10px]">{l.action || 'In Progress'}</span></td>
                    <td>
                      {portal ? (
                        <a
                          href={portal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-xs rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer shadow-2xs"
                          title={`Pay online via ${portal.name}`}
                        >
                          <span className="truncate max-w-[150px]">{portal.name.split('—')[0].trim()}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)] italic">
                          No portal linked
                        </span>
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
