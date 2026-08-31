import React from 'react';
import { Patient, Appointment, AlertItem, Authorization, FabricationItem } from '../types';

interface DashboardViewProps {
  patients: Patient[]; appointments: Appointment[]; authorizations?: Authorization[]; fabrication?: FabricationItem[]; alerts: AlertItem[];
  onNavigateToTab: (tab: string) => void; onAlertAction: (actionTarget: string, alertId: string) => void; onDismissAlert: (alertId: string) => void;
  onPatientClick?: (patientName: string) => void; onUpdatePatient?: (patientId: string, patientData: any) => Promise<void>; isWorkspaceEditMode?: boolean;
  customLabels?: Record<string, string>; onUpdateLabel?: (key: string, value: string) => void; onUpdateAppointment?: (apptId: string, updateData: any) => Promise<void>;
}

const readableStage = (patient: Patient) => {
  const stage = patient.careStage || patient.status;
  const labels: Record<string, string> = { Referral: 'New patient', Evaluation: 'Evaluation', Authorization: 'Insurance approval', 'Casting/scan': 'Scan needed', Fabrication: 'Device being made', Fitting: 'Fitting', Delivery: 'Delivery', 'Follow-up': 'Follow-up', Closed: 'Complete', 'Auth Pending': 'Insurance approval', 'Waiting for Rx': 'Documents needed' };
  return labels[stage] || stage;
};

const age = (dob?: string) => {
  if (!dob) return null;
  const birth = new Date(dob); if (Number.isNaN(birth.getTime())) return null;
  const now = new Date(); return now.getFullYear() - birth.getFullYear() - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
};

export default function DashboardView({ patients, appointments, onNavigateToTab, onPatientClick }: DashboardViewProps) {
  const activePatients = patients.filter(patient => patient.status !== 'Archived');
  const attentionPatients = activePatients.filter(patient => patient.blockerBadge || patient.nextRequiredAction);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(appt => !appt.date || appt.date === todayKey || appt.date.toLowerCase().includes('today'));
  const recentPatients = [...activePatients].sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || '')).slice(0, 5);

  return <div className="space-y-8 animate-fade-in pb-12">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">Clinical workspace</p><h2 className="page-title">Good morning. What needs your attention?</h2><p className="page-subtitle">Choose a patient or continue the next task.</p></div>
      <button onClick={() => onNavigateToTab('patients')} className="primary-button"><span className="material-symbols-outlined">groups</span> Find a patient</button>
    </header>

    <section className="workspace-section" aria-labelledby="attention-heading"><div className="section-heading"><div><h3 id="attention-heading">Needs attention</h3><p>Start with the next important step.</p></div><span className="count-badge">{attentionPatients.length}</span></div>
      {attentionPatients.length === 0 ? <div className="empty-state"><span className="material-symbols-outlined">check_circle</span><p>Everything is up to date.</p></div> : <div className="task-list">{attentionPatients.slice(0, 6).map(patient => <button key={patient.id} onClick={() => onPatientClick?.(patient.name)} className="task-row"><span className="task-icon warning"><span className="material-symbols-outlined">priority_high</span></span><span className="task-copy"><strong>{patient.name}{age(patient.dob) !== null ? ` · ${age(patient.dob)} years` : ''}</strong><span>{patient.nextRequiredAction || patient.blockerBadge || 'Review patient record'}</span></span><span className="task-stage">{readableStage(patient)}</span><span className="material-symbols-outlined task-arrow">chevron_right</span></button>)}</div>}
    </section>

    <div className="dashboard-columns"><section className="workspace-section" aria-labelledby="appointments-heading"><div className="section-heading"><div><h3 id="appointments-heading">Today’s appointments</h3><p>Patients you will see today.</p></div><button className="text-button" onClick={() => onNavigateToTab('appointments')}>See schedule</button></div><div className="task-list">{todayAppointments.slice(0, 5).map(appt => <button key={appt.id} onClick={() => onPatientClick?.(appt.patientName)} className="task-row"><span className="task-icon blue"><span className="material-symbols-outlined">calendar_today</span></span><span className="task-copy"><strong>{appt.patientName}</strong><span>{appt.type}</span></span><span className="appointment-time">{appt.time}</span><span className="material-symbols-outlined task-arrow">chevron_right</span></button>)}{todayAppointments.length === 0 && <div className="empty-state"><span className="material-symbols-outlined">event_available</span><p>No appointments today.</p></div>}</div></section>
      <section className="workspace-section" aria-labelledby="recent-heading"><div className="section-heading"><div><h3 id="recent-heading">Recently updated</h3><p>Quick access to active patients.</p></div><button className="text-button" onClick={() => onNavigateToTab('patients')}>All patients</button></div><div className="task-list">{recentPatients.map(patient => <button key={patient.id} onClick={() => onPatientClick?.(patient.name)} className="task-row"><span className="avatar-small">{patient.avatarInitials}</span><span className="task-copy"><strong>{patient.name}</strong><span>{readableStage(patient)}{patient.deviceCategory ? ` · ${patient.deviceCategory}` : ''}</span></span><span className="material-symbols-outlined task-arrow">chevron_right</span></button>)}</div></section></div>
  </div>;
}
