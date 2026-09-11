import React, { useState, useMemo } from 'react';
import { Patient, Appointment } from '../types';
import TimePicker from './TimePicker';
import PatientEmailModal from './PatientEmailModal';
import PatientSmsModal from './PatientSmsModal';

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
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar' | 'timeline'>('list');

  // Calendar View State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Timeline View State (defaults to YYYY-MM-DD string)
  const [timelineSelectedDate, setTimelineSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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

  // Manual patient notification composer state
  const [communicationPatient, setCommunicationPatient] = useState<Patient | null>(null);
  const [communicationAppointment, setCommunicationAppointment] = useState<Appointment | null>(null);
  const [communicationChannel, setCommunicationChannel] = useState<'email' | 'sms' | null>(null);

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

  // Help determine matching patient details for an appointment
  const getPatientDetails = (name: string) => {
    const matched = patients.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (matched) {
      return {
        email: matched.email || `${matched.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: matched.phone || '(555) 000-1234',
        mrn: matched.mrn,
        status: matched.status,
        clinician: matched.primaryClinician || 'Deepak Kumar Bhardwaj (BOCO)'
      };
    }
    return {
      email: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: '(555) 019-2834',
      mrn: '#NEW-APPT',
      status: 'Consultation' as const,
      clinician: 'Deepak Kumar Bhardwaj (BOCO)'
    };
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
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
  }, [appointments, searchTerm, statusFilter, patients]);

  // Handle Create Appointment Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formPatientName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      alert('A valid full patient name (at least 2 characters) is required to schedule an appointment.');
      return;
    }

    try {
      setFormIsSubmitting(true);
      await onAddAppointment({
        patientName: trimmedName,
        time: formTime,
        type: formType,
        status: formStatus,
        appt_date: formDate
      });
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

  const openCommunication = (appointment: Appointment, channel: 'email' | 'sms') => {
    const patient = patients.find(item => item.id === appointment.patientId)
      || patients.find(item => item.name.trim().toLowerCase() === appointment.patientName.trim().toLowerCase());
    if (!patient) {
      alert('A patient record is required before sending a message.');
      return;
    }
    setCommunicationAppointment(appointment);
    setCommunicationPatient(patient);
    setCommunicationChannel(channel);
  };

  const closeCommunication = () => {
    setCommunicationPatient(null);
    setCommunicationAppointment(null);
    setCommunicationChannel(null);
  };

  // Calendar Helper Logic
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const totalDays = lastDayOfMonth.getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(calendarYear, calendarMonth - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= totalDays; day++) {
      const curDate = new Date(calendarYear, calendarMonth, day);
      const dateStr = curDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month padding to fill complete weeks (42 cells max or 35)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(calendarYear, calendarMonth + 1, i);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({ dateStr, dayNumber: i, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Time Slots for Timeline View
  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:30 AM',
    '01:00 PM', '02:00 PM', '03:30 PM', '04:30 PM'
  ];

  return (
    <div className="flex flex-col space-y-6 animate-fade-in relative pb-10">
      {/* Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight">Appointments &amp; Scheduling</h2>
          <p className="text-xs font-semibold text-on-surface-variant opacity-85 mt-0.5">
            Manage patient calendar, switch views, and send automated live email reminders.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* View Mode Selector Tabs */}
          <div className="flex items-center bg-surface-container rounded-full p-1 border border-surface-container-highest/60">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="List View"
            >
              <span className="material-symbols-outlined text-sm">view_list</span>
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Calendar View"
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'timeline' ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Daily Schedule Timeline View"
            >
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span className="hidden sm:inline">Timeline</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary-container text-white font-bold text-xs py-2 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-sm">calendar_add_on</span>
            Schedule Appointment
          </button>
        </div>
      </div>

      {/* Scheduler Form (if open) */}
      {showAddForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-on-surface/45 modal-backdrop-blur" role="dialog" aria-modal="true" aria-labelledby="schedule-appointment-title">
          <div className="bg-surface-container-lowest w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-xl border border-surface-container-highest/60 animate-fade-in">
            <header className="px-6 py-5 flex items-start justify-between gap-4 border-b border-surface-container-highest/60 bg-surface-bright">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-secondary">New appointment</p>
                <h2 id="schedule-appointment-title" className="text-xl font-black text-on-surface mt-1">Schedule an appointment</h2>
                <p className="text-xs font-semibold text-on-surface-variant mt-1">Choose a patient, visit type, date, and time.</p>
              </div>
              <button type="button" onClick={() => setShowAddForm(false)} aria-label="Close schedule appointment form" className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Patient Name</label>
            <input
              type="text"
              required
              list="patient-datalist"
              placeholder="e.g. Eleanor Vance"
              value={formPatientName}
              onChange={e => setFormPatientName(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
            />
            <datalist id="patient-datalist">
              {patients.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Appt Time</label>
            <TimePicker value={formTime} onChange={setFormTime} className="mt-1" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Appt Date</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Clinical Type</label>
            <select
              value={formType}
              onChange={e => setFormType(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
            >
              <option value="Initial Evaluation - AFO">Initial Evaluation - AFO</option>
              <option value="Fitting & Delivery">Fitting & Delivery</option>
              <option value="Follow-up Alignment Check">Follow-up Alignment Check</option>
              <option value="AFO Adjustment">AFO Adjustment</option>
              <option value="KAFO Joint Tuning">KAFO Joint Tuning</option>
              <option value="Initial Consult">Initial Consult</option>
              <option value="Measurement / Cast">Measurement / Cast</option>
            </select>
          </div>

                <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider block">Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Checked In">Checked In</option>
              </select>
                </div>
              </div>

              <div className="pt-4 border-t border-surface-container-highest/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[10px] font-semibold text-on-surface-variant">The patient will receive the appointment details after booking.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" disabled={formIsSubmitting} className="px-6 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                    {formIsSubmitting ? 'Saving...' : 'Book Appointment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest border border-surface-container-highest/40 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-surface-container-highest bg-surface-container-lowest text-xs font-semibold focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/50"
            placeholder="Search by patient, type, email or MRN..."
          />
        </div>

        <div className="flex items-center gap-2 bg-surface-container rounded-xl p-1 border border-surface-container-highest/60 self-start md:self-auto shrink-0">
          {(['All', 'Scheduled', 'Checked In'] as const).map(option => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === option ? 'bg-surface-container-lowest shadow-xs text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-highest/50 shadow-2xs overflow-hidden animate-fade-in">
          {filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-on-surface">
                <thead>
                  <tr className="bg-surface border-b border-surface-container-highest/60 text-[10px] uppercase font-black tracking-wider text-on-surface-variant">
                    <th className="py-3.5 px-5">Patient &amp; MRN</th>
                    <th className="py-3.5 px-4">Date &amp; Time</th>
                    <th className="py-3.5 px-4">Clinical Visit Type</th>
                    <th className="py-3.5 px-4">Clinician</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Contact Patient</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-highest/30">
                  {filteredAppointments.map(appt => {
                    const details = getPatientDetails(appt.patientName);
                    return (
                      <tr key={appt.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary font-black flex items-center justify-center text-xs shrink-0">
                              {appt.initials}
                            </div>
                            <div>
                              <p className="font-extrabold text-on-surface">{appt.patientName}</p>
                              <p className="text-[10.5px] font-mono text-on-surface-variant font-bold">MRN: {details.mrn}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-on-surface">{appt.time}</p>
                          <p className="text-[10px] text-on-surface-variant">{appt.date || 'Today'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-on-surface truncate block max-w-[200px]">
                            {appt.type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-on-surface-variant font-medium">
                          {details.clinician}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleStatus(appt.id, appt.status)}
                            title="Click to toggle status"
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                              appt.status === 'Checked In'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {appt.status}
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => openCommunication(appt, 'email')} className="px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 bg-secondary text-white hover:bg-secondary/90 transition-all cursor-pointer" title="Open email composer">
                              <span className="material-symbols-outlined text-xs">mail</span>Email
                            </button>
                            <button type="button" onClick={() => openCommunication(appt, 'sms')} className="px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer" title="Open SMS composer">
                              <span className="material-symbols-outlined text-xs">sms</span>SMS
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingAppointment(appt)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container transition-colors cursor-pointer"
                              title="Edit Appointment"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Cancel and delete appointment for ${appt.patientName}?`)) {
                                  await onDeleteAppointment(appt.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Delete Appointment"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs font-bold text-on-surface-variant">
              No appointments found matching search or filter criteria.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map(appt => {
              const details = getPatientDetails(appt.patientName);
              return (
                <div
                  key={appt.id}
                  className="bg-surface-container-lowest border border-surface-container-highest/60 rounded-3xl p-5 shadow-2xs hover:border-secondary transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <button
                        onClick={() => handleToggleStatus(appt.id, appt.status)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                          appt.status === 'Checked In'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {appt.status}
                      </button>
                      <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary font-black text-xs flex items-center justify-center border border-secondary/20">
                        {appt.initials}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-base text-on-surface">{appt.patientName}</h3>
                    <p className="text-[10.5px] font-mono text-on-surface-variant font-bold mb-3">MRN: {details.mrn}</p>

                    <div className="bg-surface p-3 rounded-2xl border border-surface-container space-y-2 mb-4 text-xs font-semibold text-on-surface">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs text-secondary">schedule</span>
                        <span>{appt.time} ({appt.date || 'Today'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs text-primary">stethoscope</span>
                        <span className="truncate">{appt.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant text-[11px]">
                        <span className="material-symbols-outlined text-xs">mail</span>
                        <span className="truncate">{details.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-surface-container flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingAppointment(appt)}
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-secondary cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete appointment for ${appt.patientName}?`)) {
                            await onDeleteAppointment(appt.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openCommunication(appt, 'email')} className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-secondary text-white hover:bg-secondary/90 transition-all cursor-pointer" title="Open email composer">
                        <span className="material-symbols-outlined text-xs">mail</span>Email
                      </button>
                      <button type="button" onClick={() => openCommunication(appt, 'sms')} className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer" title="Open SMS composer">
                        <span className="material-symbols-outlined text-xs">sms</span>SMS
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-xs font-bold text-on-surface-variant">
              No appointments found matching search filter.
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-surface-container-lowest border border-surface-container-highest/60 rounded-3xl p-6 shadow-2xs space-y-4 animate-fade-in">
          {/* Calendar Month Header Controller */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black text-on-surface">
                {monthNames[calendarMonth]} {calendarYear}
              </h3>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                className="p-2 rounded-full hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
                title="Previous Month"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button
                onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                className="p-2 rounded-full hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
                title="Next Month"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Calendar Days Header */}
          <div className="grid grid-cols-7 gap-2 text-center border-b border-surface-container pb-2 text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Grid Matrix */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayObj, idx) => {
              // Find appointments matching this date
              const dayAppts = filteredAppointments.filter(
                a => a.date === dayObj.dateStr || (dayObj.isToday && !a.date)
              );

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setFormDate(dayObj.dateStr);
                    setShowAddForm(true);
                  }}
                  className={`min-h-[100px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dayObj.isToday
                      ? 'bg-secondary/5 border-secondary/40 shadow-2xs'
                      : dayObj.isCurrentMonth
                      ? 'bg-surface border-surface-container-highest/40 hover:border-secondary/40'
                      : 'bg-surface-container-low/30 border-transparent opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs font-black ${
                        dayObj.isToday
                          ? 'w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center'
                          : 'text-on-surface'
                      }`}
                    >
                      {dayObj.dayNumber}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="text-[9px] font-extrabold bg-secondary/15 text-secondary px-1.5 py-0.5 rounded-full">
                        {dayAppts.length} appt
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[60px] scrollbar-none">
                    {dayAppts.map(a => (
                      <div
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAppointment(a);
                        }}
                        className="bg-surface-container-lowest p-1 rounded-lg border border-surface-container text-[10px] font-bold text-on-surface truncate hover:border-secondary transition-colors"
                        title={`${a.patientName} - ${a.time} (${a.type})`}
                      >
                        <span className="text-secondary font-mono mr-1">{a.time.split(' ')[0]}</span>
                        <span>{a.patientName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: DAILY TIMELINE SCHEDULE VIEW */}
      {viewMode === 'timeline' && (
        <div className="bg-surface-container-lowest border border-surface-container-highest/60 rounded-3xl p-6 shadow-2xs space-y-5 animate-fade-in">
          {/* Timeline Controller */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container pb-4">
            <div>
              <h3 className="text-lg font-black text-on-surface">Daily Schedule Timeline</h3>
              <p className="text-xs text-on-surface-variant font-semibold">
                Sequential hour-by-hour view for clinic day planning.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-on-surface-variant">Select Date:</label>
              <input
                type="date"
                value={timelineSelectedDate}
                onChange={e => setTimelineSelectedDate(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-surface-container-highest bg-surface text-xs font-extrabold text-on-surface focus:border-secondary outline-none"
              />
            </div>
          </div>

          {/* Timeline Slot Blocks */}
          <div className="space-y-3">
            {timeSlots.map(slot => {
              const slotAppts = filteredAppointments.filter(
                a => a.time === slot && (a.date === timelineSelectedDate || (!a.date && timelineSelectedDate === new Date().toISOString().split('T')[0]))
              );

              return (
                <div key={slot} className="flex gap-4 items-start">
                  {/* Time Label */}
                  <div className="w-24 shrink-0 pt-2 text-right">
                    <span className="text-xs font-black font-mono text-secondary tracking-tight block">{slot}</span>
                    <span className="text-[9.5px] font-bold text-on-surface-variant opacity-60 uppercase">Slot</span>
                  </div>

                  {/* Slot Container */}
                  <div className="flex-1 min-h-[58px] p-2 bg-surface rounded-2xl border border-surface-container flex items-center gap-3">
                    {slotAppts.length > 0 ? (
                      slotAppts.map(appt => {
                        const details = getPatientDetails(appt.patientName);
                        return (
                          <div
                            key={appt.id}
                            className="flex-1 bg-surface-container-lowest border border-secondary/30 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-secondary transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-secondary/10 text-secondary font-black text-xs flex items-center justify-center">
                                {appt.initials}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-xs text-on-surface">{appt.patientName}</h4>
                                <p className="text-[10px] text-on-surface-variant font-semibold">{appt.type}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleStatus(appt.id, appt.status)}
                                className={`px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider border cursor-pointer ${
                                  appt.status === 'Checked In'
                                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                              >
                                {appt.status}
                              </button>

                              <button
                                onClick={() => setEditingAppointment(appt)}
                                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <button
                        onClick={() => {
                          setFormTime(slot);
                          setFormDate(timelineSelectedDate);
                          setShowAddForm(true);
                        }}
                        className="w-full py-2 border border-dashed border-surface-container-highest/80 rounded-xl text-center text-xs font-bold text-on-surface-variant/60 hover:text-secondary hover:border-secondary transition-colors cursor-pointer"
                      >
                        + Book appointment for {slot}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: EDIT APPOINTMENT */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
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

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Patient Name</label>
                <input
                  type="text"
                  required
                  list="edit-patient-datalist"
                  value={editPatientName}
                  onChange={e => setEditPatientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none transition-all"
                  placeholder="e.g., Eleanor Vance"
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
                  <TimePicker value={editTime || '09:00 AM'} onChange={setEditTime} className="mt-1" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Appt Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface focus:border-secondary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Clinical Type</label>
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface focus:border-secondary outline-none transition-all"
                >
                  <option value="Initial Evaluation - AFO">Initial Evaluation - AFO</option>
                  <option value="Fitting & Delivery">Fitting & Delivery</option>
                  <option value="Follow-up Alignment Check">Follow-up Alignment Check</option>
                  <option value="AFO Adjustment">AFO Adjustment</option>
                  <option value="KAFO Joint Tuning">KAFO Joint Tuning</option>
                  <option value="Initial Consult">Initial Consult</option>
                  <option value="Measurement / Cast">Measurement / Cast</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Appointment Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface focus:border-secondary outline-none transition-all"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Checked In">Checked In</option>
                </select>
              </div>

              <div className="pt-4 border-t border-surface-container-highest flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="px-5 py-2.5 rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editIsSubmitting}
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                  {editIsSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {communicationPatient && communicationAppointment && communicationChannel === 'email' && (
        <PatientEmailModal
          patient={communicationPatient}
          appointmentDate={communicationAppointment.date || 'Today'}
          appointmentTime={communicationAppointment.time}
          onClose={closeCommunication}
        />
      )}
      {communicationPatient && communicationAppointment && communicationChannel === 'sms' && (
        <PatientSmsModal
          patient={communicationPatient}
          appointmentType={communicationAppointment.type}
          appointmentDate={communicationAppointment.date || 'Today'}
          appointmentTime={communicationAppointment.time}
          onClose={closeCommunication}
        />
      )}
    </div>
  );
}
