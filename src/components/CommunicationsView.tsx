import React, { useMemo, useState } from 'react';
import { Claim, Patient } from '../types';
import PatientEmailModal from './PatientEmailModal';

interface CommunicationsViewProps { patients: Patient[]; claims: Claim[]; }

export default function CommunicationsView({ patients, claims }: CommunicationsViewProps) {
  const [activeSection, setActiveSection] = useState<'email' | 'invoices'>('email');
  const [search, setSearch] = useState('');
  const [emailPatient, setEmailPatient] = useState<Patient | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const emailPatients = useMemo(() => patients.filter(patient => patient.email && patient.name.toLowerCase().includes(search.toLowerCase())), [patients, search]);
  const filteredClaims = useMemo(() => claims.filter(claim => `${claim.patientName} ${claim.claimNumber}`.toLowerCase().includes(search.toLowerCase())), [claims, search]);

  const resendInvoice = async (claim: Claim) => {
    setSendingId(claim.id); setMessage('');
    try {
      const response = await fetch(`/api/claims/${claim.id}/send`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Invoice could not be sent.');
      setMessage(`Invoice ${claim.claimNumber} sent successfully.`);
    } catch (error: any) { setMessage(error.message); }
    finally { setSendingId(null); }
  };

  return <div className="space-y-6 animate-fade-in pb-16">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-surface-container-highest/20 pb-5">
      <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Patient communications</p><h2 className="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Email &amp; invoices</h2><p className="text-sm font-semibold text-on-surface-variant mt-1">Send patient messages and professional invoice receipts from one place.</p></div>
      <div className="relative w-full sm:w-64"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search patients or invoices" className="form-input pl-9" /></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <button onClick={() => setActiveSection('email')} className={`text-left rounded-2xl p-4 border transition-all ${activeSection === 'email' ? 'border-primary bg-primary/5' : 'border-surface-container-highest/50 bg-surface-container-lowest'}`}><span className="material-symbols-outlined text-primary">mail</span><p className="font-black text-on-surface mt-2">Patient email</p><p className="text-xs text-on-surface-variant mt-1">Templates, reminders, updates</p></button>
      <button onClick={() => setActiveSection('invoices')} className={`text-left rounded-2xl p-4 border transition-all ${activeSection === 'invoices' ? 'border-primary bg-primary/5' : 'border-surface-container-highest/50 bg-surface-container-lowest'}`}><span className="material-symbols-outlined text-primary">receipt_long</span><p className="font-black text-on-surface mt-2">Invoice receipts</p><p className="text-xs text-on-surface-variant mt-1">Preview, download, resend</p></button>
      <div className="rounded-2xl p-4 border border-surface-container-highest/50 bg-surface-container-lowest"><span className="material-symbols-outlined text-secondary">verified</span><p className="font-black text-on-surface mt-2">Delivery history</p><p className="text-xs text-on-surface-variant mt-1">Review activity in Settings</p></div>
    </div>
    {message && <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-3 text-sm font-bold text-secondary" role="status">{message}</div>}
    {activeSection === 'email' ? <section className="workspace-section"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-5"><div className="min-w-0"><h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">forward_to_inbox</span>Choose a patient</h3><p className="text-sm text-on-surface-variant mt-1">Start with a ready-made template, then personalize before sending.</p></div><span className="status-badge shrink-0 self-start">{emailPatients.length} with email</span></div><div className="px-5 divide-y divide-surface-container-highest/30">{emailPatients.map(patient => <div key={patient.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="min-w-0"><p className="font-extrabold text-on-surface truncate">{patient.name}</p><p className="text-sm text-on-surface-variant truncate">{patient.email} · {patient.careStage || patient.status}</p></div><button onClick={() => setEmailPatient(patient)} className="secondary-button shrink-0 self-start sm:self-auto"><span className="material-symbols-outlined text-sm">edit_note</span>Compose</button></div>)}{emailPatients.length === 0 && <p className="py-10 text-center text-sm text-on-surface-variant">No patients with email addresses match this search.</p>}</div></section> : <section className="workspace-section"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-5"><div className="min-w-0"><h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">receipt_long</span>Invoice receipts</h3><p className="text-sm text-on-surface-variant mt-1">Every receipt is filled from the patient profile and includes the Genfinity branding.</p></div><span className="status-badge shrink-0 self-start">{filteredClaims.length} invoices</span></div><div className="px-5 divide-y divide-surface-container-highest/30">{filteredClaims.map(claim => <div key={claim.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="min-w-0"><p className="font-extrabold text-on-surface">{claim.claimNumber} · {claim.patientName}</p><p className="text-sm text-on-surface-variant mt-1">{claim.date} · {claim.payer} · ${claim.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="flex flex-wrap gap-2"><a href={`/api/claims/${claim.id}/invoice.pdf`} download={`${claim.claimNumber}.pdf`} className="secondary-button">Download PDF</a><button onClick={() => resendInvoice(claim)} disabled={sendingId === claim.id} className="primary-button">{sendingId === claim.id ? 'Sending...' : 'Email invoice'}</button></div></div>)}{filteredClaims.length === 0 && <p className="py-10 text-center text-sm text-on-surface-variant">No invoices match this search.</p>}</div></section>}
    {emailPatient && <PatientEmailModal patient={emailPatient} onClose={() => setEmailPatient(null)} />}
  </div>;
}
