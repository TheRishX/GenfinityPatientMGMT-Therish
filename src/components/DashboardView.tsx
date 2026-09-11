import React from 'react';
import { Patient, Appointment, AlertItem, Authorization, FabricationItem } from '../types';

interface DashboardViewProps {
  patients: Patient[]; appointments: Appointment[]; authorizations?: Authorization[]; fabrication?: FabricationItem[]; alerts: AlertItem[];
  onNavigateToTab: (tab: string) => void; onAlertAction: (actionTarget: string, alertId: string) => void; onDismissAlert: (alertId: string) => void;
  onPatientClick?: (patientName: string) => void; onUpdatePatient?: (patientId: string, patientData: any) => Promise<void>; isWorkspaceEditMode?: boolean;
  customLabels?: Record<string, string>; onUpdateLabel?: (key: string, value: string) => void; onUpdateAppointment?: (apptId: string, updateData: any) => Promise<void>;
  onBookAppointment?: () => void;
  onSendAppointmentNotification?: (appointmentId: string, channel: 'sms' | 'email') => Promise<void>;
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

export default function DashboardView({ patients, appointments, onNavigateToTab, onPatientClick, onBookAppointment, onSendAppointmentNotification }: DashboardViewProps) {
  const activePatients = patients.filter(patient => patient.status !== 'Archived');
  const attentionPatients = activePatients.filter(patient => patient.important || patient.blockerBadge || patient.nextRequiredAction);
  const today = new Date();
  const dateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayKey = dateKey(today);
  const upcomingDateKeys = new Set([0, 1, 2].map(offset => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return dateKey(date);
  }));
  const upcomingAppointments = appointments
    .filter(appt => !appt.date || appt.date.toLowerCase().includes('today') || upcomingDateKeys.has(appt.date))
    .sort((a, b) => `${a.date || todayKey} ${a.time}`.localeCompare(`${b.date || todayKey} ${b.time}`));
  const [sendingNotification, setSendingNotification] = React.useState<string | null>(null);
  const [sentNotification, setSentNotification] = React.useState<string | null>(null);
  const displayDate = (date?: string) => date && !date.toLowerCase().includes('today') ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today';
  const sendNotification = async (appointmentId: string, channel: 'sms' | 'email') => {
    if (!onSendAppointmentNotification) return;
    const key = `${appointmentId}-${channel}`;
    setSendingNotification(key);
    try {
      await onSendAppointmentNotification(appointmentId, channel);
      setSentNotification(key);
      window.setTimeout(() => setSentNotification(current => current === key ? null : current), 3000);
    } catch (error: any) {
      alert(error?.message || `${channel.toUpperCase()} could not be sent.`);
    } finally {
      setSendingNotification(current => current === key ? null : current);
    }
  };
  const recentPatients = [...activePatients].sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || '')).slice(0, 5);

  return <div className="space-y-8 animate-fade-in pb-12">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">Clinical workspace</p><h2 className="page-title">Good morning. What needs your attention?</h2><p className="page-subtitle">Choose a patient or continue the next task.</p></div>
      <button onClick={() => onBookAppointment?.()} className="primary-button"><span className="material-symbols-outlined">calendar_add_on</span> Book new appointment</button>
    </header>

    <section className="workspace-section" aria-labelledby="attention-heading"><div className="section-heading"><div><h3 id="attention-heading">Needs attention</h3><p>Pinned priorities and patients with an open next step.</p></div><span className="count-badge">{attentionPatients.length}</span></div>
      {attentionPatients.length === 0 ? <div className="empty-state"><span className="material-symbols-outlined">push_pin</span><p>No priorities yet.</p><span>Star a patient card to add them here.</span></div> : <div className="task-list">{attentionPatients.slice(0, 6).map(patient => <button key={patient.id} onClick={() => onPatientClick?.(patient.name)} className="task-row"><span className={`task-icon ${patient.important ? 'warning' : 'blue'}`}><span className="material-symbols-outlined">{patient.important ? 'priority_high' : 'assignment_late'}</span></span><span className="task-copy"><strong>{patient.name}{age(patient.dob) !== null ? ` · ${age(patient.dob)} years` : ''}</strong><span>{patient.nextRequiredAction || patient.blockerBadge || 'Review patient record'}</span></span><span className="task-stage">{readableStage(patient)}</span><span className="material-symbols-outlined task-arrow">chevron_right</span></button>)}</div>}
    </section>

    <div className="dashboard-columns"><section className="workspace-section" aria-labelledby="appointments-heading"><div className="section-heading"><div><h3 id="appointments-heading">Appointments</h3><p>Patients you will see today and over the next two days.</p></div><button className="text-button" onClick={() => onNavigateToTab('appointments')}>See schedule</button></div><div className="task-list">{upcomingAppointments.slice(0, 5).map(appt => <div key={appt.id} onClick={() => onPatientClick?.(appt.patientName)} className="task-row cursor-pointer"><span className="task-icon blue"><span className="material-symbols-outlined">calendar_today</span></span><span className="task-copy"><strong>{appt.patientName}</strong><span>{appt.type} · {displayDate(appt.date)}</span></span><span className="appointment-time">{appt.time}</span><span className="flex items-center gap-1 ml-auto" onClick={event => event.stopPropagation()}><button type="button" title="Send SMS" aria-label={`Send SMS to ${appt.patientName}`} onClick={() => sendNotification(appt.id, 'sms')} disabled={sendingNotification === `${appt.id}-sms`} className="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container disabled:opacity-50"><span className="material-symbols-outlined text-sm">{sentNotification === `${appt.id}-sms` ? 'check' : sendingNotification === `${appt.id}-sms` ? 'sync' : 'sms'}</span></button><button type="button" title="Send email" aria-label={`Send email to ${appt.patientName}`} onClick={() => sendNotification(appt.id, 'email')} disabled={sendingNotification === `${appt.id}-email`} className="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container disabled:opacity-50"><span className="material-symbols-outlined text-sm">{sentNotification === `${appt.id}-email` ? 'check' : sendingNotification === `${appt.id}-email` ? 'sync' : 'mail'}</span></button></span><span className="material-symbols-outlined task-arrow">chevron_right</span></div>)}{upcomingAppointments.length === 0 && <div className="empty-state"><span className="material-symbols-outlined">event_available</span><p>No upcoming appointments in the next two days.</p></div>}</div></section>
      <section className="workspace-section" aria-labelledby="recent-heading"><div className="section-heading"><div><h3 id="recent-heading">Recently updated</h3><p>Quick access to active patients.</p></div><button className="text-button" onClick={() => onNavigateToTab('patients')}>All patients</button></div><div className="task-list">{recentPatients.map(patient => <button key={patient.id} onClick={() => onPatientClick?.(patient.name)} className="task-row"><span className="avatar-small">{patient.avatarInitials}</span><span className="task-copy"><strong>{patient.name}</strong><span>{readableStage(patient)}{patient.deviceCategory ? ` · ${patient.deviceCategory}` : ''}</span></span><span className="material-symbols-outlined task-arrow">chevron_right</span></button>)}</div></section></div>
  </div>;
}
