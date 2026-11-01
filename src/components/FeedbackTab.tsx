import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle,
  Lock,
  Unlock,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
  Users
} from 'lucide-react';
import { LicenseEntry, UserAccount } from '../types';
import { daysUntil, statusColor, statusLabel, fmtTs } from '../utils/helpers';

interface FeedbackTabProps {
  licenses: LicenseEntry[];
  companies?: string[];
  licenseTypes?: string[];
  users?: UserAccount[];
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
  onPostMessage: (licenseId: string, from: 'Reviewer' | 'Dept', text: string) => void;
  onApproveAndLock: (licenseId: string, finalNote?: string) => void;
  onReopenReview: (licenseId: string) => void;
  onNavigateToEdit?: (license: LicenseEntry) => void;
  onSwitchUser?: (userId: string) => void;
}

type TabFilter = 'active' | 'awaiting_operator' | 'awaiting_reviewer' | 'closed' | 'all';

export const FeedbackTab: React.FC<FeedbackTabProps> = ({
  licenses,
  companies = ['TAL', 'BGL', 'RHL', 'MISAMI', 'CORP'],
  licenseTypes = [],
  users = [],
  currentUser,
  globalAlertThreshold,
  licenseThresholds,
  onPostMessage,
  onApproveAndLock,
  onReopenReview,
  onSwitchUser
}) => {
  const [tabFilter, setTabFilter] = useState<TabFilter>('active');
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);

  // Draft text per license
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // For Administrator: persona selection between 'Reviewer' and 'Dept' (Operator/Contributor)
  const [adminPersona, setAdminPersona] = useState<'Reviewer' | 'Dept'>('Reviewer');

  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const myLicenses = useMemo(() => licenses.filter(l => inScope(l.company)), [licenses, currentUser]);

  const isReviewerRole = currentUser.role === 'Administrator' || currentUser.role === 'Verifier';
  const isOperatorRole = currentUser.role === 'Administrator' || currentUser.role === 'Operator / Contributor';

  // Effective role for posting messages
  const effectiveSenderRole: 'Reviewer' | 'Dept' =
    currentUser.role === 'Administrator'
      ? adminPersona
      : currentUser.role === 'Verifier'
      ? 'Reviewer'
      : 'Dept';

  // Check if license has discussion or legacy feedback
  const hasConversation = (l: LicenseEntry) => {
    return (
      Boolean(l.reviewState) ||
      (Array.isArray(l.thread) && l.thread.length > 0) ||
      Boolean(l.feedback && l.feedback.trim().length > 0)
    );
  };

  // Status counts
  const nAwaitingOperator = myLicenses.filter(l => l.reviewState === 'Awaiting Dept').length;
  const nAwaitingReviewer = myLicenses.filter(l => l.reviewState === 'Awaiting Reviewer').length;
  const nClosed = myLicenses.filter(l => l.reviewState === 'Closed').length;
  const nActive = myLicenses.filter(l => hasConversation(l) && l.reviewState !== 'Closed').length;

  // Filtered list
  const filteredLicenses = useMemo(() => {
    return myLicenses.filter(l => {
      // Unit filter
      if (selectedUnit !== 'All' && l.company !== selectedUnit) return false;

      // Type filter
      if (selectedType !== 'All' && l.type !== selectedType) return false;

      // Status Tab filter
      if (tabFilter === 'active') {
        if (!hasConversation(l) || l.reviewState === 'Closed') return false;
      } else if (tabFilter === 'awaiting_operator') {
        if (l.reviewState !== 'Awaiting Dept') return false;
      } else if (tabFilter === 'awaiting_reviewer') {
        if (l.reviewState !== 'Awaiting Reviewer') return false;
      } else if (tabFilter === 'closed') {
        if (l.reviewState !== 'Closed') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesId = l.id.toLowerCase().includes(q);
        const matchesNum = (l.number || '').toLowerCase().includes(q);
        const matchesVeh = (l.vNumber || '').toLowerCase().includes(q);
        const matchesComments = (l.comments || '').toLowerCase().includes(q);
        const matchesFeedback = (l.feedback || '').toLowerCase().includes(q);
        const matchesThread = l.thread?.some(t => t.text.toLowerCase().includes(q) || t.by.toLowerCase().includes(q));

        if (!matchesName && !matchesId && !matchesNum && !matchesVeh && !matchesComments && !matchesFeedback && !matchesThread) {
          return false;
        }
      }

      return true;
    });
  }, [myLicenses, selectedUnit, selectedType, tabFilter, searchQuery]);

  // Active selected license
  const activeLicense = useMemo(() => {
    if (selectedLicenseId) {
      const found = myLicenses.find(l => l.id === selectedLicenseId);
      if (found) return found;
    }
    return filteredLicenses.length > 0 ? filteredLicenses[0] : null;
  }, [selectedLicenseId, myLicenses, filteredLicenses]);

  const handleSend = (licenseId: string) => {
    const text = (drafts[licenseId] || '').trim();
    if (!text) return;
    onPostMessage(licenseId, effectiveSenderRole, text);
    setDrafts(prev => ({ ...prev, [licenseId]: '' }));
  };

  const handleQuickChipClick = (licenseId: string, chipText: string) => {
    setDrafts(prev => {
      const current = (prev[licenseId] || '').trim();
      return {
        ...prev,
        [licenseId]: current ? `${current}\n${chipText}` : chipText
      };
    });
  };

  // Build unified thread including legacy feedback string if thread is empty
  const getUnifiedThread = (l: LicenseEntry) => {
    if (l.thread && l.thread.length > 0) {
      return l.thread;
    }
    if (l.feedback && l.feedback.trim()) {
      return [
        {
          id: `legacy_${l.id}`,
          at: null,
          by: 'Reviewer',
          from: 'Reviewer' as const,
          text: l.feedback.trim()
        }
      ];
    }
    return [];
  };

  // Sample role users for quick testing
  const reviewerUser = users.find(u => u.role === 'Verifier');
  const operatorUser = users.find(u => u.role === 'Operator / Contributor');
  const adminUser = users.find(u => u.role === 'Administrator');

  // Quick suggestion chips
  const reviewerSuggestions = [
    'Please upload treasury challan copy for payment verification.',
    'Discrepancy in validity expiry date. Please verify against physical certificate.',
    'Submit updated fire safety drill & evacuation certificate.',
    'DIFE inspector observation requires engineering team clarification.',
    'Renewal application verified and compliant. Proceeding to approve and lock.'
  ];

  const operatorSuggestions = [
    'Annual government fee paid via online portal; deposit receipt uploaded.',
    'Renewal application submitted to licensing authority; awaiting physical inspection.',
    'Updated structural & electrical test report attached in document vault.',
    'Treasury challan submitted to Sonali Bank; clearance expected within 2 days.',
    'Factory layout revisions completed in accordance with inspector observations.'
  ];

  return (
    <div className="space-y-4">
      {/* Quick Role Tester Bar */}
      {onSwitchUser && (reviewerUser || operatorUser) && (
        <div className="p-2.5 rounded-lg bg-[var(--brand-light)] border border-[var(--brand)]/30 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Users className="w-4 h-4 text-[var(--brand)]" />
            <span>
              Currently signed in as: <b>{currentUser.name}</b> (
              <span className="font-semibold text-[var(--brand)]">{currentUser.role}</span>
              )
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">
              Switch role to test feedback workflow:
            </span>

            {reviewerUser && (
              <button
                onClick={() => onSwitchUser(reviewerUser.id)}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border ${
                  currentUser.id === reviewerUser.id
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                }`}
                title="Switch to Reviewer role to put comments"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>1. Reviewer ({reviewerUser.name})</span>
              </button>
            )}

            {operatorUser && (
              <button
                onClick={() => onSwitchUser(operatorUser.id)}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border ${
                  currentUser.id === operatorUser.id
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50'
                }`}
                title="Switch to Operator/Contributor role to reply"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>2. Operator / Contributor ({operatorUser.name})</span>
              </button>
            )}

            {adminUser && currentUser.id !== adminUser.id && (
              <button
                onClick={() => onSwitchUser(adminUser.id)}
                className="px-2 py-1 rounded text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                title="Switch to Administrator"
              >
                Admin ({adminUser.name})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Header Card with Workflow Summary */}
      <div className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="card-title text-base">Feedback Role: Reviewer ⇄ Operator / Contributor</h2>
                <span className="badge badge-blue text-[10px] font-semibold">Feedback Workflow</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                <b>Step 1:</b> Reviewer puts comments to Operator / Contributor. <b>Step 2:</b> Operator / Contributor replies with clarification or document proof.
              </p>
            </div>
          </div>

          {/* Quick Filter Counts */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTabFilter('awaiting_operator')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                tabFilter === 'awaiting_operator'
                  ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{nAwaitingOperator} Awaiting Operator Reply</span>
            </button>

            <button
              onClick={() => setTabFilter('awaiting_reviewer')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                tabFilter === 'awaiting_reviewer'
                  ? 'bg-blue-100 text-blue-900 border-blue-400 font-bold'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{nAwaitingReviewer} Awaiting Reviewer</span>
            </button>

            <button
              onClick={() => setTabFilter('closed')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                tabFilter === 'closed'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{nClosed} Approved & Closed</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/40 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by license name, permit #, vehicle #, or comment..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--brand)]"
            />
          </div>

          {/* Unit Scope Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--color-text-secondary)] font-medium">Unit:</span>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-hidden"
            >
              <option value="All">All Factory Units</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          {licenseTypes.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[var(--color-text-secondary)] font-medium">Type:</span>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-hidden max-w-[160px] truncate"
              >
                <option value="All">All Types</option>
                {licenseTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* View Filter Tabs */}
          <div className="flex items-center gap-1 text-xs ml-auto flex-wrap">
            <button
              onClick={() => setTabFilter('active')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer font-medium ${
                tabFilter === 'active'
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] hover:border-[var(--brand)]'
              }`}
            >
              Active Discussions ({nActive})
            </button>
            <button
              onClick={() => setTabFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer font-medium ${
                tabFilter === 'all'
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] hover:border-[var(--brand)]'
              }`}
            >
              All Licenses ({myLicenses.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Directory (Left) + Interactive Discussion Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Conversation Directory */}
        <div className="lg:col-span-5 xl:col-span-4 card p-0 overflow-hidden">
          <div className="p-3 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
              <Filter className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span>License Records ({filteredLicenses.length})</span>
            </div>
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              {tabFilter === 'active' ? 'Active Threads Only' : 'Filtered Selection'}
            </span>
          </div>

          <div className="divide-y divide-[var(--color-border-tertiary)] max-h-[680px] overflow-y-auto">
            {filteredLicenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)] space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-[var(--brand)]" />
                <p>No license discussions found matching your filter.</p>
                {tabFilter !== 'all' && (
                  <button
                    onClick={() => setTabFilter('all')}
                    className="text-xs text-[var(--brand)] underline cursor-pointer hover:opacity-80"
                  >
                    View all {myLicenses.length} licenses to start a discussion
                  </button>
                )}
              </div>
            ) : (
              filteredLicenses.map(l => {
                const days = daysUntil(l.till);
                const sc = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
                const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
                const isSelected = activeLicense?.id === l.id;
                const thread = getUnifiedThread(l);
                const lastMsg = thread.length > 0 ? thread[thread.length - 1] : null;

                const pillBg =
                  sc === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                  sc === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                  sc === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLicenseId(l.id)}
                    className={`p-3 transition-colors cursor-pointer text-xs space-y-1.5 border-l-3 ${
                      isSelected
                        ? 'bg-[var(--brand-light)] border-l-[var(--brand)]'
                        : 'border-l-transparent hover:bg-[var(--color-background-secondary)]/50'
                    }`}
                  >
                    {/* Top line: Unit, Name & Expiry Pill */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="badge badge-blue text-[10px] font-bold shrink-0">{l.company}</span>
                        <span className="font-semibold text-xs text-[var(--color-text-primary)] truncate">
                          {l.name}
                        </span>
                      </div>
                      <span className={`status-pill ${pillBg} text-[10px] shrink-0 font-medium`}>
                        {sl}
                      </span>
                    </div>

                    {/* License ID & Number */}
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                      <span className="font-mono text-[10px] opacity-75">{l.id}</span>
                      <span>{l.number ? `Lic: ${l.number}` : l.vNumber ? `Reg: ${l.vNumber}` : l.type}</span>
                    </div>

                    {/* Status badge & message snippet */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {l.reviewState === 'Awaiting Dept' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-2.5 h-2.5 text-amber-600" /> Awaiting Operator Reply
                        </span>
                      ) : l.reviewState === 'Awaiting Reviewer' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                          <ShieldCheck className="w-2.5 h-2.5 text-blue-600" /> Replied (With Reviewer)
                        </span>
                      ) : l.reviewState === 'Closed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Lock className="w-2.5 h-2.5 text-emerald-600" /> Approved & Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
                          No active feedback
                        </span>
                      )}

                      {thread.length > 0 && (
                        <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{thread.length}</span>
                        </span>
                      )}
                    </div>

                    {/* Last message preview */}
                    {lastMsg && (
                      <div className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1 italic bg-[var(--color-background-primary)]/80 p-1.5 rounded border border-[var(--color-border-tertiary)] mt-1">
                        <span className="font-semibold not-italic text-[10px] mr-1 text-[var(--color-text-primary)]">
                          {lastMsg.from === 'Reviewer' ? 'Reviewer:' : 'Operator:'}
                        </span>
                        {lastMsg.text}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Discussion & Action Workspace */}
        <div className="lg:col-span-7 xl:col-span-8">
          {activeLicense ? (
            (() => {
              const days = daysUntil(activeLicense.till);
              const sc = statusColor(days, activeLicense.type, activeLicense.status, globalAlertThreshold, licenseThresholds);
              const sl = statusLabel(days, activeLicense.status, activeLicense.type, globalAlertThreshold, licenseThresholds);
              const isClosed = activeLicense.reviewState === 'Closed';
              const thread = getUnifiedThread(activeLicense);
              const currentDraft = drafts[activeLicense.id] || '';

              const pillBg =
                sc === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                sc === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                sc === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

              return (
                <div className="card space-y-4">
                  {/* Workspace Header */}
                  <div className="p-4 border-b border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 rounded-t-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-blue font-bold px-2 py-0.5">{activeLicense.company}</span>
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{activeLicense.name}</h3>
                        <span className="text-xs font-mono text-[var(--color-text-tertiary)] bg-[var(--color-background-primary)] px-1.5 py-0.5 rounded border border-[var(--color-border-secondary)]">
                          {activeLicense.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`status-pill ${pillBg} text-xs font-medium`}>{sl}</span>
                      </div>
                    </div>

                    {/* Metadata details bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 text-[var(--color-text-secondary)] border-t border-[var(--color-border-tertiary)]">
                      <div>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] block uppercase">Classification</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{activeLicense.type}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] block uppercase">Permit / Number</span>
                        <span className="font-medium text-[var(--color-text-primary)] font-mono">{activeLicense.number || activeLicense.vNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] block uppercase">Valid Till</span>
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {activeLicense.till || 'One-time (Permanent)'}
                          {days !== null && (
                            <span className={`ml-1 text-[10px] ${days < 0 ? 'text-[#A32D2D]' : days <= globalAlertThreshold ? 'text-[#854F0B]' : 'text-[#3B6D11]'}`}>
                              ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] block uppercase">Action Status</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{activeLicense.action}</span>
                      </div>
                    </div>

                    {/* Turn Notification Banner */}
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs flex-wrap bg-[var(--color-background-primary)]">
                      <div className="flex items-center gap-2">
                        {activeLicense.reviewState === 'Awaiting Dept' ? (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span className="font-medium text-amber-900">
                              <b>Awaiting Operator / Contributor Reply:</b> Reviewer put comments on this license. Waiting on Operator / Contributor response.
                            </span>
                          </>
                        ) : activeLicense.reviewState === 'Awaiting Reviewer' ? (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                            <span className="font-medium text-blue-900">
                              <b>Replied by Operator / Contributor:</b> Ready for Reviewer verification and approval.
                            </span>
                          </>
                        ) : isClosed ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-[#3B6D11] shrink-0" />
                            <span className="font-medium text-[#3B6D11]">
                              <b>Approved & Locked by Reviewer:</b> Compliance criteria verified. Record locked.
                            </span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0" />
                            <span className="text-[var(--color-text-secondary)]">
                              No active queries yet. Reviewer can post comments below to request feedback from Operator / Contributor.
                            </span>
                          </>
                        )}
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2">
                        {isReviewerRole && !isClosed && (
                          <button
                            onClick={() => onApproveAndLock(activeLicense.id, currentDraft)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-[#3B6D11] hover:bg-[#2d540d] text-white flex items-center gap-1 cursor-pointer transition-colors"
                            title="Approve this license and lock record"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Approve & Lock</span>
                          </button>
                        )}

                        {isReviewerRole && isClosed && (
                          <button
                            onClick={() => onReopenReview(activeLicense.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                            title="Reopen review"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Reopen Review</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thread Stream */}
                  <div className="px-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--brand)]" />
                        <span>Communication Thread ({thread.length})</span>
                      </span>
                      <span className="text-[11px] font-normal text-[var(--color-text-tertiary)]">
                        Logged in group compliance audit history
                      </span>
                    </div>

                    <div className="p-4 bg-[var(--color-background-secondary)]/30 rounded-lg space-y-3 min-h-[220px] max-h-[380px] overflow-y-auto border border-[var(--color-border-tertiary)]">
                      {thread.length === 0 ? (
                        <div className="py-12 text-center text-xs text-[var(--color-text-tertiary)] space-y-2">
                          <MessageSquare className="w-8 h-8 mx-auto opacity-20 text-[var(--brand)]" />
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            No comments posted on this license yet.
                          </p>
                          <p className="max-w-md mx-auto text-[11px]">
                            {effectiveSenderRole === 'Reviewer'
                              ? 'As Reviewer, you can put comments or compliance requirements below to request feedback from Operator / Contributor.'
                              : 'As Operator / Contributor, you can post an initial update or clarification note to the Reviewer.'}
                          </p>
                        </div>
                      ) : (
                        thread.map(msg => {
                          if (msg.system) {
                            return (
                              <div
                                key={msg.id}
                                className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[var(--color-text-tertiary)] italic"
                              >
                                <span className="h-px bg-[var(--color-border-tertiary)] w-12" />
                                <Lock className="w-3 h-3 text-[#3B6D11]" />
                                <span>{msg.text}</span>
                                {msg.at && <span>• {fmtTs(msg.at)}</span>}
                                <span className="h-px bg-[var(--color-border-tertiary)] w-12" />
                              </div>
                            );
                          }

                          const isRev = msg.from === 'Reviewer';

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col max-w-[85%] rounded-lg p-3 text-xs leading-relaxed shadow-2xs ${
                                isRev
                                  ? 'bg-[#FFF9EE] border border-[#F6D389] text-[#7A4D05] mr-auto'
                                  : 'bg-[#F0F7FF] border border-[#B8D7FA] text-[#0A437B] ml-auto'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 text-[11px] font-bold pb-1.5 mb-1.5 border-b border-black/5">
                                <span className="flex items-center gap-1.5">
                                  {isRev ? (
                                    <>
                                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                                      <span className="text-amber-900 font-bold">Reviewer</span>
                                      <span className="text-[10px] text-amber-800/80 font-normal">
                                        (Feedback to Operator) • {msg.by}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                                      <span className="text-blue-900 font-bold">Operator / Contributor</span>
                                      <span className="text-[10px] text-blue-800/80 font-normal">
                                        (Reply to Reviewer) • {msg.by}
                                      </span>
                                    </>
                                  )}
                                </span>
                                {msg.at && (
                                  <span className="opacity-60 font-normal text-[10px]">
                                    {fmtTs(msg.at)}
                                  </span>
                                )}
                              </div>
                              <div className="whitespace-pre-wrap font-normal text-xs">{msg.text}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Quick Suggestion Chips */}
                  {!isClosed && (
                    <div className="px-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        <Sparkles className="w-3 h-3 text-[var(--brand)]" />
                        <span>
                          {effectiveSenderRole === 'Reviewer'
                            ? 'Reviewer Quick Comments (for Operator):'
                            : 'Operator / Contributor Quick Replies (for Reviewer):'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(effectiveSenderRole === 'Reviewer' ? reviewerSuggestions : operatorSuggestions).map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickChipClick(activeLicense.id, chip)}
                            className="px-2 py-1 text-[11px] rounded bg-[var(--color-background-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] transition-colors cursor-pointer text-left truncate max-w-[280px]"
                            title={chip}
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Composer & Reply Controls */}
                  <div className="p-4 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/20 rounded-b-lg space-y-3">
                    {!isClosed ? (
                      <div className="space-y-2.5">
                        {/* Role selector for Administrator */}
                        {currentUser.role === 'Administrator' && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-[var(--color-text-secondary)]">Active Posting Role:</span>
                            <div className="inline-flex rounded-md p-0.5 bg-[var(--color-background-secondary)] border border-[var(--color-border-secondary)]">
                              <button
                                type="button"
                                onClick={() => setAdminPersona('Reviewer')}
                                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                                  adminPersona === 'Reviewer'
                                    ? 'bg-amber-600 text-white shadow-xs font-semibold'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>Reviewer (Put comments to Operator)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminPersona('Dept')}
                                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                                  adminPersona === 'Dept'
                                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                              >
                                <Building2 className="w-3 h-3" />
                                <span>Operator / Contributor (Reply to Reviewer)</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Compose Box */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                            {effectiveSenderRole === 'Reviewer' ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reviewer: Put comments / requirements to Operator / Contributor</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Operator / Contributor: Reply to Reviewer</span>
                              </>
                            )}
                          </label>
                          <textarea
                            rows={3}
                            value={currentDraft}
                            onChange={e => setDrafts(prev => ({ ...prev, [activeLicense.id]: e.target.value }))}
                            placeholder={
                              effectiveSenderRole === 'Reviewer'
                                ? `Write feedback comments or document requirements for Operator / Contributor on this license...`
                                : `Write your reply, treasury challan payment proof, or status update to the Reviewer...`
                            }
                            className="w-full p-2.5 text-xs rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--brand)] resize-y min-h-[64px]"
                          />
                        </div>

                        {/* Composer Action Bar */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                          <div className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                            {effectiveSenderRole === 'Reviewer' ? (
                              <span>
                                ⏳ Sending will set review state to <b>Awaiting Operator / Contributor Reply</b>
                              </span>
                            ) : (
                              <span>
                                🔍 Sending will set review state to <b>Replied (With Reviewer)</b>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {currentDraft && (
                              <button
                                onClick={() => setDrafts(prev => ({ ...prev, [activeLicense.id]: '' }))}
                                className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                              >
                                Clear
                              </button>
                            )}

                            <button
                              onClick={() => handleSend(activeLicense.id)}
                              disabled={!currentDraft.trim()}
                              className={`px-4 py-1.5 text-xs font-semibold rounded-md text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors shadow-xs ${
                                effectiveSenderRole === 'Reviewer'
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>
                                {effectiveSenderRole === 'Reviewer'
                                  ? 'Put Comments to Operator / Contributor'
                                  : 'Submit Reply to Reviewer'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-md bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)]">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-[#3B6D11]" />
                          <span>
                            This review is currently <b>approved and locked by Reviewer</b>.
                          </span>
                        </div>
                        {isReviewerRole && (
                          <button
                            onClick={() => onReopenReview(activeLicense.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] hover:bg-[var(--color-background-primary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Reopen Review</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="card p-12 text-center text-xs text-[var(--color-text-tertiary)] space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto opacity-20 text-[var(--brand)]" />
              <p className="font-semibold text-sm text-[var(--color-text-primary)]">No License Selected</p>
              <p>Please select a license from the directory list on the left to inspect or post comments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
