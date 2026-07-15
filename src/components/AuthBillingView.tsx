import React, { useState } from 'react';
import { Authorization, Claim } from '../types';

interface AuthBillingViewProps {
  authorizations: Authorization[];
  claims: Claim[];
  onUpdateAuth: (authId: string, updateData: any) => Promise<void>;
  onAddAuth: (authData: any) => Promise<void>;
  onAddClaim: (claimData: any) => Promise<void>;
}

export default function AuthBillingView({
  authorizations,
  claims,
  onUpdateAuth,
  onAddAuth,
  onAddClaim
}: AuthBillingViewProps) {
  // Tabs: auth, billing
  const [activeSubTab, setActiveSubTab] = useState<'auth' | 'billing'>('auth');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // New Auth Modal State
  const [isAddAuthOpen, setIsAddAuthOpen] = useState(false);
  const [newAuthPatient, setNewAuthPatient] = useState('');
  const [newAuthDevice, setNewAuthDevice] = useState('');
  const [newAuthPayer, setNewAuthPayer] = useState('');
  const [newAuthNotes, setNewAuthNotes] = useState('');

  // Update Auth Modal State
  const [editingAuth, setEditingAuth] = useState<Authorization | null>(null);
  const [editStatus, setEditStatus] = useState<'Approved' | 'Pending' | 'Denied' | 'Needs More Info'>('Pending');
  const [editAuthNumber, setEditAuthNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // New Claim Modal State
  const [isAddClaimOpen, setIsAddClaimOpen] = useState(false);
  const [newClaimPatient, setNewClaimPatient] = useState('');
  const [newClaimPayer, setNewClaimPayer] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState('');
  const [newClaimDoc, setNewClaimDoc] = useState('');

  // Count authorizations by status
  const approvedCount = authorizations.filter(a => a.status === 'Approved').length;
  const pendingCount = authorizations.filter(a => a.status === 'Pending').length;
  const deniedCount = authorizations.filter(a => a.status === 'Denied').length;
  const needsMoreCount = authorizations.filter(a => a.status === 'Needs More Info').length;

  const filteredAuths = authorizations.filter(a => {
    if (selectedStatusFilter === 'All') return true;
    if (selectedStatusFilter === 'Approved') return a.status === 'Approved';
    if (selectedStatusFilter === 'Pending') return a.status === 'Pending';
    if (selectedStatusFilter === 'Denied') return a.status === 'Denied';
    if (selectedStatusFilter === 'Needs More Info') return a.status === 'Needs More Info';
    return true;
  });

  const handleUpdateAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuth) return;

    await onUpdateAuth(editingAuth.id, {
      status: editStatus,
      authNumber: editAuthNumber,
      notes: editNotes
    });

    setEditingAuth(null);
  };

  const handleAddAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthPatient.trim() || !newAuthDevice.trim()) return;

    await onAddAuth({
      patientName: newAuthPatient,
      device: newAuthDevice,
      payer: newAuthPayer,
      status: 'Pending',
      notes: newAuthNotes
    });

    setNewAuthPatient('');
    setNewAuthDevice('');
    setNewAuthPayer('');
    setNewAuthNotes('');
    setIsAddAuthOpen(false);
  };

  const handleAddClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaimPatient.trim() || !newClaimAmount) return;

    await onAddClaim({
      patientName: newClaimPatient,
      payer: newClaimPayer,
      amount: newClaimAmount,
      doctor: newClaimDoc,
      status: 'Billed'
    });

    setNewClaimPatient('');
    setNewClaimPayer('');
    setNewClaimAmount('');
    setNewClaimDoc('');
    setIsAddClaimOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* View Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-highest/20 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Authorization &amp; Billing</h2>
          <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
            Track payer approvals, submit claims, and manage financial compliance
          </p>
        </div>

        {/* Navigation pills */}
        <div className="flex bg-surface-container-high rounded-full p-0.5 border border-surface-container-highest/60 shrink-0">
          <button
            onClick={() => setActiveSubTab('auth')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'auth' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            Authorizations
          </button>
          <button
            onClick={() => setActiveSubTab('billing')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'billing' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            Claims &amp; Invoices
          </button>
        </div>
      </div>

      {activeSubTab === 'auth' ? (
        <div className="space-y-6">
          {/* Status Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low/35 p-3 rounded-2xl border border-surface-container-highest/30">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All', count: authorizations.length },
                { label: 'Approved', count: approvedCount },
                { label: 'Pending', count: pendingCount },
                { label: 'Denied', count: deniedCount },
                { label: 'Needs More Info', count: needsMoreCount }
              ].map(filter => (
                <button
                  key={filter.label}
                  onClick={() => setSelectedStatusFilter(filter.label)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    selectedStatusFilter === filter.label
                      ? 'bg-secondary text-white shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    selectedStatusFilter === filter.label ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAddAuthOpen(true)}
              className="bg-primary text-white font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 hover:bg-primary-container transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              + New Authorization
            </button>
          </div>

          {/* Authorizations Table */}
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-highest/50 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-container bg-surface-container-low/40">
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Patient Name</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Device Model</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Approval Status</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Submitted</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Days Waiting</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Insurance Payer</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/30">
                  {filteredAuths.map(auth => {
                    let statusBadge = 'bg-surface-container text-on-surface-variant';
                    if (auth.status === 'Approved') statusBadge = 'bg-secondary/15 text-secondary';
                    else if (auth.status === 'Pending') statusBadge = 'bg-outline-variant/15 text-outline-variant';
                    else if (auth.status === 'Denied') statusBadge = 'bg-primary-container/10 text-primary';
                    else if (auth.status === 'Needs More Info') statusBadge = 'bg-primary/5 text-primary border border-primary/10';

                    return (
                      <tr key={auth.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4 text-sm font-extrabold text-on-surface">{auth.patientName}</td>
                        <td className="p-4 text-xs font-bold text-on-surface-variant">{auth.device}</td>
                        <td className="p-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${statusBadge}`}>
                            {auth.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-semibold text-on-surface-variant">{auth.submittedDate}</td>
                        <td className="p-4 text-xs font-extrabold text-on-surface">
                          {auth.daysWaiting} days
                        </td>
                        <td className="p-4 text-xs font-bold text-on-surface-variant">{auth.payer}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setEditingAuth(auth);
                              setEditStatus(auth.status);
                              setEditAuthNumber(auth.authNumber || '');
                              setEditNotes(auth.notes || '');
                            }}
                            className="text-xs font-bold text-secondary hover:underline cursor-pointer"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Claims Top Action Area */}
          <div className="flex justify-between items-center bg-surface-container-low/35 p-3 rounded-2xl border border-surface-container-highest/30">
            <h3 className="text-sm font-bold text-on-surface px-2">Clinical Claims Ledger</h3>
            <button
              onClick={() => setIsAddClaimOpen(true)}
              className="bg-secondary text-white font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 hover:bg-on-secondary-container transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              Submit New Claim
            </button>
          </div>

          {/* Claims Ledger Table */}
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-highest/50 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-container bg-surface-container-low/40">
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Invoice ID</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Patient Name</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Insurance Payer</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Sign-off Doctor</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Claim Amount</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Date Sent</th>
                    <th className="p-4 text-xs font-bold text-on-surface uppercase tracking-wider">Ledger Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/30">
                  {claims.map(claim => (
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
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          claim.status === 'Paid'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-primary-container/10 text-primary'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW AUTHORIZATION */}
      {isAddAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-surface-container bg-surface-bright flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-on-surface">Add New Authorization Tracker</h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Initialize a request submission loop.</p>
              </div>
              <button onClick={() => setIsAddAuthOpen(false)} className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddAuthSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Patient Name</label>
                <input
                  type="text"
                  required
                  value={newAuthPatient}
                  onChange={e => setNewAuthPatient(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="e.g., Sarah Jenkins"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Device Type</label>
                <input
                  type="text"
                  required
                  value={newAuthDevice}
                  onChange={e => setNewAuthDevice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="e.g., KAFO Orthosis"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Insurance Payer</label>
                <input
                  type="text"
                  required
                  value={newAuthPayer}
                  onChange={e => setNewAuthPayer(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="e.g., BlueCross BlueShield"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Submittal Notes</label>
                <textarea
                  value={newAuthNotes}
                  onChange={e => setNewAuthNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-surface rounded-2xl border border-surface-container-highest text-xs focus:border-secondary outline-none resize-none"
                  placeholder="Internal submittal remarks..."
                />
              </div>

              <div className="pt-4 border-t border-surface-container flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAuthOpen(false)}
                  className="px-4 py-2 border border-surface-container-highest rounded-full text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-full text-xs font-bold cursor-pointer"
                >
                  Submit Auth
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE AUTHORIZATION STATUS (Mockup #4 detailed layout) */}
      {editingAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-surface-container bg-surface-bright flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm text-on-surface">
                  Update Status for {editingAuth.patientName}
                </h3>
                <p className="text-[10px] text-on-surface-variant font-bold mt-0.5">
                  Device: {editingAuth.device} • Payer: {editingAuth.payer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAuth(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateAuthSubmit} className="p-6 space-y-5">
              {/* Status Picker Selector List */}
              <div className="space-y-2">
                <label className="text-xs font-black text-on-surface uppercase tracking-wide">
                  Approval Status
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['Approved', 'Pending', 'Denied', 'Needs More Info'] as const).map(st => {
                    const isActive = editStatus === st;
                    let style = 'border-surface-container-highest hover:bg-surface-container';
                    if (isActive) {
                      if (st === 'Approved') style = 'border-secondary bg-secondary/10 text-secondary font-extrabold';
                      else if (st === 'Pending') style = 'border-outline-variant bg-outline-variant/10 text-outline-variant font-extrabold';
                      else if (st === 'Denied') style = 'border-primary bg-primary/5 text-primary font-extrabold';
                      else style = 'border-primary bg-primary/5 text-primary font-extrabold';
                    }

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditStatus(st)}
                        className={`py-2 px-3 border rounded-xl text-xs text-left flex items-center justify-between transition-all cursor-pointer ${style}`}
                      >
                        <span>{st}</span>
                        {isActive && (
                          <span className="material-symbols-outlined text-xs font-bold">check</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auth Code Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-on-surface uppercase tracking-wide">
                  Auth Code / Payer ID (Optional)
                </label>
                <input
                  type="text"
                  value={editAuthNumber}
                  onChange={e => setEditAuthNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none text-on-surface"
                  placeholder="e.g., A-99231"
                />
              </div>

              {/* Internal Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-on-surface uppercase tracking-wide">
                  Internal Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-surface rounded-2xl border border-surface-container-highest text-xs focus:border-secondary outline-none resize-none text-on-surface"
                  placeholder="Enter notes about phone calls, clinical updates, or appeals documentation here..."
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-surface-container flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingAuth(null)}
                  className="px-4.5 py-2.5 border border-surface-container-highest rounded-full text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBMIT NEW CLAIM */}
      {isAddClaimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-surface-container bg-surface-bright flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-on-surface">Submit New Invoice Claim</h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Enters directly into accounts ledger.</p>
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
                  placeholder="David Chen"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Payer</label>
                <input
                  type="text"
                  required
                  value={newClaimPayer}
                  onChange={e => setNewClaimPayer(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="Medicare Part B"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Doctor Sign-off</label>
                <input
                  type="text"
                  value={newClaimDoc}
                  onChange={e => setNewClaimDoc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="Dr. Sarah Jenkins"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Amount ($)</label>
                <input
                  type="number"
                  required
                  value={newClaimAmount}
                  onChange={e => setNewClaimAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                  placeholder="1850.00"
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
                  Post Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
