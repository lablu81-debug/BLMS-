import {
  LicenseEntry,
  UserAccount,
  PaymentLink,
  NotificationConfig,
  NotificationRecord,
  AuditEntry,
  ActivityItem
} from '../types';
import {
  INITIAL_COMPANIES,
  INITIAL_LICENSE_TYPES,
  INITIAL_LICENSE_NAMES,
  INITIAL_USERS,
  INITIAL_LICENSES,
  INITIAL_PAYMENT_LINKS,
  DEFAULT_MENU_PERMS,
  INITIAL_NOTIFICATION_CONFIG
} from '../constants/initialData';

export interface AppStateData {
  companies: string[];
  licenseTypes: string[];
  licenseNames: Record<string, string[]>;
  licenses: LicenseEntry[];
  users: UserAccount[];
  paymentLinks: PaymentLink[];
  alertThreshold: number;
  licenseThresholds: Record<string, number>;
  menuPermissions: Record<string, string[]>;
  unitMenuPermissions: Record<string, Record<string, string[]>>;
  notificationConfig: NotificationConfig;
  notificationLog: NotificationRecord[];
  auditLog: AuditEntry[];
  activity: ActivityItem[];
}

const STORAGE_KEY = 'blms_bitopi_state_v3';
const REMEMBER_KEY = 'blms_remembered_uid';

export function loadAppState(): AppStateData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all fields exist
      const menuPerms = parsed.menuPermissions || { ...DEFAULT_MENU_PERMS };
      if (menuPerms['Administrator'] && !menuPerms['Administrator'].includes('user_governance')) {
        menuPerms['Administrator'].push('user_governance');
      }
      ['Administrator', 'Operator / Contributor', 'Viewer', 'Verifier'].forEach(role => {
        if (menuPerms[role] && !menuPerms[role].includes('kpi')) {
          menuPerms[role].push('kpi');
        }
      });

      return {
        companies: parsed.companies?.length ? parsed.companies : [...INITIAL_COMPANIES],
        licenseTypes: parsed.licenseTypes?.length ? parsed.licenseTypes : [...INITIAL_LICENSE_TYPES],
        licenseNames: parsed.licenseNames ? { ...INITIAL_LICENSE_NAMES, ...parsed.licenseNames } : { ...INITIAL_LICENSE_NAMES },
        licenses: (parsed.licenses && parsed.licenses.length >= 50) ? parsed.licenses : [...INITIAL_LICENSES],
        users: parsed.users?.length ? parsed.users : [...INITIAL_USERS],
        paymentLinks: parsed.paymentLinks?.length ? parsed.paymentLinks : [...INITIAL_PAYMENT_LINKS],
        alertThreshold: parsed.alertThreshold ?? 60,
        licenseThresholds: parsed.licenseThresholds || {},
        menuPermissions: menuPerms,
        unitMenuPermissions: parsed.unitMenuPermissions || {},
        notificationConfig: parsed.notificationConfig ? { ...INITIAL_NOTIFICATION_CONFIG, ...parsed.notificationConfig } : { ...INITIAL_NOTIFICATION_CONFIG },
        notificationLog: parsed.notificationLog || [],
        auditLog: parsed.auditLog || [],
        activity: parsed.activity || []
      };
    }
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
  }

  // Initial state fallback
  return {
    companies: [...INITIAL_COMPANIES],
    licenseTypes: [...INITIAL_LICENSE_TYPES],
    licenseNames: { ...INITIAL_LICENSE_NAMES },
    licenses: [...INITIAL_LICENSES],
    users: [...INITIAL_USERS],
    paymentLinks: [...INITIAL_PAYMENT_LINKS],
    alertThreshold: 60,
    licenseThresholds: {},
    menuPermissions: { ...DEFAULT_MENU_PERMS },
    unitMenuPermissions: {},
    notificationConfig: { ...INITIAL_NOTIFICATION_CONFIG },
    notificationLog: [],
    auditLog: [
      {
        id: 'init_audit_01',
        ts: Date.now(),
        user: 'System',
        action: 'System',
        entity: 'Database',
        entityId: 'Init',
        unit: 'All',
        summary: 'BLMS initialized with baseline company compliance database',
        changes: []
      }
    ],
    activity: [
      {
        id: 'act_01',
        type: 'system',
        text: 'Session started — monitoring business licenses across all Bitopi Group units',
        unit: 'All',
        actor: 'System',
        ts: Date.now()
      }
    ]
  };
}

export function saveAppState(state: AppStateData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function getRememberedUserId(): string | null {
  try {
    return localStorage.getItem(REMEMBER_KEY);
  } catch {
    return null;
  }
}

export function setRememberedUserId(uid: string | null): void {
  try {
    if (uid) {
      localStorage.setItem(REMEMBER_KEY, uid);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}
