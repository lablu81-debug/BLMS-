import React, { useState, useEffect } from 'react';
import {
  Save,
  X,
  Upload,
  Edit2,
  Trash2,
  Paperclip,
  Search,
  Hash,
  AlertCircle
} from 'lucide-react';
import {
  LicenseEntry,
  UserAccount,
  AttachedDoc,
  LicenseStatus,
  StatusCategory,
  ActionStatus
} from '../types';
import {
  genLNo,
  daysUntil,
  statusColor,
  statusLabel,
  fmtSize,
  docExt
} from '../utils/helpers';

interface NewEntryTabProps {
  licenses: LicenseEntry[];
  companies: string[];
  licenseTypes: string[];
  licenseNames: Record<string, string[]>;
  currentUser: UserAccount;
  globalAlertThreshold: number;
  licenseThresholds: Record<string, number>;
  editingLicense: LicenseEntry | null;
  onSaveLicense: (entry: LicenseEntry, isEdit: boolean) => void;
  onCancelEdit: () => void;
  onDeleteLicense: (id: string) => void;
  onViewDocs: (docs: AttachedDoc[], title: string) => void;
  onSetEditingLicense: (entry: LicenseEntry | null) => void;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

export const NewEntryTab: React.FC<NewEntryTabProps> = ({
  licenses,
  companies,
  licenseTypes,
  licenseNames,
  currentUser,
  globalAlertThreshold,
  licenseThresholds,
  editingLicense,
  onSaveLicense,
  onCancelEdit,
  onDeleteLicense,
  onViewDocs,
  onSetEditingLicense,
  onShowToast
}) => {
  // Unit scoping
  const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);
  const permittedUnits = companies.filter(inScope);

  const defaultUnit = permittedUnits[0] || companies[0] || 'TAL';
  const defaultYear = String(new Date().getFullYear());

  // Form State
  const [company, setCompany] = useState(defaultUnit);
  const [year, setYear] = useState(defaultYear);
  const [type, setType] = useState(licenseTypes[0] || 'Trade License');
  const [category, setCategory] = useState<StatusCategory>('Renewal');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [from, setFrom] = useState('');
  const [till, setTill] = useState('');
  const [status, setStatus] = useState<LicenseStatus>('Valid');
  const [action, setAction] = useState<ActionStatus>('In Progress');
  const [comments, setComments] = useState('');
  const [docs, setDocs] = useState<AttachedDoc[]>([]);

  // Vehicle specific fields
  const [vNumber, setVNumber] = useState('');
  const [vModel, setVModel] = useState('');
  const [vTaxToken, setVTaxToken] = useState('');
  const [vFitness, setVFitness] = useState('');
  const [vInsurance, setVInsurance] = useState('');
  const [vRoutePermit, setVRoutePermit] = useState('');
  const [vRegCall, setVRegCall] = useState('');
  const [vRoutePermitCall, setVRoutePermitCall] = useState('');

  // Table filters
  const [entrySearch, setEntrySearch] = useState('');
  const [entryUnit, setEntryUnit] = useState('All');
  const [entryStatus, setEntryStatus] = useState('All');

  // Load editing license if provided
  useEffect(() => {
    if (editingLicense) {
      setCompany(editingLicense.company);
      setYear(editingLicense.year || defaultYear);
      setType(editingLicense.type);
      setCategory(editingLicense.category || 'Renewal');
      setName(editingLicense.name);
      setNumber(editingLicense.number || '');
      setFrom(editingLicense.from || '');
      setTill(editingLicense.till || '');
      setStatus(editingLicense.status);
      setAction(editingLicense.action || 'In Progress');
      setComments(editingLicense.comments || '');
      setDocs(editingLicense.docs || []);
      setVNumber(editingLicense.vNumber || '');
      setVModel(editingLicense.vModel || '');
      setVTaxToken(editingLicense.vTaxToken || '');
      setVFitness(editingLicense.vFitness || '');
      setVInsurance(editingLicense.vInsurance || '');
      setVRoutePermit(editingLicense.vRoutePermit || '');
      setVRegCall(editingLicense.vRegCall || '');
      setVRoutePermitCall(editingLicense.vRoutePermitCall || '');
    } else {
      // Reset form
      setCompany(permittedUnits[0] || companies[0] || 'TAL');
      setYear(defaultYear);
      setType(licenseTypes[0] || 'Trade License');
      setCategory('Renewal');
      setName('');
      setNumber('');
      setFrom('');
      setTill('');
      setStatus('Valid');
      setAction('In Progress');
      setComments('');
      setDocs([]);
      setVNumber('');
      setVModel('');
      setVTaxToken('');
      setVFitness('');
      setVInsurance('');
      setVRoutePermit('');
      setVRegCall('');
      setVRoutePermitCall('');
    }
  }, [editingLicense]);

