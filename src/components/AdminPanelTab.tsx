import React, { useState } from 'react';
import {
  Settings,
  List,
  Building,
  Bell,
  Users,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  Shield,
  Layers
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { hashPw } from '../utils/helpers';

interface AdminPanelTabProps {
  companies: string[];
  licenseTypes: string[];
  licenseNames: Record<string, string[]>;
  users: UserAccount[];
  alertThreshold: number;
  licenseThresholds: Record<string, number>;
  menuPermissions: Record<string, string[]>;
  unitMenuPermissions: Record<string, Record<string, string[]>>;
  currentUser: UserAccount;
  onUpdateCompanies: (companies: string[], renamedFrom?: string, renamedTo?: string) => void;
  onUpdateLicenseTypes: (types: string[]) => void;
  onUpdateLicenseNames: (names: Record<string, string[]>) => void;
  onUpdateUsers: (users: UserAccount[]) => void;
  onUpdateAlertThreshold: (threshold: number) => void;
  onUpdateLicenseThresholds: (thresholds: Record<string, number>) => void;
  onUpdateMenuPermissions: (perms: Record<string, string[]>) => void;
  onUpdateUnitMenuPermissions: (perms: Record<string, Record<string, string[]>>) => void;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
  focusSection?: 'all' | 'user_governance';
}

const ALL_ROLES: UserRole[] = ['Administrator', 'Verifier', 'Operator / Contributor', 'Viewer'];

const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'entry', label: 'New License Entry' },
  { id: 'import', label: 'Import Excel / CSV' },
  { id: 'report', label: 'Report Print' },
  { id: 'master_data', label: 'Master Data' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'renewal_pay', label: 'Renewal Payment' },
  { id: 'kpi', label: 'Operator/Contributor and Viewer KPI' },
  { id: 'notilog', label: 'Notification Log' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
  { id: 'mr', label: 'Process Matrix' },
  { id: 'notify', label: 'Notification Center' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'user_governance', label: 'User Access & Role Governance' }
];

