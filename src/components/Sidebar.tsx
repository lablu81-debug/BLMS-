import React from 'react';
import {
  BarChart3,
  Edit3,
  Upload,
  Printer,
  Database,
  MessageSquare,
  Wallet,
  Bell,
  Eye,
  Grid,
  ClipboardList,
  Users,
  Target
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  allowedMenus: string[];
  feedbackBadgeCount: number;
  reviewBadgeCount: number;
  notifyDueCount: number;
  currentUserRole: UserRole;
  usersCount?: number;
}

interface MenuItemDef {
  id: string;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
}

interface MenuCategoryGroup {
  category: string;
  items: MenuItemDef[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  allowedMenus,
  feedbackBadgeCount,
  reviewBadgeCount,
  notifyDueCount,
  usersCount
}) => {
  const allGroups: MenuCategoryGroup[] = [
    {
      category: 'Management Dashboard',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 }
      ]
    },
    {
      category: 'Operations',
      items: [
        { id: 'entry', label: 'New License Entry', icon: Edit3 },
        { id: 'import', label: 'Import Excel / CSV', icon: Upload },
        { id: 'report', label: 'Report Print', icon: Printer },
        { id: 'master_data', label: 'Master Data', icon: Database },
        { id: 'feedback', label: 'Feedback', icon: MessageSquare, badgeCount: feedbackBadgeCount },
        { id: 'renewal_pay', label: 'Renewal Payment', icon: Wallet },
        { id: 'kpi', label: 'KPI', icon: Target },
        { id: 'notilog', label: 'Notification Log', icon: Bell }
      ]
    },
    {
      category: 'Reviewer',
      items: [
        { id: 'review', label: 'Review', icon: Eye, badgeCount: reviewBadgeCount }
      ]
    },
    {
      category: 'System Admin',
      items: [
        { id: 'payment', label: 'Payment', icon: Wallet },
        { id: 'mr', label: 'Process Matrix', icon: Grid },
        { id: 'notify', label: 'Notification Center', icon: Bell, badgeCount: notifyDueCount },
        { id: 'audit', label: 'Audit Log', icon: ClipboardList },
        { id: 'user_governance', label: 'User Access & Role Governance', icon: Users, badgeCount: usersCount }
      ]
    }
  ];

  // Filter groups according to allowedMenus
  const visibleGroups = allGroups
    .map(g => ({
      ...g,
      items: g.items.filter(item => allowedMenus.includes(item.id))
    }))
    .filter(g => g.items.length > 0);

  return (
    <aside className="w-[250px] shrink-0 bg-[var(--color-background-secondary)] border-r border-[var(--color-border-tertiary)] flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--color-border-tertiary)] flex flex-col gap-1.5">
        <div className="text-base font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-1">
          Bitopi <span className="text-[var(--brand)] font-extrabold">Group</span>
        </div>
        <div className="inline-block">
          <span className="badge badge-blue text-[10px] leading-tight py-0.5 px-2">
            BLMS • License Monitoring
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <div className="p-3 flex-1 overflow-y-auto space-y-4">
        {visibleGroups.map(group => (
          <div key={group.category} className="space-y-1">
            <div className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider px-2 py-1 opacity-70">
              {group.category}
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded transition-colors text-left ${
                      isActive
                        ? 'bg-[var(--brand-light)] text-[var(--brand)] font-semibold shadow-xs'
                        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] hover:text-[var(--brand)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--brand)]' : 'text-[var(--color-text-secondary)]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badgeCount && item.badgeCount > 0 ? (
                      <span className="ml-1.5 bg-[#A32D2D] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
                        {item.badgeCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[var(--color-border-tertiary)] text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-between bg-[var(--color-background-secondary)]">
        <span>BLMS v2.4</span>
        <span className="flex items-center gap-1">
          <span className="live-dot" /> Live Active
        </span>
      </div>
    </aside>
  );
};
