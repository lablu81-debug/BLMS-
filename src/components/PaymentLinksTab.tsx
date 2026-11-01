import React, { useState } from 'react';
import { Wallet, ExternalLink, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { PaymentLink, UserAccount } from '../types';

interface PaymentLinksTabProps {
  paymentLinks: PaymentLink[];
  licenseTypes: string[];
  currentUser: UserAccount;
  onSavePaymentLink: (link: PaymentLink, isNew: boolean) => void;
  onDeletePaymentLink: (id: string) => void;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

export const PaymentLinksTab: React.FC<PaymentLinksTabProps> = ({
  paymentLinks,
  licenseTypes,
  currentUser,
  onSavePaymentLink,
  onDeletePaymentLink,
  onShowToast
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const isAdmin = currentUser.role === 'Administrator';

  const handleStartEdit = (link?: PaymentLink) => {
    if (link) {
      setEditingId(link.id);
      setName(link.name);
      setUrl(link.url);
      setDesc(link.desc || '');
      setSelectedTypes(link.types || []);
    } else {
      setEditingId('new');
      setName('');
      setUrl('https://');
      setDesc('');
      setSelectedTypes([]);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('Portal name is required.', 'error');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      onShowToast('Portal link must start with https:// or http://', 'error');
      return;
    }

    const isNew = editingId === 'new';
    const linkToSave: PaymentLink = {
      id: isNew ? 'p_' + Date.now().toString(36) : editingId!,
      name: name.trim(),
      url: url.trim(),
      desc: desc.trim(),
      types: selectedTypes
    };

    onSavePaymentLink(linkToSave, isNew);
    setEditingId(null);
  };

  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[var(--brand)]" />
          <span className="card-title">Payment — Government Fee Portals Directory</span>
        </div>
        {isAdmin && !editingId && (
          <button
            onClick={() => handleStartEdit()}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Portal Link</span>
          </button>
        )}
      </div>

      <div className="p-3 bg-[var(--color-background-secondary)]/50 border-b border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)] leading-relaxed">
        Official government portals used for license renewal fee payments, challan submissions, and structural safety certifications. Each link opens the agency's official website in a new tab.
      </div>

      {/* Add / Edit Form Modal/Section */}
      {editingId && (
        <form onSubmit={handleSave} className="p-4 bg-[var(--brand-light)]/20 border-b border-[var(--color-border-tertiary)] space-y-3">
          <div className="text-xs font-bold text-[var(--brand)]">
            {editingId === 'new' ? 'Add New Government Payment Portal' : 'Edit Portal Link'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Portal Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. DIFE — Dept. of Inspection"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Portal URL (https://) *</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)] font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Description / Payment Scope</label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Factory license and labour establishment renewal fees"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Associated License Types</label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-[var(--color-background-primary)] border border-[var(--color-border-secondary)] rounded max-h-[120px] overflow-y-auto">
              {licenseTypes.map(t => (
                <label
                  key={t}
                  className={`px-2 py-0.5 rounded text-[11px] cursor-pointer flex items-center gap-1.5 border ${
                    selectedTypes.includes(t)
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border-tertiary)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleType(t)}
                    className="hidden"
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Portal</span>
            </button>
          </div>
        </form>
      )}

      {/* List of Portals */}
      <div className="divide-y divide-[var(--color-border-tertiary)]">
        {paymentLinks.map(portal => (
          <div key={portal.id} className="p-4 flex items-center justify-between gap-4 flex-wrap hover:bg-[var(--color-background-secondary)]/30 transition-colors">
            <div className="space-y-1 flex-1 min-w-[250px]">
              <div className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span>{portal.name}</span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] leading-snug">
                {portal.desc}
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                {portal.url}
              </div>
              {portal.types?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {portal.types.map(t => (
                    <span key={t} className="tag text-[9px] py-0 px-1.5">{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Open Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(portal)}
                    className="p-1.5 rounded hover:bg-[var(--color-background-secondary)] text-[var(--brand)] cursor-pointer"
                    title="Edit Portal Link"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeletePaymentLink(portal.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-[#A32D2D] cursor-pointer"
                    title="Delete Portal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
