import React, { useState, useMemo } from 'react';
import {
  Eye,
  Send,
  CheckCircle,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  Search,
  Filter,
  Sparkles,
  Edit,
  Users,
  HelpCircle,
  Check
} from 'lucide-react';
import { LicenseEntry, UserAccount } from '../types';
import { daysUntil, statusColor, statusLabel, fmtTs } from '../utils/helpers';

interface ReviewTabProps {
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

type ReviewFilter =
  | 'All'
  | 'Needs Reviewer Action'
  | 'Awaiting Operator Answer'
  | 'Operator Answered'
  | 'Expiring Soon'
  | 'Expired'
  | 'Approved';

export const ReviewTab: React.FC<ReviewTabProps> = ({
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
  onNavigateToEdit,
  onSwitchUser
}) => {
  const [filter, setFilter] = useState<ReviewFilter>('All');
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);

  const isReviewerRole = currentUser.role === 'Administrator' || currentUser.role === 'Verifier';
  const isOperatorRole = currentUser.role === 'Administrator' || currentUser.role === 'Operator / Contributor';

  // Licenses that require review attention: Expiring Soon, Expired, or with an active reviewState / thread
  const attentionLicenses = useMemo(() => {
    return licenses
      .filter(l => inScope(l.company))
      .filter(l => {
        const days = daysUntil(l.till);
        const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
        const isExpiring = sl === 'Expiring Soon';
        const isExpired = sl === 'Expired';
        const hasReviewState = Boolean(l.reviewState);
        const hasThread = Boolean(l.thread && l.thread.length > 0);

        return isExpiring || isExpired || hasReviewState || hasThread;
      });
  }, [licenses, currentUser, globalAlertThreshold, licenseThresholds]);

  // Counts
  const nNeedsReviewerAction = attentionLicenses.filter(l => {
    const days = daysUntil(l.till);
    const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
    return l.reviewState === 'Awaiting Reviewer' || (!l.reviewState && (sl === 'Expiring Soon' || sl === 'Expired'));
  }).length;

  const nAwaitingOperatorAnswer = attentionLicenses.filter(l => l.reviewState === 'Awaiting Dept').length;
  const nOperatorAnswered = attentionLicenses.filter(l => l.reviewState === 'Awaiting Reviewer').length;
  const nApproved = attentionLicenses.filter(l => l.reviewState === 'Closed').length;

