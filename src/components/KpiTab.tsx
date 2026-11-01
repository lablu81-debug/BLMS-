import React, { useState, useMemo } from 'react';
import {
  Target,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  FileText,
  Building,
  ShieldCheck,
  Eye,
  Download,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  Flame,
  Factory,
  Car,
  FileCheck2,
  HelpCircle,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { LicenseEntry, UserAccount } from '../types';
import { daysUntil, statusColor, statusLabel, pct, generatePdfBlob, generateExcelBlob, downloadFile } from '../utils/helpers';

interface KpiTabProps {
  licenses: LicenseEntry[];
  companies: string[];
  licenseTypes: string[];
  users: UserAccount[];
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
  onNavigateToLicense?: (id: string, mode: 'entry' | 'review' | 'feedback' | 'dashboard') => void;
  onNavigateToEdit?: (license: LicenseEntry) => void;
  onShowToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

type KpiPerspective = 'operator' | 'viewer' | 'matrix';
type OperatorTaskFilter = 'all' | 'awaiting_reply' | 'expiring_soon' | 'expired' | 'missing_docs';

export const KpiTab: React.FC<KpiTabProps> = ({
  licenses,
  companies,
  licenseTypes,
  users,
  currentUser,
  globalAlertThreshold,
  licenseThresholds,
  onNavigateToLicense,
  onNavigateToEdit,
  onShowToast
}) => {
  // Active View Perspective: defaults to user's natural role
  const defaultPerspective: KpiPerspective =
    currentUser.role === 'Viewer' ? 'viewer' : 'operator';

  const [perspective, setPerspective] = useState<KpiPerspective>(defaultPerspective);
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [taskFilter, setTaskFilter] = useState<OperatorTaskFilter>('all');

  // Permission check for user's scope
  const inScope = (unit: string) =>
    currentUser.units === 'All' || currentUser.units.includes(unit);

  const scopedLicenses = useMemo(() => {
    return licenses.filter(l => inScope(l.company));
  }, [licenses, currentUser]);

  // Filtered dataset based on selection
  const filteredLicenses = useMemo(() => {
    return scopedLicenses.filter(l => {
      if (selectedUnit !== 'All' && l.company !== selectedUnit) return false;
      if (selectedType !== 'All' && l.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesNo = l.number.toLowerCase().includes(q);
        const matchesType = l.type.toLowerCase().includes(q);
        const matchesUnit = l.company.toLowerCase().includes(q);
        const matchesVeh = Boolean(l.vNumber && l.vNumber.toLowerCase().includes(q));
        if (!matchesName && !matchesNo && !matchesType && !matchesUnit && !matchesVeh) return false;
      }
      return true;
    });
  }, [scopedLicenses, selectedUnit, selectedType, searchQuery]);

  // ==========================================
  // OPERATOR / CONTRIBUTOR KPI CALCULATIONS
  // ==========================================
  const opMetrics = useMemo(() => {
    const total = filteredLicenses.length;
    if (total === 0) {
      return {
        total: 0,
        validCount: 0,
        expiringCount: 0,
        expiredCount: 0,
        onTimeRate: 100,
        feedbackResolvedRate: 100,
        awaitingOperatorReplies: 0,
        docsAttachedCount: 0,
        docsRate: 0,
        dataCompleteCount: 0,
        dataCompleteRate: 0,
        compositeScore: 100,
        compositeGrade: 'A+'
      };
    }

    let validCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let docsAttachedCount = 0;
    let dataCompleteCount = 0;
    let awaitingOperatorReplies = 0;
    let totalFeedbackQueries = 0;
    let resolvedFeedbackQueries = 0;
    let onTimeRenewals = 0;

    filteredLicenses.forEach(l => {
      const days = daysUntil(l.till);
      const stColor = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
      if (stColor === 'green') validCount++;
      else if (stColor === 'amber') expiringCount++;
      else if (stColor === 'red') expiredCount++;

      // Document attached
      const hasDocs = Array.isArray(l.docs) && l.docs.length > 0;
      if (hasDocs) docsAttachedCount++;

      // Data completeness (has name, permit number, valid dates, category, and if vehicle has vNumber)
      const hasPermitNo = l.number && l.number.trim().length > 0 && l.number !== 'N/A';
      const hasDates = l.from && l.till;
      const isVehicle = l.type === 'Transport & Vehicle (BRTA)';
      const vehComplete = !isVehicle || Boolean(l.vNumber);
      if (hasPermitNo && hasDates && vehComplete) {
        dataCompleteCount++;
      }

      // Feedback queries
      if (l.reviewState === 'Awaiting Dept') {
        awaitingOperatorReplies++;
      }
      const threadMsgs = l.thread || [];
      const hasQueries = threadMsgs.length > 0 || l.reviewState;
      if (hasQueries) {
        totalFeedbackQueries++;
        if (l.reviewState === 'Closed' || l.reviewState === 'Awaiting Reviewer') {
          resolvedFeedbackQueries++;
        }
      }

      // Renewal On-Time Rate: If license is valid or currently in progress / applied before lapsing
      const isLapsed = days !== null && days < 0 && l.status !== 'Valid';
      if (!isLapsed || l.action === 'Applied' || l.action === 'Completed') {
        onTimeRenewals++;
      }
    });

    const onTimeRate = Math.round((onTimeRenewals / total) * 100);
    const feedbackResolvedRate = totalFeedbackQueries > 0
      ? Math.round((resolvedFeedbackQueries / totalFeedbackQueries) * 100)
      : 100;
    const docsRate = Math.round((docsAttachedCount / total) * 100);
    const dataCompleteRate = Math.round((dataCompleteCount / total) * 100);

    // Weighted composite score:
    // Timeliness (35%) + Query Responsiveness (25%) + Docs (25%) + Data Completeness (15%)
    const rawScore = (onTimeRate * 0.35) + (feedbackResolvedRate * 0.25) + (docsRate * 0.25) + (dataCompleteRate * 0.15);
    const compositeScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    let compositeGrade = 'A+';
    if (compositeScore >= 95) compositeGrade = 'A+ (Exemplary)';
    else if (compositeScore >= 90) compositeGrade = 'A (Excellent)';
    else if (compositeScore >= 80) compositeGrade = 'B+ (Good)';
    else if (compositeScore >= 70) compositeGrade = 'B (Satisfactory)';
    else compositeGrade = 'C (Needs Remediation)';

    return {
      total,
      validCount,
      expiringCount,
      expiredCount,
      onTimeRate,
      feedbackResolvedRate,
      awaitingOperatorReplies,
      docsAttachedCount,
      docsRate,
      dataCompleteCount,
      dataCompleteRate,
      compositeScore,
      compositeGrade
    };
  }, [filteredLicenses, globalAlertThreshold, licenseThresholds]);

  // Unit-wise Operator Performance League Breakdown
  const unitOperatorLeague = useMemo(() => {
    const list = companies.filter(c => inScope(c));
    return list.map(comp => {
      const uLicenses = licenses.filter(l => l.company === comp);
      const total = uLicenses.length;
      if (total === 0) {
        return {
          unit: comp,
          operatorName: 'Unassigned',
          total: 0,
          valid: 0,
          expiring: 0,
          expired: 0,
          validPct: 100,
          docsPct: 100,
          pendingQueries: 0,
          kpiScore: 100,
          rating: 'Optimal'
        };
      }

      // Find primary operator for this unit
      const unitOp = users.find(u =>
        u.role === 'Operator / Contributor' &&
        (u.units === 'All' || u.units.includes(comp))
      );

      let valid = 0;
      let expiring = 0;
      let expired = 0;
      let docsCount = 0;
      let pendingQueries = 0;
      let onTimeCount = 0;

      uLicenses.forEach(l => {
        const d = daysUntil(l.till);
        const col = statusColor(d, l.type, l.status, globalAlertThreshold, licenseThresholds);
        if (col === 'green') valid++;
        else if (col === 'amber') expiring++;
        else if (col === 'red') expired++;

        if (Array.isArray(l.docs) && l.docs.length > 0) docsCount++;
        if (l.reviewState === 'Awaiting Dept') pendingQueries++;

        const isLapsed = d !== null && d < 0 && l.status !== 'Valid';
        if (!isLapsed || l.action === 'Applied' || l.action === 'Completed') {
          onTimeCount++;
        }
      });

      const validPct = Math.round((valid / total) * 100);
      const docsPct = Math.round((docsCount / total) * 100);
      const onTimePct = Math.round((onTimeCount / total) * 100);
      const queryPenalty = Math.min(20, pendingQueries * 4);

      const kpiScore = Math.max(
        0,
        Math.min(100, Math.round((validPct * 0.45) + (docsPct * 0.3) + (onTimePct * 0.25) - queryPenalty))
      );

      let rating: 'Elite' | 'Proficient' | 'Action Needed' = 'Proficient';
      if (kpiScore >= 90) rating = 'Elite';
      else if (kpiScore < 75) rating = 'Action Needed';

      return {
        unit: comp,
        operatorName: unitOp ? unitOp.name : 'Unit Compliance Team',
        operatorEmpId: unitOp?.empId || 'N/A',
        total,
        valid,
        expiring,
        expired,
        validPct,
        docsPct,
        pendingQueries,
        kpiScore,
        rating
      };
    }).sort((a, b) => b.kpiScore - a.kpiScore);
  }, [companies, licenses, users, currentUser, globalAlertThreshold, licenseThresholds]);

  // Action Queue for Operators (Filterable Tasks Needing Operator Attention)
  const operatorActionQueue = useMemo(() => {
    return filteredLicenses
      .map(l => {
        const days = daysUntil(l.till);
        const isExp = days !== null && days < 0;
        const isExpSoon = days !== null && days >= 0 && days <= (licenseThresholds[l.type] || globalAlertThreshold);
        const isAwaitingReply = l.reviewState === 'Awaiting Dept';
        const isMissingDocs = !l.docs || l.docs.length === 0;

        let priorityWeight = 0;
        const reasons: string[] = [];

        if (isAwaitingReply) {
          reasons.push('Awaiting Operator Reply to Reviewer');
          priorityWeight += 50;
        }
        if (isExp) {
          reasons.push(`Expired (${Math.abs(days || 0)}d overdue)`);
          priorityWeight += 40;
        } else if (isExpSoon) {
          reasons.push(`Expiring Soon (${days}d left)`);
          priorityWeight += 25;
        }
        if (isMissingDocs) {
          reasons.push('Missing Scanned Document');
          priorityWeight += 15;
        }

        return {
          license: l,
          days,
          isExp,
          isExpSoon,
          isAwaitingReply,
          isMissingDocs,
          reasons,
          priorityWeight
        };
      })
      .filter(item => item.reasons.length > 0)
      .filter(item => {
        if (taskFilter === 'awaiting_reply') return item.isAwaitingReply;
        if (taskFilter === 'expiring_soon') return item.isExpSoon;
        if (taskFilter === 'expired') return item.isExp;
        if (taskFilter === 'missing_docs') return item.isMissingDocs;
        return true;
      })
      .sort((a, b) => b.priorityWeight - a.priorityWeight);
  }, [filteredLicenses, taskFilter, licenseThresholds, globalAlertThreshold]);

  // ==========================================
  // VIEWER / EXECUTIVE KPI CALCULATIONS
  // ==========================================
  const viewerMetrics = useMemo(() => {
    const total = filteredLicenses.length;
    if (total === 0) {
      return {
        total: 0,
        auditReadiness: 100,
        zeroLapseUnitsCount: companies.length,
        statutoryCriticalCount: 0,
        statutoryCompliantCount: 0,
        lockedApprovedCount: 0,
        governanceIndex: 100
      };
    }

    let validCount = 0;
    let lockedApprovedCount = 0;

    // High Impact Statutory License Classifications in Bangladesh
    const statutoryClassifications = [
      'Factory License',
      'Fire License',
      'Environmental Clearance',
      'Boiler & Pressure Vessel',
      'Labour License',
      'Transport & Vehicle (BRTA)'
    ];

    let statutoryCriticalCount = 0;
    let statutoryCompliantCount = 0;

    filteredLicenses.forEach(l => {
      const days = daysUntil(l.till);
      const isRed = days !== null && (days < 0 || l.status === 'Expired');
      if (!isRed) validCount++;

      if (l.reviewState === 'Closed' || l.locked) {
        lockedApprovedCount++;
      }

      if (statutoryClassifications.includes(l.type)) {
        if (isRed) statutoryCriticalCount++;
        else statutoryCompliantCount++;
      }
    });

    // Zero-lapse units
    let zeroLapseUnitsCount = 0;
    companies.forEach(c => {
      if (!inScope(c)) return;
      const uLics = licenses.filter(l => l.company === c);
      if (uLics.length === 0) return;
      const hasExpired = uLics.some(l => {
        const d = daysUntil(l.till);
        return d !== null && (d < 0 || l.status === 'Expired');
      });
      if (!hasExpired) zeroLapseUnitsCount++;
    });

    const totalStatutory = statutoryCriticalCount + statutoryCompliantCount;
    const statutoryHealthPct = totalStatutory > 0
      ? Math.round((statutoryCompliantCount / totalStatutory) * 100)
      : 100;

    const baseAuditReadiness = Math.round((validCount / total) * 100);
    const auditReadiness = Math.round((baseAuditReadiness * 0.7) + (statutoryHealthPct * 0.3));

    const governanceIndex = Math.round((lockedApprovedCount / total) * 100);

    return {
      total,
      auditReadiness,
      zeroLapseUnitsCount,
      statutoryCriticalCount,
      statutoryCompliantCount,
      statutoryHealthPct,
      lockedApprovedCount,
      governanceIndex
    };
  }, [filteredLicenses, licenses, companies, currentUser]);

  // Bangladesh Statutory Authorities Breakdown for Viewer
  const regulatoryExposure = useMemo(() => {
    const authorityGroups = [
      {
        authority: 'DIFE — Department of Inspection for Factories',
        types: ['Factory License', 'Labour License'],
        icon: Factory,
        mandate: 'Factory registration, safety committee, worker welfare & DIFE renewal'
      },
      {
        authority: 'FSCD — Fire Service & Civil Defence',
        types: ['Fire License'],
        icon: Flame,
        mandate: 'Annual factory fire safety license, hydrant & evacuation audit'
      },
      {
        authority: 'DoE — Department of Environment',
        types: ['Environmental Clearance'],
        icon: ShieldCheck,
        mandate: 'Environmental clearance certificate (ECC), ETP & effluent standards'
      },
      {
        authority: 'BRTA — Bangladesh Road Transport Authority',
        types: ['Transport & Vehicle (BRTA)'],
        icon: Car,
        mandate: 'Factory vehicle fitness, route permit, tax token & commercial logistics'
      },
      {
        authority: 'Office of Chief Inspector of Boilers',
        types: ['Boiler & Pressure Vessel'],
        icon: AlertTriangle,
        mandate: 'Boiler safety hydraulic test, pressure registration & steam cert'
      },
      {
        authority: 'NBR & City Corporation',
        types: ['Trade License', 'Tax Certificate', 'VAT Registration'],
        icon: Building,
        mandate: 'Municipal trade license, e-TIN, VAT/BIN returns and corporate clearance'
      }
    ];

    return authorityGroups.map(grp => {
      const matched = scopedLicenses.filter(l => grp.types.includes(l.type));
      const total = matched.length;
      if (total === 0) {
        return {
          ...grp,
          total: 0,
          valid: 0,
          expiring: 0,
          expired: 0,
          complianceRate: 100,
          riskLevel: 'Low' as const
        };
      }

      let valid = 0;
      let expiring = 0;
      let expired = 0;

      matched.forEach(l => {
        const d = daysUntil(l.till);
        const col = statusColor(d, l.type, l.status, globalAlertThreshold, licenseThresholds);
        if (col === 'green') valid++;
        else if (col === 'amber') expiring++;
        else if (col === 'red') expired++;
      });

      const complianceRate = Math.round((valid / total) * 100);
      let riskLevel: 'Low' | 'Medium' | 'Critical' = 'Low';
      if (expired > 0) riskLevel = 'Critical';
      else if (expiring > 0) riskLevel = 'Medium';

      return {
        ...grp,
        total,
        valid,
        expiring,
        expired,
        complianceRate,
        riskLevel
      };
    });
  }, [scopedLicenses, globalAlertThreshold, licenseThresholds]);

  // Export Executive KPI Summary
  const handleExportPDF = async () => {
    const columns = [
      'Unit',
      'Assigned Operator',
      'Total Lic',
      'Valid',
      'Expiring Soon',
      'Expired',
      'Valid %',
      'Docs Uploaded %',
      'Pending Queries',
      'KPI Score',
      'Status'
    ];

    const rows = unitOperatorLeague.map(u => [
      u.unit,
      u.operatorName,
      u.total,
      u.valid,
      u.expiring,
      u.expired,
      `${u.validPct}%`,
      `${u.docsPct}%`,
      u.pendingQueries,
      `${u.kpiScore}/100`,
      u.rating
    ]);

    const blob = generatePdfBlob({
      title: 'Bitopi Group — Compliance KPI Executive Report',
      metaLine: `Generated: ${new Date().toLocaleString()} | Scope: ${selectedUnit} | Generated by: ${currentUser.name} (${currentUser.role})`,
      summaryLines: [
        `Operator Composite Performance: ${opMetrics.compositeScore}% (${opMetrics.compositeGrade}) | On-time Renewal Rate: ${opMetrics.onTimeRate}% | Doc Completeness: ${opMetrics.docsRate}%`,
        `Viewer Audit Readiness Index: ${viewerMetrics.auditReadiness}% | Statutory Critical Items: ${viewerMetrics.statutoryCriticalCount} | Zero-Lapse Units: ${viewerMetrics.zeroLapseUnitsCount}/${companies.length}`
      ],
      columns,
      rows
    });

    if (blob) {
      const ok = await downloadFile(`Bitopi_BLMS_KPI_Report_${new Date().toISOString().split('T')[0]}.pdf`, blob);
      if (ok) onShowToast?.('Exported KPI Executive PDF successfully.', 'success');
    }
  };

  const handleExportExcel = async () => {
    const columns = [
      'Unit',
      'Assigned Operator',
      'Total Licenses',
      'Valid Compliant',
      'Expiring Soon',
      'Expired Critical',
      'Compliance %',
      'Documents %',
      'Pending Reviewer Queries',
      'KPI Score',
      'Performance Rating'
    ];

    const rows = unitOperatorLeague.map(u => [
      u.unit,
      u.operatorName,
      u.total,
      u.valid,
      u.expiring,
      u.expired,
      u.validPct,
      u.docsPct,
      u.pendingQueries,
      u.kpiScore,
      u.rating
    ]);

    const blob = generateExcelBlob('KPI Governance', columns, rows);
    if (blob) {
      const ok = await downloadFile(`Bitopi_BLMS_KPI_Metrics_${new Date().toISOString().split('T')[0]}.xlsx`, blob);
      if (ok) onShowToast?.('Exported KPI Metrics Excel successfully.', 'success');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Perspective Switcher */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[var(--brand)] text-white shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--color-text-primary)]">
                  KPI
                </h1>
                <span className="badge badge-blue text-[11px] font-semibold">
                  Operator / Viewer Governance
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Key Performance Indicators (KPI) for Operator/Contributor and Viewer roles — renewal timeliness, query response, and executive risk governance.
              </p>
            </div>
          </div>

          {/* Perspective Pills */}
          <div className="inline-flex rounded-lg p-1 bg-[var(--color-background-secondary)] border border-[var(--color-border-secondary)] shrink-0">
            <button
              onClick={() => setPerspective('operator')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                perspective === 'operator'
                  ? 'bg-[var(--brand)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Operator / Contributor KPI</span>
            </button>

            <button
              onClick={() => setPerspective('viewer')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                perspective === 'viewer'
                  ? 'bg-[var(--brand)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Viewer & Management KPI</span>
            </button>

            <button
              onClick={() => setPerspective('matrix')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                perspective === 'matrix'
                  ? 'bg-[var(--brand)] text-white shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Target SLA Matrix</span>
            </button>
          </div>
        </div>

        {/* Global Controls & Scope Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--color-border-tertiary)] text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Unit Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[var(--color-text-secondary)] text-[11px]">Factory Unit:</span>
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="select py-1 px-2 text-xs"
              >
                <option value="All">All Factory Units (Consolidated)</option>
                {companies.filter(c => inScope(c)).map(c => (
                  <option key={c} value={c}>
                    {c} Unit
                  </option>
                ))}
              </select>
            </div>

            {/* License Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[var(--color-text-secondary)] text-[11px]">Type:</span>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="select py-1 px-2 text-xs max-w-[180px]"
              >
                <option value="All">All License Types</option>
                {licenseTypes.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search license or vehicle..."
                className="input py-1 pl-7 pr-2 text-xs w-full"
              />
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="btn btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 cursor-pointer"
              title="Download Executive KPI PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="btn btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 cursor-pointer"
              title="Download Excel Workbook"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. OPERATOR / CONTRIBUTOR KPI VIEW                                       */}
      {/* ========================================================================= */}
      {perspective === 'operator' && (
        <div className="space-y-4">
          {/* Operator Headline KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: On-Time Renewal Application Rate */}
            <div className="card p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  On-Time Renewal Rate
                </span>
                <span className="p-1.5 rounded-md bg-[#EAF3DE] text-[#3B6D11]">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {opMetrics.onTimeRate}%
                </span>
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  target ≥ 95%
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[#3B6D11]"
                  style={{ width: `${opMetrics.onTimeRate}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>Active portfolio renewals</span>
                <span className="font-semibold text-[#3B6D11]">{opMetrics.validCount} compliant</span>
              </p>
            </div>

            {/* Card 2: Feedback Query Turnaround */}
            <div className="card p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Reviewer Query Clearance
                </span>
                <span className="p-1.5 rounded-md bg-[#F0F7FF] text-[#0A437B]">
                  <MessageSquare className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {opMetrics.feedbackResolvedRate}%
                </span>
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  turnaround
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-blue-600"
                  style={{ width: `${opMetrics.feedbackResolvedRate}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>Pending operator reply</span>
                <span className={`font-semibold ${opMetrics.awaitingOperatorReplies > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {opMetrics.awaitingOperatorReplies} queries due
                </span>
              </p>
            </div>

            {/* Card 3: Digital Certificate & Docs Completeness */}
            <div className="card p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Document Attachment Rate
                </span>
                <span className="p-1.5 rounded-md bg-[#FFF9EE] text-[#7A4D05]">
                  <FileCheck2 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {opMetrics.docsRate}%
                </span>
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  {opMetrics.docsAttachedCount}/{opMetrics.total} files
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-amber-600"
                  style={{ width: `${opMetrics.docsRate}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>Scanned copy or challan</span>
                <span className="font-semibold text-amber-700">
                  {opMetrics.total - opMetrics.docsAttachedCount} missing
                </span>
              </p>
            </div>

            {/* Card 4: Operator Composite Performance Grade */}
            <div className="card p-4 space-y-2 relative overflow-hidden bg-gradient-to-br from-[var(--color-background-primary)] to-[var(--brand-light)]/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Operator Efficiency Score
                </span>
                <span className="p-1.5 rounded-md bg-[var(--brand-light)] text-[var(--brand)]">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[var(--brand)]">
                  {opMetrics.compositeScore}/100
                </span>
                <span className="text-[11px] font-bold text-[var(--brand)]">
                  {opMetrics.compositeGrade}
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[var(--brand)]"
                  style={{ width: `${opMetrics.compositeScore}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>Data Completeness</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {opMetrics.dataCompleteRate}%
                </span>
              </p>
            </div>
          </div>

          {/* Unit & Operator Performance League Table */}
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[var(--brand)]" />
                <span className="card-title">Unit Operator & Contributor Performance League</span>
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Ranked by Composite Compliance Rating
              </span>
            </div>

            <div className="table-wrap">
              <table className="blms-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Unit</th>
                    <th>Assigned Operator</th>
                    <th className="text-right">Total Licenses</th>
                    <th className="text-right">Compliant (Valid)</th>
                    <th className="text-right">Expiring Soon</th>
                    <th className="text-right">Expired</th>
                    <th className="text-right">Doc Completeness</th>
                    <th className="text-center">Queries Due</th>
                    <th className="text-right">Operator KPI Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unitOperatorLeague.map((row, idx) => (
                    <tr key={row.unit} className="hover:bg-[var(--color-background-secondary)]/50">
                      <td className="font-bold text-xs text-[var(--color-text-tertiary)]">
                        #{idx + 1}
                      </td>
                      <td>
                        <span className="badge badge-blue font-bold">
                          {row.unit}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                          {row.operatorName}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-tertiary)]">
                          {row.operatorEmpId}
                        </div>
                      </td>
                      <td className="text-right font-medium text-xs">
                        {row.total}
                      </td>
                      <td className="text-right font-semibold text-xs text-[#3B6D11]">
                        {row.valid} ({row.validPct}%)
                      </td>
                      <td className="text-right font-semibold text-xs text-[#854F0B]">
                        {row.expiring}
                      </td>
                      <td className="text-right font-semibold text-xs text-[#A32D2D]">
                        {row.expired}
                      </td>
                      <td className="text-right text-xs">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <span className="font-medium">{row.docsPct}%</span>
                          <div className="w-12 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${row.docsPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="text-center text-xs">
                        {row.pendingQueries > 0 ? (
                          <span className="badge badge-amber font-semibold">
                            {row.pendingQueries} awaiting
                          </span>
                        ) : (
                          <span className="badge badge-green font-medium">
                            Cleared
                          </span>
                        )}
                      </td>
                      <td className="text-right font-black text-xs text-[var(--brand)]">
                        {row.kpiScore}/100
                      </td>
                      <td>
                        {row.rating === 'Elite' ? (
                          <span className="badge badge-green font-semibold">
                            ★ Elite Operator
                          </span>
                        ) : row.rating === 'Proficient' ? (
                          <span className="badge badge-blue font-semibold">
                            Proficient
                          </span>
                        ) : (
                          <span className="badge badge-red font-semibold">
                            Action Needed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operator Action Queue (Items Requiring Immediate Operator / Contributor Action) */}
          <div className="card overflow-hidden">
            <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                <span className="card-title">
                  Operator Action Required Queue ({operatorActionQueue.length} records)
                </span>
              </div>

              {/* Task Filter Tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                    taskFilter === 'all'
                      ? 'bg-[var(--brand)] text-white font-semibold'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  All Action Items
                </button>
                <button
                  onClick={() => setTaskFilter('awaiting_reply')}
                  className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                    taskFilter === 'awaiting_reply'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Awaiting Reply ({opMetrics.awaitingOperatorReplies})
                </button>
                <button
                  onClick={() => setTaskFilter('expiring_soon')}
                  className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                    taskFilter === 'expiring_soon'
                      ? 'bg-amber-700 text-white font-semibold'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Expiring Soon ({opMetrics.expiringCount})
                </button>
                <button
                  onClick={() => setTaskFilter('expired')}
                  className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                    taskFilter === 'expired'
                      ? 'bg-red-600 text-white font-semibold'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Expired Critical ({opMetrics.expiredCount})
                </button>
                <button
                  onClick={() => setTaskFilter('missing_docs')}
                  className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                    taskFilter === 'missing_docs'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Missing Docs ({opMetrics.total - opMetrics.docsAttachedCount})
                </button>
              </div>
            </div>

            <div className="p-3 bg-[var(--color-background-secondary)]/30 border-b border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
              <span>
                These licenses require active Operator/Contributor intervention to maintain compliance SLA targets.
              </span>
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                Click actions on the right to reply or update records directly
              </span>
            </div>

            <div className="table-wrap max-h-[380px] overflow-y-auto">
              <table className="blms-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>License / Vehicle</th>
                    <th>Classification</th>
                    <th>Permit / Reg No.</th>
                    <th>Valid Till</th>
                    <th>Action Flag & Reasons</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operatorActionQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[var(--color-text-tertiary)]">
                        <CheckCircle className="w-6 h-6 mx-auto mb-1.5 text-green-600 opacity-60" />
                        No outstanding operator actions in this queue filter!
                      </td>
                    </tr>
                  ) : (
                    operatorActionQueue.slice(0, 50).map(item => {
                      const l = item.license;
                      return (
                        <tr key={l.id} className="hover:bg-[var(--color-background-secondary)]/40">
                          <td>
                            <span className="badge badge-blue font-bold">{l.company}</span>
                          </td>
                          <td>
                            <div className="font-semibold text-xs text-[var(--color-text-primary)]">
                              {l.name}
                            </div>
                            {l.vNumber && (
                              <div className="text-[10px] text-[var(--brand)] font-medium">
                                Vehicle: {l.vNumber}
                              </div>
                            )}
                          </td>
                          <td className="text-xs text-[var(--color-text-secondary)]">
                            {l.type}
                          </td>
                          <td className="font-mono text-xs text-[var(--color-text-tertiary)]">
                            {l.number || 'N/A'}
                          </td>
                          <td className="text-xs font-medium">
                            <span className={item.isExp ? 'text-red-600 font-bold' : item.isExpSoon ? 'text-amber-700 font-bold' : ''}>
                              {l.till || 'Permanent'}
                            </span>
                            {item.days !== null && (
                              <div className="text-[10px] text-[var(--color-text-tertiary)]">
                                {item.days < 0 ? `${Math.abs(item.days)}d ago` : `${item.days}d left`}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {item.isAwaitingReply && (
                                <span className="badge badge-amber text-[10px] font-bold">
                                  ⏳ Awaiting Reply
                                </span>
                              )}
                              {item.isExp && (
                                <span className="badge badge-red text-[10px] font-bold">
                                  ⚠ Overdue Renewal
                                </span>
                              )}
                              {item.isExpSoon && (
                                <span className="badge badge-amber text-[10px]">
                                  ⏰ Expiration Alert
                                </span>
                              )}
                              {item.isMissingDocs && (
                                <span className="badge text-[10px] bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                  📄 No Doc
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {item.isAwaitingReply ? (
                                <button
                                  onClick={() => onNavigateToLicense?.(l.id, 'feedback')}
                                  className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Submit reply to Reviewer"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Reply</span>
                                </button>
                              ) : null}

                              <button
                                onClick={() => {
                                  if (onNavigateToEdit) onNavigateToEdit(l);
                                  else onNavigateToLicense?.(l.id, 'entry');
                                }}
                                className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] text-[var(--color-text-secondary)] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                title="Update license record or upload document"
                              >
                                <span>Update</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEWER & MANAGEMENT KPI VIEW                                          */}
      {/* ========================================================================= */}
      {perspective === 'viewer' && (
        <div className="space-y-4">
          {/* Executive Governance Headline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Group Audit Readiness Index */}
            <div className="card p-4 space-y-2 relative overflow-hidden bg-gradient-to-br from-[var(--color-background-primary)] to-[var(--brand-light)]/15">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Group Audit Readiness Index
                </span>
                <span className="p-1.5 rounded-md bg-[#EAF3DE] text-[#3B6D11]">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[var(--brand)]">
                  {viewerMetrics.auditReadiness}%
                </span>
                <span className="text-[11px] font-semibold text-[#3B6D11]">
                  {viewerMetrics.auditReadiness >= 90 ? 'Audit Compliant' : 'Risk Exposure'}
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[#3B6D11]"
                  style={{ width: `${viewerMetrics.auditReadiness}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>Weighted statutory health</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {viewerMetrics.statutoryHealthPct}% regulatory
                </span>
              </p>
            </div>

            {/* Card 2: Zero-Lapse Factory Units */}
            <div className="card p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Zero-Lapse Factory Units
                </span>
                <span className="p-1.5 rounded-md bg-[#F0F7FF] text-[#0A437B]">
                  <Building className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {viewerMetrics.zeroLapseUnitsCount}/{companies.filter(c => inScope(c)).length}
                </span>
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  units 100% valid
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-blue-600"
                  style={{
                    width: `${(viewerMetrics.zeroLapseUnitsCount / Math.max(1, companies.filter(c => inScope(c)).length)) * 100}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>No expired licenses</span>
                <span className="font-semibold text-blue-700">Clean Units</span>
              </p>
            </div>

            {/* Card 3: Critical Statutory Exposure */}
            <div className="card p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Statutory Life-Safety Exposure
                </span>
                <span className={`p-1.5 rounded-md ${viewerMetrics.statutoryCriticalCount > 0 ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#EAF3DE] text-[#3B6D11]'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${viewerMetrics.statutoryCriticalCount > 0 ? 'text-[#A32D2D]' : 'text-[#3B6D11]'}`}>
                  {viewerMetrics.statutoryCriticalCount}
                </span>
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  critical statutory lapsed
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${viewerMetrics.statutoryCriticalCount > 0 ? 'bg-red-600' : 'bg-green-600'}`}
                  style={{ width: `${Math.min(100, (viewerMetrics.statutoryCriticalCount / Math.max(1, viewerMetrics.total)) * 100 * 5)}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>DIFE, Fire, DoE, Boiler, BRTA</span>
                <span className="font-semibold text-amber-700">
                  {viewerMetrics.statutoryCompliantCount} active
                </span>
              </p>
            </div>

            {/* Card 4: Governance Verification & Lock Rate */}
            <div className="card p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Technical Review Lock Rate
                </span>
                <span className="p-1.5 rounded-md bg-[#FFF9EE] text-[#7A4D05]">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {viewerMetrics.governanceIndex}%
                </span>
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  {viewerMetrics.lockedApprovedCount} verified
                </span>
              </div>
              <div className="w-full bg-[var(--color-background-tertiary)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-amber-600"
                  style={{ width: `${viewerMetrics.governanceIndex}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between">
                <span>CHO Reviewer approved & locked</span>
                <span className="font-semibold text-[var(--color-text-primary)]">Compliance Audit</span>
              </p>
            </div>
          </div>

          {/* Unit Compliance Benchmark & Risk Heatmap */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--brand)]" />
                <h3 className="card-title">Unit Compliance Benchmark & Oversight Profile</h3>
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Horizontal Compliance Stack (Valid / Expiring Soon / Expired)
              </span>
            </div>

            <div className="space-y-2.5">
              {unitOperatorLeague.map(u => {
                const total = u.total || 1;
                const vPct = Math.round((u.valid / total) * 100);
                const sPct = Math.round((u.expiring / total) * 100);
                const ePct = Math.max(0, 100 - vPct - sPct);

                return (
                  <div key={u.unit} className="p-2.5 rounded-lg bg-[var(--color-background-secondary)]/40 border border-[var(--color-border-tertiary)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-blue font-bold px-2 py-0.5">{u.unit}</span>
                        <span className="font-semibold text-[var(--color-text-primary)]">{u.operatorName}</span>
                        <span className="text-[11px] text-[var(--color-text-tertiary)]">({u.total} licenses)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#3B6D11] font-semibold">{u.valid} Valid</span>
                        {u.expiring > 0 && <span className="text-[11px] text-[#854F0B] font-semibold">{u.expiring} Expiring</span>}
                        {u.expired > 0 && <span className="text-[11px] text-[#A32D2D] font-bold">{u.expired} Expired</span>}
                        <span className="font-bold text-[var(--brand)]">{vPct}% Compliant</span>
                      </div>
                    </div>

                    <div className="h-3 w-full bg-[var(--color-background-tertiary)] rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#3B6D11] h-full transition-all duration-500"
                        style={{ width: `${vPct}%` }}
                        title={`Valid: ${u.valid} (${vPct}%)`}
                      />
                      <div
                        className="bg-[#854F0B] h-full transition-all duration-500"
                        style={{ width: `${sPct}%` }}
                        title={`Expiring: ${u.expiring} (${sPct}%)`}
                      />
                      <div
                        className="bg-[#A32D2D] h-full transition-all duration-500"
                        style={{ width: `${ePct}%` }}
                        title={`Expired: ${u.expired} (${ePct}%)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bangladesh Regulatory Authority Exposure Matrix */}
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--brand)]" />
                <span className="card-title">Statutory Regulatory Authorities Exposure</span>
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Key Inspectorates & Governance Mandates
              </span>
            </div>

            <div className="table-wrap">
              <table className="blms-table">
                <thead>
                  <tr>
                    <th>Statutory Authority & Mandate</th>
                    <th className="text-right">Monitored Records</th>
                    <th className="text-right">Compliant</th>
                    <th className="text-right">Expiring Soon</th>
                    <th className="text-right">Expired</th>
                    <th className="text-right">Compliance Rate</th>
                    <th>Risk Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {regulatoryExposure.map(reg => {
                    const Icon = reg.icon;
                    return (
                      <tr key={reg.authority} className="hover:bg-[var(--color-background-secondary)]/40">
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-[var(--brand-light)] text-[var(--brand)] shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-[var(--color-text-primary)]">
                                {reg.authority}
                              </div>
                              <div className="text-[10px] text-[var(--color-text-tertiary)] max-w-md">
                                {reg.mandate}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right font-medium text-xs">
                          {reg.total}
                        </td>
                        <td className="text-right font-semibold text-xs text-[#3B6D11]">
                          {reg.valid}
                        </td>
                        <td className="text-right font-semibold text-xs text-[#854F0B]">
                          {reg.expiring}
                        </td>
                        <td className="text-right font-bold text-xs text-[#A32D2D]">
                          {reg.expired}
                        </td>
                        <td className="text-right font-black text-xs">
                          {reg.complianceRate}%
                        </td>
                        <td>
                          {reg.riskLevel === 'Low' ? (
                            <span className="badge badge-green font-semibold">
                              ✓ Low Exposure
                            </span>
                          ) : reg.riskLevel === 'Medium' ? (
                            <span className="badge badge-amber font-semibold">
                              ⚡ Moderate Risk
                            </span>
                          ) : (
                            <span className="badge badge-red font-semibold">
                              ⚠ Critical Exposure
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TARGET SLA MATRIX VIEW                                                */}
      {/* ========================================================================= */}
      {perspective === 'matrix' && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--brand)]" />
                <span className="card-title">KPI Target SLA Matrix</span>
              </div>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Group Compliance Standards vs Realized Execution
              </span>
            </div>

            <div className="table-wrap">
              <table className="blms-table">
                <thead>
                  <tr>
                    <th>KPI Dimension</th>
                    <th>Accountable Role</th>
                    <th>Target SLA / Standard</th>
                    <th>Current Realized</th>
                    <th>Status</th>
                    <th>Escalation & Governance Protocol</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td className="font-bold text-xs text-[var(--color-text-primary)]">
                      On-Time Renewal Submission
                    </td>
                    <td>
                      <span className="badge badge-blue">Operator / Contributor</span>
                    </td>
                    <td className="text-xs font-semibold">
                      ≥ 95% of licenses renewed before expiration
                    </td>
                    <td className="text-xs font-black text-[var(--brand)]">
                      {opMetrics.onTimeRate}%
                    </td>
                    <td>
                      {opMetrics.onTimeRate >= 95 ? (
                        <span className="badge badge-green font-semibold">Met Target</span>
                      ) : (
                        <span className="badge badge-amber font-semibold">Approaching</span>
                      )}
                    </td>
                    <td className="text-[11px] text-[var(--color-text-secondary)]">
                      Initiate treasury challan and online submission at T-60 / T-45 days.
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <td className="font-bold text-xs text-[var(--color-text-primary)]">
                      Reviewer Feedback Turnaround
                    </td>
                    <td>
                      <span className="badge badge-blue">Operator / Contributor</span>
                    </td>
                    <td className="text-xs font-semibold">
                      ≤ 48 hours to reply to Reviewer comments
                    </td>
                    <td className="text-xs font-black text-[var(--brand)]">
                      {opMetrics.awaitingOperatorReplies === 0 ? '100% Cleared' : `${opMetrics.awaitingOperatorReplies} pending`}
                    </td>
                    <td>
                      {opMetrics.awaitingOperatorReplies === 0 ? (
                        <span className="badge badge-green font-semibold">Fully Cleared</span>
                      ) : (
                        <span className="badge badge-amber font-semibold">Action Due</span>
                      )}
                    </td>
                    <td className="text-[11px] text-[var(--color-text-secondary)]">
                      Reviewer flags missing compliance proofs; Operator must submit answers.
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <td className="font-bold text-xs text-[var(--color-text-primary)]">
                      Digital Document Attachment
                    </td>
                    <td>
                      <span className="badge badge-blue">Operator / Contributor</span>
                    </td>
                    <td className="text-xs font-semibold">
                      100% of licenses with scanned certificate / challan
                    </td>
                    <td className="text-xs font-black text-[var(--brand)]">
                      {opMetrics.docsRate}%
                    </td>
                    <td>
                      {opMetrics.docsRate >= 90 ? (
                        <span className="badge badge-green font-semibold">High Attachment</span>
                      ) : (
                        <span className="badge badge-amber font-semibold">Needs Uploads</span>
                      )}
                    </td>
                    <td className="text-[11px] text-[var(--color-text-secondary)]">
                      Upload PDF/Image scanned copy in New License Entry or Edit mode.
                    </td>
                  </tr>

                  {/* Row 4 */}
                  <tr>
                    <td className="font-bold text-xs text-[var(--color-text-primary)]">
                      Group Audit Readiness Score
                    </td>
                    <td>
                      <span className="badge badge-purple">Viewer / Management</span>
                    </td>
                    <td className="text-xs font-semibold">
                      ≥ 90% overall compliance health index
                    </td>
                    <td className="text-xs font-black text-[var(--brand)]">
                      {viewerMetrics.auditReadiness}%
                    </td>
                    <td>
                      {viewerMetrics.auditReadiness >= 90 ? (
                        <span className="badge badge-green font-semibold">Audit Compliant</span>
                      ) : (
                        <span className="badge badge-red font-semibold">Risk Exposure</span>
                      )}
                    </td>
                    <td className="text-[11px] text-[var(--color-text-secondary)]">
                      Executive oversight across factory units for buyer & government audits.
                    </td>
                  </tr>

                  {/* Row 5 */}
                  <tr>
                    <td className="font-bold text-xs text-[var(--color-text-primary)]">
                      Statutory Life-Safety Lapses
                    </td>
                    <td>
                      <span className="badge badge-purple">Viewer / Management</span>
                    </td>
                    <td className="text-xs font-semibold">
                      Zero (0) expired in Fire, DIFE, DoE, Boiler
                    </td>
                    <td className="text-xs font-black text-red-600">
                      {viewerMetrics.statutoryCriticalCount} expired
                    </td>
                    <td>
                      {viewerMetrics.statutoryCriticalCount === 0 ? (
                        <span className="badge badge-green font-semibold">Zero Lapse</span>
                      ) : (
                        <span className="badge badge-red font-semibold">Immediate Escalation</span>
                      )}
                    </td>
                    <td className="text-[11px] text-[var(--color-text-secondary)]">
                      Requires priority management intervention and fast-track renewal.
                    </td>
                  </tr>

                  {/* Row 6 */}
                  <tr>
                    <td className="font-bold text-xs text-[var(--color-text-primary)]">
                      CHO Technical Verification
                    </td>
                    <td>
                      <span className="badge badge-green">Verifier & Admin</span>
                    </td>
                    <td className="text-xs font-semibold">
                      100% of valid licenses inspected & locked
                    </td>
                    <td className="text-xs font-black text-[var(--brand)]">
                      {viewerMetrics.governanceIndex}%
                    </td>
                    <td>
                      <span className="badge badge-blue font-semibold">Continuous Review</span>
                    </td>
                    <td className="text-[11px] text-[var(--color-text-secondary)]">
                      Corporate Head Office Compliance team approves & locks records.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
