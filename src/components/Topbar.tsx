import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Building,
  LogOut,
  Sun,
  Moon,
  Check,
  EyeOff,
  Eye,
  UserCheck
} from 'lucide-react';
import { UserAccount, LicenseEntry } from '../types';
import { daysUntil, statusLabel, RAG } from '../utils/helpers';

interface TopbarProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onSwitchUser: (userId: string) => void;
  onSignOut: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  licenses: LicenseEntry[];
  onNavigateToLicense: (id: string, mode: 'entry' | 'review' | 'feedback' | 'dashboard') => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onSignOut,
  isDarkMode,
  onToggleTheme,
  licenses,
  onNavigateToLicense
}) => {
  const [bellOpen, setBellOpen] = useState(false);
  const [showRead, setShowRead] = useState(false);
  const [readMap, setReadMap] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`blms_alert_read_${currentUser.id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const bellRef = useRef<HTMLDivElement>(null);

  // Close bell on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveReadState = (newMap: Record<string, boolean>) => {
    setReadMap(newMap);
    try {
      localStorage.setItem(`blms_alert_read_${currentUser.id}`, JSON.stringify(newMap));
    } catch {
      // Ignore storage errors
    }
  };

  const toggleAlertRead = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...readMap };
    if (updated[key]) {
      delete updated[key];
    } else {
      updated[key] = true;
    }
    saveReadState(updated);
  };

  const markAllAlerts = (read: boolean) => {
    const updated = { ...readMap };
    allKeys.forEach(k => {
      if (read) updated[k] = true;
      else delete updated[k];
    });
    saveReadState(updated);
  };

  // Scoped licenses check
  const inScope = (unit: string) => {
    return currentUser.units === 'All' || currentUser.units.includes(unit);
  };
  const scopedLicenses = licenses.filter(l => inScope(l.company));

  // Compute alerts
  const expiredList = scopedLicenses
    .map(l => ({ l, d: daysUntil(l.till), label: statusLabel(daysUntil(l.till), l.status, l.type) }))
    .filter(x => x.label === 'Expired');

  const expiringList = scopedLicenses
    .map(l => ({ l, d: daysUntil(l.till), label: statusLabel(daysUntil(l.till), l.status, l.type) }))
    .filter(x => x.label === 'Expiring Soon');

  const waitingForMe = scopedLicenses.filter(l => {
    const r = currentUser.role;
    if ((r === 'Administrator' || r === 'Verifier') && l.reviewState === 'Awaiting Reviewer') return true;
    if ((r === 'Administrator' || r === 'Operator / Contributor') && l.reviewState === 'Awaiting Dept') return true;
    return false;
  });

  const allKeys = [
    ...expiredList.map(x => `lic:${x.l.id}:${x.l.till}`),
    ...expiringList.map(x => `lic:${x.l.id}:${x.l.till}`),
    ...waitingForMe.map(l => `fb:${l.id}:${l.reviewState}`)
  ];

  const unreadCount = allKeys.filter(k => !readMap[k]).length;

  const unitsText =
    currentUser.units === 'All'
      ? 'All units'
      : Array.isArray(currentUser.units)
      ? currentUser.units.join(', ')
      : 'No units';

  return (
    <header className="bg-[var(--color-background-primary)] border-b border-[var(--color-border-tertiary)] px-4 py-2 flex items-center justify-between gap-4 flex-wrap z-20">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
          Bitopi Group Compliance
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* User profile line */}
        <div className="text-right leading-tight hidden sm:block">
          <div className="text-xs font-semibold text-[var(--color-text-primary)]">
            {currentUser.name}
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            {currentUser.role}
            {currentUser.desig ? ` • ${currentUser.desig}` : ''}
          </div>
        </div>

        {/* Switch user demo selector */}
        <div className="relative flex items-center">
          <select
            value={currentUser.id}
            onChange={e => onSwitchUser(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] cursor-pointer"
            title="Switch User (Role Simulator)"
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Unit Scope Badge */}
        <span
          className="badge badge-blue text-xs py-1 px-2.5 max-w-[170px] truncate"
          title={`Accessible Factory Units: ${unitsText}`}
        >
          <Building className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{unitsText}</span>
        </span>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] cursor-pointer"
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Alert Bell Dropdown */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className={`relative p-1.5 rounded border cursor-pointer transition-colors ${
              bellOpen
                ? 'bg-[var(--brand-light)] text-[var(--brand)] border-[var(--brand-text)]'
                : 'border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]'
            }`}
            title="Alert Notifications"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#A32D2D] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums border border-[var(--color-background-primary)]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[92vw] max-h-[500px] bg-[var(--color-background-primary)] border border-[var(--color-border-secondary)] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-[var(--color-border-tertiary)] flex items-center justify-between bg-[var(--color-background-secondary)]">
                <span className="font-semibold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[var(--brand)]" /> License Expiry & Compliance Alerts
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {unreadCount} unread
                </span>
              </div>

              {allKeys.length > 0 && (
                <div className="p-2 border-b border-[var(--color-border-tertiary)] flex items-center justify-between text-[11px] bg-[var(--color-background-secondary)]/50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => markAllAlerts(true)}
                      className="text-[var(--brand-text)] hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                    <button
                      onClick={() => markAllAlerts(false)}
                      className="text-[var(--color-text-secondary)] hover:underline flex items-center gap-1"
                    >
                      <EyeOff className="w-3 h-3" /> Mark unread
                    </button>
                  </div>
                  <button
                    onClick={() => setShowRead(!showRead)}
                    className="text-[var(--color-text-secondary)] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> {showRead ? 'Hide read' : 'Show read'}
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border-tertiary)]">
                {allKeys.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)]">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 text-[#3B6D11] opacity-80" />
                    All licenses in your units are active and compliant. No urgent actions needed.
                  </div>
                ) : null}

                {/* Expired Section */}
                {expiredList.map(item => {
                  const key = `lic:${item.l.id}:${item.l.till}`;
                  const isRead = !!readMap[key];
                  if (!showRead && isRead) return null;

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setBellOpen(false);
                        onNavigateToLicense(item.l.id, 'dashboard');
                      }}
                      className={`p-3 text-xs flex items-start gap-2.5 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors ${
                        isRead ? 'opacity-55' : 'bg-red-50/20'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#A32D2D] mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate text-[var(--color-text-primary)]">
                            {item.l.name}
                          </span>
                          <span className="badge badge-red shrink-0 text-[10px]">
                            Expired
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                          Unit: <b>{item.l.company}</b> • Till: {item.l.till || 'No date'}
                        </div>
                        <div className="text-[10px] text-[#A32D2D] font-medium mt-1">
                          Action: {RAG.red.action}
                        </div>
                      </div>
                      <button
                        onClick={e => toggleAlertRead(key, e)}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
                        title={isRead ? 'Mark as unread' : 'Mark as read'}
                      >
                        {isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}

                {/* Expiring Soon Section */}
                {expiringList.map(item => {
                  const key = `lic:${item.l.id}:${item.l.till}`;
                  const isRead = !!readMap[key];
                  if (!showRead && isRead) return null;

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setBellOpen(false);
                        onNavigateToLicense(item.l.id, 'dashboard');
                      }}
                      className={`p-3 text-xs flex items-start gap-2.5 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors ${
                        isRead ? 'opacity-55' : 'bg-amber-50/20'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#854F0B] mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate text-[var(--color-text-primary)]">
                            {item.l.name}
                          </span>
                          <span className="badge badge-amber shrink-0 text-[10px]">
                            {item.d} days left
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                          Unit: <b>{item.l.company}</b> • Expiry: {item.l.till}
                        </div>
                        <div className="text-[10px] text-[#854F0B] font-medium mt-1">
                          Action: {RAG.amber.action}
                        </div>
                      </div>
                      <button
                        onClick={e => toggleAlertRead(key, e)}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
                        title={isRead ? 'Mark as unread' : 'Mark as read'}
                      >
                        {isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}

                {/* Feedback Pending Action */}
                {waitingForMe.map(l => {
                  const key = `fb:${l.id}:${l.reviewState}`;
                  const isRead = !!readMap[key];
                  if (!showRead && isRead) return null;

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setBellOpen(false);
                        onNavigateToLicense(l.id, 'feedback');
                      }}
                      className={`p-3 text-xs flex items-start gap-2.5 cursor-pointer hover:bg-[var(--color-background-secondary)] transition-colors ${
                        isRead ? 'opacity-55' : 'bg-blue-50/20'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[var(--brand)] mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate text-[var(--color-text-primary)]">
                            {l.name}
                          </span>
                          <span className="badge badge-blue shrink-0 text-[10px]">
                            Feedback Reply
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                          Unit: <b>{l.company}</b> • State: {l.reviewState}
                        </div>
                        <div className="text-[10px] text-[var(--brand)] font-medium mt-1">
                          Pending your reply/action
                        </div>
                      </div>
                      <button
                        onClick={e => toggleAlertRead(key, e)}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
                        title={isRead ? 'Mark as unread' : 'Mark as read'}
                      >
                        {isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1 cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};
