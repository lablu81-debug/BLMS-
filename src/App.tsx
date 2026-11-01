/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LicenseEntry,
  UserAccount,
  AttachedDoc,
  PaymentLink,
  NotificationConfig,
  NotificationRecord,
  AuditEntry,
  AuditFieldChange
} from './types';
import {
  loadAppState,
  saveAppState,
  getRememberedUserId,
  setRememberedUserId,
  AppStateData
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginScreen } from './components/LoginScreen';
import { DashboardTab } from './components/DashboardTab';
import { NewEntryTab } from './components/NewEntryTab';
import { ImportTab } from './components/ImportTab';
import { ReportPrintTab } from './components/ReportPrintTab';
import { MasterDataTab } from './components/MasterDataTab';
import { FeedbackTab } from './components/FeedbackTab';
import { ReviewTab } from './components/ReviewTab';
import { RenewalPaymentTab } from './components/RenewalPaymentTab';
import { PaymentLinksTab } from './components/PaymentLinksTab';
import { ProcessMatrixTab } from './components/ProcessMatrixTab';
import { NotificationCenterTab } from './components/NotificationCenterTab';
import { NotificationLogTab } from './components/NotificationLogTab';
import { AuditLogTab } from './components/AuditLogTab';
import { AdminPanelTab } from './components/AdminPanelTab';
import { KpiTab } from './components/KpiTab';
import { DocViewerModal, ConfirmModal, ToastStack, ConfirmState, ToastState } from './components/Modals';

