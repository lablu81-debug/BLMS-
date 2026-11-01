import React, { useState } from 'react';
import { Upload, Download, Check, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LicenseEntry, UserAccount, StatusCategory, LicenseStatus, ActionStatus } from '../types';
import { generateExcelBlob, downloadFile, genLNo } from '../utils/helpers';

interface ImportTabProps {
  licenses: LicenseEntry[];
  companies: string[];
  licenseTypes: string[];
  currentUser: UserAccount;
  onImportSuccess: (imported: LicenseEntry[], filename: string) => void;
  onShowToast: (message: string, kind?: 'info' | 'success' | 'error') => void;
}

interface ParsedImportRow {
  rowNum: number;
  entry: Partial<LicenseEntry>;
  errors: string[];
}

export const ImportTab: React.FC<ImportTabProps> = ({
  licenses,
  companies,
  licenseTypes,
  currentUser,
  onImportSuccess,
  onShowToast
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Template Download Handler
  const handleDownloadTemplate = () => {
    const headers = [
      'Unit',
      'Type of License',
      'License Name',
      'License No.',
      'Valid From / Issue Date',
      'Valid Till',
      'Status',
      'Status Category',
      'Comments',
      'Action Status'
    ];
    const sampleRows = [
      [
        'TAL',
        'Trade License',
        'City Corporation Trade License',
        'CCC-2026-12345',
        '2026-01-01',
        '2026-12-31',
        'Valid',
        'Renewal (Periodic Expiry)',
        'Sample license entry for renewal',
        'In Progress'
      ],
      [
        'BGL',
        'Tax Certificate',
        'TIN Certificate',
        'TIN-12345678',
        '2024-01-01',
        '',
        'Valid',
        'One-time (Permanent)',
        'Permanent corporate TIN certificate',
        'Completed'
      ]
    ];

    const blob = generateExcelBlob('Licenses Template', headers, sampleRows);
    if (blob) {
      downloadFile('BLMS_License_Import_Template.xlsx', blob);
      onShowToast('Downloaded BLMS_License_Import_Template.xlsx', 'success');
    }
  };

  // Helper date parser
  const parseDateStr = (raw: any): string => {
    if (!raw) return '';
    if (typeof raw === 'number') {
      // Excel serial date conversion
      const parsedDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
      return parsedDate.toISOString().split('T')[0];
    }
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parts = s.split(/[\/\-.]/);
    if (parts.length === 3) {
      // DD/MM/YYYY or YYYY/MM/DD
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return s;
  };

  // Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson.length) {
          onShowToast('No data rows found in worksheet.', 'error');
          setIsProcessing(false);
          return;
        }

        const inScope = (unit: string) => currentUser.units === 'All' || currentUser.units.includes(unit);

        const rows: ParsedImportRow[] = rawJson.slice(0, 1000).map((r, idx) => {
          const errors: string[] = [];
          // Standardize column key names
          const normalized: Record<string, any> = {};
          Object.keys(r).forEach(k => {
            const keyClean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[keyClean] = r[k];
          });

          const unitVal = (normalized['unit'] || normalized['company'] || '').toString().trim().toUpperCase();
          const typeVal = (normalized['typeoflicense'] || normalized['licensetype'] || normalized['type'] || '').toString().trim();
          const nameVal = (normalized['licensename'] || normalized['name'] || '').toString().trim();
          const numVal = (normalized['licenseno'] || normalized['licensenumber'] || normalized['number'] || '').toString().trim();
          const fromVal = parseDateStr(normalized['validfromissuedate'] || normalized['validfrom'] || normalized['issuedate']);
          const tillVal = parseDateStr(normalized['validtill'] || normalized['expirydate'] || normalized['till']);
          const catVal = (normalized['statuscategory'] || normalized['category'] || 'Renewal').toString().trim();
          const statVal = (normalized['status'] || 'Valid').toString().trim();
          const actVal = (normalized['actionstatus'] || normalized['action'] || 'In Progress').toString().trim();
          const commVal = (normalized['comments'] || normalized['remarks'] || '').toString().trim();

          // Validation
          if (!unitVal) {
            errors.push('Unit is required');
          } else if (!companies.includes(unitVal)) {
            errors.push(`Unit "${unitVal}" does not exist in master company list`);
          } else if (!inScope(unitVal)) {
            errors.push(`You do not have access permission for unit "${unitVal}"`);
          }

          if (!typeVal) {
            errors.push('Type of License is required');
          } else if (!licenseTypes.includes(typeVal)) {
            errors.push(`Unknown License Type "${typeVal}"`);
          }

          if (!nameVal) {
            errors.push('License Name is required');
          }

          const rawCat = String(catVal || '').trim();
          const lowerCat = rawCat.toLowerCase();
          const isOneTime = lowerCat.includes('one-time') || lowerCat.includes('permanent');
          const isRenewal = lowerCat.includes('renewal') || lowerCat.includes('periodic');

          if (!isOneTime && !isRenewal) {
            errors.push('Status Category must be "Renewal (Periodic Expiry)" or "One-time (Permanent)"');
          }

          if (isRenewal && !tillVal) {
            errors.push('Valid Till date is required for Renewal (Periodic Expiry) licenses');
          }

          const entryCategory: StatusCategory = isOneTime ? 'One-time' : 'Renewal';

          const entry: Partial<LicenseEntry> = {
            company: unitVal,
            type: typeVal,
            name: nameVal,
            number: numVal,
            from: fromVal,
            till: tillVal,
            category: entryCategory,
            status: (statVal || 'Valid') as LicenseStatus,
            action: (actVal || 'In Progress') as ActionStatus,
            comments: commVal
          };

          return {
            rowNum: idx + 2,
            entry,
            errors
          };
        });

        setParsedRows(rows);
      } catch (err: any) {
        console.error('Import parse error:', err);
        onShowToast(`Failed to parse file: ${err.message || 'invalid format'}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (!parsedRows) return;
    const validRows = parsedRows.filter(r => r.errors.length === 0);

    if (!validRows.length) {
      onShowToast('No valid records to import. Please resolve the errors.', 'error');
      return;
    }

    const currentYear = String(new Date().getFullYear());
    const newLicenses: LicenseEntry[] = validRows.map((r, i) => {
      const e = r.entry;
      const comp = e.company || 'TAL';
      const year = (e.from || currentYear).slice(0, 4);
      const existingInUnit = licenses.filter(l => l.company === comp).length;
      const autoId = genLNo(comp, year, existingInUnit + i);

      return {
        id: autoId,
        company: comp,
        year,
        type: e.type || 'Trade License',
        name: e.name || '',
        number: e.number || '',
        from: e.from || '',
        till: e.category === 'One-time' ? '' : (e.till || ''),
        status: e.status || 'Valid',
        category: e.category || 'Renewal',
        comments: e.comments || '',
        action: e.action || 'In Progress',
        feedback: '',
        docs: []
      };
    });

    onImportSuccess(newLicenses, fileName);
    setParsedRows(null);
    setFileName('');
  };

  const validCount = parsedRows?.filter(r => r.errors.length === 0).length || 0;
  const invalidCount = parsedRows?.filter(r => r.errors.length > 0).length || 0;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Upload className="w-4 h-4 text-[var(--brand)]" /> Import Licenses from Excel / CSV
          </span>
          <button
            onClick={handleDownloadTemplate}
            className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span>Download Excel Template</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Upload an Excel (.xlsx, .xls) or CSV file with license records. The file will be parsed and validated against your authorized unit scopes and master categories before saving.
          </p>

          <div
            className="border-2 border-dashed border-[var(--color-border-secondary)] hover:border-[var(--brand)] rounded-lg p-6 text-center cursor-pointer transition-colors bg-[var(--color-background-secondary)]/50"
            onClick={() => document.getElementById('excelFileInput')?.click()}
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-[var(--brand)] opacity-80" />
            <div className="text-xs font-semibold text-[var(--color-text-primary)]">
              Click to browse or drop your .xlsx or .csv file here
            </div>
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
              Supports standard column headers: Unit, Type of License, License Name, Lic No, From, Till, Status, Status Category, Comments, Action
            </div>
            <input
              id="excelFileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Parse Preview Section */}
      {parsedRows && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="card-title">Import Preview — {fileName}</span>
              <span className="badge badge-green text-[10px]">{validCount} valid</span>
              {invalidCount > 0 && (
                <span className="badge badge-red text-[10px]">{invalidCount} with errors (skipped)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParsedRows(null)}
                className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] hover:bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isProcessing}
                className="px-3.5 py-1 text-xs font-semibold rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Import {validCount} Record(s)</span>
              </button>
            </div>
          </div>

          <div className="table-wrap max-h-[500px]">
            <table className="blms-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>License Name</th>
                  <th>Lic. No.</th>
                  <th>From</th>
                  <th>Till</th>
                  <th>Status Category</th>
                  <th>Status</th>
                  <th>Validation Result</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map(r => {
                  const hasErr = r.errors.length > 0;
                  return (
                    <tr key={r.rowNum} className={hasErr ? 'bg-red-50/30' : ''}>
                      <td className="text-xs font-mono">{r.rowNum}</td>
                      <td><span className="badge badge-blue">{r.entry.company || '-'}</span></td>
                      <td className="text-xs">{r.entry.type || '-'}</td>
                      <td className="font-medium text-xs">{r.entry.name || '-'}</td>
                      <td className="text-xs font-mono">{r.entry.number || '-'}</td>
                      <td className="text-xs">{r.entry.from || '-'}</td>
                      <td className="text-xs">{r.entry.till || '-'}</td>
                      <td><span className="badge badge-gray text-[10px]">{r.entry.category === 'One-time' ? 'One-time (Permanent)' : 'Renewal (Periodic Expiry)'}</span></td>
                      <td><span className="badge badge-gray text-[10px]">{r.entry.status}</span></td>
                      <td>
                        {hasErr ? (
                          <div className="text-[11px] text-[#A32D2D] space-y-0.5">
                            {r.errors.map((err, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#3B6D11] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