  // Available names for selected type
  const availableNames = licenseNames[type] || [];

  // When type changes and name is empty, auto-select first available or leave for manual select
  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (licenseNames[newType]?.length) {
      setName(licenseNames[newType][0]);
    } else {
      setName('');
    }
  };

  const isVehicle = type === 'Transport & Vehicle (BRTA)';

  // Calculate Auto ID
  const autoId = editingLicense
    ? editingLicense.id
    : genLNo(
        company,
        year,
        licenses.filter(l => l.company === company).length
      );

  // File Upload Handler
  const handleFileUpload = (files: FileList | null) => {
    if (!files || !files.length) return;
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];

    Array.from(files).forEach(file => {
      const ext = docExt(file.name);
      if (!allowed.includes(ext)) {
        onShowToast(`File ${file.name} is not supported. Use PDF, JPG or PNG.`, 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        onShowToast(`File ${file.name} exceeds 5 MB limit.`, 'error');
        return;
      }
      if (docs.length >= 5) {
        onShowToast('Maximum 5 documents can be attached per license.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newDoc: AttachedDoc = {
          id: 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          name: file.name,
          size: file.size,
          data: base64,
          by: currentUser.name,
          at: Date.now()
        };
        setDocs(prev => [...prev, newDoc]);
        onShowToast(`Attached ${file.name}`, 'success');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVehicle && (!type || !name)) {
      onShowToast('Please select License Type and Name.', 'error');
      return;
    }

    if (isVehicle && !vNumber.trim()) {
      onShowToast('Please enter Vehicle Registration Number.', 'error');
      return;
    }

    // Prepare license entry
    let finalName = name;
    let finalNumber = number;
    let finalTill = till;

    if (isVehicle) {
      finalName = `Vehicle ${vNumber.trim()}${vModel ? ` — ${vModel.trim()}` : ''}`;
      finalNumber = vNumber.trim();
      // Earliest expiry date from BRTA documents
      const dates = [vTaxToken, vFitness, vInsurance, vRoutePermit].filter(Boolean).sort();
      finalTill = dates[0] || '';
    }

    if (category === 'One-time' && !isVehicle) {
      finalTill = '';
    }

    const entryToSave: LicenseEntry = {
      id: autoId,
      company,
      year,
      type,
      name: finalName,
      number: finalNumber,
      from: isVehicle ? '' : from,
      till: finalTill,
      status: isVehicle ? 'Valid' : status,
      category,
      comments,
      action,
      docs,
      feedback: editingLicense?.feedback || '',
      reviewState: editingLicense?.reviewState,
      thread: editingLicense?.thread,
      locked: editingLicense?.locked,
      // Vehicle BRTA fields
      vNumber,
      vModel,
      vTaxToken,
      vFitness,
      vInsurance,
      vRoutePermit,
      vRegCall,
      vRoutePermitCall
    };

    onSaveLicense(entryToSave, !!editingLicense);
  };

  // Filtered operational entries
  const operationalEntries = licenses
    .filter(l => inScope(l.company))
    .filter(l => {
      if (entryUnit !== 'All' && l.company !== entryUnit) return false;
      if (entryStatus !== 'All' && statusLabel(daysUntil(l.till), l.status, l.type, globalAlertThreshold, licenseThresholds) !== entryStatus) return false;
      if (entrySearch) {
        const q = entrySearch.toLowerCase();
        return [l.id, l.company, l.type, l.name, l.number, l.comments]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      }
      return true;
    });

  const canEdit = currentUser.role === 'Administrator' || currentUser.role === 'Operator / Contributor';

  return (
    <div className="space-y-6">
      {/* Pending Feedback Banner for Dept */}
      {editingLicense?.feedback && editingLicense.reviewState === 'Awaiting Dept' && (
        <div className="p-4 rounded-lg border border-amber-300 bg-[#FAEEDA] text-[#854F0B] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold">Reviewer Feedback Received for this Record</div>
            <div className="text-xs leading-relaxed">{editingLicense.feedback}</div>
            <div className="text-[11px] opacity-80 pt-1">
              Please update the fields or upload revised compliance documents below and save to return to the reviewer.
            </div>
          </div>
        </div>
      )}

      {/* Main Entry Card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Hash className="w-4 h-4 text-[var(--brand)]" />
            {editingLicense ? 'Edit License Record' : 'New License Entry'}
          </span>
          <span className="badge badge-blue text-xs font-mono py-1 px-2.5">
            L No: <b>{autoId}</b>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Company / Unit */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Company / Unit <span className="text-red-500">*</span>
              </label>
              <select
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                required
              >
                {permittedUnits.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Issue Year */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Issue Year <span className="text-red-500">*</span>
              </label>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
              >
                {Array.from({ length: 65 }, (_, i) => String(1975 + i)).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Type of License */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Type of License <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                required
              >
                {licenseTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Status Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Status Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as StatusCategory)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
              >
                <option value="Renewal">Renewal (Periodic Expiry)</option>
                <option value="One-time">One-time (Permanent)</option>
              </select>
            </div>
          </div>

          {/* Regular License Fields */}
          {!isVehicle ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  License Name <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                    required
                  >
                    <option value="">— Select Official Name —</option>
                    {availableNames.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value="Other">Other (Custom specification)</option>
                  </select>
                  {name === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify custom license title..."
                      onChange={e => setName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  License / Registration No.
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="e.g. CCC-2026-12345"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  {category === 'One-time' ? 'Issue Date' : 'Valid From'}
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                />
              </div>

              {category !== 'One-time' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Valid Till (Expiration Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={till}
                    onChange={e => setTill(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as LicenseStatus)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="Valid">Valid</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Applied">Applied</option>
                  <option value="In Progress">In Progress</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Action Status
                </label>
                <select
                  value={action}
                  onChange={e => setAction(e.target.value as ActionStatus)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Applied">Applied</option>
                </select>
              </div>
            </div>
          ) : (
            /* Vehicle (BRTA) Specific Fields */
            <div className="p-4 rounded-lg border border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)]/30 space-y-3">
              <div className="text-xs font-bold text-[var(--brand)] flex items-center gap-1.5">
                Vehicle Details (BRTA Regulatory Compliance)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vNumber}
                    onChange={e => setVNumber(e.target.value)}
                    placeholder="e.g. DHAKA METRO-HA-11-1234"
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    value={vModel}
                    onChange={e => setVModel(e.target.value)}
                    placeholder="e.g. Toyota Hiace 2020"
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Tax Token Date
                  </label>
                  <input
                    type="date"
                    value={vTaxToken}
                    onChange={e => setVTaxToken(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Fitness Certificate Date
                  </label>
                  <input
                    type="date"
                    value={vFitness}
                    onChange={e => setVFitness(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Insurance Valid Till
                  </label>
                  <input
                    type="date"
                    value={vInsurance}
                    onChange={e => setVInsurance(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Route Permit Date
                  </label>
                  <input
                    type="date"
                    value={vRoutePermit}
                    onChange={e => setVRoutePermit(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Registration Call Date
                  </label>
                  <input
                    type="date"
                    value={vRegCall}
                    onChange={e => setVRegCall(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Route Permit Call Date
                  </label>
                  <input
                    type="date"
                    value={vRoutePermitCall}
                    onChange={e => setVRoutePermitCall(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Operational Comments & Inspection Remarks
            </label>
            <input
              type="text"
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="e.g. Annual inspection cleared, renewal fee challan submitted..."
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          {/* Document Upload Area */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] block">
              Supporting Compliance Documents (PDF, JPG, PNG - max 5MB, up to 5 files)
            </label>

            <div
              className="border-2 border-dashed border-[var(--color-border-secondary)] hover:border-[var(--brand)] rounded-lg p-4 text-center cursor-pointer transition-colors bg-[var(--color-background-secondary)]/50"
              onClick={() => document.getElementById('fileUploadInput')?.click()}
            >
              <Upload className="w-6 h-6 mx-auto mb-1 text-[var(--brand)] opacity-70" />
              <div className="text-xs font-medium text-[var(--color-text-primary)]">
                Click to select files or drag & drop files here
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                License copies, challan receipts, inspection reports, official permits
              </div>
              <input
                id="fileUploadInput"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Attached documents pill list */}
            {docs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {docs.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-background-secondary)] border border-[var(--color-border-tertiary)] text-xs"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                    <button
                      type="button"
                      onClick={() => onViewDocs(docs, `${d.name} (${autoId})`)}
                      className="font-medium hover:underline max-w-[150px] truncate text-[var(--color-text-primary)]"
                    >
                      {d.name}
                    </button>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">({fmtSize(d.size)})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(d.id)}
                      className="text-red-500 hover:text-red-700 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-tertiary)]">
            {editingLicense && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={!canEdit}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingLicense ? 'Update License' : 'Save New Entry'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* "Your Entries" Operational Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span className="card-title">Your Unit Entries</span>
            <span className="text-xs text-[var(--color-text-secondary)]">({operationalEntries.length} records)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search entries..."
                value={entrySearch}
                onChange={e => setEntrySearch(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] w-[160px] focus:outline-hidden"
              />
            </div>

            <select
              value={entryUnit}
              onChange={e => setEntryUnit(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
            >
              <option value="All">All Units</option>
              {permittedUnits.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={entryStatus}
              onChange={e => setEntryStatus(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
            >
              <option value="All">All Statuses</option>
              <option value="Valid">Valid</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="blms-table">
            <thead>
              <tr>
                <th>L No</th>
                <th>Type</th>
                <th>Unit</th>
                <th>License Name</th>
                <th>Lic No</th>
                <th>Valid Till</th>
                <th>Status</th>
                <th>Docs</th>
                {canEdit && <th>Manage</th>}
              </tr>
            </thead>
            <tbody>
              {operationalEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-xs text-[var(--color-text-tertiary)]">
                    No entries found matching filters.
                  </td>
                </tr>
              ) : (
                operationalEntries.map(l => {
                  const days = daysUntil(l.till);
                  const sc = statusColor(days, l.type, l.status, globalAlertThreshold, licenseThresholds);
                  const sl = statusLabel(days, l.status, l.type, globalAlertThreshold, licenseThresholds);

                  const pillBg =
                    sc === 'green' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                    sc === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                    sc === 'red' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]';

                  return (
                    <tr key={l.id}>
                      <td className="text-[11px] font-mono text-[var(--color-text-secondary)]">{l.id}</td>
                      <td><span className="tag text-[10px]">{l.type}</span></td>
                      <td><span className="badge badge-blue">{l.company}</span></td>
                      <td className="font-semibold text-xs">{l.name}</td>
                      <td className="text-[11px] font-mono">{l.number || '-'}</td>
                      <td className="text-xs">{l.till || '-'}</td>
                      <td><span className={`status-pill ${pillBg} text-[10px]`}>{sl}</span></td>
                      <td>
                        {l.docs?.length ? (
                          <button
                            type="button"
                            onClick={() => onViewDocs(l.docs || [], `${l.name} (${l.id})`)}
                            className="px-2 py-0.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--brand)] flex items-center gap-1 cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{l.docs.length}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--color-text-tertiary)]">-</span>
                        )}
                      </td>
                      {canEdit && (
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onSetEditingLicense(l);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1 rounded hover:bg-[var(--color-background-secondary)] text-[var(--brand)] cursor-pointer"
                              title="Edit License"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLicense(l.id)}
                              className="p-1 rounded hover:bg-red-50 text-[#A32D2D] cursor-pointer"
                              title="Delete License"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
