import React from 'react';
import { Grid, Check, Edit, Eye, Lock } from 'lucide-react';

interface ProcessMatrixTabProps {
  companies: string[];
}

export const ProcessMatrixTab: React.FC<ProcessMatrixTabProps> = ({ companies }) => {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-[var(--brand)]" />
          <span className="card-title">Process & View Matrix (MR)</span>
        </div>
      </div>

      <div className="p-3 bg-[var(--color-background-secondary)]/50 border-b border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-secondary)]">
        Compliance RACI matrix outlining organizational data entry, technical review, and management overview governance across Bitopi industrial units.
      </div>

      <div className="table-wrap">
        <table className="blms-table">
          <thead>
            <tr>
              <th>Factory Unit</th>
              <th>Prepared by (Input)</th>
              <th>Reviewed by (Verification)</th>
              <th>View: Operator</th>
              <th>View: Verifier</th>
              <th>View: Viewer (Executive)</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c}>
                <td>
                  <span className="badge badge-blue font-bold">{c}</span>
                </td>
                <td className="text-xs font-medium text-[var(--color-text-primary)]">
                  Operator / Contributor (Factory HR & Compliance)
                </td>
                <td className="text-xs font-medium text-[var(--brand)]">
                  Verifier (CHO Compliance Reviewer)
                </td>
                <td>
                  <span className="badge badge-green">
                    <Check className="w-3 h-3" /> Access
                  </span>
                </td>
                <td>
                  <span className="badge badge-green">
                    <Check className="w-3 h-3" /> Access
                  </span>
                </td>
                <td>
                  <span className="badge badge-green">
                    <Check className="w-3 h-3" /> Access
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-[var(--color-background-secondary)]/30 border-t border-[var(--color-border-tertiary)] space-y-2">
        <div className="text-xs font-bold text-[var(--color-text-primary)]">
          Governance Operational Legend:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="badge badge-green"><Check className="w-3 h-3" /> Access</span>
            <span className="text-[var(--color-text-secondary)]">View and monitor dashboards</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[var(--brand-light)] text-[var(--brand)]"><Edit className="w-3.5 h-3.5" /></span>
            <span className="text-[var(--color-text-secondary)]"><b>Operator</b>: Data entry, updates & replies</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[var(--brand-light)] text-[var(--brand)]"><Eye className="w-3.5 h-3.5" /></span>
            <span className="text-[var(--color-text-secondary)]"><b>Verifier</b>: Review, feedback & instructions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#EAF3DE] text-[#3B6D11]"><Lock className="w-3.5 h-3.5" /></span>
            <span className="text-[var(--color-text-secondary)]"><b>Approve & Lock</b>: Freezes record after sign-off</span>
          </div>
        </div>
      </div>
    </div>
  );
};
