import React, { useState, useMemo } from 'react';
import {
  Building,
  List,
  BarChart2,
  Truck,
  Search,
  Download,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  Layers,
  Grid,
  Table as TableIcon
} from 'lucide-react';
import { LicenseEntry, UserAccount, AttachedDoc } from '../types';
import {
  daysUntil,
  statusColor,
  statusLabel,
  pct,
  RAG,
  generatePdfBlob,
  downloadFile
} from '../utils/helpers';

interface DashboardTabProps {
  licenses: LicenseEntry[];
  companies: string[];
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
  onViewDocs: (docs: AttachedDoc[], title: string) => void;
  onEditLicense?: (license: LicenseEntry) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  licenses,
  companies,
  currentUser,
  globalAlertThreshold,
  licenseThresholds,
  onViewDocs
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'unit' | 'unit_type' | 'rag' | 'vehicle'>('unit_type');
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'All' | 'Valid' | 'Expiring Soon' | 'Expired'>('All');
  const [unitTypeViewMode, setUnitTypeViewMode] = useState<'matrix' | 'cards' | 'chart'>('matrix');
  const [unitTypeSelectedUnit, setUnitTypeSelectedUnit] = useState('All');

  // Unit scoping
  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const myLicenses = licenses.filter(l => inScope(l.company));