  const filtered = useMemo(() => {
    return attentionLicenses.filter(l => {
      // Unit filter
      if (selectedUnit !== 'All' && l.company !== selectedUnit) return false;

      const days = daysUntil(l.till);
      const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);

      // Status filter
      if (filter === 'Needs Reviewer Action') {
        if (l.reviewState !== 'Awaiting Reviewer' && !(l.reviewState === undefined && (sl === 'Expiring Soon' || sl === 'Expired'))) {
          return false;
        }
      } else if (filter === 'Awaiting Operator Answer') {
        if (l.reviewState !== 'Awaiting Dept') return false;
      } else if (filter === 'Operator Answered') {
        if (l.reviewState !== 'Awaiting Reviewer') return false;
      } else if (filter === 'Expiring Soon') {
        if (sl !== 'Expiring Soon') return false;
      } else if (filter === 'Expired') {
        if (sl !== 'Expired') return false;
      } else if (filter === 'Approved') {
        if (l.reviewState !== 'Closed') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesId = l.id.toLowerCase().includes(q);
        const matchesNum = (l.number || '').toLowerCase().includes(q);
        const matchesVeh = (l.vNumber || '').toLowerCase().includes(q);
        const matchesThread = l.thread?.some(t => t.text.toLowerCase().includes(q));

        if (!matchesName && !matchesId && !matchesNum && !matchesVeh && !matchesThread) {
          return false;
        }
      }

      return true;
    });
  }, [attentionLicenses, selectedUnit, filter, searchQuery, globalAlertThreshold, licenseThresholds]);

  const handleSendQuestion = (licenseId: string) => {
    const text = (drafts[licenseId] || '').trim();
    if (!text) return;
    onPostMessage(licenseId, 'Reviewer', text);
    setDrafts(prev => ({ ...prev, [licenseId]: '' }));
  };

  const handleSendAnswer = (licenseId: string) => {
    const text = (drafts[licenseId] || '').trim();
    if (!text) return;
    onPostMessage(licenseId, 'Dept', text);
    setDrafts(prev => ({ ...prev, [licenseId]: '' }));
  };

  const handleQuickQuestionClick = (licenseId: string, qText: string) => {
    setDrafts(prev => {
      const current = (prev[licenseId] || '').trim();
      return {
        ...prev,
        [licenseId]: current ? `${current}\n${qText}` : qText
      };
    });
  };

  // Sample role users for quick testing
  const reviewerUser = users.find(u => u.role === 'Verifier');
  const operatorUser = users.find(u => u.role === 'Operator / Contributor');
  const adminUser = users.find(u => u.role === 'Administrator');

  return (
    <div className="space-y-4">
      {/* Quick Role Tester Bar */}
      {onSwitchUser && (reviewerUser || operatorUser) && (
        <div className="p-2.5 rounded-lg bg-[var(--brand-light)] border border-[var(--brand)]/30 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Users className="w-4 h-4 text-[var(--brand)]" />
            <span>
              Signed in as: <b>{currentUser.name}</b> (
              <span className="font-semibold text-[var(--brand)]">{currentUser.role}</span>
              )
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">
              Switch role to test Reviewer ⇄ Operator flow:
            </span>

            {reviewerUser && (
              <button
                onClick={() => onSwitchUser(reviewerUser.id)}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border ${
                  currentUser.id === reviewerUser.id
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                }`}
                title="Switch to Reviewer to ask questions"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Reviewer ({reviewerUser.name})</span>
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
                title="Switch to Operator/Contributor to answer"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Operator / Contributor ({operatorUser.name})</span>
              </button>
            )}

            {adminUser && currentUser.id !== adminUser.id && (
              <button
                onClick={() => onSwitchUser(adminUser.id)}
                className="px-2 py-1 rounded text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Admin ({adminUser.name})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Review Queue Card */}
      <div className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="card-title text-base">Review Queue — Compliance Review Role</h2>
                <span className="badge badge-amber text-[10px] font-semibold">Reviewer Verification</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                When Operator / Contributor updates a license, Reviewer asks regarding <b>Expiring Soon</b> or <b>Expired</b> permits, and Operator / Contributor provides the answer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-amber text-xs font-semibold">
              {nNeedsReviewerAction} need(s) Reviewer action
            </span>
            <span className="badge badge-blue text-xs font-semibold">
              {nAwaitingOperatorAnswer} awaiting Operator answer
            </span>
            <span className="badge badge-green text-xs font-semibold">
              {nApproved} approved
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/40 flex flex-wrap items-center gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search licenses requiring review..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-hidden"
            />
          </div>

          {/* Unit Scope */}
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-text-secondary)] font-medium">Unit:</span>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-hidden"
            >
              <option value="All">All Units</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {(
              [
                'All',
                'Needs Reviewer Action',
                'Awaiting Operator Answer',
                'Operator Answered',
                'Expiring Soon',
                'Expired',
                'Approved'
              ] as const
            ).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer font-medium ${
                  filter === f
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] hover:border-[var(--brand)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[11px] text-[var(--color-text-secondary)]">
            {filtered.length} license(s)
          </span>
        </div>

        {/* License Review List */}
        <div className="divide-y divide-[var(--color-border-tertiary)]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)] space-y-1">
              <Eye className="w-8 h-8 mx-auto opacity-20 text-[var(--brand)]" />
              <p>No licenses requiring review under this filter.</p>
            </div>
          ) : (
            filtered.map(l => {
              const days = daysUntil(l.till);
              const sc = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
              const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);
              const isClosed = l.reviewState === 'Closed';
              const isExpiringSoon = sl === 'Expiring Soon';
              const isExpired = sl === 'Expired';
              const thread = l.thread || [];
              const draftText = drafts[l.id] || '';

              const pillBg =
                sc === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                sc === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                sc === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

              // Predefined questions specifically for Expiring Soon vs Expired
              const expiringSoonQuestions = [
                `License expires in ${days !== null ? `${days} days` : 'soon'}. Has the renewal challan and application been submitted to the authority?`,
                'Expiring Soon: Please upload the latest renewal application acknowledgement receipt.',
                'Expiring Soon: Confirm if regulatory inspection is scheduled or fee clearance is pending.'
              ];

              const expiredQuestions = [
                `URGENT: License is EXPIRED (${days !== null ? `${Math.abs(days)}d overdue` : 'overdue'}). What is the delay justification and current status?`,
                'Expired: Please submit treasury challan deposit copy and expedited renewal filing.',
                'Expired: Provide immediate explanation on why renewal was not completed prior to expiration.'
              ];

              const operatorAnswers = [
                'Renewal fee paid at Sonali Bank; treasury challan receipt attached in document vault.',
                'Renewal application submitted to licensing authority; awaiting physical site inspection.',
                'Regulatory authority server was down; application processed today and clearance expected shortly.',
                'Inspection completed by inspector; official certificate collection pending.'
              ];

              return (
                <div key={l.id} className="p-4 space-y-3 hover:bg-[var(--color-background-secondary)]/20 transition-colors">
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge badge-blue font-bold">{l.company}</span>
                      <span className="font-semibold text-xs text-[var(--color-text-primary)]">{l.name}</span>
                      <span className="text-[11px] font-mono text-[var(--color-text-tertiary)] bg-[var(--color-background-secondary)] px-1.5 py-0.5 rounded border border-[var(--color-border-secondary)]">
                        {l.id}
                      </span>

                      {/* State Badges */}
                      {l.reviewState === 'Awaiting Dept' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-2.5 h-2.5 text-amber-600" /> Awaiting Operator / Contributor Answer
                        </span>
                      )}
                      {l.reviewState === 'Awaiting Reviewer' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                          <ShieldCheck className="w-2.5 h-2.5 text-blue-600" /> Operator Answered — Ready for Review
                        </span>
                      )}
                      {isClosed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Lock className="w-2.5 h-2.5 text-emerald-600" /> Approved & Locked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`status-pill ${pillBg} text-[10px] font-bold`}>{sl}</span>
                    </div>
                  </div>

                  {/* Metadata line */}
                  <div className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-3 flex-wrap">
                    <span><b>Classification:</b> {l.type}</span>
                    <span>•</span>
                    <span><b>Permit #:</b> {l.number || l.vNumber || '—'}</span>
                    <span>•</span>
                    <span>
                      <b>Valid Till:</b> {l.till || 'One-time'}
                      {days !== null && (
                        <b className={`ml-1 ${days < 0 ? 'text-[#A32D2D]' : days <= globalAlertThreshold ? 'text-[#854F0B]' : 'text-[#3B6D11]'}`}>
                          ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})
                        </b>
                      )}
                    </span>
                    <span>•</span>
                    <span><b>Status:</b> {l.status}</span>
                  </div>

                  {/* Thread History */}
                  {thread.length > 0 && (
                    <div className="p-3 bg-[var(--color-background-secondary)]/50 rounded-lg space-y-2 max-h-[220px] overflow-y-auto border border-[var(--color-border-tertiary)]">
                      {thread.map(msg => {
                        if (msg.system) {
                          return (
                            <div key={msg.id} className="text-center text-[10px] text-[var(--color-text-tertiary)] italic py-0.5">
                              {msg.text} {msg.at ? `• ${fmtTs(msg.at)}` : ''}
                            </div>
                          );
                        }

                        const isRev = msg.from === 'Reviewer';
                        return (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded text-xs leading-relaxed max-w-[85%] ${
                              isRev
                                ? 'bg-[#FFF9EE] border border-[#F6D389] text-[#7A4D05] mr-auto'
                                : 'bg-[#F0F7FF] border border-[#B8D7FA] text-[#0A437B] ml-auto'
                            }`}
                          >
                            <div className="text-[10px] font-bold opacity-80 mb-1 flex items-center justify-between gap-2">
                              <span>
                                {isRev ? '🛡️ Reviewer' : '🏭 Operator / Contributor'} ({msg.by})
                              </span>
                              {msg.at && <span className="font-normal">{fmtTs(msg.at)}</span>}
                            </div>
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Review Action Controls */}
                  {!isClosed ? (
                    <div className="space-y-2.5 pt-1">
                      {/* Context-aware Question/Answer Prompts */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                          <span>
                            {isReviewerRole
                              ? isExpired
                                ? 'Reviewer: Click question to ask Operator regarding EXPIRED license:'
                                : 'Reviewer: Click question to ask Operator regarding EXPIRING SOON license:'
                              : 'Operator / Contributor: Click quick answer to respond to Reviewer:'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(isReviewerRole ? (isExpired ? expiredQuestions : expiringSoonQuestions) : operatorAnswers).map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickQuestionClick(l.id, chip)}
                              className="px-2 py-1 text-[11px] rounded bg-[var(--color-background-primary)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)] cursor-pointer text-left truncate max-w-[340px]"
                              title={chip}
                            >
                              + {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Input & Send */}
                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={draftText}
                          onChange={e => setDrafts(prev => ({ ...prev, [l.id]: e.target.value }))}
                          placeholder={
                            isReviewerRole
                              ? `Ask Operator / Contributor questions regarding renewal status of this ${isExpired ? 'expired' : isExpiringSoon ? 'expiring soon' : 'license'}...`
                              : `Operator / Contributor: Type your answer/explanation to the Reviewer...`
                          }
                          className="flex-1 p-2 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--brand)]"
                        />
                        <div className="flex flex-col gap-1 justify-end shrink-0">
                          {isReviewerRole && (
                            <button
                              onClick={() => handleSendQuestion(l.id)}
                              disabled={!draftText.trim()}
                              className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer disabled:opacity-40"
                              title="Ask Operator/Contributor"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>Ask Operator</span>
                            </button>
                          )}
                          {isOperatorRole && (
                            <button
                              onClick={() => handleSendAnswer(l.id)}
                              disabled={!draftText.trim()}
                              className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer disabled:opacity-40"
                              title="Answer to Reviewer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Answer Reviewer</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          {onNavigateToEdit && isOperatorRole && (
                            <button
                              onClick={() => onNavigateToEdit(l)}
                              className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] hover:bg-[var(--brand-light)] text-[var(--brand)] font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Update License Record / Attachments</span>
                            </button>
                          )}
                        </div>

                        {isReviewerRole && (
                          <button
                            onClick={() => onApproveAndLock(l.id, draftText)}
                            className="px-3 py-1 text-xs font-semibold rounded bg-[#3B6D11] hover:bg-[#2d540d] text-white flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Approve & Lock Record</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 rounded bg-[var(--color-background-secondary)] text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#3B6D11]" />
                        <span>Record is approved and locked by Reviewer. Compliance verified.</span>
                      </div>
                      {isReviewerRole && (
                        <button
                          onClick={() => onReopenReview(l.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Reopen Review</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
