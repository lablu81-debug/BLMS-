export type UserRole = 'Administrator' | 'Verifier' | 'Operator / Contributor' | 'Viewer';

export type StatusCategory = 'Renewal' | 'One-time' | 'Renewal (Periodic Expiry)' | 'One-time (Permanent)';

export type LicenseStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Suspended' | 'Applied' | 'In Progress';

export type ActionStatus = 'In Progress' | 'Completed' | 'Applied';

export interface AttachedDoc {
  id: string;
  name: string;
  size: number;
  data: string; // base64 DataURL
  by: string;
  at: number;
}

export interface ThreadMessage {
  id: string;
  at: number | null;
  by: string;
  from: 'Reviewer' | 'Dept';
  text: string;
  system?: boolean;
}

export type ReviewState = 'Awaiting Dept' | 'Awaiting Reviewer' | 'Closed';

export interface LicenseEntry {
  id: string;
  company: string;
  year: string;
  type: string;
  name: string;
  number: string;
  from: string;
  till: string;
  status: LicenseStatus;
  category: StatusCategory;
  comments: string;
  action: ActionStatus;
  feedback?: string;
  reviewState?: ReviewState;
  thread?: ThreadMessage[];
  locked?: boolean;
  docs?: AttachedDoc[];
  seq?: number;
  // Vehicle BRTA specific fields
  vNumber?: string;
  vModel?: string;
  vTaxToken?: string;
  vFitness?: string;
  vInsurance?: string;
  vRoutePermit?: string;
  vRegCall?: string;
  vRoutePermitCall?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  empId?: string;
  dept?: string;
  desig?: string;
  role: UserRole;
  units: 'All' | string[];
  unitRoles?: Record<string, UserRole>;
  menus?: string[];
  loginId?: string;
  pwHash?: string;
}

export interface PaymentLink {
  id: string;
  name: string;
  url: string;
  desc: string;
  types: string[];
}

export interface NotificationRecord {
  licId: string;
  unit: string;
  name: string;
  stage: string;
  label: string;
  till: string;
  at: number;
  by: string;
  via: 'auto' | 'manual';
}

export interface UnitRecipients {
  emails: string[];
  phones: string[];
}

export interface NotificationConfig {
  email: boolean;
  whatsapp: boolean;
  autoEmail: boolean;
  dailyRunFrequency: '2x' | '3x' | '4x' | 'hourly_if_notices';
  runTimes: string[];
  moreRunsIfNotices: boolean;
  autoExtraIntervalHours: number;
  lastAutoRunAt?: number;
  autoRunCountToday?: number;
  lastAutoRunDate?: string;
  stages: number[];
  notifyExpired: boolean;
  repeatDays: number;
  sendTime: string;
  recipients: Record<string, UnitRecipients>;
  emailSubject: string;
  emailBody: string;
  waBody: string;
}

export interface AuditFieldChange {
  field: string;
  from: string;
  to: string;
}

export type AuditAction = 'Created' | 'Updated' | 'Deleted' | 'Review' | 'Notify' | 'Export' | 'Admin' | 'Access' | 'System';

export interface AuditEntry {
  id: string;
  ts: number;
  user: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  unit: string;
  summary: string;
  changes: AuditFieldChange[];
}

export interface ActivityItem {
  id: string;
  type: 'entry-add' | 'entry-update' | 'entry-delete' | 'review' | 'export' | 'admin' | 'system' | 'notify';
  text: string;
  unit: string;
  actor: string;
  ts: number;
}