  // Filtered for table and views
  const filteredLicenses = myLicenses.filter(l => {
    if (unitFilter !== 'All' && l.company !== unitFilter) return false;
    if (typeFilter !== 'All' && l.type !== typeFilter) return false;
    if (categoryFilter !== 'All' && l.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = [l.id, l.company, l.type, l.name, l.number, l.comments, l.action, l.vNumber, l.vModel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Key KPI stats for general licenses
  const totalCount = myLicenses.length;
  const validCount = myLicenses.filter(l => {
    const d = daysUntil(l.till);
    const s = statusLabel(d, l.status, l.type, globalAlertThreshold, licenseThresholds);
    return s === 'Valid';
  }).length;
  const expiringCount = myLicenses.filter(l => {
    const d = daysUntil(l.till);
    const s = statusLabel(d, l.status, l.type, globalAlertThreshold, licenseThresholds);
    return s === 'Expiring Soon';
  }).length;
  const expiredCount = myLicenses.filter(l => {
    const d = daysUntil(l.till);
    const s = statusLabel(d, l.status, l.type, globalAlertThreshold, licenseThresholds);
    return s === 'Expired';
  }).length;
  const accessibleUnitsCount = companies.filter(inScope).length;

  // Distinct types for filter
  const distinctTypes = Array.from(new Set(myLicenses.map(l => l.type).filter(Boolean))).sort();

  // Unit-wise statistics calculation
  const scopedUnits = companies.filter(inScope);
  const unitStats = scopedUnits.map(comp => {
    const unitLics = myLicenses.filter(l => l.company === comp);
    let vN = 0, eN = 0, xN = 0;
    unitLics.forEach(l => {
      const d = daysUntil(l.till);
      const s = statusLabel(d, l.status, l.type, globalAlertThreshold, licenseThresholds);
      if (s === 'Expired') xN++;
      else if (s === 'Expiring Soon') eN++;
      else vN++;
    });
    return { company: comp, total: unitLics.length, validN: vN, expiringN: eN, expiredN: xN };
  });

  const grandTotal = unitStats.reduce(
    (acc, u) => ({
      total: acc.total + u.total,
      validN: acc.validN + u.validN,
      expiringN: acc.expiringN + u.expiringN,
      expiredN: acc.expiredN + u.expiredN
    }),
    { total: 0, validN: 0, expiringN: 0, expiredN: 0 }
  );



  // Unit-wise Types Matrix & Breakdown Data
  const unitTypeData = useMemo(() => {
    const units = scopedUnits;

    // Distinct types sorted by volume descending
    const typeTotalsMap: Record<string, number> = {};
    myLicenses.forEach(l => {
      typeTotalsMap[l.type] = (typeTotalsMap[l.type] || 0) + 1;
    });
    const sortedTypes = Array.from(new Set(myLicenses.map(l => l.type).filter(Boolean))).sort(
      (a, b) => (typeTotalsMap[b] || 0) - (typeTotalsMap[a] || 0)
    );

    // Matrix: [type][unit] -> { total, validN, expiringN, expiredN }
    const matrix: Record<string, Record<string, { total: number; validN: number; expiringN: number; expiredN: number }>> = {};
    const typeTotals: Record<string, { total: number; validN: number; expiringN: number; expiredN: number }> = {};
    const unitTotals: Record<string, { total: number; validN: number; expiringN: number; expiredN: number }> = {};

    units.forEach(u => {
      unitTotals[u] = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
    });

    sortedTypes.forEach(t => {
      matrix[t] = {};
      typeTotals[t] = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
      units.forEach(u => {
        matrix[t][u] = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
      });
    });

    myLicenses.forEach(l => {
      if (!matrix[l.type]) {
        matrix[l.type] = {};
        typeTotals[l.type] = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
        units.forEach(u => {
          matrix[l.type][u] = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
        });
      }
      if (!matrix[l.type][l.company]) {
        matrix[l.type][l.company] = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
      }
      if (!unitTotals[l.company]) {
        unitTotals[l.company] = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
      }

      const d = daysUntil(l.till);
      const s = statusLabel(d, l.status, l.type, globalAlertThreshold, licenseThresholds);

      const cell = matrix[l.type][l.company];
      cell.total++;
      typeTotals[l.type].total++;
      unitTotals[l.company].total++;

      if (s === 'Expired') {
        cell.expiredN++;
        typeTotals[l.type].expiredN++;
        unitTotals[l.company].expiredN++;
      } else if (s === 'Expiring Soon') {
        cell.expiringN++;
        typeTotals[l.type].expiringN++;
        unitTotals[l.company].expiringN++;
      } else {
        cell.validN++;
        typeTotals[l.type].validN++;
        unitTotals[l.company].validN++;
      }
    });

    // Grand totals
    const grand = { total: 0, validN: 0, expiringN: 0, expiredN: 0 };
    units.forEach(u => {
      grand.total += unitTotals[u].total;
      grand.validN += unitTotals[u].validN;
      grand.expiringN += unitTotals[u].expiringN;
      grand.expiredN += unitTotals[u].expiredN;
    });

    // List of types present in each unit
    const unitTypeDetails: Record<string, { type: string; total: number; validN: number; expiringN: number; expiredN: number }[]> = {};
    units.forEach(u => {
      unitTypeDetails[u] = sortedTypes
        .map(t => ({
          type: t,
          total: matrix[t]?.[u]?.total || 0,
          validN: matrix[t]?.[u]?.validN || 0,
          expiringN: matrix[t]?.[u]?.expiringN || 0,
          expiredN: matrix[t]?.[u]?.expiredN || 0
        }))
        .filter(item => item.total > 0);
    });

    return { units, sortedTypes, matrix, typeTotals, unitTotals, grand, unitTypeDetails };
  }, [myLicenses, scopedUnits, globalAlertThreshold, licenseThresholds]);

  // -------------------------------------------------------------
  // Vehicle Specific Statistics & Logic
  // -------------------------------------------------------------
  const vehicleLicenses = myLicenses.filter(l => l.type === 'Transport & Vehicle (BRTA)');

  const vehDocStatus = (dateStr?: string) => {
    const d = daysUntil(dateStr);
    if (d === null) return { k: 'none' as const, label: 'Not set', d: null };
    if (d < 0) return { k: 'red' as const, label: 'Expired', d };
    if (d <= globalAlertThreshold) return { k: 'amber' as const, label: 'Expiring', d };
    return { k: 'green' as const, label: 'Valid', d };
  };

  const vehOverall = (v: LicenseEntry): 'green' | 'amber' | 'red' | 'none' => {
    const docs = [v.vTaxToken, v.vFitness, v.vInsurance, v.vRoutePermit];
    const statuses = docs.map(vehDocStatus).map(s => s.k);
    if (statuses.includes('red')) return 'red';
    if (statuses.includes('amber')) return 'amber';
    if (statuses.includes('green')) return 'green';
    return 'none';
  };

  const totalVehicles = vehicleLicenses.length;
  const vehCounts = { green: 0, amber: 0, red: 0, none: 0 };
  vehicleLicenses.forEach(v => {
    const o = vehOverall(v);
    vehCounts[o]++;
  });

  const VEHICLE_DOCS: { key: keyof LicenseEntry; label: string }[] = [
    { key: 'vTaxToken', label: 'Tax Token' },
    { key: 'vFitness', label: 'Fitness' },
    { key: 'vInsurance', label: 'Insurance' },
    { key: 'vRoutePermit', label: 'Route Permit' }
  ];

  const docStats = VEHICLE_DOCS.map(item => {
    let validN = 0, expiringN = 0, expiredN = 0;
    vehicleLicenses.forEach(v => {
      const val = v[item.key] as string | undefined;
      const st = vehDocStatus(val);
      if (st.k === 'green') validN++;
      else if (st.k === 'amber') expiringN++;
      else if (st.k === 'red') expiredN++;
    });
    const totalWithDoc = validN + expiringN + expiredN;
    const unset = totalVehicles - totalWithDoc;
    return {
      label: item.label,
      validN,
      expiringN,
      expiredN,
      total: totalWithDoc,
      unset
    };
  });

  const unsets = docStats
    .filter(d => d.unset > 0)
    .map(d => `${d.unset} vehicle${d.unset === 1 ? ' has' : 's have'} no ${d.label} date`);

  const sortedVehicles = vehicleLicenses
    .slice()
    .sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2, none: 3 };
      return order[vehOverall(a)] - order[vehOverall(b)];
    })
    .filter(v => {
      if (vehicleStatusFilter === 'All') return true;
      const o = vehOverall(v);
      if (vehicleStatusFilter === 'Valid') return o === 'green';
      if (vehicleStatusFilter === 'Expiring Soon') return o === 'amber';
      if (vehicleStatusFilter === 'Expired') return o === 'red';
      return true;
    });

  // Export PDF Handler
  const handleDownloadDashboardPdf = () => {
    const columns = [
      'L No',
      'Unit',
      'Type',
      'License Name',
      'Lic No',
      'Valid Till',
      'Status',
      'Status Category',
      'Action'
    ];
    const rows = filteredLicenses.map(l => [
      l.id,
      l.company,
      l.type,
      l.name,
      l.number || '-',
      l.till || '-',
      statusLabel(daysUntil(l.till), l.status, l.type, globalAlertThreshold, licenseThresholds),
      l.category === 'One-time' ? 'One-time (Permanent)' : 'Renewal (Periodic Expiry)',
      l.action
    ]);

    const blob = generatePdfBlob({
      title: 'Bitopi Group — Business Licenses Monitoring Dashboard',
      metaLine: `Generated: ${new Date().toLocaleDateString('en-GB')} | Scope: ${unitFilter} | Total: ${filteredLicenses.length} record(s)`,
      summaryLines: [
        `Summary: Total: ${totalCount} | Valid: ${validCount} (${pct(validCount, totalCount)}) | Expiring: ${expiringCount} (${pct(expiringCount, totalCount)}) | Expired: ${expiredCount} (${pct(expiredCount, totalCount)})`
      ],
      columns,
      rows
    });

    if (blob) {
      downloadFile('BLMS_Dashboard_Summary.pdf', blob);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation Tabs */}
      <div className="dash-tabs flex gap-1.5 p-1 bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] rounded-xl overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveSubTab('unit')}
          className={`dash-tab flex items-center gap-2 px-4 py-2 text-xs rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'unit'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] font-semibold shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Unit-wise Summary</span>
        </button>
        <button
          onClick={() => setActiveSubTab('unit_type')}
          className={`dash-tab flex items-center gap-2 px-4 py-2 text-xs rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'unit_type'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] font-semibold shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Unit-wise Types of License</span>
        </button>
        <button
          onClick={() => setActiveSubTab('rag')}
          className={`dash-tab flex items-center gap-2 px-4 py-2 text-xs rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'rag'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] font-semibold shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Status % (Green, Amber, Red)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('vehicle')}
          className={`dash-tab flex items-center gap-2 px-4 py-2 text-xs rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'vehicle'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] font-semibold shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Vehicle Status</span>
        </button>
      </div>

      {/* KPI Top Cards (When on Vehicle Status: Shows 4 Vehicle Specific KPI Cards) */}
      {activeSubTab === 'vehicle' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--color-background-primary)] p-4 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] text-[var(--color-text-secondary)] font-medium">Total vehicles</div>
            <div className="text-2xl font-bold mt-1 text-[var(--color-text-primary)] tabular-nums">
              {totalVehicles}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">100% of vehicles</div>
          </div>
          <div className="bg-[var(--color-background-primary)] p-4 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] text-[var(--color-text-secondary)] font-medium">Valid</div>
            <div className="text-2xl font-bold mt-1 text-[#3B6D11] tabular-nums">
              {vehCounts.green}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
              {pct(vehCounts.green, totalVehicles)} of vehicles
            </div>
          </div>
          <div className="bg-[var(--color-background-primary)] p-4 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] text-[var(--color-text-secondary)] font-medium">Expiring soon</div>
            <div className="text-2xl font-bold mt-1 text-[#854F0B] tabular-nums">
              {vehCounts.amber}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
              {pct(vehCounts.amber, totalVehicles)} of vehicles
            </div>
          </div>
          <div className="bg-[var(--color-background-primary)] p-4 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] text-[var(--color-text-secondary)] font-medium">Expired</div>
            <div className="text-2xl font-bold mt-1 text-[#A32D2D] tabular-nums">
              {vehCounts.red}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
              {pct(vehCounts.red, totalVehicles)} of vehicles
            </div>
          </div>
        </div>
      ) : (
        /* Standard General KPI Cards for other tabs */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="bg-[var(--color-background-primary)] p-3.5 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Total Licenses</div>
            <div className="text-2xl font-bold mt-1 text-[var(--color-text-primary)] tabular-nums">{totalCount}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Across {accessibleUnitsCount} unit(s)</div>
          </div>
          <div className="bg-[var(--color-background-primary)] p-3.5 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] font-semibold text-[#3B6D11] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid & Compliant
            </div>
            <div className="text-2xl font-bold mt-1 text-[#3B6D11] tabular-nums">{validCount}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{pct(validCount, totalCount)} of total</div>
          </div>
          <div className="bg-[var(--color-background-primary)] p-3.5 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] font-semibold text-[#854F0B] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Expiring Soon
            </div>
            <div className="text-2xl font-bold mt-1 text-[#854F0B] tabular-nums">{expiringCount}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Within {globalAlertThreshold} days window</div>
          </div>
          <div className="bg-[var(--color-background-primary)] p-3.5 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs">
            <div className="text-[11px] font-semibold text-[#A32D2D] flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Expired / Critical
            </div>
            <div className="text-2xl font-bold mt-1 text-[#A32D2D] tabular-nums">{expiredCount}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{pct(expiredCount, totalCount)} overdue</div>
          </div>
          <div className="bg-[var(--color-background-primary)] p-3.5 rounded-lg border border-[var(--color-border-tertiary)] shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Factory Units</div>
            <div className="text-2xl font-bold mt-1 text-[var(--brand)] tabular-nums">{accessibleUnitsCount}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">Bitopi manufacturing base</div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Subtab 4: VEHICLE STATUS (Matching user uploaded screenshot)  */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'vehicle' && (
        <div className="card">
          {/* Card Header with Legend */}
          <div className="card-header">
            <span className="card-title text-sm font-semibold text-[var(--color-text-primary)]">
              Vehicle Status — Tax Token, Fitness, Insurance, Route Permit
            </span>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#3B6D11]" /> Green — Valid
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#854F0B]" /> Amber — Expiring
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#A32D2D]" /> Red — Expired
              </span>
            </div>
          </div>

          {/* Centered High-Fidelity Bar Chart */}
          <div className="p-6 overflow-x-auto flex justify-center bg-[var(--color-background-primary)]">
            <svg
              viewBox="0 0 540 250"
              width="540"
              height="250"
              className="max-w-full overflow-visible select-none"
              role="img"
              aria-label="Vehicle document compliance status bar chart"
            >
              {/* Horizontal gridlines & Y-axis labels */}
              {[
                { v: 100, y: 35 },
                { v: 75, y: 77.5 },
                { v: 50, y: 120 },
                { v: 25, y: 162.5 },
                { v: 0, y: 205 }
              ].map(tick => (
                <g key={tick.v}>
                  <line
                    x1="45"
                    y1={tick.y}
                    x2="520"
                    y2={tick.y}
                    stroke="var(--color-border-tertiary)"
                    strokeWidth="0.8"
                  />
                  <text
                    x="40"
                    y={tick.y + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    fill="var(--color-text-secondary)"
                  >
                    {tick.v}%
                  </text>
                </g>
              ))}

              {/* Baseline axis */}
              <line
                x1="45"
                y1="205"
                x2="520"
                y2="205"
                stroke="var(--color-border-secondary)"
                strokeWidth="1.2"
              />

              {/* Clusters for each of the 4 document categories */}
              {docStats.map((item, i) => {
                const clusterW = 68;
                const clusterGap = 48;
                const cx = 60 + i * (clusterW + clusterGap);
                const baseY = 205;
                const maxBarH = 170;
                const barW = 20;

                const tot = item.total || 1;
                const vP = item.total ? (item.validN / tot) * 100 : 0;
                const eP = item.total ? (item.expiringN / tot) * 100 : 0;
                const xP = item.total ? (item.expiredN / tot) * 100 : 0;

                const vH = (vP / 100) * maxBarH;
                const eH = (eP / 100) * maxBarH;
                const xH = (xP / 100) * maxBarH;

                const formatLabel = (p: number) => {
                  const rounded = Math.round(p * 10) / 10;
                  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
                };

                return (
                  <g key={item.label}>
                    {/* Green Bar (Valid) */}
                    <g>
                      {vH > 0 && (
                        <rect
                          x={cx}
                          y={baseY - vH}
                          width={barW}
                          height={vH}
                          rx="2"
                          fill="#3B6D11"
                        />
                      )}
                      <text
                        x={cx + barW / 2}
                        y={vH > 0 ? baseY - vH - 5 : baseY - 5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="var(--color-text-primary)"
                      >
                        {formatLabel(vP)}
                      </text>
                    </g>

                    {/* Amber Bar (Expiring) */}
                    <g>
                      {eH > 0 && (
                        <rect
                          x={cx + 24}
                          y={baseY - eH}
                          width={barW}
                          height={eH}
                          rx="2"
                          fill="#854F0B"
                        />
                      )}
                      <text
                        x={cx + 24 + barW / 2}
                        y={eH > 0 ? baseY - eH - 5 : baseY - 5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="var(--color-text-primary)"
                      >
                        {formatLabel(eP)}
                      </text>
                    </g>

                    {/* Red Bar (Expired) */}
                    <g>
                      {xH > 0 && (
                        <rect
                          x={cx + 48}
                          y={baseY - xH}
                          width={barW}
                          height={xH}
                          rx="2"
                          fill="#A32D2D"
                        />
                      )}
                      <text
                        x={cx + 48 + barW / 2}
                        y={xH > 0 ? baseY - xH - 5 : baseY - 5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="var(--color-text-primary)"
                      >
                        {formatLabel(xP)}
                      </text>
                    </g>

                    {/* Cluster Labels */}
                    <text
                      x={cx + 34}
                      y="222"
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="bold"
                      fill="var(--color-text-primary)"
                    >
                      {item.label}
                    </text>
                    <text
                      x={cx + 34}
                      y="235"
                      textAnchor="middle"
                      fontSize="9"
                      fill="var(--color-text-secondary)"
                    >
                      {item.total} vehicles
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Subtext explanation directly below chart */}
          <div className="px-6 pb-4 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            Each bar shows the share of vehicles whose document is valid, expiring (within {globalAlertThreshold} days) or expired.
            {unsets.length > 0 && ` ${unsets.join('. ')}.`}
          </div>

          {/* License Status — % Green, Amber and Red Segmented Strip & Cards */}
          <div className="px-6 py-4 border-t border-[var(--color-border-tertiary)] space-y-3">
            <div className="flex justify-between items-baseline flex-wrap gap-2">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                License Status — % Green, Amber and Red
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] font-normal">
                {totalCount} licenses
              </span>
            </div>

            {/* Continuous horizontal segmented bar */}
            <div
              className="h-2.5 w-full bg-[var(--color-background-secondary)] rounded-full overflow-hidden flex shadow-xs"
              role="img"
              aria-label={`Green ${pct(validCount, totalCount)}, Amber ${pct(expiringCount, totalCount)}, Red ${pct(expiredCount, totalCount)}`}
            >
              <div
                style={{ width: `${(validCount / (totalCount || 1)) * 100}%` }}
                className="bg-[#3B6D11]"
                title={`Green: ${pct(validCount, totalCount)}`}
              />
              <div
                style={{ width: `${(expiringCount / (totalCount || 1)) * 100}%` }}
                className="bg-[#854F0B]"
                title={`Amber: ${pct(expiringCount, totalCount)}`}
              />
              <div
                style={{ width: `${(expiredCount / (totalCount || 1)) * 100}%` }}
                className="bg-[#A32D2D]"
                title={`Red: ${pct(expiredCount, totalCount)}`}
              />
            </div>

            {/* 3 Summary Cards underneath */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B6D11] shrink-0" />
                <div>
                  <div className="text-[11px] text-[var(--color-text-secondary)] font-medium">Green — Active</div>
                  <div className="text-sm font-bold text-[#3B6D11] tabular-nums mt-0.5">
                    {pct(validCount, totalCount)}{' '}
                    <span className="text-[11px] font-normal text-[var(--color-text-secondary)]">
                      {validCount} of {totalCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#854F0B] shrink-0" />
                <div>
                  <div className="text-[11px] text-[var(--color-text-secondary)] font-medium">Amber — Action Required</div>
                  <div className="text-sm font-bold text-[#854F0B] tabular-nums mt-0.5">
                    {pct(expiringCount, totalCount)}{' '}
                    <span className="text-[11px] font-normal text-[var(--color-text-secondary)]">
                      {expiringCount} of {totalCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A32D2D] shrink-0" />
                <div>
                  <div className="text-[11px] text-[var(--color-text-secondary)] font-medium">Red — Critical</div>
                  <div className="text-sm font-bold text-[#A32D2D] tabular-nums mt-0.5">
                    {pct(expiredCount, totalCount)}{' '}
                    <span className="text-[11px] font-normal text-[var(--color-text-secondary)]">
                      {expiredCount} of {totalCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Filter Pills Row */}
          <div className="px-6 py-2.5 border-t border-[var(--color-border-tertiary)] flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] mr-1">Status:</span>
            {(['All', 'Valid', 'Expiring Soon', 'Expired'] as const).map(s => {
              const isActive = vehicleStatusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setVehicleStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer font-medium ${
                    isActive
                      ? 'bg-[var(--brand-light)] text-[var(--brand)] border border-[var(--brand-text)] font-semibold'
                      : 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] hover:bg-[var(--color-background-secondary)]'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Vehicle Table */}
          <div className="table-wrap">
            <table className="blms-table">
              <thead>
                <tr>
                  <th>Vehicle No.</th>
                  <th>Model</th>
                  <th>Unit</th>
                  <th>Tax Token</th>
                  <th>Fitness</th>
                  <th>Insurance</th>
                  <th>Route Permit</th>
                  <th>Registration call</th>
                  <th>Route permit call</th>
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {sortedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                      No vehicles found matching current filter ({vehicleStatusFilter}).
                    </td>
                  </tr>
                ) : (
                  sortedVehicles.map(v => {
                    const overall = vehOverall(v);
                    const overallLabel =
                      overall === 'green' ? 'Valid' :
                      overall === 'amber' ? 'Expiring' :
                      overall === 'red' ? 'Expired' : 'No dates';

                    const overallPillCls =
                      overall === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                      overall === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                      overall === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

                    const renderDocCell = (dateStr?: string) => {
                      if (!dateStr) {
                        return <span className="text-[var(--color-text-tertiary)] font-sans text-xs">—</span>;
                      }
                      const st = vehDocStatus(dateStr);
                      const bg =
                        st.k === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                        st.k === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                        st.k === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

                      const subtextColor =
                        st.k === 'green' ? 'text-[#3B6D11]' :
                        st.k === 'amber' ? 'text-[#854F0B]' : 'text-[#A32D2D]';

                      const daysText = st.d !== null ? (st.d < 0 ? `${Math.abs(st.d)}d ago` : `${st.d}d left`) : '';

                      return (
                        <div className="space-y-0.5">
                          <span className={`status-pill ${bg} text-[10px]`}>
                            {st.label}
                          </span>
                          <div className={`text-[10px] ${subtextColor} font-medium tracking-tight`}>
                            {dateStr} {daysText ? `· ${daysText}` : ''}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <tr key={v.id}>
                        <td className="font-bold text-xs text-[var(--color-text-primary)] whitespace-nowrap">
                          {v.vNumber || v.number}
                        </td>
                        <td className="text-xs text-[var(--color-text-primary)]">
                          {v.vModel || '-'}
                        </td>
                        <td>
                          <span className="badge badge-blue font-bold">{v.company}</span>
                        </td>
                        <td>{renderDocCell(v.vTaxToken)}</td>
                        <td>{renderDocCell(v.vFitness)}</td>
                        <td>{renderDocCell(v.vInsurance)}</td>
                        <td>{renderDocCell(v.vRoutePermit)}</td>
                        <td className="text-xs text-[var(--color-text-primary)]">
                          {v.vRegCall || '—'}
                        </td>
                        <td className="text-xs text-[var(--color-text-primary)]">
                          {v.vRoutePermitCall || '-'}
                        </td>
                        <td>
                          <span className={`status-pill ${overallPillCls} text-[10px]`}>
                            {overallLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Subtab 1: Unit-wise Summary                                   */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'unit' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Unit-wise License Status — Management Summary</span>
            <div className="flex gap-3 text-[11px] text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#3B6D11]" /> Valid</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#854F0B]" /> Expiring</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#A32D2D]" /> Expired</span>
            </div>
          </div>

          <div className="p-4 overflow-x-auto flex justify-center bg-[var(--color-background-secondary)]/30">
            <svg width={Math.max(500, unitStats.length * 90 + 80)} height="220" className="max-w-full">
              {[0, 20, 40, 60, 80, 100].map(v => {
                const y = 180 - (v / 100) * 150;
                return (
                  <g key={v}>
                    <line x1="40" y1={y} x2={unitStats.length * 90 + 60} y2={y} stroke="var(--color-border-tertiary)" strokeDasharray="2 2" />
                    <text x="32" y={y + 3} textAnchor="end" fontSize="9" fill="var(--color-text-tertiary)">{v}%</text>
                  </g>
                );
              })}

              {unitStats.map((u, i) => {
                const cx = 55 + i * 90;
                const total = u.total || 1;
                const vPct = (u.validN / total) * 100;
                const ePct = (u.expiringN / total) * 100;
                const xPct = (u.expiredN / total) * 100;

                const vH = (vPct / 100) * 150;
                const eH = (ePct / 100) * 150;
                const xH = (xPct / 100) * 150;

                return (
                  <g key={u.company}>
                    <rect x={cx} y={180 - vH} width="16" height={Math.max(2, vH)} rx="2" fill="#3B6D11" />
                    {u.validN > 0 && (
                      <text x={cx + 8} y={175 - vH} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--color-text-primary)">
                        {u.validN}
                      </text>
                    )}

                    <rect x={cx + 20} y={180 - eH} width="16" height={Math.max(2, eH)} rx="2" fill="#854F0B" />
                    {u.expiringN > 0 && (
                      <text x={cx + 28} y={175 - eH} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--color-text-primary)">
                        {u.expiringN}
                      </text>
                    )}

                    <rect x={cx + 40} y={180 - xH} width="16" height={Math.max(2, xH)} rx="2" fill="#A32D2D" />
                    {u.expiredN > 0 && (
                      <text x={cx + 48} y={175 - xH} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--color-text-primary)">
                        {u.expiredN}
                      </text>
                    )}

                    <text x={cx + 28} y="196" textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--color-text-primary)">
                      {u.company}
                    </text>
                    <text x={cx + 28} y="208" textAnchor="middle" fontSize="9" fill="var(--color-text-secondary)">
                      {u.total} total
                    </text>
                  </g>
                );
              })}
              <line x1="40" y1="180" x2={unitStats.length * 90 + 60} y2="180" stroke="var(--color-border-secondary)" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="table-wrap border-t border-[var(--color-border-tertiary)]">
            <table className="blms-table">
              <thead>
                <tr>
                  <th>Factory Unit</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Valid %</th>
                  <th className="text-right">Expiring %</th>
                  <th className="text-right">Expired %</th>
                </tr>
              </thead>
              <tbody>
                {unitStats.map(u => (
                  <tr key={u.company}>
                    <td className="font-semibold text-xs">
                      <span className="badge badge-blue">{u.company}</span>
                    </td>
                    <td className="text-right tabular-nums">{u.total}</td>
                    <td className="text-right tabular-nums text-[#3B6D11] font-semibold">
                      {pct(u.validN, u.total)} <span className="text-[10px] text-[var(--color-text-tertiary)]">({u.validN})</span>
                    </td>
                    <td className="text-right tabular-nums text-[#854F0B] font-semibold">
                      {pct(u.expiringN, u.total)} <span className="text-[10px] text-[var(--color-text-tertiary)]">({u.expiringN})</span>
                    </td>
                    <td className="text-right tabular-nums text-[#A32D2D] font-semibold">
                      {pct(u.expiredN, u.total)} <span className="text-[10px] text-[var(--color-text-tertiary)]">({u.expiredN})</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[var(--color-background-secondary)] font-bold border-t border-[var(--color-border-secondary)]">
                  <td>All Units Consolidated</td>
                  <td className="text-right tabular-nums">{grandTotal.total}</td>
                  <td className="text-right tabular-nums text-[#3B6D11]">
                    {pct(grandTotal.validN, grandTotal.total)} ({grandTotal.validN})
                  </td>
                  <td className="text-right tabular-nums text-[#854F0B]">
                    {pct(grandTotal.expiringN, grandTotal.total)} ({grandTotal.expiringN})
                  </td>
                  <td className="text-right tabular-nums text-[#A32D2D]">
                    {pct(grandTotal.expiredN, grandTotal.total)} ({grandTotal.expiredN})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* ------------------------------------------------------------- */}
      {/* Subtab: Unit-wise Types of License                            */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'unit_type' && (
        <div className="card shadow-xs space-y-4">
          {/* Header & Controls Toolbar */}
          <div className="p-4 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 rounded-t-lg flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[var(--brand)]" />
                <h3 className="card-title text-base">Unit-wise Types of License — Distribution & Compliance Matrix</h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Comprehensive matrix mapping license classifications across all Bitopi Group factory units.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Unit focus dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-[var(--color-text-secondary)]">Focus Unit:</span>
                <select
                  value={unitTypeSelectedUnit}
                  onChange={e => setUnitTypeSelectedUnit(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-medium"
                >
                  <option value="All">All Factory Units (Consolidated)</option>
                  {scopedUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="inline-flex rounded-md p-0.5 bg-[var(--color-background-secondary)] border border-[var(--color-border-secondary)] text-xs">
                <button
                  type="button"
                  onClick={() => setUnitTypeViewMode('matrix')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                    unitTypeViewMode === 'matrix'
                      ? 'bg-[var(--brand)] text-white shadow-xs font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title="Cross-matrix table"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Matrix View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnitTypeViewMode('cards')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                    unitTypeViewMode === 'cards'
                      ? 'bg-[var(--brand)] text-white shadow-xs font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title="Unit Cards breakdown"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Unit Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnitTypeViewMode('chart')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                    unitTypeViewMode === 'chart'
                      ? 'bg-[var(--brand)] text-white shadow-xs font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title="Stacked Unit Distribution Chart"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Distribution Chart</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter notice banner */}
          {(unitFilter !== 'All' || typeFilter !== 'All') && (
            <div className="mx-4 p-2.5 rounded-lg bg-[var(--brand-light)] border border-[var(--brand)]/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>
                  Active table filter: {unitFilter !== 'All' && <b>Unit: {unitFilter}</b>}
                  {unitFilter !== 'All' && typeFilter !== 'All' && ' • '}
                  {typeFilter !== 'All' && <b>Type: {typeFilter}</b>}
                </span>
              </div>
              <button
                onClick={() => { setUnitFilter('All'); setTypeFilter('All'); }}
                className="px-2 py-0.5 rounded bg-white text-[var(--brand)] border border-[var(--brand)]/30 font-semibold text-[11px] cursor-pointer hover:bg-[var(--brand)] hover:text-white transition-colors"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* VIEW 1: Cross-Tab Matrix (Pivot Table) */}
          {unitTypeViewMode === 'matrix' && (
            <div className="p-4 pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-4 text-[11px]">
                  <span>Legend:</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B6D11]" /> All Valid
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#854F0B]" /> Expiring Soon
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A32D2D]" /> Expired
                  </span>
                </div>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  Click any cell count to view its license records below
                </span>
              </div>

              <div className="table-wrap border border-[var(--color-border-tertiary)] rounded-lg overflow-x-auto">
                <table className="blms-table">
                  <thead>
                    <tr>
                      <th className="min-w-[220px]">Type of License</th>
                      {unitTypeData.units.map(u => (
                        <th
                          key={u}
                          className={`text-center min-w-[75px] ${
                            unitTypeSelectedUnit === u ? 'bg-[var(--brand-light)] font-bold text-[var(--brand)]' : ''
                          }`}
                        >
                          {u}
                        </th>
                      ))}
                      <th className="text-center min-w-[85px] bg-[var(--color-background-secondary)]">Total</th>
                      <th className="min-w-[150px]">Compliance Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitTypeData.sortedTypes.map(t => {
                      const typeTot = unitTypeData.typeTotals[t];
                      const isTypeFiltered = typeFilter === t;

                      return (
                        <tr
                          key={t}
                          className={isTypeFiltered ? 'bg-[var(--brand-light)]/40 font-semibold' : ''}
                        >
                          <td className="font-semibold text-xs text-[var(--color-text-primary)]">
                            <button
                              onClick={() => {
                                setTypeFilter(typeFilter === t ? 'All' : t);
                                if (unitTypeSelectedUnit !== 'All') setUnitFilter(unitTypeSelectedUnit);
                              }}
                              className="hover:text-[var(--brand)] text-left cursor-pointer transition-colors flex items-center gap-1.5"
                              title="Filter records table by this type"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
                              <span>{t}</span>
                            </button>
                          </td>

                          {unitTypeData.units.map(u => {
                            const cell = unitTypeData.matrix[t]?.[u];
                            const isSelectedCell = unitFilter === u && typeFilter === t;
                            const isFocusUnit = unitTypeSelectedUnit === u;

                            if (!cell || cell.total === 0) {
                              return (
                                <td
                                  key={u}
                                  className={`text-center text-[var(--color-text-tertiary)] text-xs ${
                                    isFocusUnit ? 'bg-[var(--brand-light)]/20' : ''
                                  }`}
                                >
                                  —
                                </td>
                              );
                            }

                            const badgeCls =
                              cell.expiredN > 0
                                ? 'bg-[#FCEBEB] text-[#A32D2D] border border-red-200 hover:bg-red-200'
                                : cell.expiringN > 0
                                ? 'bg-[#FAEEDA] text-[#854F0B] border border-amber-200 hover:bg-amber-200'
                                : 'bg-[#EAF3DE] text-[#3B6D11] border border-green-200 hover:bg-green-200';

                            return (
                              <td
                                key={u}
                                className={`text-center ${isFocusUnit ? 'bg-[var(--brand-light)]/20' : ''}`}
                              >
                                <button
                                  onClick={() => {
                                    setUnitFilter(u);
                                    setTypeFilter(t);
                                  }}
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${badgeCls} ${
                                    isSelectedCell ? 'ring-2 ring-[var(--brand)] ring-offset-1 scale-105' : ''
                                  }`}
                                  title={`${u} • ${t}: ${cell.total} record(s) (${cell.validN} Valid, ${cell.expiringN} Expiring, ${cell.expiredN} Expired). Click to filter.`}
                                >
                                  {cell.total}
                                </button>
                              </td>
                            );
                          })}

                          {/* Total for this type */}
                          <td className="text-center font-bold text-xs tabular-nums text-[var(--color-text-primary)] bg-[var(--color-background-secondary)]/50">
                            <button
                              onClick={() => {
                                setTypeFilter(t);
                                setUnitFilter('All');
                              }}
                              className="hover:text-[var(--brand)] cursor-pointer"
                              title="Filter all units for this type"
                            >
                              {typeTot.total}
                            </button>
                          </td>

                          {/* Mini Compliance Stacked Bar */}
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 bg-[var(--color-border-tertiary)] rounded-full overflow-hidden flex">
                                {typeTot.validN > 0 && (
                                  <div
                                    style={{ width: `${(typeTot.validN / typeTot.total) * 100}%` }}
                                    className="bg-[#3B6D11]"
                                    title={`Valid: ${typeTot.validN}`}
                                  />
                                )}
                                {typeTot.expiringN > 0 && (
                                  <div
                                    style={{ width: `${(typeTot.expiringN / typeTot.total) * 100}%` }}
                                    className="bg-[#854F0B]"
                                    title={`Expiring: ${typeTot.expiringN}`}
                                  />
                                )}
                                {typeTot.expiredN > 0 && (
                                  <div
                                    style={{ width: `${(typeTot.expiredN / typeTot.total) * 100}%` }}
                                    className="bg-[#A32D2D]"
                                    title={`Expired: ${typeTot.expiredN}`}
                                  />
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--color-text-secondary)] font-mono tabular-nums shrink-0">
                                {pct(typeTot.validN, typeTot.total)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Consolidated Summary Row */}
                    <tr className="bg-[var(--color-background-secondary)] font-bold text-xs border-t-2 border-[var(--color-border-secondary)]">
                      <td className="font-extrabold text-[var(--color-text-primary)]">
                        Total Licenses by Unit
                      </td>
                      {unitTypeData.units.map(u => (
                        <td key={u} className="text-center tabular-nums font-extrabold text-[var(--color-text-primary)]">
                          <button
                            onClick={() => {
                              setUnitFilter(u);
                              setTypeFilter('All');
                            }}
                            className="hover:text-[var(--brand)] cursor-pointer text-xs"
                            title={`Filter records for all types in ${u}`}
                          >
                            {unitTypeData.unitTotals[u].total}
                          </button>
                        </td>
                      ))}
                      <td className="text-center tabular-nums font-extrabold text-[var(--brand)] text-sm bg-[var(--color-background-secondary)]">
                        {unitTypeData.grand.total}
                      </td>
                      <td>
                        <span className="text-[11px] text-[#3B6D11] font-bold">
                          {pct(unitTypeData.grand.validN, unitTypeData.grand.total)} Valid ({unitTypeData.grand.validN}/{unitTypeData.grand.total})
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: Unit Cards Breakdown */}
          {unitTypeViewMode === 'cards' && (
            <div className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitTypeData.units
                  .filter(u => unitTypeSelectedUnit === 'All' || unitTypeSelectedUnit === u)
                  .map(unit => {
                    const uTotals = unitTypeData.unitTotals[unit];
                    const typesInUnit = unitTypeData.unitTypeDetails[unit] || [];

                    return (
                      <div
                        key={unit}
                        className="p-4 rounded-xl border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] shadow-2xs space-y-3"
                      >
                        {/* Unit Card Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-tertiary)]">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-blue font-extrabold text-xs px-2.5 py-0.5">{unit}</span>
                            <div>
                              <div className="font-bold text-xs text-[var(--color-text-primary)]">
                                {unit === 'TAL' ? 'Tarashima Apparels Ltd.' :
                                 unit === 'BGL' ? 'Bitopi Group Ltd.' :
                                 unit === 'RHL' ? 'Rupashi Holdings Ltd.' :
                                 unit === 'MISAMI' ? 'Misami Garments Ltd.' :
                                 unit === 'CORP' ? 'Corporate Headquarters' : unit}
                              </div>
                              <div className="text-[10px] text-[var(--color-text-tertiary)]">
                                {typesInUnit.length} license classification(s)
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-extrabold text-[var(--color-text-primary)] tabular-nums">
                              {uTotals.total}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-tertiary)]">
                              {pct(uTotals.total, unitTypeData.grand.total)} of group
                            </div>
                          </div>
                        </div>

                        {/* Mini Unit Compliance Pills */}
                        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                          <div className="p-1 rounded bg-[#EAF3DE]/60 border border-green-200">
                            <div className="text-[10px] text-[#3B6D11] font-medium">Valid</div>
                            <div className="font-bold text-[#3B6D11] tabular-nums">{uTotals.validN}</div>
                          </div>
                          <div className="p-1 rounded bg-[#FAEEDA]/60 border border-amber-200">
                            <div className="text-[10px] text-[#854F0B] font-medium">Expiring</div>
                            <div className="font-bold text-[#854F0B] tabular-nums">{uTotals.expiringN}</div>
                          </div>
                          <div className="p-1 rounded bg-[#FCEBEB]/60 border border-red-200">
                            <div className="text-[10px] text-[#A32D2D] font-medium">Expired</div>
                            <div className="font-bold text-[#A32D2D] tabular-nums">{uTotals.expiredN}</div>
                          </div>
                        </div>

                        {/* List of Types in this unit */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Active License Types:
                          </div>
                          <div className="divide-y divide-[var(--color-border-tertiary)] max-h-[220px] overflow-y-auto">
                            {typesInUnit.map(item => (
                              <div
                                key={item.type}
                                onClick={() => {
                                  setUnitFilter(unit);
                                  setTypeFilter(item.type);
                                }}
                                className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-[var(--color-background-secondary)]/50 rounded cursor-pointer transition-colors text-xs"
                                title={`Click to filter ${unit} • ${item.type}`}
                              >
                                <div className="truncate font-medium text-[var(--color-text-primary)]">
                                  {item.type}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.validN > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-green-100 text-green-800">
                                      {item.validN}V
                                    </span>
                                  )}
                                  {item.expiringN > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                      {item.expiringN}E
                                    </span>
                                  )}
                                  {item.expiredN > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                                      {item.expiredN}X
                                    </span>
                                  )}
                                  <span className="text-xs font-extrabold text-[var(--color-text-primary)] tabular-nums ml-1">
                                    {item.total}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Filter by unit button */}
                        <button
                          onClick={() => {
                            setUnitFilter(unit);
                            setTypeFilter('All');
                          }}
                          className="w-full py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] text-[var(--color-text-secondary)] font-medium transition-colors cursor-pointer"
                        >
                          View all {uTotals.total} licenses in {unit}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* VIEW 3: Comparative Stacked Distribution Chart */}
          {unitTypeViewMode === 'chart' && (
            <div className="p-4 pt-0 space-y-3">
              {/* Chart Legend */}
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-[var(--color-text-secondary)]">Factory Units:</span>
                  {unitTypeData.units.map((u, i) => {
                    const colors = ['#1D4ED8', '#0D9488', '#4F46E5', '#9333EA', '#D97706'];
                    const color = colors[i % colors.length];
                    return (
                      <span key={u} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: color }} />
                        <span>{u}</span>
                      </span>
                    );
                  })}
                </div>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  Comparative volume of each license classification across units
                </span>
              </div>

              {/* Stacked Chart SVG */}
              <div className="overflow-x-auto pb-4 flex justify-center bg-[var(--color-background-secondary)]/20 rounded-lg p-4 border border-[var(--color-border-tertiary)]">
                {(() => {
                  const unitColors: Record<string, string> = {
                    TAL: '#1D4ED8',
                    BGL: '#0D9488',
                    RHL: '#4F46E5',
                    MISAMI: '#9333EA',
                    CORP: '#D97706'
                  };

                  const maxTot = Math.max(...unitTypeData.sortedTypes.map(t => unitTypeData.typeTotals[t].total), 1);
                  const yMax = Math.max(Math.ceil(maxTot / 5) * 5, 5);
                  const colWidth = 66;
                  const svgW = Math.max(720, unitTypeData.sortedTypes.length * colWidth + 120);
                  const svgH = 340;
                  const baseY = 240;
                  const maxBarH = 180;
                  const barW = 30;

                  return (
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      width={svgW}
                      height={svgH}
                      className="max-w-full overflow-visible select-none"
                    >
                      {/* Gridlines */}
                      {[0, 0.25, 0.5, 0.75, 1.0].map(ratio => {
                        const val = Math.round(yMax * ratio);
                        const y = baseY - ratio * maxBarH;
                        return (
                          <g key={ratio}>
                            <line
                              x1="50"
                              y1={y}
                              x2={svgW - 20}
                              y2={y}
                              stroke="var(--color-border-tertiary)"
                              strokeWidth="0.8"
                            />
                            <text
                              x="44"
                              y={y + 3.5}
                              textAnchor="end"
                              fontSize="10"
                              fill="var(--color-text-secondary)"
                            >
                              {val}
                            </text>
                          </g>
                        );
                      })}

                      <line
                        x1="50"
                        y1={baseY}
                        x2={svgW - 20}
                        y2={baseY}
                        stroke="var(--color-border-secondary)"
                        strokeWidth="1.2"
                      />

                      {/* Stacked Bars per Type */}
                      {unitTypeData.sortedTypes.map((t, i) => {
                        const cx = 70 + i * colWidth;
                        const typeTot = unitTypeData.typeTotals[t];
                        let cumulativeH = 0;

                        return (
                          <g
                            key={t}
                            className="cursor-pointer"
                            onClick={() => setTypeFilter(typeFilter === t ? 'All' : t)}
                          >
                            {unitTypeData.units.map(u => {
                              const cell = unitTypeData.matrix[t]?.[u];
                              const cnt = cell?.total || 0;
                              if (cnt === 0) return null;

                              const segmentH = (cnt / yMax) * maxBarH;
                              const y = baseY - cumulativeH - segmentH;
                              cumulativeH += segmentH;

                              return (
                                <rect
                                  key={u}
                                  x={cx}
                                  y={y}
                                  width={barW}
                                  height={segmentH}
                                  fill={unitColors[u] || '#64748B'}
                                  rx={cumulativeH >= (typeTot.total / yMax) * maxBarH ? 2 : 0}
                                />
                              );
                            })}

                            {/* Total on top */}
                            <text
                              x={cx + barW / 2}
                              y={baseY - cumulativeH - 5}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="bold"
                              fill="var(--color-text-primary)"
                            >
                              {typeTot.total}
                            </text>

                            {/* Label */}
                            <text
                              x={cx + barW / 2}
                              y={baseY + 16}
                              textAnchor="end"
                              transform={`rotate(-40 ${cx + barW / 2} ${baseY + 16})`}
                              fontSize="9.5"
                              fill="var(--color-text-secondary)"
                            >
                              {t.length > 17 ? t.substring(0, 15) + '…' : t}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'rag' && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <span className="card-title">License Status — % Green, Amber and Red</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{totalCount} total licenses</span>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="h-8 w-full max-w-2xl bg-[var(--color-border-tertiary)] rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${(validCount / (totalCount || 1)) * 100}%` }}
                  className="bg-[#3B6D11] flex items-center justify-center text-[11px] text-white font-bold"
                  title="Green: Valid"
                >
                  {validCount > 0 ? pct(validCount, totalCount) : ''}
                </div>
                <div
                  style={{ width: `${(expiringCount / (totalCount || 1)) * 100}%` }}
                  className="bg-[#854F0B] flex items-center justify-center text-[11px] text-white font-bold"
                  title="Amber: Expiring Soon"
                >
                  {expiringCount > 0 ? pct(expiringCount, totalCount) : ''}
                </div>
                <div
                  style={{ width: `${(expiredCount / (totalCount || 1)) * 100}%` }}
                  className="bg-[#A32D2D] flex items-center justify-center text-[11px] text-white font-bold"
                  title="Red: Expired"
                >
                  {expiredCount > 0 ? pct(expiredCount, totalCount) : ''}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-2xl w-full mt-6 text-center">
                <div className="p-3 rounded-lg border border-green-200 bg-[#EAF3DE]/50">
                  <div className="text-xs font-bold text-[#3B6D11]">Green (Active)</div>
                  <div className="text-xl font-extrabold text-[#3B6D11] mt-1">{pct(validCount, totalCount)}</div>
                  <div className="text-[11px] text-[#3B6D11]">{validCount} licenses</div>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 bg-[#FAEEDA]/50">
                  <div className="text-xs font-bold text-[#854F0B]">Amber (Expiring)</div>
                  <div className="text-xl font-extrabold text-[#854F0B] mt-1">{pct(expiringCount, totalCount)}</div>
                  <div className="text-[11px] text-[#854F0B]">{expiringCount} licenses</div>
                </div>
                <div className="p-3 rounded-lg border border-red-200 bg-[#FCEBEB]/50">
                  <div className="text-xs font-bold text-[#A32D2D]">Red (Critical)</div>
                  <div className="text-xl font-extrabold text-[#A32D2D] mt-1">{pct(expiredCount, totalCount)}</div>
                  <div className="text-[11px] text-[#A32D2D]">{expiredCount} licenses</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Status Guide — Operational Meaning & Protocols</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-green-200 bg-[#EAF3DE]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#3B6D11]" />
                  <span className="font-bold text-xs text-[#3B6D11]">Green — {RAG.green.title}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {RAG.green.text}
                </p>
                <div className="text-[11px] pt-2 border-t border-green-200 text-[#3B6D11]">
                  <b>Action:</b> {RAG.green.action}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-amber-200 bg-[#FAEEDA]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#854F0B]" />
                  <span className="font-bold text-xs text-[#854F0B]">Amber — {RAG.amber.title}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {RAG.amber.text}
                </p>
                <div className="text-[11px] pt-2 border-t border-amber-200 text-[#854F0B]">
                  <b>Action:</b> {RAG.amber.action}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-red-200 bg-[#FCEBEB]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#A32D2D]" />
                  <span className="font-bold text-xs text-[#A32D2D]">Red — {RAG.red.title}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {RAG.red.text}
                </p>
                <div className="text-[11px] pt-2 border-t border-red-200 text-[#A32D2D]">
                  <b>Action:</b> {RAG.red.action}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* General All Licenses Overview Table (Shown on non-vehicle tabs) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab !== 'vehicle' && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <span className="card-title">All Licenses Overview</span>
              <span className="text-[11px] text-[var(--color-text-secondary)]">({filteredLicenses.length} records)</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadDashboardPdf}
                className="px-2.5 py-1 text-xs rounded font-medium bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] w-[160px] focus:outline-hidden"
                />
              </div>

              <select
                value={unitFilter}
                onChange={e => setUnitFilter(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
              >
                <option value="All">All Units</option>
                {scopedUnits.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] max-w-[150px] truncate"
              >
                <option value="All">All Types</option>
                {distinctTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
              >
                <option value="All">All Categories</option>
                <option value="Renewal">Renewal (Periodic Expiry)</option>
                <option value="One-time">One-time (Permanent)</option>
              </select>
            </div>
          </div>

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
                  <th>Docs</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                      No license records found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map(l => {
                    const days = daysUntil(l.till);
                    const sc = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
                    const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);

                    const pillBg =
                      sc === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                      sc === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                      sc === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

                    const dayText =
                      l.status === 'Suspended' ? 'Suspended' :
                      days !== null ? (days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`) : '';

                    const docCount = l.docs?.length || 0;

                    return (
                      <tr key={l.id}>
                        <td className="text-[11px] font-mono text-[var(--color-text-secondary)]">{l.id}</td>
                        <td><span className="tag text-[10px]">{l.type}</span></td>
                        <td><span className="badge badge-blue">{l.company}</span></td>
                        <td className="font-medium text-xs">
                          {l.name}
                          {l.reviewState === 'Awaiting Dept' && (
                            <span className="ml-1.5 badge badge-amber text-[9px]">Reply needed</span>
                          )}
                          {l.reviewState === 'Awaiting Reviewer' && (
                            <span className="ml-1.5 badge badge-blue text-[9px]">With reviewer</span>
                          )}
                          {l.reviewState === 'Closed' && (
                            <span className="ml-1.5 badge badge-green text-[9px]">Approved</span>
                          )}
                        </td>
                        <td className="text-[11px] font-mono">{l.number || '-'}</td>
                        <td className="text-xs">{l.from || '-'}</td>
                        <td className="text-xs">{l.till || '-'}</td>
                        <td>
                          <span className={`status-pill ${pillBg} text-[10px]`}>{sl}</span>
                          {dayText && (
                            <div className="text-[9px] text-[var(--color-text-secondary)] mt-0.5">{dayText}</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${l.category === 'One-time' ? 'badge-amber' : 'badge-blue'} text-[10px]`}>
                            {l.category === 'One-time' ? 'One-time (Permanent)' : 'Renewal (Periodic Expiry)'}
                          </span>
                        </td>
                        <td className="text-xs max-w-[150px] truncate" title={l.comments}>
                          {l.comments || '-'}
                        </td>
                        <td>
                          <span className="badge badge-gray text-[10px]">{l.action || '-'}</span>
                        </td>
                        <td>
                          {docCount > 0 ? (
                            <button
                              onClick={() => onViewDocs(l.docs || [], `${l.name} (${l.id})`)}
                              className="px-2 py-0.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--brand)] flex items-center gap-1 cursor-pointer"
                              title={`View ${docCount} attached document(s)`}
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>{docCount}</span>
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
      )}
    </div>
  );
};
