import React, { useState } from 'react';
import { Patient, Appointment } from '../types';

interface AppointmentsViewProps {
  patients: Patient[];
  appointments: Appointment[];
  onAddAppointment: (apptData: any) => Promise<void>;
  onUpdateAppointment: (apptId: string, updateData: any) => Promise<void>;
  onDeleteAppointment: (apptId: string) => Promise<void>;
}

export default function AppointmentsView({
  patients,
  appointments,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment
}: AppointmentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'Checked In'>('All');
  
  // Schedule New Appointment Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formPatientName, setFormPatientName] = useState('');
  const [formTime, setFormTime] = useState('09:00 AM');
  const [formType, setFormType] = useState('Initial Evaluation - AFO');
  const [formStatus, setFormStatus] = useState<'Scheduled' | 'Checked In'>('Scheduled');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  // Edit Appointment Form State
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState('');
  const [editStatus, setEditStatus] = useState<'Scheduled' | 'Checked In'>('Scheduled');
  const [editDate, setEditDate] = useState('');
  const [editIsSubmitting, setEditIsSubmitting] = useState(false);

  // Synchronize edit fields when selected appointment changes
  React.useEffect(() => {
    if (editingAppointment) {
      setEditPatientName(editingAppointment.patientName);
      setEditTime(editingAppointment.time);
      setEditType(editingAppointment.type);
      setEditStatus(editingAppointment.status);
      setEditDate(editingAppointment.date || new Date().toISOString().split('T')[0]);
    }
  }, [editingAppointment]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      setEditIsSubmitting(true);
      await onUpdateAppointment(editingAppointment.id, {
        patientName: editPatientName,
        time: editTime,
        type: editType,
        status: editStatus,
        appt_date: editDate
      });
      setEditingAppointment(null);
    } catch (err: any) {
      alert(err.message || 'Error updating appointment');
    } finally {
      setEditIsSubmitting(false);
    }
  };

  // Email sending loading / feedback state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sentSuccessId, setSentSuccessId] = useState<string | null>(null);

  // Help determine matching patient details for an appointment
  const getPatientDetails = (name: string) => {
    const matched = patients.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (matched) {
      return {
        email: matched.email || `${matched.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: matched.phone || '(555) 000-1234',
        mrn: matched.mrn,
        status: matched.status
      };
    }
    // Placeholder fallback
    return {
      email: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: '(555) 019-2834',
      mrn: '#NEW-APPT',
      status: 'Consultation' as const
    };
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter(appt => {
    const term = searchTerm.toLowerCase();
    const patientDetails = getPatientDetails(appt.patientName);
    const matchesSearch = 
      appt.patientName.toLowerCase().includes(term) || 
      appt.type.toLowerCase().includes(term) ||
      patientDetails.email.toLowerCase().includes(term) ||
      patientDetails.mrn.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'All' ? true : appt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle Create Appointment Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientName.trim()) {
      alert('Patient name is required');
      return;
    }

    try {
      setFormIsSubmitting(true);
      await onAddAppointment({
        patientName: formPatientName,
        time: formTime,
        type: formType,
        status: formStatus,
        appt_date: formDate
      });
      // Clear form
      setFormPatientName('');
      setFormTime('09:00 AM');
      setFormType('Initial Evaluation - AFO');
      setFormStatus('Scheduled');
      setFormDate(new Date().toISOString().split('T')[0]);
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Error creating appointment');
    } finally {
      setFormIsSubmitting(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (apptId: string, currentStatus: Appointment['status']) => {
    const nextStatus = currentStatus === 'Scheduled' ? 'Checked In' : 'Scheduled';
    try {
      await onUpdateAppointment(apptId, { status: nextStatus });
    } catch (err: any) {
      alert(err.message || 'Error updating appointment status');
    }
  };

  // One-click email sender
  const handleOneClickEmail = async (apptId: string, patientName: string, email: string, apptTime: string, apptType: string) => {
    setSendingEmailId(apptId);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          patientName,
          subject: `Appointment Reminder: ${apptType}`,
          message: `Dear ${patientName}, this is a reminder for your upcoming ${apptType} appointment scheduled at ${apptTime}. Please arrive 10 minutes early.`
        })
      });
      if (!res.ok) throw new Error('Email server rejected transmission');
      
      // Flash success indicator
      setSentSuccessId(apptId);
      setTimeout(() => {
        setSentSuccessId(null);
      }, 3000);
    } catch (err: any) {
      alert(err.message || 'Error sending email');
    } finally {
      setSendingEmailId(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in relative">
      {/* Appointments Header */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Appointments &amp; Scheduling</h2>
          <p className="text-xs font-semibold text-on-surface-variant opacity-85 mt-0.5">
            Manage calendar schedules, view patient appointment details, and dispatch live email reminders.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="bg-primary hover:bg-primary-container text-white font-bold text-xs py-2 px-4 rounded-md flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none shrink-0"
        >
          <span className="material-symbols-outlined text-xs">calendar_add_on</span>
          {showAddForm ? 'Close Scheduler' : 'Schedule Appointment'}
        </button>
      </div>

      {/* Scheduler Form (if open) */}
      {showAddForm && (
        <form 
          onSubmit={handleFormSubmit}
          className="mb-6 p-5 bg-surface-container-lowest rounded-md border border-surface-container-highest/40 shadow-xs grid grid-cols-1 md:grid-cols-5 gap-4 animate-fade-in"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Patient Name</label>
            <input
              type="text"
              required
              list="patient-datalist"
              placeholder="e.g. Eleanor Vance"
              value={formPatientName}
              onChange={e => setFormPatientName(e.target.value)}
              className="w-full px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
            />
            <datalist id="patient-datalist">
              {patients.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Appt Time</label>
            <select
              value={formTime}
              onChange={e => setFormTime(e.target.value)}
              className="w-full px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
            >
              <option value="08:00 AM">08:00 AM</option>
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
              <option value="01:00 PM">01:00 PM</option>
              <option value="02:00 PM">02:00 PM</option>
              <option value="03:30 PM">03:30 PM</option>
              <option value="04:30 PM">04:30 PM</option>
            </select>
          </div>

          <div className="space-y-1 col-span-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Appt Date</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Clinical Type</label>
            <select
              value={formType}
              onChange={e => setFormType(e.target.value)}
              className="w-full px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
            >
              <option value="Initial Evaluation - AFO">Initial Evaluation - AFO</option>
              <option value="Fitting & Delivery">Fitting & Delivery</option>
              <option value="Follow-up Alignment Check">Follow-up Alignment Check</option>
              <option value="AFO Adjustment">AFO Adjustment</option>
              <option value="KAFO Joint Tuning">KAFO Joint Tuning</option>
              <option value="Initial Consult">Initial Consult</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Initial Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Checked In">Checked In</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={formIsSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-md hover:shadow-xs transition-all flex items-center gap-1.5 h-[34px] cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">check</span>
              {formIsSubmitting ? 'Saving...' : 'Book'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest border border-surface-container-highest/30 rounded-md p-3.5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-surface-container-highest bg-surface-container-lowest text-xs focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/55"
            placeholder="Search appointments by patient, type, email or ID..."
          />
        </div>

        <div className="flex items-center gap-2 bg-surface-container-high rounded-md p-0.5 border border-surface-container-highest/60 self-start md:self-auto shrink-0">
          {(['All', 'Scheduled', 'Checked In'] as const).map(option => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={`px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === option ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List Grid */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4">
        {filteredAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAppointments.map(appt => {
              const details = getPatientDetails(appt.patientName);
              const isSending = sendingEmailId === appt.id;
              const isSentSuccess = sentSuccessId === appt.id;

              return (
                <div 
                  key={appt.id} 
                  className="bg-surface-container-lowest border border-surface-container shadow-xs hover:border-secondary/45 transition-all p-4 rounded-md flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Initial Status / Toggle Status click */}
                    <div className="flex justify-between items-start mb-3">
                      <button
                        onClick={() => handleToggleStatus(appt.id, appt.status)}
                        title="Click to toggle status"
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm border transition-all cursor-pointer ${
                          appt.status === 'Checked In' 
                            ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                            : 'bg-primary-container/10 text-primary border-primary-container/25'
                        }`}
                      >
                        {appt.status}
                      </button>

                      {/* Initials badge */}
                      <div className="w-6 h-6 rounded-md bg-secondary-container/35 text-on-secondary-container flex items-center justify-center font-bold text-[9px] uppercase">
                        {appt.initials}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm text-on-surface mb-0.5">{appt.patientName}</h3>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <p className="text-[10px] font-bold text-on-surface-variant opacity-75 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">id_card</span> MRN: {details.mrn}
                      </p>
                      <span className="text-[9px] font-black uppercase bg-secondary-container/20 text-on-secondary-container px-2 py-0.5 rounded-sm border border-secondary-container/10">
                        {details.status}
                      </span>
                    </div>

                    {/* Appt Detail details */}
                    <div className="space-y-2 bg-surface p-2.5 rounded-md border border-surface-container mb-3.5">
                      {appt.date && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                          <span className="material-symbols-outlined text-xs text-primary">calendar_today</span>
                          <span>Date: {appt.date}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                        <span className="material-symbols-outlined text-xs text-primary">schedule</span>
                        <span>Time: {appt.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                        <span className="material-symbols-outlined text-xs text-secondary">stethoscope</span>
                        <span className="truncate">Type: {appt.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                        <span className="material-symbols-outlined text-xs text-outline-variant">mail</span>
                        <span className="truncate select-all">{details.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                        <span className="material-symbols-outlined text-xs text-outline-variant">phone</span>
                        <span>Phone: {details.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer: Send Notification / Email button */}
                  <div className="border-t border-surface-container/60 pt-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingAppointment(appt)}
                        title="Edit Appointment"
                        className="p-1 rounded bg-surface hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all cursor-pointer flex items-center justify-center border border-surface-container-highest"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Are you absolutely sure you want to cancel and delete the appointment for ${appt.patientName}?`)) {
                            await onDeleteAppointment(appt.id);
                          }
                        }}
                        title="Delete Appointment"
                        className="p-1 rounded bg-surface hover:bg-primary-container/15 text-primary transition-all cursor-pointer flex items-center justify-center border border-surface-container-highest"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => handleOneClickEmail(appt.id, appt.patientName, details.email, appt.time, appt.type)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                        isSentSuccess 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-secondary hover:bg-secondary-container text-white shadow-xs'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {isSending ? 'sync' : isSentSuccess ? 'done' : 'send'}
                      </span>
                      {isSending ? 'Sending...' : isSentSuccess ? 'Sent!' : 'Email Patient'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center rounded-md border border-dashed border-surface-container-highest/60 bg-surface-container-low/20">
            <p className="text-sm font-bold text-on-surface-variant opacity-75">No appointments match your search filter</p>
          </div>
        )}
      </div>

      {/* MODAL: EDIT APPOINTMENT */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 flex justify-between items-center border-b border-surface-container-highest bg-surface-bright">
              <div>
                <h2 className="text-lg font-extrabold text-on-surface">Edit Appointment</h2>
                <p className="text-xs text-on-surface-variant font-semibold mt-0.5">
                  Update appointment date, time, clinical type or status.
                </p>
              </div>
              <button
                onClick={() => setEditingAppointment(null)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Patient Name</label>
                <input
                  type="text"
                  required
                  list="edit-patient-datalist"
                  value={editPatientName}
                  onChange={e => setEditPatientName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/45"
                  placeholder="e.g., Sarah Connor"
                />
                <datalist id="edit-patient-datalist">
                  {patients.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Appt Time</label>
                  <select
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm text-on-surface focus:border-secondary outline-none transition-all"
                  >
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Appt Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm text-on-surface focus:border-secondary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Clinical Type</label>
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm text-on-surface focus:border-secondary outline-none transition-all"
                >
                  <option value="Initial Evaluation - AFO">Initial Evaluation - AFO</option>
                  <option value="Fitting & Delivery">Fitting & Delivery</option>
                  <option value="Follow-up Alignment Check">Follow-up Alignment Check</option>
                  <option value="AFO Adjustment">AFO Adjustment</option>
                  <option value="KAFO Joint Tuning">KAFO Joint Tuning</option>
                  <option value="Initial Consult">Initial Consult</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Appointment Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm text-on-surface focus:border-secondary outline-none transition-all"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Checked In">Checked In</option>
                </select>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-surface-container-highest flex justify-end gap-3 bg-surface-bright">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="px-5 py-2.5 rounded-full border-2 border-surface-container-highest text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editIsSubmitting}
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                  {editIsSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
