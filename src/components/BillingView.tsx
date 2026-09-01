import React, { useState } from 'react';
import { Claim } from '../types';

interface BillingViewProps {
  claims: Claim[];
  onAddClaim: (claimData: any) => Promise<void>;
  onUpdateClaimStatus: (claimId: string, status: Claim['status']) => Promise<void>;
  onDeleteClaim: (claimId: string) => Promise<void>;
  isWorkspaceEditMode?: boolean;
  customLabels?: Record<string, string>;
  onUpdateLabel?: (key: string, value: string) => void;
}

export default function BillingView({
  claims,
  onAddClaim,
  onUpdateClaimStatus,
  onDeleteClaim,
  isWorkspaceEditMode = false,
  customLabels = {},
  onUpdateLabel
}: BillingViewProps) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [billingSearch, setBillingSearch] = useState<string>('');
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Claim | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Claim Modal State
  const [isAddClaimOpen, setIsAddClaimOpen] = useState(false);
  const [newClaimPatient, setNewClaimPatient] = useState('');
  const [newClaimPayer, setNewClaimPayer] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState('');
  const [newClaimDoc, setNewClaimDoc] = useState('');

  // Calculating statistics
  const totalBilled = claims.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = claims.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0);
  const totalOutstanding = claims.filter(c => c.status === 'Billed').reduce((sum, c) => sum + c.amount, 0);
  const totalDenied = claims.filter(c => c.status === 'Denied').reduce((sum, c) => sum + c.amount, 0);
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

  // Filter claims based on status and search query
  const filteredClaims = claims.filter(c => {
    const matchesStatus = selectedStatusFilter === 'All' || c.status === selectedStatusFilter;
    const matchesSearch = c.patientName.toLowerCase().includes(billingSearch.toLowerCase()) ||
                          c.claimNumber.toLowerCase().includes(billingSearch.toLowerCase()) ||
                          c.payer.toLowerCase().includes(billingSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleAddClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaimPatient.trim() || !newClaimAmount) return;

    await onAddClaim({
      patientName: newClaimPatient,
      payer: newClaimPayer || 'Self',
      amount: newClaimAmount,
      doctor: newClaimDoc || 'Dr. Deepak Kumar Bhardwaj',
      status: 'Billed'
    });

    setNewClaimPatient('');
    setNewClaimPayer('');
    setNewClaimAmount('');
    setNewClaimDoc('');
    setIsAddClaimOpen(false);
  };

  const getLabel = (key: string, defaultValue: string) => {
    return customLabels[key] || defaultValue;
  };

  return (
    <div id="billing-view-container" className="space-y-8 animate-fade-in pb-16">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-highest/20 pb-6">
        <div>
          {isWorkspaceEditMode ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs text-primary">edit</span>
              <input
                type="text"
                value={getLabel('billing_page_title', 'Billing & Financial Claims Ledger')}
                onChange={(e) => onUpdateLabel?.('billing_page_title', e.target.value)}
                className="bg-surface border border-primary text-2xl font-extrabold text-on-surface tracking-tight px-2 py-0.5 rounded outline-none"
              />
            </div>
          ) : (
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
              {getLabel('billing_page_title', 'Billing & Financial Claims Ledger')}
            </h2>
          )}
          <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
            Analyze account receipts, dispatch claim invoices, and log patient payments
          </p>
        </div>

        <button
          id="btn-submit-new-claim"
          onClick={() => setIsAddClaimOpen(true)}
          className="bg-primary hover:bg-primary-container text-white font-bold text-xs px-5 py-3 rounded-full flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-sm">add_card</span>
          Submit New Invoice Claim
        </button>
      </div>

      {/* Financial Health Statistics Grid */}
      <div id="billing-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Billed */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/25 flex flex-col justify-between min-h-[120px]">
          <div>
            <h4 className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Total Billed Claims</h4>
            <div className="text-2xl font-black text-on-surface mt-2">
              ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant font-semibold mt-1">Sum of all dispatch drafts</span>
        </div>

        {/* Stat 2: Total Collected */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/25 flex flex-col justify-between min-h-[120px] hover:border-secondary/25 transition-all">
          <div>
            <h4 className="text-[10px] font-bold text-secondary tracking-wider uppercase">Total Collected (Paid)</h4>
            <div className="text-2xl font-black text-secondary mt-2">
              ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[10px] text-secondary/80 font-bold mt-1">Cleared financial balances</span>
        </div>

        {/* Stat 3: Total Outstanding */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/25 flex flex-col justify-between min-h-[120px]">
          <div>
            <h4 className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Receivables (Outstanding)</h4>
            <div className="text-2xl font-black text-on-surface mt-2">
              ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[10px] text-on-surface-variant font-semibold mt-1">Awaiting payer clearance</span>
        </div>

        {/* Stat 4: Collection Performance */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/25 flex flex-col justify-between min-h-[120px]">
          <div>
            <h4 className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Collection Rate</h4>
            <div className="text-2xl font-black text-on-surface mt-2">
              {collectionRate.toFixed(1)}%
            </div>
          </div>
          <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden mt-1">
            <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Main Ledger Content */}
      <div id="billing-ledger-card" className="space-y-6">
        {/* Search and Filters bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-low/35 p-3 rounded-2xl border border-surface-container-highest/30">
          <div className="flex flex-wrap gap-1.5">
            {['All', 'Billed', 'Paid', 'Denied'].map(status => {
              const count = status === 'All' ? claims.length : claims.filter(c => c.status === status).length;
              const isActive = selectedStatusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-secondary text-white shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span>{status}</span>
                  <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              value={billingSearch}
              onChange={e => setBillingSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 rounded-full border border-surface-container-highest bg-surface-container-lowest text-xs focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/60"
              placeholder="Search ledger..."
            />
          </div>
        </div>

        {/* Ledger Invoices Table */}
        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-highest/50 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-low/40">
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Invoice ID</th>
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Patient Name</th>
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Payer Provider</th>
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Authorized Clinician</th>
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Invoice Value</th>
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Sent Date</th>
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container/30">
                {filteredClaims.length > 0 ? (
                  filteredClaims.map(claim => {
                    let statusStyle = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
                    if (claim.status === 'Paid') statusStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
                    else if (claim.status === 'Denied') statusStyle = 'bg-primary-container/10 text-primary';

                    return (
                      <tr key={claim.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4 text-xs font-extrabold text-on-surface">{claim.claimNumber}</td>
                        <td className="p-4 text-sm font-extrabold text-on-surface">{claim.patientName}</td>
                        <td className="p-4 text-xs font-bold text-on-surface-variant">{claim.payer}</td>
                        <td className="p-4 text-xs font-semibold text-on-surface-variant">{claim.doctor}</td>
                        <td className="p-4 text-sm font-black text-on-surface">
                          ${claim.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-xs font-semibold text-on-surface-variant">{claim.date}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${statusStyle}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {editingClaimId === claim.id ? (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(claim)}
                                className="px-2.5 py-1 rounded bg-primary-container/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            ) : (
                              <>
                                {claim.status !== 'Paid' && (
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Mark claim ${claim.claimNumber} for ${claim.patientName} as paid?`)) {
                                        await onUpdateClaimStatus(claim.id, 'Paid');
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-white transition-all text-[10px] font-bold cursor-pointer"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                                {claim.status === 'Billed' && (
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Mark claim ${claim.claimNumber} as denied?`)) {
                                        await onUpdateClaimStatus(claim.id, 'Denied');
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded bg-surface border border-surface-container-highest text-primary hover:bg-primary-container/10 transition-all text-[10px] font-bold cursor-pointer"
                                  >
                                    Mark Denied
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingClaimId(claim.id)}
                                  aria-label={`Manage invoice ${claim.claimNumber}`}
                                  title="Manage invoice"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-surface-container-highest text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs font-bold text-on-surface-variant">
                      No invoices found in the ledger matching selection criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-invoice-title" className="w-full max-w-sm rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
            <h3 id="delete-invoice-title" className="text-lg font-extrabold text-on-surface">Delete this invoice?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Invoice <span className="font-bold text-on-surface">{deleteTarget.claimNumber}</span> for {deleteTarget.patientName} will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setEditingClaimId(null); }}
                disabled={isDeleting}
                className="rounded-full border border-surface-container-highest px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteClaim(deleteTarget.id);
                    setDeleteTarget(null);
                    setEditingClaimId(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-container disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting…' : 'Delete invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT NEW CLAIM */}
      {isAddClaimOpen && (
        <div id="new-claim-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-surface-container bg-surface-bright flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-on-surface">Submit New Ledger Claim</h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Enters directly into medical compliance accounts ledger.</p>
              </div>
              <button onClick={() => setIsAddClaimOpen(false)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddClaimSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Patient Name</label>
                <input
                  type="text"
                  required
                  value={newClaimPatient}
                  onChange={e => setNewClaimPatient(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="Patient Full Name"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Insurance Payer Provider</label>
                <input
                  type="text"
                  required
                  value={newClaimPayer}
                  onChange={e => setNewClaimPayer(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="e.g., Medicare Part B, BlueCross"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Doctor Sign-off</label>
                <input
                  type="text"
                  value={newClaimDoc}
                  onChange={e => setNewClaimDoc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="Dr. Deepak Kumar Bhardwaj"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Claim Amount ($)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={newClaimAmount}
                  onChange={e => setNewClaimAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="1450.00"
                />
              </div>

              <div className="pt-4 border-t border-surface-container flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClaimOpen(false)}
                  className="px-4 py-2 border border-surface-container-highest rounded-full text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-full text-xs font-bold cursor-pointer"
                >
                  Post &amp; Dispatch Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
