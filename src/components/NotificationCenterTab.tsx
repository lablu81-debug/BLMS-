import React, { useState } from 'react';
import {
  Bell,
  Mail,
  MessageCircle,
  Copy,
  Check,
  CheckCircle2,
  Settings,
  Send,
  Play,
  RotateCcw,
  Users,
  FileCode,
  Clock,
  Zap,
  AlertTriangle
} from 'lucide-react';
import {
  LicenseEntry,
  NotificationConfig,
  NotificationRecord,
  UserAccount
} from '../types';
import {
  daysUntil,
  statusColor,
  statusLabel,
  RAG,
  fmtTs
} from '../utils/helpers';

interface NotificationCenterTabProps {
  licenses: LicenseEntry[];
  companies: string[];
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
  notificationConfig: NotificationConfig;
  notificationLog: NotificationRecord[];
  onSaveNotificationConfig: (config: NotificationConfig) => void;
  onRecordNotification: (record: NotificationRecord) => void;
  onRecordBatchNotifications: (records: NotificationRecord[]) => void;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

export const NotificationCenterTab: React.FC<NotificationCenterTabProps> = ({
  licenses,
  companies,
  currentUser,
  globalAlertThreshold,
  licenseThresholds,
  notificationConfig,
  notificationLog,
  onSaveNotificationConfig,
  onRecordNotification,
  onRecordBatchNotifications,
  onShowToast
}) => {
  const [config, setConfig] = useState<NotificationConfig>(notificationConfig);
  const [activeSubTab, setActiveSubTab] = useState<'due' | 'rules' | 'recipients' | 'templates'>('due');

  const isAdmin = currentUser.role === 'Administrator';
  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const myLicenses = licenses.filter(l => inScope(l.company));

  // Determine stage for a license
  const getStageForLicense = (l: LicenseEntry): { key: string; label: string } | null => {
    const days = daysUntil(l.till);
    if (days === null) return null;

    if (days < 0 || l.status === 'Expired') {
      return config.notifyExpired ? { key: 'EXPIRED', label: 'Expired Alert' } : null;
    }

    const matchedThreshold = [...config.stages].sort((a, b) => a - b).find(s => days <= s);
    if (matchedThreshold !== undefined) {
      return { key: `T-${matchedThreshold}`, label: `${matchedThreshold}-Day Notice` };
    }

    return null;
  };

  // Determine if notice is due (has not been sent yet for this stage & till date)
  const isNoticeDue = (l: LicenseEntry) => {
    const stage = getStageForLicense(l);
    if (!stage) return null;

    const existing = notificationLog.find(n => n.licId === l.id && n.till === l.till && n.stage === stage.key);
    if (existing) {
      // If expired and repeat is set
      if (stage.key === 'EXPIRED' && config.repeatDays > 0) {
        const timePassed = Date.now() - existing.at;
        if (timePassed >= config.repeatDays * 24 * 60 * 60 * 1000) {
          return stage;
        }
      }
      return null;
    }

    return stage;
  };

  const dueList = myLicenses
    .map(l => ({ l, stage: isNoticeDue(l), days: daysUntil(l.till) }))
    .filter(item => item.stage !== null)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  // Recipients for unit
  const getRecipientsForUnit = (unit: string) => {
    const all = config.recipients?.ALL || { emails: [], phones: [] };
    const unitRec = config.recipients?.[unit] || { emails: [], phones: [] };
    return {
      emails: Array.from(new Set([...(all.emails || []), ...(unitRec.emails || [])])),
      phones: Array.from(new Set([...(all.phones || []), ...(unitRec.phones || [])]))
    };
  };

  // Template variables builder
  const buildTemplateVars = (l: LicenseEntry) => {
    const days = daysUntil(l.till);
    const color = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
    const actionText = (color !== 'gray' ? RAG[color] : RAG.amber).action;

    let statusText = 'valid';
    if (days === null) statusText = 'no expiry date';
    else if (days < 0) statusText = `expired ${Math.abs(days)} day(s) ago`;
    else if (days === 0) statusText = 'expires today';
    else statusText = `expires in ${days} day(s)`;

    return {
      unit: l.company,
      license: l.name,
      type: l.type,
      number: l.number || '—',
      till: l.till || '—',
      days: days !== null ? Math.abs(days) : '—',
      statusText,
      action: actionText
    };
  };

  const fillTemplate = (template: string, vars: Record<string, any>) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? vars[key] : match));
  };

  const getEmailContent = (l: LicenseEntry) => {
    const vars = buildTemplateVars(l);
    return {
      subject: fillTemplate(config.emailSubject, vars),
      body: fillTemplate(config.emailBody, vars)
    };
  };

  const getWaContent = (l: LicenseEntry) => {
    const vars = buildTemplateVars(l);
    return fillTemplate(config.waBody, vars);
  };

  // Action handlers
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} copied to clipboard!`, 'success');
  };

  const handleMarkSent = (l: LicenseEntry, stageKey: string, stageLabel: string, via: 'auto' | 'manual' = 'manual') => {
    const newRecord: NotificationRecord = {
      licId: l.id,
      unit: l.company,
      name: l.name,
      stage: stageKey,
      label: stageLabel,
      till: l.till,
      at: Date.now(),
      by: currentUser.name,
      via
    };
    onRecordNotification(newRecord);
    onShowToast(`Marked ${stageLabel} as sent for ${l.name}`, 'success');
  };

  const handleMarkAllSent = () => {
    if (!dueList.length) return;
    const records: NotificationRecord[] = dueList.map(item => ({
      licId: item.l.id,
      unit: item.l.company,
      name: item.l.name,
      stage: item.stage!.key,
      label: item.stage!.label,
      till: item.l.till,
      at: Date.now(),
      by: currentUser.name,
      via: 'manual'
    }));

    onRecordBatchNotifications(records);
    onShowToast(`Recorded ${records.length} notices as sent.`, 'success');
  };

  // Next run calculation
  const getNextRunInfo = () => {
    if (!config.autoEmail) return { text: 'Disabled', isAuto: false };
    const runTimes = config.runTimes && config.runTimes.length > 0 ? config.runTimes : ['09:00', '15:00'];
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let nextTime = runTimes.find(t => {
      const [h, m] = t.split(':').map(Number);
      return (h * 60 + m) > currentMins;
    });

    if (!nextTime) {
      nextTime = `${runTimes[0]} (Tomorrow)`;
    }

    return {
      text: nextTime,
      count: config.autoRunCountToday || 2,
      runTimes: runTimes.join(', '),
      moreRuns: config.moreRunsIfNotices
    };
  };

  const nextRunInfo = getNextRunInfo();

  // Simulate Daily Automated Monitoring Run
  const handleRunDailyCheck = () => {
    let triggeredCount = 0;
    const recordsToLog: NotificationRecord[] = [];

    licenses.forEach(l => {
      const stage = isNoticeDue(l);
      if (stage) {
        triggeredCount++;
        recordsToLog.push({
          licId: l.id,
          unit: l.company,
          name: l.name,
          stage: stage.key,
          label: stage.label,
          till: l.till,
          at: Date.now(),
          by: 'Daily Scheduler (BLMS)',
          via: 'auto'
        });
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const nextCount = (config.lastAutoRunDate === todayStr ? (config.autoRunCountToday || 0) : 0) + 1;
    const updatedConfig: NotificationConfig = {
      ...config,
      lastAutoRunAt: Date.now(),
      lastAutoRunDate: todayStr,
      autoRunCountToday: nextCount
    };
    setConfig(updatedConfig);
    onSaveNotificationConfig(updatedConfig);

    if (recordsToLog.length > 0) {
      onRecordBatchNotifications(recordsToLog);
      onShowToast(`Daily check completed! Sent ${triggeredCount} automated notifications (Run #${nextCount} today).`, 'success');
    } else {
      onShowToast(`Daily check completed (Run #${nextCount} today). All licenses are current; no new notices due.`, 'info');
    }
  };

  // Save config
  const handleSaveConfig = () => {
    onSaveNotificationConfig(config);
    onShowToast('Notification settings and templates saved successfully!', 'success');
  };

  // Digest email generator
  const getDigestContent = () => {
    const lines = dueList
      .map(
        x =>
          `• [${x.l.company}] ${x.l.name} (${x.l.number || 'No num'}) — Valid Till: ${x.l.till} — Notice: ${x.stage?.label}`
      )
      .join('\n');

    const allRecipients = Array.from(
      new Set(dueList.flatMap(x => getRecipientsForUnit(x.l.company).emails))
    );

    const subject = `[BLMS Consolidated] ${dueList.length} Business Licenses Need Attention`;
    const body = `Dear Management & Compliance Team,\n\nThe Bitopi Group Business Licenses Monitoring System has flagged the following ${dueList.length} license(s) approaching expiration or overdue:\n\n${lines}\n\nPlease initiate renewal payments or documentation updates immediately.\n\nRegards,\nBLMS Automation`;

    return { subject, body, recipients: allRecipients };
  };

  const digest = getDigestContent();

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Metrics */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--brand)]" />
            <span className="card-title">Notification Center — Automated Reminders & Alerts</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] text-[11px] text-[var(--color-text-secondary)]">
              <Clock className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span>Schedule: <b>{config.runTimes?.length || 2}x daily</b> {config.moreRunsIfNotices ? '+ extra if notices' : ''}</span>
            </div>
            <button
              onClick={handleRunDailyCheck}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-[#3B6D11] hover:bg-[#2f570d] text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Execute daily automated scan for all units immediately"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Daily Check Now</span>
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--color-background-secondary)]/30">
          <div className="p-3 bg-[var(--color-background-primary)] rounded border border-[var(--color-border-tertiary)]">
            <div className="text-[11px] text-[var(--color-text-secondary)]">Notices Due Now</div>
            <div className={`text-2xl font-bold mt-1 ${dueList.length > 0 ? 'text-[#854F0B]' : 'text-[#3B6D11]'}`}>
              {dueList.length}
            </div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">Waiting to be sent</div>
          </div>
          <div className="p-3 bg-[var(--color-background-primary)] rounded border border-[var(--color-border-tertiary)]">
            <div className="text-[11px] text-[var(--color-text-secondary)]">Active Stages</div>
            <div className="text-sm font-bold mt-1 text-[var(--color-text-primary)]">
              {config.stages.join('d, ')}d {config.notifyExpired ? '+ Expired' : ''}
            </div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">Notice milestones</div>
          </div>
          <div className="p-3 bg-[var(--color-background-primary)] rounded border border-[var(--color-border-tertiary)]">
            <div className="text-[11px] text-[var(--color-text-secondary)]">Automated Daily Check</div>
            <div className="text-sm font-bold mt-1 text-[var(--color-text-primary)] flex items-center gap-1.5 flex-wrap">
              <span className={`w-2 h-2 rounded-full ${config.autoEmail ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
              <span>
                {config.autoEmail
                  ? `${config.dailyRunFrequency === '2x' ? 'Twice Daily (2+)' : config.dailyRunFrequency === '3x' ? '3x Daily' : config.dailyRunFrequency === '4x' ? '4x Daily' : 'Continuous'} [${config.runTimes?.join(', ') || '09:00, 15:00'}]`
                  : 'Manual Only'}
              </span>
            </div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] flex items-center justify-between mt-1">
              <span>Runs today: <b className="text-[var(--brand)]">{config.autoRunCountToday || 2}</b> (Next: {nextRunInfo.text})</span>
              {config.moreRunsIfNotices && <span className="text-amber-600 font-semibold">+auto extra if notices</span>}
            </div>
          </div>
          <div className="p-3 bg-[var(--color-background-primary)] rounded border border-[var(--color-border-tertiary)]">
            <div className="text-[11px] text-[var(--color-text-secondary)]">Total Notices Logged</div>
            <div className="text-2xl font-bold mt-1 text-[var(--brand)]">
              {notificationLog.length}
            </div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">Recorded in audit</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Selection */}
      <div className="flex gap-1.5 p-1 bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] rounded-lg overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSubTab('due')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'due'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Bell className="w-3.5 h-3.5" /> Due Now Queue ({dueList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'rules'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" /> Reminder Rules
        </button>
        <button
          onClick={() => setActiveSubTab('recipients')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'recipients'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Stakeholder Recipients
        </button>
        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'templates'
              ? 'bg-[var(--color-background-primary)] text-[var(--brand)] shadow-xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" /> Message Templates
        </button>
      </div>

      {/* SUBTAB 1: Due Now Queue */}
      {activeSubTab === 'due' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Due Now — Notices Waiting to be Sent</span>
            <div className="flex items-center gap-2 flex-wrap">
              {dueList.length > 0 && digest.recipients.length > 0 && (
                <a
                  href={`mailto:${digest.recipients.join(',')}?subject=${encodeURIComponent(digest.subject)}&body=${encodeURIComponent(digest.body)}`}
                  className="px-2.5 py-1 text-xs rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] flex items-center gap-1 font-medium cursor-pointer"
                  title="Send one consolidated email with all due notices"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Digest ({digest.recipients.length} recipients)</span>
                </a>
              )}
              {dueList.length > 0 && (
                <>
                  <button
                    onClick={() => handleCopy(`${digest.subject}\n\n${digest.body}`, 'Digest')}
                    className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Digest</span>
                  </button>
                  <button
                    onClick={handleMarkAllSent}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-[#3B6D11] hover:bg-[#2d540d] text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark All Sent</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Automated Daily Runner Status Banner */}
          <div className="p-3 bg-[var(--color-background-secondary)]/60 border-b border-[var(--color-border-tertiary)] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${config.autoEmail ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-semibold text-[var(--color-text-primary)]">
                Automated Daily Checks:
              </span>
              <span className="text-[var(--color-text-secondary)]">
                {config.autoEmail ? (
                  <>
                    Scheduled <b>{config.runTimes?.length || 2}x daily</b> ({config.runTimes?.join(', ') || '09:00, 15:00'})
                    {config.moreRunsIfNotices && ' • Automatically checks twice or more times if notices exist'}
                  </>
                ) : (
                  'Disabled'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-[var(--color-text-tertiary)]">
                Today's runs: <b className="text-[var(--brand)]">{config.autoRunCountToday || 2}</b>
              </span>
              <span className="text-[var(--color-border-secondary)]">|</span>
              <span className="text-[var(--color-text-tertiary)]">
                Next scheduled: <b>{nextRunInfo.text}</b>
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="blms-table">
              <thead>
                <tr>
                  <th>L No</th>
                  <th>Unit</th>
                  <th>License Name</th>
                  <th>Valid Till</th>
                  <th>Notice Stage</th>
                  <th>Send via Email</th>
                  <th>Send via WhatsApp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dueList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                      <CheckCircle2 className="w-8 h-8 text-[#3B6D11] mx-auto mb-2 opacity-80" />
                      No reminder notices currently due. Every license is compliant or has already been notified!
                    </td>
                  </tr>
                ) : (
                  dueList.map(item => {
                    const l = item.l;
                    const stage = item.stage!;
                    const recipients = getRecipientsForUnit(l.company);
                    const emailContent = getEmailContent(l);
                    const waText = getWaContent(l);

                    const mailtoUrl = recipients.emails.length
                      ? `mailto:${recipients.emails.join(',')}?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`
                      : '';

                    return (
                      <tr key={l.id}>
                        <td className="text-[11px] font-mono text-[var(--color-text-secondary)]">{l.id}</td>
                        <td><span className="badge badge-blue">{l.company}</span></td>
                        <td className="font-semibold text-xs">
                          {l.name}
                          <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono">{l.number}</div>
                        </td>
                        <td className="text-xs">{l.till}</td>
                        <td>
                          <span className={`badge ${stage.key === 'EXPIRED' ? 'badge-red' : 'badge-amber'}`}>
                            {stage.label}
                          </span>
                        </td>
                        <td>
                          {mailtoUrl ? (
                            <div className="flex items-center gap-1">
                              <a
                                href={mailtoUrl}
                                onClick={() => handleCopy(`${emailContent.subject}\n\n${emailContent.body}`, 'Email')}
                                className="px-2 py-0.5 text-xs rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] inline-flex items-center gap-1 cursor-pointer"
                                title={`Send email to: ${recipients.emails.join(', ')}`}
                              >
                                <Mail className="w-3 h-3" />
                                <span>Email</span>
                              </a>
                              <button
                                onClick={() => handleCopy(`${emailContent.subject}\n\n${emailContent.body}`, 'Email content')}
                                className="p-1 rounded hover:bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]"
                                title="Copy email text"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">No email configured</span>
                          )}
                        </td>
                        <td>
                          {recipients.phones.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {recipients.phones.map(ph => (
                                <a
                                  key={ph}
                                  href={`https://wa.me/${ph}?text=${encodeURIComponent(waText)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 text-xs rounded bg-emerald-700 text-white hover:bg-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                                  title={`Open WhatsApp chat with +${ph}`}
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WA (+{ph.slice(-4)})</span>
                                </a>
                              ))}
                              <button
                                onClick={() => handleCopy(waText, 'WhatsApp text')}
                                className="p-1 rounded hover:bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]"
                                title="Copy WhatsApp text"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">No phone set</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleMarkSent(l, stage.key, stage.label)}
                            className="px-2 py-0.5 text-xs rounded font-medium bg-[#3B6D11] text-white hover:bg-[#2d540d] flex items-center gap-1 cursor-pointer"
                            title="Record this notice as sent to prevent duplicate alerts"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Sent</span>
                          </button>
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

      {/* SUBTAB 2: Reminder Rules */}
      {activeSubTab === 'rules' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Reminder Milestone & Scheduling Rules</span>
          </div>

          <div className="p-4 space-y-4 max-w-2xl">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                Active Channels
              </label>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.email}
                    onChange={e => setConfig(prev => ({ ...prev, email: e.target.checked }))}
                    disabled={!isAdmin}
                    className="accent-[var(--brand)]"
                  />
                  <span>Email (Automated & One-Click Mailto)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.whatsapp}
                    onChange={e => setConfig(prev => ({ ...prev, whatsapp: e.target.checked }))}
                    disabled={!isAdmin}
                    className="accent-[var(--brand)]"
                  />
                  <span>WhatsApp (One-Click Direct Link)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                Notice Milestones (Days before expiration)
              </label>
              <input
                type="text"
                value={config.stages.join(', ')}
                onChange={e => {
                  const arr = e.target.value
                    .split(',')
                    .map(x => parseInt(x.trim()))
                    .filter(n => !isNaN(n) && n > 0);
                  setConfig(prev => ({ ...prev, stages: arr }));
                }}
                disabled={!isAdmin}
                placeholder="e.g. 60, 30, 15, 7"
                className="w-full px-3 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
              />
              <div className="text-[10px] text-[var(--color-text-tertiary)]">
                Comma-separated integers. A notice is triggered whenever a license valid-till date crosses each milestone.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                Expired License Recurring Alerts
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifyExpired}
                    onChange={e => setConfig(prev => ({ ...prev, notifyExpired: e.target.checked }))}
                    disabled={!isAdmin}
                    className="accent-[var(--brand)]"
                  />
                  <span>Trigger Alert when Expired</span>
                </label>

                <div className="flex items-center gap-1.5 text-xs">
                  <span>Repeat every</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={config.repeatDays}
                    onChange={e => setConfig(prev => ({ ...prev, repeatDays: parseInt(e.target.value) || 7 }))}
                    disabled={!isAdmin}
                    className="w-16 px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                  <span>days</span>
                </div>
              </div>
            </div>

            {/* Automated Daily Check Schedule & Frequency Configuration */}
            <div className="p-3.5 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-light)]/20 space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--brand)]" />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    Automated Daily Check & Recurring Schedule
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoEmail}
                    onChange={e => setConfig(prev => ({ ...prev, autoEmail: e.target.checked }))}
                    disabled={!isAdmin}
                    className="accent-[var(--brand)]"
                  />
                  <span>Automated Scan Engine Active</span>
                </label>
              </div>

              <div className="text-[11px] text-[var(--color-text-secondary)]">
                BLMS automated background scanner runs compliance checks to detect upcoming license expirations, calculate stage milestones, and log reminders for all units.
              </div>

              {/* Frequency selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Automated Check Frequency
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        dailyRunFrequency: '2x',
                        runTimes: ['09:00', '15:00']
                      }));
                    }}
                    className={`p-2.5 rounded border text-left flex items-start gap-2 cursor-pointer transition-colors ${
                      config.dailyRunFrequency === '2x'
                        ? 'bg-[var(--color-background-primary)] border-[var(--brand)] shadow-xs ring-1 ring-[var(--brand)]'
                        : 'bg-[var(--color-background-primary)] border-[var(--color-border-secondary)] hover:border-[var(--brand)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dailyRunFreq"
                      checked={config.dailyRunFrequency === '2x'}
                      onChange={() => {}}
                      className="mt-0.5 accent-[var(--brand)]"
                    />
                    <div>
                      <div className="font-bold text-[var(--color-text-primary)]">Twice Daily (Recommended)</div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">09:00 AM (Morning) & 03:00 PM (Afternoon)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        dailyRunFrequency: '3x',
                        runTimes: ['09:00', '13:00', '17:00']
                      }));
                    }}
                    className={`p-2.5 rounded border text-left flex items-start gap-2 cursor-pointer transition-colors ${
                      config.dailyRunFrequency === '3x'
                        ? 'bg-[var(--color-background-primary)] border-[var(--brand)] shadow-xs ring-1 ring-[var(--brand)]'
                        : 'bg-[var(--color-background-primary)] border-[var(--color-border-secondary)] hover:border-[var(--brand)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dailyRunFreq"
                      checked={config.dailyRunFrequency === '3x'}
                      onChange={() => {}}
                      className="mt-0.5 accent-[var(--brand)]"
                    />
                    <div>
                      <div className="font-bold text-[var(--color-text-primary)]">3 Times Daily</div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">09:00 AM, 01:00 PM & 05:00 PM</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        dailyRunFrequency: '4x',
                        runTimes: ['06:00', '12:00', '18:00', '00:00']
                      }));
                    }}
                    className={`p-2.5 rounded border text-left flex items-start gap-2 cursor-pointer transition-colors ${
                      config.dailyRunFrequency === '4x'
                        ? 'bg-[var(--color-background-primary)] border-[var(--brand)] shadow-xs ring-1 ring-[var(--brand)]'
                        : 'bg-[var(--color-background-primary)] border-[var(--color-border-secondary)] hover:border-[var(--brand)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dailyRunFreq"
                      checked={config.dailyRunFrequency === '4x'}
                      onChange={() => {}}
                      className="mt-0.5 accent-[var(--brand)]"
                    />
                    <div>
                      <div className="font-bold text-[var(--color-text-primary)]">4 Times Daily (Every 6 hrs)</div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">06:00, 12:00, 18:00 & 00:00</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        dailyRunFrequency: 'hourly_if_notices',
                        runTimes: ['09:00', '15:00'],
                        moreRunsIfNotices: true,
                        autoExtraIntervalHours: 1
                      }));
                    }}
                    className={`p-2.5 rounded border text-left flex items-start gap-2 cursor-pointer transition-colors ${
                      config.dailyRunFrequency === 'hourly_if_notices'
                        ? 'bg-[var(--color-background-primary)] border-[var(--brand)] shadow-xs ring-1 ring-[var(--brand)]'
                        : 'bg-[var(--color-background-primary)] border-[var(--color-border-secondary)] hover:border-[var(--brand)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dailyRunFreq"
                      checked={config.dailyRunFrequency === 'hourly_if_notices'}
                      onChange={() => {}}
                      className="mt-0.5 accent-[var(--brand)]"
                    />
                    <div>
                      <div className="font-bold text-[var(--color-text-primary)]">Hourly Continuous if Notices Pending</div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">Automated scan every hour while queue has items</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Extra runs when notices exist - SPECIFIED IN USER REQUEST */}
              <div className="pt-2 border-t border-[var(--color-border-tertiary)] space-y-2">
                <label className="flex items-start gap-2 text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.moreRunsIfNotices}
                    onChange={e => setConfig(prev => ({ ...prev, moreRunsIfNotices: e.target.checked }))}
                    disabled={!isAdmin}
                    className="accent-[var(--brand)] mt-0.5"
                  />
                  <div>
                    <span className="text-[var(--color-text-primary)] font-bold">
                      Run automated checks twice or more times automatically if have notices
                    </span>
                    <p className="font-normal text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                      Ensures compliance alerts are promptly delivered: when pending notices exist in the Due Queue, the background engine runs additional automated checks throughout the day instead of waiting until tomorrow.
                    </p>
                  </div>
                </label>

                {config.moreRunsIfNotices && (
                  <div className="flex items-center gap-2 pl-5 text-xs text-[var(--color-text-secondary)]">
                    <span>Re-check interval when notices are pending:</span>
                    <select
                      value={config.autoExtraIntervalHours || 3}
                      onChange={e => setConfig(prev => ({ ...prev, autoExtraIntervalHours: Number(e.target.value) }))}
                      disabled={!isAdmin}
                      className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-medium"
                    >
                      <option value={1}>Every 1 hour (Continuous Alerting)</option>
                      <option value={2}>Every 2 hours (High Urgency)</option>
                      <option value={3}>Every 3 hours (Twice or more times)</option>
                      <option value={4}>Every 4 hours</option>
                      <option value={6}>Every 6 hours</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Scheduled Run Times Display & Adding */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--color-border-tertiary)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Scheduled Daily Check Times ({config.runTimes?.length || 2} times/day)
                  </label>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">24-hour format (HH:MM)</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(config.runTimes || ['09:00', '15:00']).map((timeSlot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-background-primary)] border border-[var(--color-border-secondary)] text-xs font-mono font-bold text-[var(--color-text-primary)]"
                    >
                      <Clock className="w-3 h-3 text-[var(--brand)]" />
                      <span>{timeSlot}</span>
                      {isAdmin && (config.runTimes?.length || 2) > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newTimes = (config.runTimes || []).filter((_, i) => i !== idx);
                            setConfig(prev => ({ ...prev, runTimes: newTimes }));
                          }}
                          className="text-red-500 hover:text-red-700 ml-1 text-xs cursor-pointer"
                          title="Remove time slot"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSlot = prompt('Enter additional check time (HH:MM, e.g. 11:30 or 16:00):');
                        if (newSlot && /^([01]\d|2[0-3]):([0-5]\d)$/.test(newSlot)) {
                          const updated = Array.from(new Set([...(config.runTimes || []), newSlot])).sort();
                          setConfig(prev => ({ ...prev, runTimes: updated }));
                        }
                      }}
                      className="px-2 py-1 text-xs rounded border border-dashed border-[var(--color-border-secondary)] hover:border-[var(--brand)] text-[var(--color-text-secondary)] hover:text-[var(--brand)] cursor-pointer"
                    >
                      + Add Time Slot
                    </button>
                  )}
                </div>
              </div>

              {/* Runner Live Status Footer */}
              <div className="p-2.5 rounded bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] text-[11px] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.autoEmail ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-[var(--color-text-secondary)]">
                    Automated Runner: <b className={config.autoEmail ? 'text-green-700 dark:text-green-400 font-bold' : 'text-gray-500 font-bold'}>{config.autoEmail ? 'Active' : 'Disabled'}</b> • Executed today: <b>{config.autoRunCountToday || 2} runs</b>
                  </span>
                </div>
                <div className="text-[var(--color-text-tertiary)]">
                  Next automated check: <b className="text-[var(--color-text-primary)]">{nextRunInfo.text}</b>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3">
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
                >
                  Save Reminder Rules
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Stakeholder Recipients */}
      {activeSubTab === 'recipients' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Stakeholder Notification Recipients by Unit</span>
          </div>

          <div className="p-3 bg-[var(--color-background-secondary)]/50 border-b border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)]">
            "All units" (Global) receives all company alerts. Individual unit lists receive alerts only for their assigned factory licenses. Separate multiple emails/numbers with commas.
          </div>

          <div className="p-4 space-y-4">
            {['ALL', ...companies].map(compKey => {
              const current = config.recipients?.[compKey] || { emails: [], phones: [] };

              return (
                <div key={compKey} className="p-3 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--brand)]">
                      {compKey === 'ALL' ? 'Global Group Distribution (All Units)' : `Factory Unit: ${compKey}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Email Addresses</label>
                      <input
                        type="text"
                        value={current.emails.join(', ')}
                        onChange={e => {
                          const emails = e.target.value.split(',').map(x => x.trim()).filter(Boolean);
                          setConfig(prev => ({
                            ...prev,
                            recipients: {
                              ...prev.recipients,
                              [compKey]: { ...current, emails }
                            }
                          }));
                        }}
                        disabled={!isAdmin}
                        placeholder="e.g. compliance@bitopibd.com, hr@bitopibd.com"
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[var(--color-text-secondary)]">WhatsApp Phone Numbers (e.g. 88017...)</label>
                      <input
                        type="text"
                        value={current.phones.join(', ')}
                        onChange={e => {
                          const phones = e.target.value.split(',').map(x => x.trim()).filter(Boolean);
                          setConfig(prev => ({
                            ...prev,
                            recipients: {
                              ...prev.recipients,
                              [compKey]: { ...current, phones }
                            }
                          }));
                        }}
                        disabled={!isAdmin}
                        placeholder="e.g. 8801713000001, 8801812345678"
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {isAdmin && (
              <div className="pt-2">
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
                >
                  Save Recipients Directory
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: Message Templates */}
      {activeSubTab === 'templates' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Dynamic Message Templates</span>
          </div>

          <div className="p-4 space-y-4">
            <div className="p-3 bg-[var(--color-background-secondary)] rounded text-xs space-y-1 text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Available Variable Placeholders:</span>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[var(--brand)] pt-1">
                <span>{'{unit}'}</span>
                <span>{'{license}'}</span>
                <span>{'{type}'}</span>
                <span>{'{number}'}</span>
                <span>{'{till}'}</span>
                <span>{'{days}'}</span>
                <span>{'{statusText}'}</span>
                <span>{'{action}'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">Email Subject Template</label>
              <input
                type="text"
                value={config.emailSubject}
                onChange={e => setConfig(prev => ({ ...prev, emailSubject: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">Email Body Template</label>
              <textarea
                rows={9}
                value={config.emailBody}
                onChange={e => setConfig(prev => ({ ...prev, emailBody: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">WhatsApp Message Template</label>
              <textarea
                rows={5}
                value={config.waBody}
                onChange={e => setConfig(prev => ({ ...prev, waBody: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono leading-relaxed"
              />
            </div>

            {isAdmin && (
              <div className="pt-2">
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
                >
                  Save Message Templates
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
