import React, { useMemo, useState } from 'react';
import { Patient, PatientFile, REASONS_FOR_VISIT } from '../types';
import TimePicker from './TimePicker';

interface BookAppointmentModalProps {
  patients: Patient[];
  onAddPatient: (patientData: any) => Promise<boolean | void>;
  onAddAppointment: (appointmentData: any) => Promise<void>;
  onViewPatient: (patient: Patient) => void;
  onClose: () => void;
  includeAppointment?: boolean;
}

const today = new Date().toISOString().split('T')[0];

const normalize = (value?: string) => (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export default function BookAppointmentModal({ patients, onAddPatient, onAddAppointment, onViewPatient, onClose, includeAppointment = true }: BookAppointmentModalProps) {
  const [patientType, setPatientType] = useState<'old' | 'new'>(includeAppointment ? 'old' : 'new');
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [clinician, setClinician] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [deviceCategory, setDeviceCategory] = useState('');
  const [affectedSide, setAffectedSide] = useState('');
  const [careStage, setCareStage] = useState('Referral');
  const [allergies, setAllergies] = useState('');
  const [communicationPreference, setCommunicationPreference] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [newPatientStep, setNewPatientStep] = useState(1);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('09:00 AM');
  const [type, setType] = useState('Initial Consultation');
  const [status, setStatus] = useState<'Scheduled' | 'Checked In'>('Scheduled');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const readFile = (file: File) => new Promise<PatientFile>(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: `f_${Date.now()}_${file.name}`,
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : file.type.includes('image') ? 'jpg' : 'doc',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      content: String(reader.result || '')
    });
    reader.readAsDataURL(file);
  });

  const matchingPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return patients
      .filter(patient => [patient.name, patient.phone, patient.email, patient.mrn]
        .some(value => (value || '').toLowerCase().includes(term)))
      .slice(0, 6);
  }, [patients, search]);

  const duplicatePatients = useMemo(() => {
    const newName = normalize(name);
    const newPhone = normalize(phone);
    const newEmail = normalize(email);
    if (!newName && !newPhone && !newEmail && !dob) return [];
    return patients.filter(patient => {
      const sameName = newName.length >= 2 && normalize(patient.name) === newName;
      const samePhone = newPhone.length >= 7 && normalize(patient.phone) === newPhone;
      const sameEmail = newEmail.length >= 5 && normalize(patient.email) === newEmail;
      const sameDob = Boolean(dob && patient.dob === dob && sameName);
      return sameName || samePhone || sameEmail || sameDob;
    }).slice(0, 3);
  }, [dob, email, name, patients, phone]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (patientType === 'old' && !selectedPatient) {
      setError('Search for and select a patient before booking.');
      return;
    }
    if (patientType === 'new' && duplicatePatients.length) {
      setError('This patient already exists. Choose the existing record below to continue.');
      return;
    }
    if (patientType === 'new' && (!name.trim() || !phone.trim() || !dob)) {
      setError('Full name, phone number, and date of birth are required to create a patient.');
      setNewPatientStep(1);
      return;
    }
    setSubmitting(true);
    try {
      let patientName = selectedPatient?.name || name.trim() || `Unidentified patient ${Date.now()}`;
      if (patientType === 'new') {
        const uploadedFiles = await Promise.all(documents.map(readFile));
        const patientSaved = await onAddPatient({
          name: patientName,
          phone: phone.trim(),
          dob,
          email: email.trim(),
          referralSource: reason,
          status: 'New Referral',
          address: address.trim(),
          gender,
          insuranceCompany: insuranceCompany.trim(),
          insuranceId: insuranceId.trim(),
          primaryClinician: clinician.trim(),
          diagnosis: diagnosis.trim(),
          deviceCategory: deviceCategory || undefined,
          affectedSide: affectedSide || undefined,
          careStage,
          allergies: allergies.split(',').map(value => value.trim()).filter(Boolean),
          communicationPreference: communicationPreference || undefined,
          files: uploadedFiles
        });
        if (patientSaved === false) return;
        if (!includeAppointment) {
          onClose();
          return;
        }
      }

      if (includeAppointment) {
        await onAddAppointment({ patientName, time: time.trim(), type: type.trim(), status, appt_date: date, notes: notes.trim() });
      }
      onClose();
    } catch (submissionError: any) {
      setError(submissionError?.message || 'The appointment could not be booked.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-on-surface/45 p-4 modal-backdrop-blur" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="book-appointment-title">
        <header className="flex items-start justify-between gap-4 border-b border-surface-container-highest bg-surface-bright px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Scheduling workflow</p>
            <h2 id="book-appointment-title" className="mt-1 text-xl font-extrabold text-on-surface">{includeAppointment ? 'Book new appointment' : 'Add patient'}</h2>
            <p className="mt-1 text-xs font-semibold text-on-surface-variant">{includeAppointment ? 'Find an existing patient or create a new patient record before booking.' : 'Complete any details you have now. Every field can be updated later.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close booking workflow" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </header>

        <form onSubmit={submit} className="overflow-y-auto p-6">
          {includeAppointment && <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-container-low p-1">
            <button type="button" onClick={() => { setPatientType('old'); setError(''); }} className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${patientType === 'old' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}>
              <span className="material-symbols-outlined mr-1 align-middle text-base">person_search</span>Old patient
            </button>
            <button type="button" onClick={() => { setPatientType('new'); setSelectedPatient(null); setError(''); }} className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${patientType === 'new' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}>
              <span className="material-symbols-outlined mr-1 align-middle text-base">person_add</span>New patient
            </button>
          </div>}

          {patientType === 'old' ? (
            <section className="mb-6 rounded-2xl border border-surface-container-highest/60 p-4">
              <label className="form-label">Search existing patients</label>
              <div className="relative mt-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-on-surface-variant">search</span>
                <input autoFocus value={search} onChange={event => { setSearch(event.target.value); setSelectedPatient(null); }} className="form-input pl-10" placeholder="Search by name, phone, email, or MRN" />
              </div>
              {selectedPatient && <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-3"><div><p className="text-sm font-black text-on-surface">{selectedPatient.name}</p><p className="text-xs text-on-surface-variant">{selectedPatient.phone} · {selectedPatient.mrn}</p></div><button type="button" onClick={() => setSelectedPatient(null)} className="text-xs font-bold text-primary">Change</button></div>}
              {!selectedPatient && search.trim() && <div className="mt-2 space-y-1">{matchingPatients.length ? matchingPatients.map(patient => <button type="button" key={patient.id} onClick={() => { setSelectedPatient(patient); setSearch(patient.name); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-surface-container-low"><span><span className="block text-sm font-extrabold text-on-surface">{patient.name}</span><span className="block text-xs text-on-surface-variant">{patient.phone || 'No phone'} · {patient.mrn}</span></span><span className="material-symbols-outlined text-sm text-primary">arrow_forward</span></button>) : <p className="px-3 py-3 text-xs font-semibold text-on-surface-variant">No matching patient found. Switch to New patient to create a record.</p>}</div>}
            </section>
          ) : (
            <section className="mb-6 rounded-2xl border border-surface-container-highest/60 p-4">
              <div className="mb-4 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-black text-on-surface"><span className="material-symbols-outlined text-primary">person_add</span>New patient intake</h3><span className="text-xs font-bold text-on-surface-variant">Step {newPatientStep} of 3</span></div>
              <div className="mb-5 grid grid-cols-3 gap-2">{['Identity', 'Clinical', 'Documents'].map((label, index) => <button type="button" key={label} onClick={() => setNewPatientStep(index + 1)} className={`rounded-xl px-2 py-2 text-xs font-black ${newPatientStep === index + 1 ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}>{index + 1}. {label}</button>)}</div>
              {newPatientStep === 1 && <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-label sm:col-span-2">Full name <span className="text-primary">*</span><input required value={name} onChange={event => setName(event.target.value)} className="form-input mt-1" placeholder="e.g. Sarah Connor" /></label>
                <label className="form-label">Phone number <span className="text-primary">*</span><input required type="tel" value={phone} onChange={event => setPhone(event.target.value)} className="form-input mt-1" placeholder="(555) 000-0000" /></label>
                <label className="form-label">Date of birth <span className="text-primary">*</span><input required type="date" value={dob} onChange={event => setDob(event.target.value)} className="form-input mt-1" /></label>
                <label className="form-label">Email address <span className="font-normal">(optional)</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} className="form-input mt-1" placeholder="sarah@example.com" /></label>
                <label className="form-label">Gender <span className="font-normal">(optional)</span><select value={gender} onChange={event => setGender(event.target.value)} className="form-input mt-1"><option value="">Not provided</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
                <label className="form-label sm:col-span-2">Address <span className="font-normal">(optional)</span><input value={address} onChange={event => setAddress(event.target.value)} className="form-input mt-1" placeholder="Street, city, state, ZIP" /></label>
              </div>}
              {newPatientStep === 2 && <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-label">Reason for visit <span className="font-normal">(optional)</span><select value={reason} onChange={event => setReason(event.target.value)} className="form-input mt-1"><option value="">Not provided</option>{REASONS_FOR_VISIT.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="form-label">Care stage <span className="font-normal">(optional)</span><select value={careStage} onChange={event => setCareStage(event.target.value)} className="form-input mt-1"><option>Referral</option><option>Evaluation</option><option>Authorization</option><option>Fabrication</option><option>Fitting</option><option>Follow-up</option></select></label>
                <label className="form-label">Insurance company <span className="font-normal">(optional)</span><input value={insuranceCompany} onChange={event => setInsuranceCompany(event.target.value)} className="form-input mt-1" /></label>
                <label className="form-label">Member ID <span className="font-normal">(optional)</span><input value={insuranceId} onChange={event => setInsuranceId(event.target.value)} className="form-input mt-1" /></label>
                <label className="form-label">Primary clinician <span className="font-normal">(optional)</span><input value={clinician} onChange={event => setClinician(event.target.value)} className="form-input mt-1" /></label>
                <label className="form-label">Affected side <span className="font-normal">(optional)</span><select value={affectedSide} onChange={event => setAffectedSide(event.target.value)} className="form-input mt-1"><option value="">Not provided</option><option>Left</option><option>Right</option><option>Bilateral</option></select></label>
                <label className="form-label">Device category <span className="font-normal">(optional)</span><input value={deviceCategory} onChange={event => setDeviceCategory(event.target.value)} className="form-input mt-1" placeholder="AFO, prosthesis, etc." /></label>
                <label className="form-label">Allergies <span className="font-normal">(optional)</span><input value={allergies} onChange={event => setAllergies(event.target.value)} className="form-input mt-1" placeholder="Separate with commas" /></label>
                <label className="form-label">Communication preference <span className="font-normal">(optional)</span><select value={communicationPreference} onChange={event => setCommunicationPreference(event.target.value)} className="form-input mt-1"><option value="">Not provided</option><option>SMS Text</option><option>Email</option><option>Phone Call</option><option>Patient Portal</option></select></label>
              </div>}
              {newPatientStep === 3 && <div className="space-y-4"><div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4"><p className="text-sm font-black text-on-surface">Upload documents <span className="font-normal text-on-surface-variant">(optional)</span></p><p className="mt-1 text-xs text-on-surface-variant">Prescriptions, insurance cards, referrals, or clinical records can be added now or later.</p><input type="file" multiple onChange={event => setDocuments(Array.from(event.target.files || []))} className="mt-3 block w-full text-xs font-semibold text-on-surface-variant file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" /></div>{documents.length ? documents.map(file => <p key={file.name} className="rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>) : <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800">Document upload pending — you can upload files later from the patient profile.</p>}<label className="form-label">Additional notes <span className="font-normal">(optional)</span><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={4} className="form-input mt-1 resize-none" placeholder="Any details to complete later" /></label></div>}
              {newPatientStep < 3 && <div className="mt-5 flex justify-end"><button type="button" onClick={() => setNewPatientStep(step => step + 1)} className="primary-button">Continue <span className="material-symbols-outlined text-sm">arrow_forward</span></button></div>}
              {duplicatePatients.length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4" role="alert">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-700">person_alert</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-amber-900">This patient may already exist</p>
                      <p className="mt-1 text-xs font-semibold text-amber-800">We found a matching patient. Do you want to book the appointment for the existing record?</p>
                      <div className="mt-3 space-y-2">
                        {duplicatePatients.map(patient => (
                          <div key={patient.id} className="rounded-xl border border-amber-200 bg-white/70 p-3">
                            <p className="text-sm font-extrabold text-on-surface">{patient.name}</p>
                            <p className="mt-0.5 text-xs text-on-surface-variant">{patient.phone || 'No phone'} · {patient.email || 'No email'} · DOB {patient.dob || 'Not provided'}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button type="button" onClick={() => { setPatientType('old'); setSelectedPatient(patient); setSearch(patient.name); setError(''); }} className="primary-button !min-h-9 !px-3 !py-2 text-xs">Book for this patient</button>
                              <button type="button" onClick={() => { onClose(); onViewPatient(patient); }} className="secondary-button !min-h-9 !px-3 !py-2 text-xs">View patient details</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {includeAppointment && <section className="rounded-2xl border border-surface-container-highest/60 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-on-surface"><span className="material-symbols-outlined text-primary">calendar_month</span>Appointment details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-label">Appointment date<input required type="date" value={date} onChange={event => setDate(event.target.value)} className="form-input mt-1" /></label>
              <label className="form-label">Appointment time<TimePicker value={time} onChange={setTime} className="mt-1" /></label>
              <label className="form-label">Visit type<select value={type} onChange={event => setType(event.target.value)} className="form-input mt-1"><option>Initial Consultation</option><option>Evaluation</option><option>Device Fitting</option><option>Follow-up</option><option>Adjustment Session</option><option>Delivery</option></select></label>
              <label className="form-label">Status<select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="form-input mt-1"><option>Scheduled</option><option>Checked In</option></select></label>
              <label className="form-label sm:col-span-2">Notes <span className="font-normal">(optional)</span><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} className="form-input mt-1 resize-none" placeholder="Add preparation notes or special instructions" /></label>
            </div>
          </section>}

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">{error}</p>}
          <footer className="mt-6 flex justify-end gap-3 border-t border-surface-container-highest pt-4">
            <button type="button" onClick={onClose} className="secondary-button">Cancel</button>
            {(!includeAppointment || patientType === 'old' || newPatientStep === 3) && <button type="submit" disabled={submitting} className="primary-button disabled:cursor-not-allowed disabled:opacity-50"><span className="material-symbols-outlined text-sm">{includeAppointment ? 'event_available' : 'person_add'}</span>{submitting ? 'Saving…' : includeAppointment ? 'Book appointment' : 'Save patient'}</button>}
          </footer>
        </form>
      </div>
    </div>
  );
}