export const AdminPanelTab: React.FC<AdminPanelTabProps> = ({
  companies,
  licenseTypes,
  licenseNames,
  users,
  alertThreshold,
  licenseThresholds,
  menuPermissions,
  unitMenuPermissions,
  currentUser,
  onUpdateCompanies,
  onUpdateLicenseTypes,
  onUpdateLicenseNames,
  onUpdateUsers,
  onUpdateAlertThreshold,
  onUpdateLicenseThresholds,
  onUpdateMenuPermissions,
  onUpdateUnitMenuPermissions,
  onShowToast,
  focusSection = 'all'
}) => {
  // License Type State
  const [editingTypeIdx, setEditingTypeIdx] = useState<number | null>(null);
  const [editingTypeVal, setEditingTypeVal] = useState('');
  const [newTypeVal, setNewTypeVal] = useState('');

  // Company Units State
  const [editingCompIdx, setEditingCompIdx] = useState<number | null>(null);
  const [editingCompVal, setEditingCompVal] = useState('');
  const [newCompVal, setNewCompVal] = useState('');

  // Threshold rule state
  const [tempThreshold, setTempThreshold] = useState(alertThreshold);

  // User Edit State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userForm, setUserForm] = useState<{
    name: string;
    empId: string;
    dept: string;
    desig: string;
    loginId: string;
    password?: string;
    role: UserRole;
    units: 'All' | string[];
    unitRoles: Record<string, UserRole>;
    customMenus: boolean;
    menus: string[];
  }>({
    name: '',
    empId: '',
    dept: '',
    desig: '',
    loginId: '',
    role: 'Operator / Contributor',
    units: 'All',
    unitRoles: {},
    customMenus: false,
    menus: []
  });

  // User Section Sub-tab: 'users' | 'role_perms' | 'unit_perms'
  const [userSectionTab, setUserSectionTab] = useState<'users' | 'role_perms' | 'unit_perms'>('users');
  // Quick user menu permission modal
  const [quickMenuUser, setQuickMenuUser] = useState<UserAccount | null>(null);
  const [quickMenus, setQuickMenus] = useState<string[]>([]);
  const [quickCustom, setQuickCustom] = useState<boolean>(false);

  // License Names Category State
  const [selectedLnType, setSelectedLnType] = useState(licenseTypes[0] || 'Trade License');
  const [editingLnIdx, setEditingLnIdx] = useState<number | null>(null);
  const [editingLnVal, setEditingLnVal] = useState('');
  const [newLnVal, setNewLnVal] = useState('');

  // Menu Permissions Unit Selector
  const [mpUnit, setMpUnit] = useState(companies[0] || 'TAL');

  // --- License Types Handlers ---
  const handleAddType = () => {
    const v = newTypeVal.trim();
    if (!v) return;
    if (licenseTypes.includes(v)) {
      onShowToast('This license type already exists.', 'error');
      return;
    }
    onUpdateLicenseTypes([...licenseTypes, v]);
    setNewTypeVal('');
    onShowToast(`Added license type: ${v}`, 'success');
  };

  const handleSaveEditType = (idx: number) => {
    const v = editingTypeVal.trim();
    if (!v) return;
    const updated = [...licenseTypes];
    updated[idx] = v;
    onUpdateLicenseTypes(updated);
    setEditingTypeIdx(null);
    onShowToast('Updated license type', 'success');
  };

  const handleDeleteType = (idx: number) => {
    const name = licenseTypes[idx];
    if (confirm(`Delete license type "${name}"?`)) {
      const updated = licenseTypes.filter((_, i) => i !== idx);
      onUpdateLicenseTypes(updated);
      onShowToast(`Deleted ${name}`, 'success');
    }
  };

  // --- Company Unit Handlers ---
  const handleAddComp = () => {
    const v = newCompVal.trim().toUpperCase();
    if (!v) return;
    if (companies.includes(v)) {
      onShowToast('This unit code already exists.', 'error');
      return;
    }
    onUpdateCompanies([...companies, v]);
    setNewCompVal('');
    onShowToast(`Added unit: ${v}`, 'success');
  };

  const handleSaveEditComp = (idx: number) => {
    const oldCode = companies[idx];
    const newCode = editingCompVal.trim().toUpperCase();
    if (!newCode) return;
    if (newCode === oldCode) {
      setEditingCompIdx(null);
      return;
    }
    if (companies.includes(newCode)) {
      onShowToast(`Unit "${newCode}" already exists.`, 'error');
      return;
    }
    const updated = [...companies];
    updated[idx] = newCode;
    onUpdateCompanies(updated, oldCode, newCode);
    setEditingCompIdx(null);
    onShowToast(`Renamed ${oldCode} to ${newCode}`, 'success');
  };

  const handleDeleteComp = (idx: number) => {
    const code = companies[idx];
    if (confirm(`Delete company unit "${code}"?`)) {
      const updated = companies.filter((_, i) => i !== idx);
      onUpdateCompanies(updated);
      onShowToast(`Deleted unit ${code}`, 'success');
    }
  };

  // --- Alert Rule Handlers ---
  const handleSaveGlobalThreshold = () => {
    if (tempThreshold <= 0 || tempThreshold > 365) {
      onShowToast('Threshold must be between 1 and 365 days.', 'error');
      return;
    }
    onUpdateAlertThreshold(tempThreshold);
    onShowToast(`Default alert threshold rule updated to ${tempThreshold} days.`, 'success');
  };

  const handleSaveTypeThreshold = (typeName: string, daysVal: string) => {
    const updated = { ...licenseThresholds };
    if (!daysVal.trim()) {
      delete updated[typeName];
    } else {
      const n = parseInt(daysVal);
      if (n > 0 && n <= 365) {
        updated[typeName] = n;
      }
    }
    onUpdateLicenseThresholds(updated);
    onShowToast(`Saved alert threshold override for ${typeName}`, 'success');
  };

  // --- License Names Handlers ---
  const currentNamesList = licenseNames[selectedLnType] || [];

  const handleAddLicenseName = () => {
    const v = newLnVal.trim();
    if (!v) return;
    if (currentNamesList.includes(v)) {
      onShowToast(`Name "${v}" already exists under ${selectedLnType}.`, 'error');
      return;
    }
    const updated = {
      ...licenseNames,
      [selectedLnType]: [...currentNamesList, v]
    };
    onUpdateLicenseNames(updated);
    setNewLnVal('');
    onShowToast(`Added "${v}" to ${selectedLnType}`, 'success');
  };

  const handleSaveEditLicenseName = (idx: number) => {
    const v = editingLnVal.trim();
    if (!v) return;
    const updatedList = [...currentNamesList];
    updatedList[idx] = v;
    const updated = {
      ...licenseNames,
      [selectedLnType]: updatedList
    };
    onUpdateLicenseNames(updated);
    setEditingLnIdx(null);
    onShowToast(`Updated license name to "${v}"`, 'success');
  };

  const handleDeleteLicenseName = (idx: number) => {
    const name = currentNamesList[idx];
    if (confirm(`Delete license name "${name}" from ${selectedLnType}?`)) {
      const updatedList = currentNamesList.filter((_, i) => i !== idx);
      const updated = {
        ...licenseNames,
        [selectedLnType]: updatedList
      };
      onUpdateLicenseNames(updated);
      onShowToast(`Deleted "${name}"`, 'success');
    }
  };

  // --- User Handlers ---
  const handleStartEditUser = (u: UserAccount) => {
    setEditingUserId(u.id);
    setIsAddingUser(false);
    setUserForm({
      name: u.name,
      empId: u.empId || '',
      dept: u.dept || '',
      desig: u.desig || '',
      loginId: u.loginId || '',
      password: '',
      role: u.role,
      units: u.units,
      unitRoles: u.unitRoles ? { ...u.unitRoles } : {},
      customMenus: Array.isArray(u.menus),
      menus: u.menus || []
    });
  };

  const handleStartAddUser = () => {
    setIsAddingUser(true);
    setEditingUserId(null);
    setUserForm({
      name: '',
      empId: '',
      dept: '',
      desig: '',
      loginId: '',
      password: '',
      role: 'Operator / Contributor',
      units: 'All',
      unitRoles: {},
      customMenus: false,
      menus: []
    });
  };

  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) {
      onShowToast('User full name is required.', 'error');
      return;
    }
    if (!userForm.loginId.trim()) {
      onShowToast('User ID for sign-in is required.', 'error');
      return;
    }

    if (isAddingUser) {
      const newUid = 'u_' + Date.now().toString(36);
      let pwHash: string | undefined = undefined;
      if (userForm.password?.trim()) {
        pwHash = await hashPw(newUid, userForm.password.trim());
      }
      const newUser: UserAccount = {
        id: newUid,
        name: userForm.name.trim(),
        empId: userForm.empId.trim(),
        dept: userForm.dept.trim(),
        desig: userForm.desig.trim(),
        loginId: userForm.loginId.trim(),
        pwHash,
        role: userForm.role,
        units: userForm.units,
        unitRoles: userForm.unitRoles,
        menus: userForm.customMenus ? userForm.menus : undefined
      };
      onUpdateUsers([...users, newUser]);
      setIsAddingUser(false);
      onShowToast(`Added user: ${newUser.name}`, 'success');
    } else if (editingUserId) {
      const existing = users.find(u => u.id === editingUserId);
      if (!existing) return;

      let pwHash = existing.pwHash;
      if (userForm.password?.trim()) {
        pwHash = await hashPw(existing.id, userForm.password.trim());
      }

      const updatedUsers = users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: userForm.name.trim(),
            empId: userForm.empId.trim(),
            dept: userForm.dept.trim(),
            desig: userForm.desig.trim(),
            loginId: userForm.loginId.trim(),
            pwHash,
            role: userForm.role,
            units: userForm.units,
            unitRoles: userForm.unitRoles,
            menus: userForm.customMenus ? userForm.menus : undefined
          };
        }
        return u;
      });
      onUpdateUsers(updatedUsers);
      setEditingUserId(null);
      onShowToast(`Updated user: ${userForm.name}`, 'success');
    }
  };

  const handleDeleteUser = (u: UserAccount) => {
    if (u.id === currentUser.id) {
      onShowToast('You cannot delete your currently active user account.', 'error');
      return;
    }
    if (confirm(`Delete user account "${u.name}"?`)) {
      onUpdateUsers(users.filter(x => x.id !== u.id));
      onShowToast(`Deleted user ${u.name}`, 'success');
    }
  };

  // --- Unit Menu Permission Handlers ---
  const getUnitMenuChecked = (role: string, menuId: string): boolean => {
    const unitPerms = unitMenuPermissions[mpUnit]?.[role];
    if (unitPerms) {
      return unitPerms.includes(menuId);
    }
    // Default fallback
    const roleDefault = ALL_MENU_ITEMS.map(m => m.id);
    return roleDefault.includes(menuId);
  };

  const handleToggleUnitMenu = (role: string, menuId: string) => {
    const curUnitPerms = unitMenuPermissions[mpUnit] || {};
    const curRolePerms = curUnitPerms[role] || ALL_MENU_ITEMS.map(m => m.id);

    const isChecked = curRolePerms.includes(menuId);
    const newRolePerms = isChecked
      ? curRolePerms.filter(x => x !== menuId)
      : [...curRolePerms, menuId];

    const updated = {
      ...unitMenuPermissions,
      [mpUnit]: {
        ...curUnitPerms,
        [role]: newRolePerms
      }
    };
    onUpdateUnitMenuPermissions(updated);
  };

  // --- Global Role Menu Permission Handlers ---
  const handleToggleRoleMenu = (role: string, menuId: string) => {
    if (role === 'Administrator' && (menuId === 'admin' || menuId === 'user_governance')) return;
    const curPerms = menuPermissions[role] || ALL_MENU_ITEMS.map(m => m.id);
    const isChecked = curPerms.includes(menuId);
    const newPerms = isChecked ? curPerms.filter(x => x !== menuId) : [...curPerms, menuId];
    onUpdateMenuPermissions({
      ...menuPermissions,
      [role]: newPerms
    });
    onShowToast(`Updated ${role} menu access for ${menuId}`, 'success');
  };

  const handleOpenQuickMenuModal = (u: UserAccount) => {
    setQuickMenuUser(u);
    setQuickCustom(Array.isArray(u.menus));
    setQuickMenus(
      Array.isArray(u.menus)
        ? [...u.menus]
        : (menuPermissions[u.role] || ALL_MENU_ITEMS.map(m => m.id))
    );
  };

  const handleSaveQuickMenuModal = () => {
    if (!quickMenuUser) return;
    const updatedUsers = users.map(u => {
      if (u.id === quickMenuUser.id) {
        return {
          ...u,
          menus: quickCustom ? quickMenus : undefined
        };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
    setQuickMenuUser(null);
    onShowToast(`Updated menu permissions for ${quickMenuUser.name}`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--brand)]" />
            <span className="card-title">Admin Panel — System Configuration & Master Governance</span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION 1: License Types */}
          <div className="p-4 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)]">
              <List className="w-4 h-4 text-[var(--brand)]" />
              <span>License Types Management ({licenseTypes.length})</span>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto divide-y divide-[var(--color-border-tertiary)] pr-1">
              {licenseTypes.map((t, idx) => (
                <div key={t} className="pt-1.5 pb-1 flex items-center justify-between gap-2 text-xs">
                  {editingTypeIdx === idx ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editingTypeVal}
                        onChange={e => setEditingTypeVal(e.target.value)}
                        className="px-2 py-0.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] flex-1"
                      />
                      <button
                        onClick={() => handleSaveEditType(idx)}
                        className="p-1 rounded text-white bg-[var(--brand)]"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingTypeIdx(null)}
                        className="p-1 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate">{t}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingTypeIdx(idx);
                            setEditingTypeVal(t);
                          }}
                          className="p-1 rounded text-[var(--brand)] hover:bg-[var(--color-background-secondary)]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(idx)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--color-border-tertiary)]">
              <input
                type="text"
                placeholder="Add new license type..."
                value={newTypeVal}
                onChange={e => setNewTypeVal(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
              />
              <button
                onClick={handleAddType}
                className="px-3 py-1 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
              >
                Add Type
              </button>
            </div>
          </div>

          {/* SECTION 2: Company Units */}
          <div className="p-4 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)]">
              <Building className="w-4 h-4 text-[var(--brand)]" />
              <span>Company Units Management ({companies.length})</span>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto divide-y divide-[var(--color-border-tertiary)] pr-1">
              {companies.map((c, idx) => (
                <div key={c} className="pt-1.5 pb-1 flex items-center justify-between gap-2 text-xs">
                  {editingCompIdx === idx ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editingCompVal}
                        onChange={e => setEditingCompVal(e.target.value.toUpperCase())}
                        className="px-2 py-0.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] flex-1 font-mono uppercase"
                      />
                      <button
                        onClick={() => handleSaveEditComp(idx)}
                        className="p-1 rounded text-white bg-[var(--brand)]"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingCompIdx(null)}
                        className="p-1 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-xs flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-[var(--brand)] opacity-70" />
                        {c}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingCompIdx(idx);
                            setEditingCompVal(c);
                          }}
                          className="p-1 rounded text-[var(--brand)] hover:bg-[var(--color-background-secondary)]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteComp(idx)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--color-border-tertiary)]">
              <input
                type="text"
                placeholder="Unit code (e.g. MISAMI)"
                value={newCompVal}
                onChange={e => setNewCompVal(e.target.value.toUpperCase())}
                className="flex-1 px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono uppercase"
              />
              <button
                onClick={handleAddComp}
                className="px-3 py-1 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
              >
                Add Unit
              </button>
            </div>
          </div>

          {/* SECTION 3: Global Expiration Alert Rule */}
          <div className="p-4 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)]">
              <Bell className="w-4 h-4 text-[var(--brand)]" />
              <span>Global Expiry Threshold Rule</span>
            </div>

            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-[var(--color-text-secondary)]">
                Default alert window for all licenses:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={tempThreshold}
                  onChange={e => setTempThreshold(parseInt(e.target.value) || 60)}
                  className="w-20 px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-bold text-center"
                />
                <span className="font-medium text-[var(--color-text-secondary)]">days before expiration</span>
              </div>
              <button
                onClick={handleSaveGlobalThreshold}
                className="px-3 py-1 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
              >
                Save Rule
              </button>
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)]">
              When a license valid-till date is within this number of days, its status automatically transitions from Green (Valid) to Amber (Expiring Soon).
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: User Access & Role Governance with Menu Permissions */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--brand)]" />
            <span className="card-title">User Access &amp; Role Governance ({users.length})</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sub-tabs switch: Users List vs Role Menu Matrix */}
            <div className="flex p-0.5 rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-xs">
              <button
                type="button"
                onClick={() => setUserSectionTab('users')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  userSectionTab === 'users'
                    ? 'bg-[var(--brand)] text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                User Accounts ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setUserSectionTab('role_perms')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  userSectionTab === 'role_perms'
                    ? 'bg-[var(--brand)] text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Role Menu Permissions
              </button>
              <button
                type="button"
                onClick={() => setUserSectionTab('unit_perms')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  userSectionTab === 'unit_perms'
                    ? 'bg-[var(--brand)] text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Unit Menu Permissions
              </button>
            </div>

            {userSectionTab === 'users' && !isAddingUser && !editingUserId && (
              <button
                onClick={handleStartAddUser}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: User Accounts List & Form */}
        {userSectionTab === 'users' && (
          <>
            {/* User Form if Adding or Editing */}
            {(isAddingUser || editingUserId) && (
              <form onSubmit={handleSaveUserForm} className="p-4 bg-[var(--brand-light)]/20 border-b border-[var(--color-border-tertiary)] space-y-4">
                <div className="text-xs font-bold text-[var(--brand)] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isAddingUser ? 'Create New User Account' : `Edit User: ${userForm.name}`}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Full Name *</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="e.g. Rahul Hasan"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Employee ID</label>
                    <input
                      type="text"
                      value={userForm.empId}
                      onChange={e => setUserForm(prev => ({ ...prev, empId: e.target.value }))}
                      placeholder="e.g. TAL-0142"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Department</label>
                    <input
                      type="text"
                      value={userForm.dept}
                      onChange={e => setUserForm(prev => ({ ...prev, dept: e.target.value }))}
                      placeholder="e.g. Compliance / HR"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Designation</label>
                    <input
                      type="text"
                      value={userForm.desig}
                      onChange={e => setUserForm(prev => ({ ...prev, desig: e.target.value }))}
                      placeholder="e.g. Compliance Executive"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Sign-in User ID *</label>
                    <input
                      type="text"
                      value={userForm.loginId}
                      onChange={e => setUserForm(prev => ({ ...prev, loginId: e.target.value }))}
                      required
                      placeholder="e.g. rahul.tal"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      {isAddingUser ? 'Password' : 'Change Password (optional)'}
                    </label>
                    <input
                      type="password"
                      value={userForm.password || ''}
                      onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={isAddingUser ? 'Default: blms123' : 'Leave empty to keep existing'}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Default Global Role *</label>
                    <select
                      value={userForm.role}
                      onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                    >
                      {ALL_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Authorized Unit Scope</label>
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={userForm.units === 'All'}
                          onChange={e =>
                            setUserForm(prev => ({
                              ...prev,
                              units: e.target.checked ? 'All' : [companies[0] || 'TAL']
                            }))
                          }
                          className="accent-[var(--brand)]"
                        />
                        <span>All Units</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Individual unit selection if not 'All' */}
                {userForm.units !== 'All' && (
                  <div className="p-3 bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded space-y-2">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Select Accessible Units:</span>
                    <div className="flex flex-wrap gap-3">
                      {companies.map(c => {
                        const isChecked = Array.isArray(userForm.units) && userForm.units.includes(c);
                        return (
                          <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const cur = Array.isArray(userForm.units) ? userForm.units : [];
                                const next = e.target.checked ? [...cur, c] : cur.filter(x => x !== c);
                                setUserForm(prev => ({ ...prev, units: next.length ? next : [c] }));
                              }}
                              className="accent-[var(--brand)]"
                            />
                            <span className="font-semibold">{c}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MENU ACCESS & PERMISSIONS FOR THIS USER */}
                <div className="p-3 bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[var(--brand)]" />
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        Menu Permissions for this User
                      </span>
                    </div>

                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userForm.customMenus}
                        onChange={e => {
                          const isChecked = e.target.checked;
                          setUserForm(prev => ({
                            ...prev,
                            customMenus: isChecked,
                            menus: isChecked
                              ? (prev.menus?.length ? prev.menus : (menuPermissions[prev.role] || ALL_MENU_ITEMS.map(m => m.id)))
                              : []
                          }));
                        }}
                        className="accent-[var(--brand)]"
                      />
                      <span className="font-semibold text-[var(--brand)]">Custom menus for this user</span>
                    </label>
                  </div>

                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    {userForm.customMenus
                      ? 'Tick the specific modules this user is permitted to open. Overrides default role permissions.'
                      : `Currently following default permissions for role "${userForm.role}". Check "Custom menus" above to customize individual menu access.`}
                  </p>

                  {userForm.customMenus && (
                    <div className="space-y-2 pt-2 border-t border-[var(--color-border-tertiary)]">
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setUserForm(prev => ({ ...prev, menus: ALL_MENU_ITEMS.map(m => m.id) }))}
                          className="text-[var(--brand)] hover:underline"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setUserForm(prev => ({ ...prev, menus: ['dashboard'] }))}
                          className="text-[var(--color-text-secondary)] hover:underline"
                        >
                          Dashboard Only
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() =>
                            setUserForm(prev => ({
                              ...prev,
                              menus: [...(menuPermissions[prev.role] || ALL_MENU_ITEMS.map(m => m.id))]
                            }))
                          }
                          className="text-[var(--color-text-secondary)] hover:underline"
                        >
                          Reset to Role Default ({userForm.role})
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {ALL_MENU_ITEMS.map(m => {
                          const isChecked = userForm.menus.includes(m.id);
                          const isAdminPanelLocked = userForm.role === 'Administrator' && (m.id === 'admin' || m.id === 'user_governance');

                          return (
                            <label
                              key={m.id}
                              className={`p-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-[var(--brand-light)] border-[var(--brand-text)] text-[var(--brand)] font-medium'
                                  : 'bg-[var(--color-background-secondary)] border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAdminPanelLocked}
                                onChange={() => {
                                  if (isAdminPanelLocked) return;
                                  const next = isChecked
                                    ? userForm.menus.filter(x => x !== m.id)
                                    : [...userForm.menus, m.id];
                                  setUserForm(prev => ({ ...prev, menus: next }));
                                }}
                                className="accent-[var(--brand)]"
                              />
                              <span className="truncate">{m.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(null);
                      setIsAddingUser(false);
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
                  >
                    Save User Account
                  </button>
                </div>
              </form>
            )}

            {/* User List Table */}
            <div className="table-wrap">
              <table className="blms-table">
                <thead>
                  <tr>
                    <th>Name &amp; Designation</th>
                    <th>Employee ID</th>
                    <th>Sign-in ID</th>
                    <th>Default Role</th>
                    <th>Accessible Units</th>
                    <th>Menu Permissions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const unitsDisplay = u.units === 'All' ? 'All Units' : (Array.isArray(u.units) ? u.units.join(', ') : 'None');
                    const hasCustomMenus = Array.isArray(u.menus);
                    const activeMenuCount = hasCustomMenus
                      ? (u.menus?.length ?? 0)
                      : (menuPermissions[u.role] || ALL_MENU_ITEMS).length;

                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="font-semibold text-xs text-[var(--color-text-primary)]">{u.name}</div>
                          <div className="text-[11px] text-[var(--color-text-secondary)]">
                            {u.desig || '-'} {u.dept ? `• ${u.dept}` : ''}
                          </div>
                        </td>
                        <td className="text-xs font-mono">{u.empId || '-'}</td>
                        <td className="text-xs font-mono font-bold text-[var(--brand)]">{u.loginId || u.id}</td>
                        <td><span className="badge badge-gray text-xs">{u.role}</span></td>
                        <td><span className="badge badge-blue text-xs">{unitsDisplay}</span></td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickMenuModal(u)}
                            className="cursor-pointer text-left group"
                            title="Click to view or customize menu permissions for this user"
                          >
                            {hasCustomMenus ? (
                              <span className="badge badge-amber font-semibold group-hover:underline">
                                Custom ({activeMenuCount} menus)
                              </span>
                            ) : (
                              <span className="badge badge-gray font-normal group-hover:underline">
                                By Role ({activeMenuCount} menus)
                              </span>
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEditUser(u)}
                              className="p-1 rounded hover:bg-[var(--color-background-secondary)] text-[var(--brand)] cursor-pointer"
                              title="Edit User"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenQuickMenuModal(u)}
                              className="p-1 rounded hover:bg-[var(--color-background-secondary)] text-[var(--brand)] cursor-pointer"
                              title="Manage User Menu Permissions"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VIEW 2: Global Role Menu Permissions Matrix */}
        {userSectionTab === 'role_perms' && (
          <div className="p-4 space-y-3">
            <div className="p-3 bg-[var(--color-background-secondary)]/50 rounded-lg text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Configure baseline menu access permissions for each of the 4 system roles. Users without custom menu overrides automatically inherit their role's permissions.
            </div>

            <div className="table-wrap">
              <table className="blms-table">
                <thead>
                  <tr>
                    <th className="font-bold">System Role</th>
                    {ALL_MENU_ITEMS.map(m => (
                      <th key={m.id} className="text-center font-normal text-[10px] whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_ROLES.map(role => {
                    const rolePerms = menuPermissions[role] || ALL_MENU_ITEMS.map(m => m.id);

                    return (
                      <tr key={role}>
                        <td className="font-bold text-xs whitespace-nowrap">{role}</td>
                        {ALL_MENU_ITEMS.map(m => {
                          const isChecked = rolePerms.includes(m.id);
                          const isAdminPanelLocked = role === 'Administrator' && (m.id === 'admin' || m.id === 'user_governance');

                          return (
                            <td key={m.id} className="text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAdminPanelLocked}
                                onChange={() => handleToggleRoleMenu(role, m.id)}
                                className="accent-[var(--brand)]"
                                title={
                                  isAdminPanelLocked
                                    ? 'Administrators must always have Admin Panel access'
                                    : `${role} - ${m.label}`
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: Factory Unit Menu Permissions Matrix */}
        {userSectionTab === 'unit_perms' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-[var(--color-background-secondary)]/50 rounded-lg">
              <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Set which menu items each role can open within factory unit <b>{mpUnit}</b>. Overrides standard role defaults for this unit.
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Selected Unit:</span>
                <select
                  value={mpUnit}
                  onChange={e => setMpUnit(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-bold cursor-pointer"
                >
                  {companies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-wrap">
              <table className="blms-table">
                <thead>
                  <tr>
                    <th className="font-bold">Role in {mpUnit}</th>
                    {ALL_MENU_ITEMS.map(m => (
                      <th key={m.id} className="text-center font-normal text-[10px] whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_ROLES.map(role => (
                    <tr key={role}>
                      <td className="font-bold text-xs whitespace-nowrap">{role}</td>
                      {ALL_MENU_ITEMS.map(m => {
                        const isChecked = getUnitMenuChecked(role, m.id);
                        const isAdminPanelLocked = role === 'Administrator' && m.id === 'admin';
                        return (
                          <td key={m.id} className="text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAdminPanelLocked}
                              onChange={() => handleToggleUnitMenu(role, m.id)}
                              className="accent-[var(--brand)]"
                              title={
                                isAdminPanelLocked
                                  ? 'Administrators must always have Admin Panel access'
                                  : `${role} in ${mpUnit} - ${m.label}`
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QUICK USER MENU PERMISSIONS MODAL */}
      {quickMenuUser && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={e => {
            if (e.target === e.currentTarget) setQuickMenuUser(null);
          }}
        >
          <div className="bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border-secondary)] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border-tertiary)] flex items-center justify-between bg-[var(--color-background-secondary)]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--brand)]" />
                <span className="font-bold text-sm text-[var(--color-text-primary)]">
                  Menu Permissions — {quickMenuUser.name}
                </span>
                <span className="badge badge-gray text-xs">{quickMenuUser.role}</span>
              </div>
              <button
                onClick={() => setQuickMenuUser(null)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer p-2 rounded bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)]">
                <input
                  type="checkbox"
                  checked={quickCustom}
                  onChange={e => {
                    const isChecked = e.target.checked;
                    setQuickCustom(isChecked);
                    if (isChecked && !quickMenus.length) {
                      setQuickMenus(menuPermissions[quickMenuUser.role] || ALL_MENU_ITEMS.map(m => m.id));
                    }
                  }}
                  className="accent-[var(--brand)]"
                />
                <span>Enable custom menu permissions for {quickMenuUser.name}</span>
              </label>

              {quickCustom ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span>Select allowed menus:</span>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setQuickMenus(ALL_MENU_ITEMS.map(m => m.id))}
                        className="text-[var(--brand)] hover:underline"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuickMenus(menuPermissions[quickMenuUser.role] || ALL_MENU_ITEMS.map(m => m.id))
                        }
                        className="text-[var(--color-text-secondary)] hover:underline"
                      >
                        Reset to Role Default
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {ALL_MENU_ITEMS.map(m => {
                      const isChecked = quickMenus.includes(m.id);
                      const isLocked = quickMenuUser.role === 'Administrator' && (m.id === 'admin' || m.id === 'user_governance');

                      return (
                        <label
                          key={m.id}
                          className={`p-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-[var(--brand-light)] border-[var(--brand-text)] text-[var(--brand)] font-medium'
                              : 'bg-[var(--color-background-secondary)] border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isLocked}
                            onChange={() => {
                              if (isLocked) return;
                              setQuickMenus(prev =>
                                isChecked ? prev.filter(x => x !== m.id) : [...prev, m.id]
                              );
                            }}
                            className="accent-[var(--brand)]"
                          />
                          <span className="truncate">{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded border border-dashed border-[var(--color-border-secondary)] text-xs text-[var(--color-text-secondary)] text-center leading-relaxed">
                  Currently using default role permissions for <b>{quickMenuUser.role}</b>.
                  <br />
                  This user has access to {(menuPermissions[quickMenuUser.role] || ALL_MENU_ITEMS).length} standard modules.
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[var(--color-border-tertiary)] flex justify-end gap-2 bg-[var(--color-background-secondary)]">
              <button
                type="button"
                onClick={() => setQuickMenuUser(null)}
                className="px-3 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickMenuModal}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: License-wise Alert Threshold Overrides */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--brand)]" />
            <span className="card-title">Alert Thresholds — Customized by License Type</span>
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">
            Global default: <b>{alertThreshold} days</b>
          </span>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-xs text-[var(--color-text-secondary)]">
            You can customize different warning advance notices for high-risk statutory permits (e.g. 90 days for Environmental Clearance or Boiler inspection).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {licenseTypes.map(t => {
              const customVal = licenseThresholds[t];
              return (
                <div key={t} className="p-2.5 rounded border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{t}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder={String(alertThreshold)}
                      defaultValue={customVal !== undefined ? customVal : ''}
                      onBlur={e => handleSaveTypeThreshold(t, e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-center font-semibold"
                    />
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">days</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 6: License Names Catalog */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--brand)]" />
            <span className="card-title">Official License Names Directory</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-secondary)]">Category:</span>
            <select
              value={selectedLnType}
              onChange={e => setSelectedLnType(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] font-medium max-w-[200px] truncate"
            >
              {licenseTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto divide-y divide-[var(--color-border-tertiary)] pr-1">
            {currentNamesList.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--color-text-tertiary)]">
                No names configured for this category yet.
              </div>
            ) : (
              currentNamesList.map((n, idx) => (
                <div key={n} className="pt-1.5 pb-1 flex items-center justify-between gap-2 text-xs">
                  {editingLnIdx === idx ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editingLnVal}
                        onChange={e => setEditingLnVal(e.target.value)}
                        className="px-2 py-0.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] flex-1"
                      />
                      <button
                        onClick={() => handleSaveEditLicenseName(idx)}
                        className="p-1 rounded text-white bg-[var(--brand)]"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingLnIdx(null)}
                        className="p-1 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate">{n}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingLnIdx(idx);
                            setEditingLnVal(n);
                          }}
                          className="p-1 rounded text-[var(--brand)] hover:bg-[var(--color-background-secondary)]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLicenseName(idx)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--color-border-tertiary)]">
            <input
              type="text"
              placeholder={`Add new license name under ${selectedLnType}...`}
              value={newLnVal}
              onChange={e => setNewLnVal(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
            />
            <button
              onClick={handleAddLicenseName}
              className="px-3 py-1 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] cursor-pointer"
            >
              Add Name
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
