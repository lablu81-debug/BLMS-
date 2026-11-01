import React from 'react';
import { X, Download, FileText, AlertTriangle } from 'lucide-react';
import { AttachedDoc } from '../types';
import { fmtSize, docExt, downloadFile } from '../utils/helpers';

export interface ConfirmState {
  message: string;
  onYes: () => void;
}

export interface ToastState {
  id: string;
  message: string;
  kind?: 'info' | 'success' | 'error';
}

interface DocViewerModalProps {
  doc: AttachedDoc | null;
  docsList: AttachedDoc[];
  title: string;
  onClose: () => void;
  onSelectDoc: (d: AttachedDoc) => void;
}

export const DocViewerModal: React.FC<DocViewerModalProps> = ({
  doc,
  docsList,
  title,
  onClose,
  onSelectDoc
}) => {
  if (!doc) return null;
  const ext = docExt(doc.name);
  const isPdf = ext === 'pdf';

  const handleDownload = () => {
    // Convert base64 data to blob and download
    try {
      const arr = doc.data.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      downloadFile(doc.name, blob);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border-secondary)] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-tertiary)] flex items-center justify-between bg-[var(--color-background-secondary)]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--brand)]" />
            <span className="font-semibold text-sm text-[var(--color-text-primary)]">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] flex items-center gap-1 text-[var(--color-text-primary)]"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-1 rounded"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {docsList.length > 1 && (
          <div className="px-4 py-2 border-b border-[var(--color-border-tertiary)] flex gap-2 overflow-x-auto bg-[var(--color-background-secondary)]/50">
            {docsList.map(d => (
              <button
                key={d.id}
                onClick={() => onSelectDoc(d)}
                className={`px-3 py-1 text-xs rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  d.id === doc.id
                    ? 'bg-[var(--brand)] text-white border-[var(--brand)] font-medium'
                    : 'bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] border-[var(--color-border-tertiary)] hover:border-[var(--brand-text)]'
                }`}
              >
                <span className="uppercase text-[10px] font-mono px-1 py-0.5 rounded bg-black/10">
                  {docExt(d.name)}
                </span>
                <span className="truncate max-w-[140px]">{d.name}</span>
                <span className="text-[10px] opacity-70">({fmtSize(d.size)})</span>
              </button>
            ))}
          </div>
        )}

        <div className="p-4 flex-1 overflow-auto bg-[var(--color-background-tertiary)] flex items-center justify-center min-h-[350px]">
          {isPdf ? (
            <iframe
              src={doc.data}
              title={doc.name}
              className="w-full h-[65vh] border-0 rounded bg-white"
            />
          ) : (
            <div className="max-h-[65vh] overflow-auto flex items-center justify-center p-2 bg-white rounded shadow-xs">
              <img
                src={doc.data}
                alt={doc.name}
                className="max-h-[60vh] max-w-full object-contain rounded"
              />
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)] flex justify-between items-center bg-[var(--color-background-secondary)]">
          <span>
            {doc.name} • {fmtSize(doc.size)} • Uploaded by {doc.by} on{' '}
            {new Date(doc.at).toLocaleDateString()}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[var(--color-background-primary)] border border-[var(--color-border-secondary)] rounded hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal: React.FC<{
  confirm: ConfirmState | null;
  onClose: () => void;
}> = ({ confirm, onClose }) => {
  if (!confirm) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--color-background-primary)] rounded-lg border border-[var(--color-border-secondary)] max-w-md w-full p-5 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-100 text-red-700 rounded-full shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">
              Confirm Action
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {confirm.message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border-tertiary)]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              confirm.onYes();
              onClose();
            }}
            className="px-3 py-1.5 text-xs rounded bg-[#A32D2D] hover:bg-[#822323] text-white font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastStack: React.FC<{
  toasts: ToastState[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-[92vw]">
      {toasts.map(t => {
        const bg =
          t.kind === 'error'
            ? 'bg-[#A32D2D] text-white'
            : t.kind === 'success'
            ? 'bg-[#3B6D11] text-white'
            : 'bg-[var(--color-text-primary)] text-[var(--color-background-primary)]';

        return (
          <div
            key={t.id}
            className={`p-3 rounded-lg shadow-lg flex items-center justify-between gap-3 text-xs ${bg} animate-in fade-in slide-in-from-bottom-2`}
          >
            <span className="leading-snug">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="opacity-70 hover:opacity-100 p-0.5"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
