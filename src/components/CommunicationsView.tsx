import React, { useEffect, useMemo, useState } from 'react';
import { Appointment, Patient } from '../types';
import PatientEmailModal from './PatientEmailModal';
import PatientSmsModal from './PatientSmsModal';

interface CommunicationsViewProps {
  patients: Patient[];
  appointments: Appointment[];
}

export default function CommunicationsView({ patients, appointments }: CommunicationsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [channel, setChannel] = useState<'email' | 'sms' | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string | undefined>();
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/sms/config')
      .then(response => response.json())
      .then(data => setSmsConfigured(Boolean(data.configured)))
      .catch(() => setSmsConfigured(false));
  }, []);

  const appointmentByPatient = useMemo(() => {
    const result = new Map<string, Appointment>();
    appointments.forEach(appointment => {
      if (appointment.patientId) result.set(appointment.patientId, appointment);
      result.set(`name:${appointment.patientName.trim().toLowerCase()}`, appointment);
    });
    return result;
  }, [appointments]);

  const visiblePatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients.filter(patient => {
      if (!term) return true;
      return [patient.name, patient.email, patient.phone, patient.mrn]
        .some(value => (value || '').toLowerCase().includes(term));
    });
  }, [patients, search]);

  const openComposer = (patient: Patient, nextChannel: 'email' | 'sms') => {
    setSelectedPatient(patient);
    setChannel(nextChannel);
    setSelectedAppointmentType(
      appointmentByPatient.get(patient.id)?.type
        || appointmentByPatient.get(`name:${patient.name.trim().toLowerCase()}`)?.type
    );
  };

  const closeComposer = () => {
    setSelectedPatient(null);
    setChannel(null);
    setSelectedAppointmentType(undefined);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <div className="flex flex-col gap-4 border-b border-surface-container-highest/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Patient communications</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-on-surface">Email &amp; SMS</h2>
          <p className="mt-1 text-sm font-semibold text-on-surface-variant">Choose a patient, then send an email or text from the same row.</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">search</span>
          <span className="sr-only">Search patients</span>
          <input value={search} onChange={event => setSearch(event.target.value)} className="form-input pl-10" placeholder="Search patients" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <span className="material-symbols-outlined text-primary">forum</span>
          <p className="mt-2 font-black text-on-surface">One communication hub</p>
          <p className="mt-1 text-xs text-on-surface-variant">Email and SMS actions stay together for every patient.</p>
        </div>
        <div className="rounded-2xl border border-surface-container-highest/50 bg-surface-container-lowest p-4">
          <span className="material-symbols-outlined text-primary">mail</span>
          <p className="mt-2 font-black text-on-surface">{patients.filter(patient => patient.email).length} email recipients</p>
          <p className="mt-1 text-xs text-on-surface-variant">Ready for templates and personalized messages.</p>
        </div>
        <div className="rounded-2xl border border-surface-container-highest/50 bg-surface-container-lowest p-4">
          <span className="material-symbols-outlined text-secondary">sms</span>
          <p className="mt-2 font-black text-on-surface">{patients.filter(patient => patient.phone).length} SMS recipients</p>
          <p className="mt-1 text-xs text-on-surface-variant">{smsConfigured === false ? 'RingCentral needs setup.' : 'Ready for appointment reminders and updates.'}</p>
        </div>
      </div>

      <section className="workspace-section overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-surface-container-highest/30 p-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-on-surface">
              <span className="material-symbols-outlined text-primary">groups</span>
              Patients
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">Use the action buttons at the right of each patient.</p>
          </div>
          <span className="status-badge shrink-0">{visiblePatients.length} shown</span>
        </div>

        <div className="divide-y divide-surface-container-highest/30">
          {visiblePatients.length ? visiblePatients.map(patient => (
            <div key={patient.id} className="flex flex-col gap-4 p-5 transition-colors hover:bg-surface-container-low/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">
                  {patient.avatarUrl ? <img src={patient.avatarUrl} alt="" className="h-full w-full object-cover" /> : patient.avatarInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-on-surface">{patient.name}</p>
                  <p className="truncate text-sm text-on-surface-variant">{patient.email || 'No email'} · {patient.phone || 'No phone'}</p>
                  <p className="mt-1 text-xs font-semibold text-on-surface-variant">{patient.careStage || patient.status}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                <button type="button" disabled={!patient.email} onClick={() => openComposer(patient, 'email')} className="secondary-button !min-h-10 !px-3 disabled:cursor-not-allowed disabled:opacity-40" title={patient.email ? `Email ${patient.name}` : 'No email address'}>
                  <span className="material-symbols-outlined text-sm">mail</span>
                  <span className="hidden sm:inline">Email</span>
                </button>
                <button type="button" disabled={!patient.phone} onClick={() => openComposer(patient, 'sms')} className="primary-button !min-h-10 !px-3 disabled:cursor-not-allowed disabled:opacity-40" title={patient.phone ? `Text ${patient.name}` : 'No phone number'}>
                  <span className="material-symbols-outlined text-sm">sms</span>
                  <span className="hidden sm:inline">SMS</span>
                </button>
              </div>
            </div>
          )) : (
            <div className="p-10 text-center text-sm font-semibold text-on-surface-variant">No patients match your search.</div>
          )}
        </div>
      </section>

      {selectedPatient && channel === 'email' && <PatientEmailModal patient={selectedPatient} onClose={closeComposer} />}
      {selectedPatient && channel === 'sms' && <PatientSmsModal patient={selectedPatient} appointmentType={selectedAppointmentType} onClose={closeComposer} />}
    </div>
  );
}
