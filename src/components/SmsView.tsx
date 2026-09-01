import React, { useEffect, useMemo, useState } from 'react';
import { Appointment, Patient } from '../types';
import PatientSmsModal from './PatientSmsModal';

interface SmsViewProps { patients: Patient[]; appointments: Appointment[]; }

export default function SmsView({ patients, appointments }: SmsViewProps) {
  const [mode, setMode] = useState<'patients' | 'appointments'>('patients');
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string | undefined>();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  useEffect(() => {
    fetch('/api/sms/config').then(response => response.json()).then(data => setConfigured(Boolean(data.configured))).catch(() => setConfigured(false));
  }, []);

  const appointmentPatients = useMemo(() => {
    const appointmentByPatient = new Map<string, Appointment>();
    appointments.forEach(appointment => {
      if (appointment.patientId) appointmentByPatient.set(`id:${appointment.patientId}`, appointment);
      appointmentByPatient.set(`name:${appointment.patientName.trim().toLowerCase()}`, appointment);
    });
    return patients
      .map(patient => ({ patient, appointment: appointmentByPatient.get(`id:${patient.id}`) || appointmentByPatient.get(`name:${patient.name.trim().toLowerCase()}`) }))
      .filter(item => item.appointment);
  }, [appointments, patients]);
  const sourcePatients = mode === 'patients' ? patients.map(patient => ({ patient, appointment: undefined })) : appointmentPatients;
  const visiblePatients = sourcePatients.filter(({ patient }) => {
    const term = search.trim().toLowerCase();
    return !term || patient.name.toLowerCase().includes(term) || (patient.phone || '').includes(term) || patient.mrn.toLowerCase().includes(term);
  });

  const verifyConnection = async () => {
    setChecking(true); setConnectionMessage('');
    try { const response = await fetch('/api/sms/verify', { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'RingCentral verification failed.'); setConfigured(true); setConnectionMessage(data.message); }
    catch (error: any) { setConnectionMessage(error.message); setConfigured(false); }
    finally { setChecking(false); }
  };

  return <div className="space-y-6 animate-fade-in pb-16">
    <div className="flex flex-col gap-4 border-b border-surface-container-highest/20 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-3xl font-extrabold text-on-surface tracking-tight">SMS messages</h2><p className="mt-1 text-sm font-semibold text-on-surface-variant">Send a stage-appropriate text to a patient in one step.</p></div><button type="button" onClick={verifyConnection} disabled={checking} className="secondary-button !min-h-10 !px-4 !py-2 text-sm"><span className="material-symbols-outlined text-base">{checking ? 'sync' : 'verified_user'}</span>{checking ? 'Checking…' : 'Check RingCentral'}</button></div>
    {configured === false && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">RingCentral SMS is not connected. Add the four RC_* values to the server environment, then check the connection.</div>}
    {connectionMessage && configured && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{connectionMessage}</div>}
    {connectionMessage && configured === false && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{connectionMessage}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-primary p-5 text-white"><p className="text-xs font-bold uppercase tracking-wider text-white/70">Recipients</p><p className="mt-2 text-3xl font-black">{patients.length}</p><p className="mt-1 text-sm text-white/80">patients in your portal</p></div><div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5"><p className="text-xs font-bold uppercase tracking-wider text-secondary">Today’s queue</p><p className="mt-2 text-3xl font-black text-on-surface">{appointmentPatients.length}</p><p className="mt-1 text-sm text-on-surface-variant">appointment-linked recipients</p></div><div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5"><p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Templates</p><p className="mt-2 text-3xl font-black text-on-surface">4</p><p className="mt-1 text-sm text-on-surface-variant">ready-to-use message starters</p></div></div>
    <section className="workspace-section overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-surface-container-highest/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full bg-surface-container-low p-1" role="tablist" aria-label="SMS recipients">
          <button type="button" role="tab" aria-selected={mode === 'patients'} onClick={() => setMode('patients')} className={`rounded-full px-4 py-2 text-sm font-bold cursor-pointer ${mode === 'patients' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>All patients</button>
          <button type="button" role="tab" aria-selected={mode === 'appointments'} onClick={() => setMode('appointments')} className={`rounded-full px-4 py-2 text-sm font-bold cursor-pointer ${mode === 'appointments' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>New appointments</button>
        </div>
        <label className="relative block w-full sm:max-w-xs"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span><span className="sr-only">Search patients</span><input value={search} onChange={event => setSearch(event.target.value)} className="form-input pl-10" placeholder="Search by name or phone" /></label>
      </div>
      <div className="divide-y divide-surface-container/60">
        {visiblePatients.length ? visiblePatients.map(({ patient, appointment }) => {
          return <div key={patient.id} className="flex flex-col gap-4 p-5 transition-colors hover:bg-surface-container-low/60 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">{patient.avatarUrl ? <img src={patient.avatarUrl} alt="" className="h-full w-full object-cover" /> : patient.avatarInitials}</div><div className="min-w-0"><p className="truncate text-base font-extrabold text-on-surface">{patient.name}</p><p className="text-sm text-on-surface-variant">{patient.phone || 'No phone number'} · {patient.careStage || patient.status}</p>{appointment && <p className="mt-1 text-xs font-bold text-secondary">{appointment.type} · {appointment.date || 'Today'} · {appointment.time}</p>}</div></div><button type="button" disabled={!patient.phone} onClick={() => { setSelectedAppointmentType(appointment?.type); setSelectedPatient(patient); }} className="primary-button shrink-0 disabled:cursor-not-allowed disabled:opacity-40"><span className="material-symbols-outlined text-sm">sms</span> Send text</button></div>;
        }) : <div className="p-10 text-center text-sm font-semibold text-on-surface-variant">No patients with phone numbers match this list.</div>}
      </div>
    </section>
    {selectedPatient && <PatientSmsModal patient={selectedPatient} appointmentType={selectedAppointmentType} onClose={() => { setSelectedPatient(null); setSelectedAppointmentType(undefined); }} />}
  </div>;
}