export default function App() {
  const [data, setData] = useState<AppStateData>(loadAppState);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const rememberedId = getRememberedUserId();
    return Boolean(rememberedId);
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const rememberedId = getRememberedUserId();
    return rememberedId || data.users[0]?.id || 'u1';
  });

  const currentUser = data.users.find(u => u.id === currentUserId) || data.users[0];

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Currently editing license in New Entry
  const [editingLicense, setEditingLicense] = useState<LicenseEntry | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('blms_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Modal / Toast States
  const [viewingDoc, setViewingDoc] = useState<AttachedDoc | null>(null);
  const [viewingDocList, setViewingDocList] = useState<AttachedDoc[]>([]);
  const [viewingDocTitle, setViewingDocTitle] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Sync theme with document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      try {
        localStorage.setItem('blms_theme', 'dark');
      } catch {
        // Ignore
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      try {
        localStorage.setItem('blms_theme', 'light');
      } catch {
        // Ignore
      }
    }
  }, [isDarkMode]);

  // Persist state updates to localStorage
  useEffect(() => {
    saveAppState(data);
  }, [data]);

  // Toast Helper
  const showToast = useCallback((message: string, kind: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts(prev => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Audit Logging Helper
  const logAudit = useCallback((
    action: AuditEntry['action'],
    entity: string,
    entityId: string,
    unit: string,
    summary: string,
    changes: AuditFieldChange[] = []
  ) => {
    const entry: AuditEntry = {
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      user: `${currentUser.name} (${currentUser.role})`,
      action,
      entity,
      entityId,
      unit,
      summary,
      changes
    };

    setData(prev => ({
      ...prev,
      auditLog: [entry, ...prev.auditLog].slice(0, 1000)
    }));
  }, [currentUser]);

  // Allowed menus for current user
  const getAllowedMenus = useCallback((): string[] => {
    if (Array.isArray(currentUser.menus)) {
      const set = new Set(currentUser.menus);
      if (currentUser.role === 'Administrator') {
        set.add('user_governance');
      }
      set.add('kpi');
      return Array.from(set);
    }

    const defaultRolePerms = data.menuPermissions[currentUser.role] || [
      'dashboard',
      'entry',
      'report',
      'master_data',
      'kpi'
    ];

    const accessibleUnits =
      currentUser.units === 'All'
        ? data.companies
        : Array.isArray(currentUser.units)
        ? currentUser.units
        : [];

    const allowed = new Set<string>();

    if (accessibleUnits.length > 0) {
      accessibleUnits.forEach(c => {
        const roleInUnit = currentUser.unitRoles?.[c] || currentUser.role;
        const unitRolePerms =
          data.unitMenuPermissions[c]?.[roleInUnit] ||
          data.menuPermissions[roleInUnit] ||
          defaultRolePerms;
        unitRolePerms.forEach(m => allowed.add(m));
      });
    } else {
      defaultRolePerms.forEach(m => allowed.add(m));
    }

    if (currentUser.role === 'Administrator') {
      allowed.add('user_governance');
    }
    allowed.add('kpi');

    return Array.from(allowed);
  }, [currentUser, data.menuPermissions, data.unitMenuPermissions, data.companies]);

  const allowedMenus = getAllowedMenus();

  // If active tab not allowed or old 'admin', fall back
  useEffect(() => {
    if (activeTab === 'admin') {
      setActiveTab('user_governance');
      return;
    }
    if (allowedMenus.length > 0 && !allowedMenus.includes(activeTab)) {
      setActiveTab(allowedMenus.includes('dashboard') ? 'dashboard' : allowedMenus[0]);
    }
  }, [allowedMenus, activeTab]);

  // Auth Handlers
  const handleSignInSuccess = (user: UserAccount, remember: boolean) => {
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
    if (remember) {
      setRememberedUserId(user.id);
    } else {
      setRememberedUserId(null);
    }
    logAudit('Access', 'Session', '', 'All', `Signed in as ${user.name}`);
    showToast(`Welcome back, ${user.name}!`, 'success');
  };

  const handleSignOut = () => {
    logAudit('Access', 'Session', '', 'All', `Signed out (${currentUser.name})`);
    setIsAuthenticated(false);
    setRememberedUserId(null);
    showToast('Signed out successfully.', 'info');
  };

  const handleSwitchUser = (userId: string) => {
    const nextUser = data.users.find(u => u.id === userId);
    if (!nextUser || nextUser.id === currentUser.id) return;

    logAudit(
      'Access',
      'User Switch',
      nextUser.id,
      'All',
      `Switched signed-in user from ${currentUser.name} (${currentUser.role}) to ${nextUser.name} (${nextUser.role})`,
      [
        {
          field: 'User',
          from: `${currentUser.name} (${currentUser.role})`,
          to: `${nextUser.name} (${nextUser.role})`
        }
      ]
    );

    setCurrentUserId(nextUser.id);
    setEditingLicense(null);
    showToast(`Switched user to ${nextUser.name} (${nextUser.role})`, 'info');
  };

  // License CRUD Handlers
  const handleSaveLicense = (entry: LicenseEntry, isEdit: boolean) => {
    const prev = data.licenses.find(l => l.id === entry.id);

    if (isEdit && prev) {
      const changes: AuditFieldChange[] = [];
      const fieldsToCheck: (keyof LicenseEntry)[] = [
        'company',
        'type',
        'name',
        'number',
        'from',
        'till',
        'status',
        'category',
        'action',
        'comments'
      ];

      fieldsToCheck.forEach(f => {
        const vOld = String(prev[f] || '—');
        const vNew = String(entry[f] || '—');
        if (vOld !== vNew) {
          changes.push({ field: String(f), from: vOld, to: vNew });
        }
      });

      const updateThread = [...(prev.thread || [])];
      const summaryChange = changes.map(c => `${c.field} changed from ${c.from} to ${c.to}`).join(', ') || 'record refreshed';
      updateThread.push({
        id: 'sys_' + Date.now().toString(36),
        at: Date.now(),
        by: currentUser.name,
        from: 'Dept',
        text: `Updated by Operator / Contributor (${currentUser.name}): ${summaryChange}. Flagged for Reviewer inspection.`,
        system: true
      });

      const updatedEntry: LicenseEntry = {
        ...entry,
        thread: updateThread,
        reviewState: 'Awaiting Reviewer',
        locked: false
      };

      setData(prevData => ({
        ...prevData,
        licenses: prevData.licenses.map(l => (l.id === entry.id ? updatedEntry : l))
      }));

      logAudit('Updated', 'License', entry.id, entry.company, `Updated ${entry.name} (Flagged for Reviewer)`, changes);
      showToast(`Updated license ${entry.name}! Flagged for Reviewer inspection.`, 'success');
    } else {
      setData(prevData => ({
        ...prevData,
        licenses: [entry, ...prevData.licenses]
      }));

      logAudit('Created', 'License', entry.id, entry.company, `Created ${entry.name}`, [
        { field: 'Type', from: '—', to: entry.type },
        { field: 'Valid Till', from: '—', to: entry.till || 'One-time' },
        { field: 'Status', from: '—', to: entry.status }
      ]);
      showToast(`Created new license ${entry.name} (${entry.id})`, 'success');
    }

    setEditingLicense(null);
  };

  const handleDeleteLicense = (id: string) => {
    const license = data.licenses.find(l => l.id === id);
    if (!license) return;

    setConfirmModal({
      message: `Are you sure you want to delete license "${license.name}" (${license.id})? This cannot be undone.`,
      onYes: () => {
        setData(prevData => ({
          ...prevData,
          licenses: prevData.licenses.filter(l => l.id !== id)
        }));
        if (editingLicense?.id === id) setEditingLicense(null);
        logAudit('Deleted', 'License', id, license.company, `Deleted ${license.name}`);
        showToast(`Deleted ${license.name}`, 'success');
      }
    });
  };

  const handleImportSuccess = (imported: LicenseEntry[], filename: string) => {
    setData(prevData => ({
      ...prevData,
      licenses: [...imported, ...prevData.licenses]
    }));

    logAudit(
      'Created',
      'Import',
      filename,
      'Multiple',
      `Imported ${imported.length} licenses from ${filename}`
    );
    showToast(`Successfully imported ${imported.length} license records!`, 'success');
    setActiveTab('master_data');
  };

  // Feedback & Review Handlers
  const handlePostMessage = (licenseId: string, from: 'Reviewer' | 'Dept', text: string) => {
    const license = data.licenses.find(l => l.id === licenseId);
    if (!license) return;

    const newMessage = {
      id: 'msg_' + Date.now().toString(36),
      at: Date.now(),
      by: currentUser.name,
      from,
      text
    };

    const nextThread = [...(license.thread || []), newMessage];
    const nextState = from === 'Reviewer' ? 'Awaiting Dept' : 'Awaiting Reviewer';

    setData(prevData => ({
      ...prevData,
      licenses: prevData.licenses.map(l => {
        if (l.id === licenseId) {
          return {
            ...l,
            thread: nextThread,
            reviewState: nextState as any,
            feedback: from === 'Reviewer' ? text : l.feedback,
            locked: false
          };
        }
        return l;
      })
    }));

    logAudit(
      'Review',
      'License',
      licenseId,
      license.company,
      from === 'Reviewer'
        ? `Reviewer (${currentUser.name}) put comments for Operator / Contributor on ${license.name}`
        : `Operator / Contributor (${currentUser.name}) replied to Reviewer on ${license.name}`,
      [{ field: from === 'Reviewer' ? 'Reviewer → Operator/Contributor' : 'Operator/Contributor → Reviewer', from: '—', to: text }]
    );

    showToast(
      from === 'Reviewer'
        ? 'Feedback comment sent to Operator / Contributor!'
        : 'Reply sent to Reviewer!',
      'success'
    );
  };

  const handleApproveAndLock = (licenseId: string, finalNote?: string) => {
    const license = data.licenses.find(l => l.id === licenseId);
    if (!license) return;

    const msgs = [...(license.thread || [])];
    if (finalNote?.trim()) {
      msgs.push({
        id: 'msg_' + Date.now().toString(36),
        at: Date.now(),
        by: currentUser.name,
        from: 'Reviewer',
        text: finalNote.trim()
      });
    }

    msgs.push({
      id: 'sys_' + Date.now().toString(36),
      at: Date.now(),
      by: currentUser.name,
      from: 'Reviewer',
      text: `Approved and locked by ${currentUser.name}`,
      system: true
    });

    setData(prevData => ({
      ...prevData,
      licenses: prevData.licenses.map(l => {
        if (l.id === licenseId) {
          return {
            ...l,
            thread: msgs,
            reviewState: 'Closed',
            locked: true,
            feedback: finalNote?.trim() || l.feedback
          };
        }
        return l;
      })
    }));

    logAudit(
      'Review',
      'License',
      licenseId,
      license.company,
      `Approved and locked record: ${license.name}`
    );
    showToast(`Approved and locked compliance record for ${license.name}`, 'success');
  };

  const handleReopenReview = (licenseId: string) => {
    const license = data.licenses.find(l => l.id === licenseId);
    if (!license) return;

    const msgs = [
      ...(license.thread || []),
      {
        id: 'sys_' + Date.now().toString(36),
        at: Date.now(),
        by: currentUser.name,
        from: 'Reviewer' as const,
        text: `Review reopened by ${currentUser.name}`,
        system: true
      }
    ];

    setData(prevData => ({
      ...prevData,
      licenses: prevData.licenses.map(l => {
        if (l.id === licenseId) {
          return {
            ...l,
            thread: msgs,
            reviewState: 'Awaiting Dept',
            locked: false
          };
        }
        return l;
      })
    }));

    logAudit(
      'Review',
      'License',
      licenseId,
      license.company,
      `Reopened review for ${license.name}`
    );
    showToast('Reopened review. Department can now update fields and reply.', 'info');
  };

  // Payment Link Handlers
  const handleSavePaymentLink = (link: PaymentLink, isNew: boolean) => {
    if (isNew) {
      setData(prev => ({
        ...prev,
        paymentLinks: [...prev.paymentLinks, link]
      }));
      logAudit('Admin', 'Payment Portal', link.name, 'All', `Added portal link "${link.name}"`);
    } else {
      setData(prev => ({
        ...prev,
        paymentLinks: prev.paymentLinks.map(p => (p.id === link.id ? link : p))
      }));
      logAudit('Admin', 'Payment Portal', link.name, 'All', `Updated portal link "${link.name}"`);
    }
    showToast('Saved government payment portal link.', 'success');
  };

  const handleDeletePaymentLink = (id: string) => {
    const target = data.paymentLinks.find(p => p.id === id);
    if (!target) return;

    setConfirmModal({
      message: `Delete portal link "${target.name}"?`,
      onYes: () => {
        setData(prev => ({
          ...prev,
          paymentLinks: prev.paymentLinks.filter(p => p.id !== id)
        }));
        logAudit('Admin', 'Payment Portal', target.name, 'All', `Deleted portal link "${target.name}"`);
        showToast('Deleted portal link.', 'info');
      }
    });
  };

  // Notification Handlers
  const handleRecordNotification = (record: NotificationRecord) => {
    setData(prev => ({
      ...prev,
      notificationLog: [record, ...prev.notificationLog]
    }));
    logAudit(
      'Notify',
      'License',
      record.licId,
      record.unit,
      `${record.label} sent for ${record.name} (${record.via})`
    );
  };

  const handleRecordBatchNotifications = (records: NotificationRecord[]) => {
    setData(prev => ({
      ...prev,
      notificationLog: [...records, ...prev.notificationLog]
    }));
    logAudit(
      'Notify',
      'License Batch',
      `${records.length} records`,
      'Multiple',
      `Sent / recorded batch of ${records.length} compliance reminders`
    );
  };

  const handleSaveNotificationConfig = (config: NotificationConfig) => {
    setData(prev => ({
      ...prev,
      notificationConfig: config
    }));
    logAudit('Admin', 'Notification Rules', '', 'All', 'Updated notification rules & templates');
  };

  // Admin Panel Master Data Handlers
  const handleUpdateCompanies = (newCompanies: string[], renamedFrom?: string, renamedTo?: string) => {
    setData(prev => {
      let updatedLicenses = prev.licenses;
      if (renamedFrom && renamedTo) {
        updatedLicenses = prev.licenses.map(l =>
          l.company === renamedFrom ? { ...l, company: renamedTo } : l
        );
      }
      return {
        ...prev,
        companies: newCompanies,
        licenses: updatedLicenses
      };
    });

    if (renamedFrom && renamedTo) {
      logAudit('Admin', 'Company Unit', renamedTo, renamedTo, `Renamed unit ${renamedFrom} to ${renamedTo}`);
    } else {
      logAudit('Admin', 'Company Units', '', 'All', 'Updated company units registry');
    }
  };

  const handleUpdateLicenseTypes = (types: string[]) => {
    setData(prev => ({ ...prev, licenseTypes: types }));
    logAudit('Admin', 'License Types', '', 'All', 'Updated license types directory');
  };

  const handleUpdateLicenseNames = (names: Record<string, string[]>) => {
    setData(prev => ({ ...prev, licenseNames: names }));
    logAudit('Admin', 'License Names', '', 'All', 'Updated official license names directory');
  };

  const handleUpdateUsers = (users: UserAccount[]) => {
    setData(prev => ({ ...prev, users }));
    logAudit('Admin', 'Users', '', 'All', 'Updated user access accounts');
  };

  const handleUpdateAlertThreshold = (threshold: number) => {
    const oldVal = data.alertThreshold;
    setData(prev => ({ ...prev, alertThreshold: threshold }));
    logAudit(
      'Admin',
      'Alert Rule',
      'Global Threshold',
      'All',
      `Updated default alert threshold to ${threshold} days`,
      [{ field: 'Threshold', from: `${oldVal}d`, to: `${threshold}d` }]
    );
  };

  const handleUpdateLicenseThresholds = (thresholds: Record<string, number>) => {
    setData(prev => ({ ...prev, licenseThresholds: thresholds }));
    logAudit('Admin', 'Alert Thresholds', '', 'All', 'Updated license-wise threshold overrides');
  };

  const handleUpdateMenuPermissions = (perms: Record<string, string[]>) => {
    setData(prev => ({ ...prev, menuPermissions: perms }));
    logAudit('Admin', 'Menu Permissions', '', 'All', 'Updated global role menu permissions');
  };

  const handleUpdateUnitMenuPermissions = (perms: Record<string, Record<string, string[]>>) => {
    setData(prev => ({ ...prev, unitMenuPermissions: perms }));
    logAudit('Admin', 'Unit Menu Permissions', '', 'All', 'Updated unit-wise menu permissions');
  };

  // Navigations from notifications or tables
  const handleNavigateToLicense = (id: string, mode: 'entry' | 'review' | 'feedback' | 'dashboard') => {
    const lic = data.licenses.find(l => l.id === id);
    if (!lic) return;

    if (mode === 'entry') {
      setEditingLicense(lic);
      setActiveTab('entry');
    } else if (mode === 'review') {
      setActiveTab('review');
    } else if (mode === 'feedback') {
      setActiveTab('feedback');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Badges calculations
  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const myScopedLicenses = data.licenses.filter(l => inScope(l.company));

  const feedbackBadgeCount = myScopedLicenses.filter(l => {
    if (currentUser.role === 'Administrator') {
      return l.reviewState === 'Awaiting Reviewer' || l.reviewState === 'Awaiting Dept';
    }
    if (currentUser.role === 'Verifier') {
      return l.reviewState === 'Awaiting Reviewer';
    }
    if (currentUser.role === 'Operator / Contributor') {
      return l.reviewState === 'Awaiting Dept';
    }
    return false;
  }).length;

  const reviewBadgeCount = myScopedLicenses.filter(l => {
    const days = Math.ceil((new Date(l.till).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return (l.status === 'Expired' || (days !== null && days <= data.alertThreshold)) && l.reviewState !== 'Closed';
  }).length;

  const notifyDueCount = myScopedLicenses.filter(l => {
    const days = Math.ceil((new Date(l.till).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (isNaN(days)) return false;
    return days <= 60;
  }).length;

  // Automated Background Daily Scanner (runs automatically twice or more times if have notices)
  useEffect(() => {
    const config = data.notificationConfig;
    if (!config.autoEmail) return;

    const runAutomatedScan = (reason: string) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const stages = [...(config.stages || [60, 30, 15, 7])].sort((a, b) => a - b);
      const recordsToLog: NotificationRecord[] = [];

      data.licenses.forEach(l => {
        if (!l.till) return;
        const days = Math.ceil((new Date(l.till).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (isNaN(days)) return;

        let stageKey: string | null = null;
        let stageLabel: string = '';

        if (days < 0 || l.status === 'Expired') {
          if (config.notifyExpired) {
            stageKey = 'EXPIRED';
            stageLabel = 'Expired Alert';
          }
        } else {
          const matched = stages.find(s => days <= s);
          if (matched !== undefined) {
            stageKey = `T-${matched}`;
            stageLabel = `${matched}-Day Notice`;
          }
        }

        if (!stageKey) return;

        // Check if already sent
        const existing = data.notificationLog.find(
          n => n.licId === l.id && n.till === l.till && n.stage === stageKey
        );
        if (existing) {
          if (stageKey === 'EXPIRED' && config.repeatDays > 0) {
            const timePassed = Date.now() - existing.at;
            if (timePassed < config.repeatDays * 24 * 60 * 60 * 1000) {
              return;
            }
          } else {
            return;
          }
        }

        recordsToLog.push({
          licId: l.id,
          unit: l.company,
          name: l.name,
          stage: stageKey,
          label: stageLabel,
          till: l.till,
          at: Date.now(),
          by: 'Daily Scheduler (BLMS)',
          via: 'auto'
        });
      });

      const nextRunCount = (config.lastAutoRunDate === todayStr ? (config.autoRunCountToday || 0) : 0) + 1;

      setData(prev => ({
        ...prev,
        notificationConfig: {
          ...prev.notificationConfig,
          lastAutoRunAt: Date.now(),
          lastAutoRunDate: todayStr,
          autoRunCountToday: nextRunCount
        },
        notificationLog: recordsToLog.length > 0 ? [...recordsToLog, ...prev.notificationLog].slice(0, 2000) : prev.notificationLog
      }));

      if (recordsToLog.length > 0) {
        logAudit(
          'System',
          'Daily Scheduler',
          'Automated Scan',
          'All',
          `Automated Daily Check (Run #${nextRunCount} - ${reason}) recorded ${recordsToLog.length} notices`
        );
        showToast(
          `Automated Daily Check (Run #${nextRunCount}): Logged and dispatched ${recordsToLog.length} automated notices (${reason}).`,
          'info'
        );
      }
    };

    // Periodic heartbeat check
    const interval = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeSlot = `${hours}:${minutes}`;

      const runTimes = config.runTimes && config.runTimes.length > 0 ? config.runTimes : ['09:00', '15:00'];
      const lastRunAt = config.lastAutoRunAt || 0;
      const msSinceLastRun = Date.now() - lastRunAt;

      // 1. Scheduled run times (e.g. twice daily: 09:00 and 15:00)
      const isScheduledTime = runTimes.includes(currentTimeSlot);
      if (isScheduledTime && msSinceLastRun > 65000) {
        runAutomatedScan(`Scheduled ${currentTimeSlot}`);
        return;
      }

      // 2. Extra runs when notices exist (twice or more times)
      if (config.moreRunsIfNotices && notifyDueCount > 0) {
        const intervalMs = (config.autoExtraIntervalHours || 3) * 60 * 60 * 1000;
        const currentRunsToday = config.lastAutoRunDate === todayStr ? (config.autoRunCountToday || 0) : 0;

        if (msSinceLastRun >= intervalMs || (currentRunsToday < 2 && msSinceLastRun >= 180000)) {
          runAutomatedScan(`Notices Pending (${notifyDueCount} items due)`);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [data.notificationConfig, data.licenses, data.notificationLog, notifyDueCount, showToast, logAudit]);

  // Render Login if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginScreen
        users={data.users}
        companies={data.companies}
        onSignInSuccess={handleSignInSuccess}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background-tertiary)] text-[var(--color-text-primary)]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={tabId => {
          setActiveTab(tabId);
          if (tabId === 'entry' && editingLicense) {
            setEditingLicense(null);
          }
        }}
        allowedMenus={allowedMenus}
        feedbackBadgeCount={feedbackBadgeCount}
        reviewBadgeCount={reviewBadgeCount}
        notifyDueCount={notifyDueCount}
        currentUserRole={currentUser.role}
        usersCount={data.users.length}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          currentUser={currentUser}
          allUsers={data.users}
          onSwitchUser={handleSwitchUser}
          onSignOut={handleSignOut}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(prev => !prev)}
          licenses={data.licenses}
          onNavigateToLicense={handleNavigateToLicense}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {activeTab === 'dashboard' && (
            <DashboardTab
              licenses={data.licenses}
              companies={data.companies}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              onViewDocs={(docsList, title) => {
                setViewingDocList(docsList);
                setViewingDoc(docsList[0] || null);
                setViewingDocTitle(title);
              }}
              onEditLicense={lic => {
                setEditingLicense(lic);
                setActiveTab('entry');
              }}
            />
          )}

          {activeTab === 'entry' && (
            <NewEntryTab
              licenses={data.licenses}
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              licenseNames={data.licenseNames}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              editingLicense={editingLicense}
              onSaveLicense={handleSaveLicense}
              onCancelEdit={() => setEditingLicense(null)}
              onDeleteLicense={handleDeleteLicense}
              onViewDocs={(docsList, title) => {
                setViewingDocList(docsList);
                setViewingDoc(docsList[0] || null);
                setViewingDocTitle(title);
              }}
              onSetEditingLicense={setEditingLicense}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'import' && (
            <ImportTab
              licenses={data.licenses}
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              currentUser={currentUser}
              onImportSuccess={handleImportSuccess}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'report' && (
            <ReportPrintTab
              licenses={data.licenses}
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'master_data' && (
            <MasterDataTab
              licenses={data.licenses}
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              onNavigateToNewEntry={() => {
                setEditingLicense(null);
                setActiveTab('entry');
              }}
              onViewDocs={(docsList, title) => {
                setViewingDocList(docsList);
                setViewingDoc(docsList[0] || null);
                setViewingDocTitle(title);
              }}
            />
          )}

          {activeTab === 'feedback' && (
            <FeedbackTab
              licenses={data.licenses}
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              users={data.users}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              onPostMessage={handlePostMessage}
              onApproveAndLock={handleApproveAndLock}
              onReopenReview={handleReopenReview}
              onNavigateToEdit={lic => {
                setEditingLicense(lic);
                setActiveTab('entry');
              }}
              onSwitchUser={handleSwitchUser}
            />
          )}

          {activeTab === 'review' && (
            <ReviewTab
              licenses={data.licenses}
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              users={data.users}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              onPostMessage={handlePostMessage}
              onApproveAndLock={handleApproveAndLock}
              onReopenReview={handleReopenReview}
              onNavigateToEdit={lic => {
                setEditingLicense(lic);
                setActiveTab('entry');
              }}
              onSwitchUser={handleSwitchUser}
            />
          )}

          {activeTab === 'renewal_pay' && (
            <RenewalPaymentTab
              licenses={data.licenses}
              paymentLinks={data.paymentLinks}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
            />
          )}

          {activeTab === 'kpi' && (
            <KpiTab
              licenses={data.licenses}
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              users={data.users}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              onNavigateToLicense={handleNavigateToLicense}
              onNavigateToEdit={lic => {
                setEditingLicense(lic);
                setActiveTab('entry');
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'payment' && (
            <PaymentLinksTab
              paymentLinks={data.paymentLinks}
              licenseTypes={data.licenseTypes}
              currentUser={currentUser}
              onSavePaymentLink={handleSavePaymentLink}
              onDeletePaymentLink={handleDeletePaymentLink}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'mr' && <ProcessMatrixTab companies={data.companies} />}

          {activeTab === 'notify' && (
            <NotificationCenterTab
              licenses={data.licenses}
              companies={data.companies}
              currentUser={currentUser}
              globalAlertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              notificationConfig={data.notificationConfig}
              notificationLog={data.notificationLog}
              onSaveNotificationConfig={handleSaveNotificationConfig}
              onRecordNotification={handleRecordNotification}
              onRecordBatchNotifications={handleRecordBatchNotifications}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'notilog' && (
            <NotificationLogTab
              notificationLog={data.notificationLog}
              companies={data.companies}
              currentUser={currentUser}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogTab
              auditLog={data.auditLog}
              companies={data.companies}
              currentUser={currentUser}
              onShowToast={showToast}
            />
          )}

          {(activeTab === 'admin' || activeTab === 'user_governance') && (
            <AdminPanelTab
              companies={data.companies}
              licenseTypes={data.licenseTypes}
              licenseNames={data.licenseNames}
              users={data.users}
              alertThreshold={data.alertThreshold}
              licenseThresholds={data.licenseThresholds}
              menuPermissions={data.menuPermissions}
              unitMenuPermissions={data.unitMenuPermissions}
              currentUser={currentUser}
              onUpdateCompanies={handleUpdateCompanies}
              onUpdateLicenseTypes={handleUpdateLicenseTypes}
              onUpdateLicenseNames={handleUpdateLicenseNames}
              onUpdateUsers={handleUpdateUsers}
              onUpdateAlertThreshold={handleUpdateAlertThreshold}
              onUpdateLicenseThresholds={handleUpdateLicenseThresholds}
              onUpdateMenuPermissions={handleUpdateMenuPermissions}
              onUpdateUnitMenuPermissions={handleUpdateUnitMenuPermissions}
              onShowToast={showToast}
              focusSection={activeTab === 'user_governance' ? 'user_governance' : 'all'}
            />
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      <DocViewerModal
        doc={viewingDoc}
        docsList={viewingDocList}
        title={viewingDocTitle}
        onClose={() => setViewingDoc(null)}
        onSelectDoc={d => setViewingDoc(d)}
      />

      <ConfirmModal
        confirm={confirmModal}
        onClose={() => setConfirmModal(null)}
      />

      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </div>
  );
}
