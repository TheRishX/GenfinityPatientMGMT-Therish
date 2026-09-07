import React, { useState, useEffect } from 'react';
import { Patient, PatientFile, Appointment, Authorization, Claim, ClinicalNote, TimelineEvent, TimelineEventType, REASONS_FOR_VISIT } from '../types';
import { PatientTimeline } from './PatientTimeline';
import { compressImageFile } from '../utils/imageCompressor';
import PatientEmailModal from './PatientEmailModal';
import PatientSmsModal from './PatientSmsModal';
import BookAppointmentModal from './BookAppointmentModal';
import TimePicker from './TimePicker';

interface PatientsViewProps {
  patients: Patient[];
  appointments: Appointment[];
  authorizations: Authorization[];
  claims: Claim[];
  searchTerm: string;
  onAddPatient: (patientData: any) => Promise<boolean | void>;
  onAddFile: (patientId: string, fileData: any) => Promise<void>;
  onDeleteFile: (patientId: string, fileId: string) => Promise<void>;
  onUpdatePatient: (patientId: string, patientData: any) => Promise<void>;
  onDeletePatient: (patientId: string) => Promise<void>;
  onAddAppointment: (apptData: any) => Promise<void>;
  onUpdateAppointment: (apptId: string, updateData: any) => Promise<void>;
  onAddAuth: (authData: any) => Promise<void>;
  onAddClaim: (claimData: any) => Promise<void>;
  isNewPatientModalOpen: boolean;
  setIsNewPatientModalOpen: (open: boolean) => void;
  selectedPatient?: Patient | null;
  setSelectedPatient?: (patient: Patient | null) => void;
}

const careStages: Array<{ value: NonNullable<Patient['careStage']>; label: string; color: string }> = [
  { value: 'Referral', label: 'New referral', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'Evaluation', label: 'Evaluation', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'Authorization', label: 'Insurance approval', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'Casting/scan', label: 'Casting or scan', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { value: 'Fabrication', label: 'Device being made', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'Fitting', label: 'Fitting', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { value: 'Delivery', label: 'Delivery', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'Follow-up', label: 'Follow-up', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'Closed', label: 'Complete', color: 'bg-surface-container text-on-surface-variant border-surface-container-highest' }
];

export default function PatientsView({
  patients,
  appointments,
  authorizations,
  claims,
  searchTerm,
  onAddPatient,
  onAddFile,
  onDeleteFile,
  onUpdatePatient,
  onDeletePatient,
  onAddAppointment,
  onUpdateAppointment,
  onAddAuth,
  onAddClaim,
  isNewPatientModalOpen,
  setIsNewPatientModalOpen,
  selectedPatient: selectedPatientProp,
  setSelectedPatient: setSelectedPatientProp
}: PatientsViewProps) {
  // Active selected patient for profile modal (supports prop integration and local fallback)
  const [localSelectedPatient, setLocalSelectedPatient] = useState<Patient | null>(null);
  const selectedPatient = selectedPatientProp !== undefined ? selectedPatientProp : localSelectedPatient;
  const setSelectedPatient = setSelectedPatientProp !== undefined ? setSelectedPatientProp : setLocalSelectedPatient;

  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [patientView, setPatientView] = useState<'grid' | 'list' | 'compact'>('grid');
  const [sortBy, setSortBy] = useState<'priority' | 'name' | 'status'>('priority');
  const [activeProfileTab, setActiveProfileTab] = useState<string>('info');
  const [viewingFile, setViewingFile] = useState<PatientFile | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Card Overflow Menu & Admin Security Delete Modal state
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [deleteModalPatient, setDeleteModalPatient] = useState<Patient | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [emailPatient, setEmailPatient] = useState<Patient | null>(null);
  const [smsPatient, setSmsPatient] = useState<Patient | null>(null);
  const [timelineCategory, setTimelineCategory] = useState<'all' | 'visits' | 'notes' | 'orders' | 'auth' | 'fabrication' | 'documents'>('all');

  // Quick Add Timeline Event States
  const [showAddTimelineModal, setShowAddTimelineModal] = useState(false);
  const [newTlEventType, setNewTlEventType] = useState<TimelineEventType>('visit');
  const [newTlTitle, setNewTlTitle] = useState('');
  const [newTlSummary, setNewTlSummary] = useState('');
  const [newTlOutcome, setNewTlOutcome] = useState('');
  const [newTlNextAction, setNewTlNextAction] = useState('');
  const [newTlStatus, setNewTlStatus] = useState('Completed');
  const [newTlAuthor, setNewTlAuthor] = useState('Dr. Deepak Kumar Bhardwaj');

  // Info Tab States
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoName, setEditInfoName] = useState('');
  const [editInfoPhone, setEditInfoPhone] = useState('');
  const [editInfoDob, setEditInfoDob] = useState('');
  const [editInfoEmail, setEditInfoEmail] = useState('');
  const [editInfoReferralSource, setEditInfoReferralSource] = useState('');
  const [editInfoStatus, setEditInfoStatus] = useState('');
  const [editInfoInsuranceCompany, setEditInfoInsuranceCompany] = useState('');
  const [editInfoInsuranceId, setEditInfoInsuranceId] = useState('');
  const [editInfoAddress, setEditInfoAddress] = useState('');
  const [editInfoGender, setEditInfoGender] = useState('');
  const [editInfoAvatarUrl, setEditInfoAvatarUrl] = useState('');
  const [editInfoCareStage, setEditInfoCareStage] = useState<Patient['careStage']>('Referral');

  // Appointments Tab States
  const [newApptDate, setNewApptDate] = useState('');
  const [newApptTime, setNewApptTime] = useState('09:00 AM');
  const [newApptType, setNewApptType] = useState('Consultation');
  const [newApptStatus, setNewApptStatus] = useState<'Scheduled' | 'Checked In'>('Scheduled');

  // Authorization Tab States
  const [newAuthDevice, setNewAuthDevice] = useState('');
  const [newAuthPayer, setNewAuthPayer] = useState('');
  const [newAuthNotes, setNewAuthNotes] = useState('');

  // Billing Tab States
  const [newClaimPayer, setNewClaimPayer] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState('');
  const [newClaimDoc, setNewClaimDoc] = useState('');
  const [newClaimDescription, setNewClaimDescription] = useState('');
  const [newClaimDetails, setNewClaimDetails] = useState('');
  const [newClaimPaymentMethod, setNewClaimPaymentMethod] = useState('Cash / Self-Pay');
  const [newClaimTip, setNewClaimTip] = useState('');
  const [newClaimWarranty, setNewClaimWarranty] = useState('30');

  // Clinical Notes Tab States
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteAuthor, setNewNoteAuthor] = useState('Dr. Deepak Kumar Bhardwaj');

  // Keep selectedPatient state in sync with updated database props
  useEffect(() => {
    if (selectedPatient) {
      const updated = patients.find(p => p.id === selectedPatient.id);
      if (updated) {
        setSelectedPatient(updated);
      }
    }
  }, [patients]);

  // Pre-fill edit fields on patient selection
  useEffect(() => {
    if (selectedPatient) {
      setEditInfoName(selectedPatient.name || '');
      setEditInfoPhone(selectedPatient.phone || '');
      setEditInfoDob(selectedPatient.dob || '');
      setEditInfoEmail(selectedPatient.email || '');
      setEditInfoReferralSource(selectedPatient.referralSource || 'other');
      setEditInfoStatus(selectedPatient.status || 'In Progress');
      setEditInfoInsuranceCompany(selectedPatient.insuranceCompany || '');
      setEditInfoInsuranceId(selectedPatient.insuranceId || '');
      setEditInfoAddress(selectedPatient.address || '');
      setEditInfoGender(selectedPatient.gender || 'Not specified');
      setEditInfoAvatarUrl(selectedPatient.avatarUrl || '');
      setEditInfoCareStage(selectedPatient.careStage || 'Referral');
      setIsEditingInfo(false);
      setActiveProfileTab('info');
    }
  }, [selectedPatient?.id]);

  // Add Patient Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newReferral, setNewReferral] = useState('');
  const [newInsuranceCompany, setNewInsuranceCompany] = useState('');
  const [newPrimaryClinician, setNewPrimaryClinician] = useState('Dr. Deepak Kumar Bhardwaj');

  // Interactive Checklist states for Profile (Info / checklist on profile)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    prescription: true,
    clinicalRecords: true,
    lmn: false
  });

  // Filtered patients list
  const filteredPatients = patients.filter(p => {
    if (!p) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      p.name.toLowerCase().includes(term) ||
      p.mrn.toLowerCase().includes(term) ||
      p.status.toLowerCase().includes(term) ||
      (p.phone && p.phone.includes(term)) ||
      (p.insuranceCompany && p.insuranceCompany.toLowerCase().includes(term)) ||
      (p.primaryClinician && p.primaryClinician.toLowerCase().includes(term))
    );
    if (!matchesSearch) return false;

    if (archiveFilter === 'active') {
      return p.status !== 'Archived';
    } else if (archiveFilter === 'archived') {
      return p.status === 'Archived';
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'status') return a.status.localeCompare(b.status) || a.name.localeCompare(b.name);
    return Number(Boolean(b.important)) - Number(Boolean(a.important)) || a.name.localeCompare(b.name);
  });

  // Handle saving new patient
  const handleSavePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.toLowerCase() === 'a') {
      alert('A valid full patient name (minimum 2 characters) is required before saving a patient record.');
      return;
    }

    await onAddPatient({
      name: trimmedName,
      phone: newPhone,
      dob: newDob,
      email: newEmail,
      referralSource: newReferral,
      insuranceCompany: newInsuranceCompany || 'Medicare Blue Cross',
      primaryClinician: newPrimaryClinician || 'Dr. Deepak Kumar Bhardwaj',
      status: 'In Progress'
    });

    // Reset Form
    setNewName('');
    setNewPhone('');
    setNewDob('');
    setNewEmail('');
    setNewReferral('');
    setNewInsuranceCompany('');
    setNewPrimaryClinician('Dr. Deepak Kumar Bhardwaj');
    setIsNewPatientModalOpen(false);
  };

  // Handler for logging a new timeline entry
  const handleAddTimelineEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newTlTitle.trim() || !newTlSummary.trim()) {
      alert('Please provide a title and clinical summary for the timeline entry.');
      return;
    }

    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} · ${now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

    const newEntry: TimelineEvent = {
      id: `tl_${Date.now()}`,
      dateTime: dateStr,
      author: newTlAuthor || 'Dr. Sarah Jenkins',
      eventType: newTlEventType,
      title: newTlTitle,
      summary: newTlSummary,
      outcome: newTlOutcome.trim() || undefined,
      nextAction: newTlNextAction.trim() || undefined,
      status: newTlStatus.trim() || 'Completed'
    };

    const currentTl = selectedPatient.timeline || [];
    const updatedTl = [newEntry, ...currentTl];

    await onUpdatePatient(selectedPatient.id, {
      timeline: updatedTl
    });

    // Reset modal
    setNewTlTitle('');
    setNewTlSummary('');
    setNewTlOutcome('');
    setNewTlNextAction('');
    setNewTlStatus('Completed');
    setShowAddTimelineModal(false);
  };

  // Real File Upload handlers with Image Compression
  const processUploadedFile = async (file: File) => {
    if (!selectedPatient) return;

    try {
      setIsUploadingFile(true);
      setUploadError('');
      if (file.size > 15 * 1024 * 1024) throw new Error('This file is larger than 15 MB. Choose a smaller file.');
      const isImg = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp)$/i);
      let content = '';
      let sizeStr = '';

      if (isImg) {
        const stats = await compressImageFile(file);
        content = stats.compressedDataUrl;
        sizeStr = `${stats.compressedSizeKB} KB (${stats.savingsPercentage}% saved)`;
      } else {
        content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      let type: 'pdf' | 'jpg' | 'png' | 'doc' = 'pdf';
      if (['jpg', 'jpeg'].includes(extension)) type = 'jpg';
      else if (extension === 'png') type = 'png';
      else if (extension === 'doc' || extension === 'docx') type = 'doc';

      await onAddFile(selectedPatient.id, {
        name: file.name,
        type: type,
        size: sizeStr,
        content: content
      });

      // Update selectedPatient's file list locally for instant feedback
      setSelectedPatient(prev => {
        if (!prev) return null;
        const newFile: PatientFile = {
          id: `f_${Date.now()}`,
          name: file.name,
          type: type,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          size: sizeStr,
          content: content
        };
        return {
          ...prev,
          files: [newFile, ...(prev.files || [])]
        };
      });
    } catch (err: any) {
      setUploadError(err.message || 'The file could not be uploaded.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPatient || !e.target.files || e.target.files.length === 0) return;
    processUploadedFile(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!selectedPatient || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    processUploadedFile(e.dataTransfer.files[0]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleLocalDeleteFile = async (fileId: string) => {
    if (!selectedPatient) return;
    await onDeleteFile(selectedPatient.id, fileId);
    setSelectedPatient(prev => {
      if (!prev) return null;
      return {
        ...prev,
        files: prev.files.filter(f => f.id !== fileId)
      };
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-container-highest/20 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
            Patients
          </h2>
          <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
            Search for a patient, then choose the next action.
          </p>
        </div>
        <button
          onClick={() => setShowBookingModal(true)}
          className="w-full sm:w-auto bg-primary text-white font-bold text-sm px-6 py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 duration-200 shrink-0"
        >
          <span className="material-symbols-outlined text-sm">calendar_add_on</span>
          Book new appointment
        </button>
      </div>

      {/* Focused workspace controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-surface-container-highest/70 bg-surface-container-lowest px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full overflow-x-auto rounded-xl bg-surface-container-low p-1 sm:w-auto">
          {[
            { id: 'active', label: 'Active' },
            { id: 'archived', label: 'Archived' },
            { id: 'all', label: 'All records' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setArchiveFilter(filter.id as typeof archiveFilter)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                archiveFilter === filter.id ? 'bg-surface text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="hidden text-xs font-semibold text-on-surface-variant md:block">{filteredPatients.length} patients</span>
          <label className="flex items-center gap-1.5 rounded-lg border border-surface-container-highest px-2.5 py-2 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">sort</span>
            <select aria-label="Sort patients" value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="bg-transparent font-bold text-on-surface outline-none cursor-pointer">
              <option value="priority">Priority</option>
              <option value="name">Name</option>
              <option value="status">Care status</option>
            </select>
          </label>
          <div className="flex rounded-lg border border-surface-container-highest bg-surface-container-low p-0.5" aria-label="Patient view">
            {[
              { id: 'grid', icon: 'grid_view', label: 'Grid view' },
              { id: 'list', icon: 'view_list', label: 'List view' },
              { id: 'compact', icon: 'view_compact', label: 'Compact view' }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setPatientView(view.id as typeof patientView)}
                title={view.label}
                aria-label={view.label}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${patientView === view.id ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-base">{view.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scan-friendly patient records */}
      <div className={patientView === 'list' ? 'space-y-2' : patientView === 'compact' ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'}>
        {filteredPatients.map(p => {
          // Determine status color theme
          let statusStyle = 'bg-secondary/10 text-secondary border-secondary/20';
          if (p.status === 'Consultation') statusStyle = 'bg-surface-container text-on-surface-variant border-surface-container-highest';
          else if (p.status === 'Fabrication') statusStyle = 'bg-primary/10 text-primary border-primary/20';
          else if (p.status === 'New Referral') statusStyle = 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300';
          else if (p.status === 'Archived') statusStyle = 'bg-surface-container text-on-surface-variant/60 border-surface-container-highest';

          // Contextual patient info lookups
          const patientAppts = appointments.filter(a => a.patientName.toLowerCase() === p.name.toLowerCase());
          const nextAppt = patientAppts[0];
          const patientAuth = authorizations.find(a => a.patientName.toLowerCase() === p.name.toLowerCase());
          
          const activeDevice = patientAuth?.device || (
            p.id === 'p1' ? 'Custom Bilateral AFO' :
            p.id === 'p2' ? 'Transfemoral Prosthesis' :
            p.id === 'p3' ? 'TLSO Spinal Orthosis' :
            p.id === 'p4' ? 'Custom AFO Left' : 'Custom Orthosis / Device'
          );

          const isMenuOpen = openCardMenuId === p.id;

          if (patientView === 'list') {
            return (
              <div key={p.id} onClick={() => { setSelectedPatient(p); setActiveProfileTab('info'); }} className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-surface-container-highest/70 bg-surface-container-lowest px-3 py-3 transition-all hover:border-secondary/50 hover:shadow-sm sm:grid-cols-[auto_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(140px,1fr)_auto]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary/10 text-xs font-black text-secondary">
                  {p.avatarUrl ? <img className="h-full w-full object-cover" alt={p.name} src={p.avatarUrl} referrerPolicy="no-referrer" /> : <span>{p.avatarInitials}</span>}
                </div>
                <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-black text-on-surface">{p.name}</h3>{p.important && <span className="material-symbols-outlined text-sm font-black text-amber-600">priority_high</span>}</div><p className="mt-0.5 font-mono text-[10px] font-semibold text-on-surface-variant">{p.mrn}</p></div>
                <div className="hidden min-w-0 sm:block"><p className="truncate text-xs font-bold text-on-surface">{p.deviceCategory || activeDevice}</p><p className="mt-0.5 text-[10px] text-on-surface-variant">{p.primaryClinician || 'Dr. Sarah Jenkins'}</p></div>
                <div className="hidden min-w-0 sm:block"><p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Next step</p><p className="truncate text-xs font-semibold text-on-surface">{p.nextAppointment || (nextAppt ? nextAppt.time : 'No visit scheduled')}</p></div>
                <div className="flex items-center gap-2"><span className={`hidden rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide sm:block ${statusStyle}`}>{p.status}</span><span className="material-symbols-outlined text-base text-on-surface-variant transition-transform group-hover:translate-x-0.5">arrow_forward</span></div>
              </div>
            );
          }

          if (patientView === 'compact') {
            return (
              <div key={p.id} onClick={() => { setSelectedPatient(p); setActiveProfileTab('info'); }} className="group flex cursor-pointer items-center gap-3 rounded-xl border border-surface-container-highest/70 bg-surface-container-lowest px-3 py-2.5 transition-all hover:border-secondary/50 hover:shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary/10 text-[11px] font-black text-secondary">{p.avatarUrl ? <img className="h-full w-full object-cover" alt={p.name} src={p.avatarUrl} referrerPolicy="no-referrer" /> : p.avatarInitials}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><h3 className="truncate text-xs font-black text-on-surface">{p.name}</h3>{p.important && <span className="material-symbols-outlined text-xs font-black text-amber-600">priority_high</span>}</div><p className="mt-0.5 truncate text-[10px] text-on-surface-variant">{p.careStage || p.status} · {p.nextAppointment || (nextAppt ? nextAppt.time : 'No visit')}</p></div>
                <span className={`h-2 w-2 shrink-0 rounded-full ${p.blockerBadge ? 'bg-amber-500' : p.status === 'Archived' ? 'bg-surface-container-highest' : 'bg-emerald-500'}`} title={p.blockerBadge || p.status} />
              </div>
            );
          }

          return (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPatient(p);
                setActiveProfileTab('info');
              }}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-highest/70 cursor-pointer hover:border-secondary/60 hover:shadow-md transition-all group flex flex-col justify-between relative min-h-[218px] space-y-4"
            >
              {/* Card Header: Avatar, Name, MRN, Status */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-black text-sm overflow-hidden shrink-0 border border-secondary/20">
                      {p.avatarUrl ? (
                        <img
                          className="w-full h-full object-cover"
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          src={p.avatarUrl}
                        />
                      ) : p.id === 'p4' ? (
                        <img
                          className="w-full h-full object-cover"
                          alt="Eleanor Vance"
                          referrerPolicy="no-referrer"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrDX68ppEAqs_qFiQjVZ-pjvW7nzC-y8ew8jUnTQi7M9LMden4EQEWwD2_PRQqRVHVV3n7ttr8RpOpeaz60eJLFdqbjCSOnjD8r_W0OjndDWD52zlRvf8D_DEfPtq6gyyyu7r8kvL-YqlXnRZscJ8nufW2zl8p2wwoAcWoy8h0qLy227ryQ2OwvXAQsDdt9aZluBpQRPTd0bCQV8WFXtfOpEXnI3cOUsvRMaqWGuJVo9o1eJdyf4mpZg"
                        />
                      ) : (
                        <span>{p.avatarInitials}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-on-surface group-hover:text-secondary transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                        <p className="text-[10.5px] font-extrabold text-on-surface-variant font-mono mt-0.5">
                        MRN: {p.mrn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${statusStyle}`}>
                      {p.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant"><span className="material-symbols-outlined text-xs">call</span> Phone</p>
                      <p className="mt-0.5 truncate text-xs font-bold text-on-surface">{p.phone || 'Not provided'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant"><span className="material-symbols-outlined text-xs">mail</span> Email</p>
                      <p className="mt-0.5 truncate text-xs font-bold text-on-surface">{p.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-surface-container pt-3 text-xs">
                    <span className="text-on-surface-variant"><strong className="font-bold">DOB:</strong> {p.dob || 'Not provided'}</span>
                    <span className="truncate text-on-surface-variant"><strong className="font-bold">Address:</strong> {p.address || 'Not provided'}</span>
                  </div>
                  {!p.files?.length && <p className="truncate text-[10px] font-bold text-amber-700 dark:text-amber-400">Document upload pending</p>}
                  {p.blockerBadge && <p className="truncate text-[10px] font-bold text-amber-700 dark:text-amber-400">Attention: {p.blockerBadge}</p>}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-surface-container/60 pt-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      setEmailPatient(p);
                    }}
                    disabled={!p.email}
                    title={p.email ? `Email ${p.name}` : 'No email address'}
                    aria-label={p.email ? `Email ${p.name}` : 'No email address'}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 text-secondary transition-colors hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-base">mail</span>
                  </button>
                  <button
                    onClick={event => { event.stopPropagation(); setSmsPatient(p); }}
                    disabled={!p.phone}
                    title={p.phone ? `Text ${p.name}` : 'No phone number'}
                    aria-label={p.phone ? `Text ${p.name}` : 'No phone number'}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-base">sms</span>
                  </button>
                </div>

                {/* Overflow Menu Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenCardMenuId(isMenuOpen ? null : p.id);
                    }}
                    title="Patient Record Actions"
                    className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-base font-bold">more_vert</span>
                  </button>

                  {/* Popover Dropdown */}
                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 bottom-8 w-48 bg-surface-container-lowest border border-surface-container-highest rounded-2xl shadow-lg z-30 py-2 animate-fade-in text-xs font-semibold"
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          setOpenCardMenuId(null);
                          await onUpdatePatient(p.id, { important: !p.important });
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-on-surface transition-colors hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-sm text-amber-600">priority_high</span>
                        {p.important ? 'Remove from Needs attention' : 'Mark as Important'}
                      </button>

                      <button
                        onClick={() => {
                          setOpenCardMenuId(null);
                          setSelectedPatient(p);
                          setActiveProfileTab('info');
                          setIsEditingInfo(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface-container flex items-center gap-2 text-on-surface cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm text-on-surface-variant">edit</span>
                        Edit Demographics
                      </button>

                      <button
                        onClick={async () => {
                          setOpenCardMenuId(null);
                          const newStatus = p.status === 'Archived' ? 'In Progress' : 'Archived';
                          await onUpdatePatient(p.id, { ...p, status: newStatus });
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface-container flex items-center gap-2 text-on-surface cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm text-on-surface-variant">
                          {p.status === 'Archived' ? 'unarchive' : 'archive'}
                        </span>
                        {p.status === 'Archived' ? 'Restore Patient' : 'Archive Patient'}
                      </button>

                      <div className="border-t border-surface-container-highest/40 my-1" />

                      <button
                        onClick={() => {
                          setOpenCardMenuId(null);
                          setDeleteModalPatient(p);
                          setDeleteConfirmInput('');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-primary-container/20 text-primary font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">delete_forever</span>
                        Permanent Delete...
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredPatients.length === 0 && (
          <div className="col-span-full text-center py-12 bg-surface-container-lowest rounded-3xl border border-dashed border-surface-container-highest">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-50 mb-3">
              folder_open
            </span>
            <p className="text-on-surface-variant font-bold text-sm">No patients found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD NEW PATIENT */}
      {false && isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur" onClick={() => setIsNewPatientModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-5 flex justify-between items-center border-b border-surface-container-highest bg-surface-bright">
              <div>
                <h2 className="text-lg font-extrabold text-on-surface">New patient</h2>
                <p className="text-xs text-on-surface-variant font-semibold mt-0.5">
                  Start with the basics. You can add more details later.
                </p>
              </div>
              <button
                onClick={() => setIsNewPatientModalOpen(false)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePatientSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-base font-bold text-on-surface">Full name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/40"
                  placeholder="e.g., Sarah Connor"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-base font-bold text-on-surface">Phone number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/40"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-base font-bold text-on-surface">Date of birth</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={e => setNewDob(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm text-on-surface focus:border-secondary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-base font-bold text-on-surface">Email address <span className="font-normal text-on-surface-variant">(optional)</span></label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/40"
                  placeholder="sarah@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-base font-bold text-on-surface">Reason for visit <span className="font-normal text-on-surface-variant">(optional)</span></label>
                <select
                  value={newReferral}
                  onChange={e => setNewReferral(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all text-on-surface"
                >
                  <option value="">Select a reason...</option>
                  {REASONS_FOR_VISIT.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                <label className="text-base font-bold text-on-surface">Insurance provider <span className="font-normal text-on-surface-variant">(optional)</span></label>
                  <input
                    type="text"
                    value={newInsuranceCompany}
                    onChange={e => setNewInsuranceCompany(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/40"
                    placeholder="e.g., Medicare Blue Cross"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-base font-bold text-on-surface">Primary clinician</label>
                  <select
                    value={newPrimaryClinician}
                    onChange={e => setNewPrimaryClinician(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all text-on-surface"
                  >
                            <option value="Dr. Deepak Kumar Bhardwaj">Dr. Deepak Kumar Bhardwaj</option>
                            <option value="Dr. Blake Jackson Sanders">Dr. Blake Jackson Sanders</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-surface-container-highest flex justify-end gap-3 bg-surface-bright">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border-2 border-surface-container-highest text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                  Save patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBookingModal && (
        <BookAppointmentModal
          patients={patients}
          onAddPatient={onAddPatient}
          onAddAppointment={onAddAppointment}
          onViewPatient={(patient) => {
            setShowBookingModal(false);
            setSelectedPatient(patient);
            setActiveProfileTab('info');
          }}
          onClose={() => setShowBookingModal(false)}
        />
      )}

      {isNewPatientModalOpen && (
        <BookAppointmentModal
          patients={patients}
          onAddPatient={onAddPatient}
          onAddAppointment={onAddAppointment}
          onViewPatient={(patient) => {
            setIsNewPatientModalOpen(false);
            setSelectedPatient(patient);
            setActiveProfileTab('info');
          }}
          includeAppointment={false}
          onClose={() => setIsNewPatientModalOpen(false)}
        />
      )}

      {/* MODAL 2: PATIENT PROFILE (Eleanor Vance Setup, Image 5) */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-5 bg-on-surface/40 modal-backdrop-blur" onClick={() => setSelectedPatient(null)}>
          <div className="bg-surface-container-lowest w-full max-w-6xl rounded-2xl shadow-xl relative flex flex-col max-h-[94vh] overflow-hidden" onClick={(event) => event.stopPropagation()}>
            {/* Close trigger */}
            <button
              onClick={() => setSelectedPatient(null)}
              aria-label="Close patient profile"
              className="absolute top-4 right-4 w-9 h-9 bg-surface-container-low rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors z-10 cursor-pointer"
            >
              <span className="material-symbols-outlined font-bold text-sm">close</span>
            </button>

            {/* Focused patient identity and clinical summary */}
            <div className="px-5 pt-5 pb-4 pr-16 border-b border-surface-container-highest bg-surface-container-lowest space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-surface-container-highest shadow-2xs shrink-0 bg-surface-container-high flex items-center justify-center font-black">
                  {selectedPatient.avatarUrl ? (
                    <img
                      className="w-full h-full object-cover"
                      alt={selectedPatient.name}
                      referrerPolicy="no-referrer"
                      src={selectedPatient.avatarUrl}
                    />
                  ) : selectedPatient.id === 'p4' ? (
                    <img
                      className="w-full h-full object-cover"
                      alt="Eleanor Vance"
                      referrerPolicy="no-referrer"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrDX68ppEAqs_qFiQjVZ-pjvW7nzC-y8ew8jUnTQi7M9LMden4EQEWwD2_PRQqRVHVV3n7ttr8RpOpeaz60eJLFdqbjCSOnjD8r_W0OjndDWD52zlRvf8D_DEfPtq6gyyyu7r8kvL-YqlXnRZscJ8nufW2zl8p2wwoAcWoy8h0qLy227ryQ2OwvXAQsDdt9aZluBpQRPTd0bCQV8WFXtfOpEXnI3cOUsvRMaqWGuJVo9o1eJdyf4mpZg"
                    />
                  ) : (
                    <span className="text-sm text-on-surface-variant">{selectedPatient.avatarInitials}</span>
                  )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg font-black text-on-surface tracking-tight leading-tight truncate">
                        {selectedPatient.name}
                      </h1>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedPatient.status === 'Archived'
                          ? 'bg-surface-container text-on-surface-variant'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      }`}>
                        {selectedPatient.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${careStages.find(stage => stage.value === selectedPatient.careStage)?.color || 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                        {careStages.find(stage => stage.value === selectedPatient.careStage)?.label || 'Current stage not set'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                      <span className="font-mono">MRN {selectedPatient.mrn}</span>
                      <span aria-hidden="true">•</span>
                      <span>DOB {selectedPatient.dob || 'Not provided'}</span>
                      <span aria-hidden="true">•</span>
                      <span>{selectedPatient.phone || 'No phone'}</span>
                      <span className="truncate max-w-[260px]">{selectedPatient.email || 'No email'}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-surface-container-low px-4 py-3 min-w-0">
                  <span className="block text-sm font-bold text-on-surface-variant">Patient record</span>
                  <p className="mt-1 text-base font-bold text-on-surface">Basic information</p>
                </div>
              </div>

            </div>

            {/* One patient menu: every section stays in one predictable horizontal line. */}
            <nav className="px-4 flex gap-1 border-b border-surface-container-highest bg-surface-container-lowest shrink-0 overflow-x-auto select-none" aria-label="Patient profile sections">
              {[
                { id: 'info', label: 'Patient information', icon: 'contact_page' },
                { id: 'appointments', label: 'Visits', icon: 'calendar_month' },
                { id: 'documents', label: 'Files', icon: 'folder_open' },
                { id: 'authorization', label: 'Insurance', icon: 'verified_user' },
                { id: 'billing', label: 'Payments', icon: 'receipt_long' },
                { id: 'timeline', label: 'Overview', icon: 'space_dashboard' },
                { id: 'notes', label: 'Notes', icon: 'edit_note' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveProfileTab(tab.id)}
                  className={`px-3 py-2.5 font-bold text-[11px] transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeProfileTab === tab.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-surface">
              {activeProfileTab === 'timeline' || activeProfileTab === 'story' ? (
                <PatientTimeline
                  patient={selectedPatient}
                  appointments={appointments}
                  authorizations={authorizations}
                  claims={claims}
                  onNavigateTab={(tabId) => setActiveProfileTab(tabId)}
                  onAddTimelineEntry={async (entry) => {
                    const currentTl = selectedPatient.timeline || [];
                    const newEntry: TimelineEvent = {
                      id: `tl_${Date.now()}`,
                      ...entry
                    };
                    await onUpdatePatient(selectedPatient.id, {
                      timeline: [newEntry, ...currentTl]
                    });
                  }}
                />
              ) : activeProfileTab === 'documents' ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Checklist & Upload Card Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Checklist column */}
                    <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/20">
                      <h2 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg fill">fact_check</span>
                        Intake Requirements
                      </h2>
                      <div className="space-y-3">
                        {/* Requirement 1 */}
                        <label className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low cursor-pointer transition-all border border-surface-container-highest/40">
                          <input
                            type="checkbox"
                            checked={checklist.prescription}
                            onChange={() => setChecklist(prev => ({ ...prev, prescription: !prev.prescription }))}
                            className="w-5 h-5 rounded-md border-2 border-outline text-primary focus:ring-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-on-surface truncate">
                              Valid Prescription (Rx) Received
                            </span>
                            <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5">
                              Signed by Dr. Aris Thorne on Oct 12, 2023
                            </span>
                          </div>
                        </label>

                        {/* Requirement 2 */}
                        <label className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low cursor-pointer transition-all border border-surface-container-highest/40">
                          <input
                            type="checkbox"
                            checked={checklist.clinicalRecords}
                            onChange={() => setChecklist(prev => ({ ...prev, clinicalRecords: !prev.clinicalRecords }))}
                            className="w-5 h-5 rounded-md border-2 border-outline text-primary focus:ring-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-on-surface truncate">
                              Clinical Records Received
                            </span>
                            <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5">
                              Surgical notes from Orthopedic dept.
                            </span>
                          </div>
                        </label>

                        {/* Requirement 3 (LMN Required) */}
                        <label className={`flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low cursor-pointer transition-all border ${
                          !checklist.lmn 
                            ? 'border-primary-container/20 bg-primary/5' 
                            : 'border-surface-container-highest/40'
                        }`}>
                          <input
                            type="checkbox"
                            checked={checklist.lmn}
                            onChange={() => setChecklist(prev => ({ ...prev, lmn: !prev.lmn }))}
                            className="w-5 h-5 rounded-md border-2 border-outline text-primary focus:ring-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-on-surface truncate">
                              LMN (Letter of Medical Necessity)
                            </span>
                            <span className={`block text-[10px] font-bold mt-0.5 ${!checklist.lmn ? 'text-primary' : 'text-on-surface-variant'}`}>
                              {!checklist.lmn ? 'Pending physician signature. Required before fabrication.' : 'Completed and signed.'}
                            </span>
                          </div>
                          {!checklist.lmn && (
                            <span className="px-2 py-0.5 bg-primary text-white rounded-full text-[9px] font-bold shrink-0">
                              Required
                            </span>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Right column: Drag File action box */}
                    <div
                      onClick={triggerFileInput}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`bg-surface-container-low hover:bg-surface-container-high rounded-2xl p-5 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all cursor-pointer group ${
                        isDragging ? 'border-primary bg-primary/5 scale-105' : 'border-outline-variant hover:border-secondary'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      {isUploadingFile && <p className="text-xs font-bold text-primary mb-3">Uploading securely…</p>}
                      {uploadError && <p className="text-xs font-semibold text-red-700 mb-3" role="alert">{uploadError}</p>}
                      <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-xl text-on-secondary-container">cloud_upload</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-on-surface mb-1">Upload File</h3>
                      <p className="text-[10px] font-semibold text-on-surface-variant leading-relaxed mb-4">
                        Drag and drop PDFs, JPGs, or scan directly.
                      </p>
                      <button disabled={isUploadingFile} className="w-full py-2.5 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50">
                        <span className="material-symbols-outlined text-xs">add</span>
                        {isUploadingFile ? 'Uploading…' : 'Select a file'}
                      </button>
                    </div>
                  </div>

                  {/* Bottom: Patient File Grid */}
                  <div>
                    <h2 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg">folder_open</span>
                      Files for {selectedPatient.name}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedPatient.files && selectedPatient.files.length > 0 ? (
                        selectedPatient.files.map((file: PatientFile) => (
                          <div
                            key={file.id}
                            className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-surface-container-highest/60 group relative flex flex-col justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                file.type === 'pdf' ? 'bg-primary-container/15 text-primary' : 'bg-secondary-container/20 text-on-secondary-container'
                              }`}>
                                {file.type.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-on-surface truncate" title={file.name}>
                                  {file.name}
                                </h4>
                                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                                  {file.date} • {file.size}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-surface-container/30">
                              <button
                                onClick={() => setViewingFile(file)}
                                className="flex-1 py-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">visibility</span> View
                              </button>
                              <button
                                onClick={() => handleLocalDeleteFile(file.id)}
                                aria-label="Delete File"
                                className="p-1.5 text-primary hover:bg-primary-container/10 rounded-full transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm font-bold">delete</span>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-8 text-center text-on-surface-variant text-xs font-semibold">
                          No files uploaded for this patient yet. Use the upload box above to add some!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeProfileTab === 'info' ? (
                <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                  <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest/20">
                    <div>
                      <h2 className="text-sm font-black text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">contact_page</span>
                        Patient Demographics & Clinical Profile
                      </h2>
                      <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5">
                        Manage HIPAA-compliant records, insurance verification, and address details.
                      </p>
                    </div>
                    <button
                      id="toggle-edit-info-btn"
                      onClick={() => setIsEditingInfo(!isEditingInfo)}
                      className="px-4 py-1.5 rounded-full bg-secondary text-white text-xs font-bold flex items-center gap-1.5 hover:bg-secondary-container transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {isEditingInfo ? 'visibility' : 'edit'}
                      </span>
                      {isEditingInfo ? 'Cancel / View' : 'Edit Demographics'}
                    </button>
                  </div>

                  {isEditingInfo ? (
                    <form
                      id="edit-patient-info-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await onUpdatePatient(selectedPatient.id, {
                          name: editInfoName,
                          phone: editInfoPhone,
                          dob: editInfoDob,
                          email: editInfoEmail,
                          referralSource: editInfoReferralSource,
                          status: editInfoStatus,
                          careStage: editInfoCareStage,
                          insuranceCompany: editInfoInsuranceCompany,
                          insuranceId: editInfoInsuranceId,
                          address: editInfoAddress,
                          gender: editInfoGender,
                          avatarUrl: editInfoAvatarUrl
                        });
                        setIsEditingInfo(false);
                      }}
                      className="bg-surface-container-lowest rounded-lg p-6 border border-surface-container-highest/40 space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                          <input
                            type="text"
                            required
                            value={editInfoName}
                            onChange={(e) => setEditInfoName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Phone Number</label>
                          <input
                            type="text"
                            value={editInfoPhone}
                            onChange={(e) => setEditInfoPhone(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Date of Birth</label>
                          <input
                            type="date"
                            value={editInfoDob}
                            onChange={(e) => setEditInfoDob(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                          <input
                            type="email"
                            value={editInfoEmail}
                            onChange={(e) => setEditInfoEmail(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Referral Source</label>
                          <select
                            value={editInfoReferralSource}
                            onChange={(e) => setEditInfoReferralSource(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          >
                            {REASONS_FOR_VISIT.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Current care stage</label>
                          <select
                            value={editInfoCareStage}
                            onChange={(e) => setEditInfoCareStage(e.target.value as Patient['careStage'])}
                            className={`w-full px-4 py-2.5 rounded-md border text-xs font-semibold focus:border-primary outline-none ${careStages.find(stage => stage.value === editInfoCareStage)?.color || ''}`}
                          >
                            {careStages.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Workflow Status</label>
                          <select
                            value={editInfoStatus}
                            onChange={(e) => setEditInfoStatus(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Consultation">Consultation</option>
                            <option value="Fabrication">Fabrication</option>
                            <option value="New Referral">New Referral</option>
                            <option value="Waiting for Rx">Waiting for Rx</option>
                            <option value="Ready for Auth">Ready for Auth</option>
                            <option value="Auth Pending">Auth Pending</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Gender</label>
                          <select
                            value={editInfoGender}
                            onChange={(e) => setEditInfoGender(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Not specified">Not specified</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Insurance Carrier</label>
                          <input
                            type="text"
                            placeholder="e.g. Medicare Blue Cross"
                            value={editInfoInsuranceCompany}
                            onChange={(e) => setEditInfoInsuranceCompany(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Member ID / Insurance ID</label>
                          <input
                            type="text"
                            placeholder="e.g. MB-9283-X"
                            value={editInfoInsuranceId}
                            onChange={(e) => setEditInfoInsuranceId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Primary Address</label>
                          <input
                            type="text"
                            placeholder="123 Clinical Street, Apt 101"
                            value={editInfoAddress}
                            onChange={(e) => setEditInfoAddress(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Profile Image</label>
                          <div className="flex items-center gap-4">
                            <input
                              type="text"
                              placeholder="Paste a profile image URL, or click 'Browse' to upload"
                              value={editInfoAvatarUrl}
                              onChange={(e) => setEditInfoAvatarUrl(e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                            />
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setEditInfoAvatarUrl(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                                id="avatar-file-input"
                              />
                              <label
                                htmlFor="avatar-file-input"
                                className="px-4 py-2.5 rounded-md bg-surface border border-surface-container-highest text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                              >
                                <span className="material-symbols-outlined text-sm">upload</span>
                                Browse...
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-surface-container flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingInfo(false)}
                          className="px-5 py-2 rounded-md border border-surface-container-highest text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Demographics Card */}
                      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/40 space-y-4">
                        <h3 className="text-xs font-black text-on-surface flex items-center gap-1.5 border-b border-surface-container pb-2">
                          <span className="material-symbols-outlined text-secondary text-sm">person</span>
                          General Profile
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">MRN:</span>
                            <span className="font-mono bg-surface-container-low px-2 py-0.5 rounded-md font-bold text-on-surface">{selectedPatient.mrn}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Gender:</span>
                            <span className="font-semibold text-on-surface">{selectedPatient.gender || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Email:</span>
                            <span className="font-semibold text-on-surface break-all">{selectedPatient.email || 'No email registered'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Phone:</span>
                            <span className="font-semibold text-on-surface">{selectedPatient.phone || 'No phone registered'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Birth Date:</span>
                            <span className="font-semibold text-on-surface">{selectedPatient.dob || '01/01/1980'}</span>
                          </div>
                          <div className="flex justify-between items-start text-xs">
                            <span className="text-on-surface-variant font-bold shrink-0">Address:</span>
                            <span className="font-semibold text-on-surface text-right">{selectedPatient.address || 'No address registered'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Insurance & Status Card */}
                      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/40 space-y-4">
                        <h3 className="text-xs font-black text-on-surface flex items-center gap-1.5 border-b border-surface-container pb-2">
                          <span className="material-symbols-outlined text-secondary text-sm">shield</span>
                          Payer &amp; Referrals
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Insurance Carrier:</span>
                            <span className="font-semibold text-on-surface">{selectedPatient.insuranceCompany || 'No carrier verified'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Insurance Member ID:</span>
                            <span className="font-mono bg-surface-container-low px-2 py-0.5 rounded-md font-bold text-on-surface">{selectedPatient.insuranceId || 'Pending'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Primary Clinician:</span>
                            <span className="font-bold text-primary">{selectedPatient.primaryClinician || (selectedPatient.id === 'p2' || selectedPatient.id === 'p4' || selectedPatient.id === 'p6' || selectedPatient.id === 'p8' ? 'Dr. Aris Thorne' : 'Dr. Sarah Jenkins')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Workflow State:</span>
                            <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">{selectedPatient.status}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-bold">Referral Source:</span>
                            <span className="capitalize font-semibold text-on-surface">{selectedPatient.referralSource || 'Other'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeProfileTab === 'appointments' ? (
                <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Schedule Appointment Form */}
                    <div className="lg:col-span-1 bg-surface-container-lowest rounded-3xl p-5 border border-surface-container-highest/40 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-black text-on-surface flex items-center gap-1.5 border-b border-surface-container pb-2 mb-4">
                          <span className="material-symbols-outlined text-primary text-sm">edit_calendar</span>
                          Schedule Session
                        </h3>
                        <form
                          id="add-appointment-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newApptDate || !newApptTime) return;
                            await onAddAppointment({
                              patientName: selectedPatient.name,
                              time: newApptTime,
                              type: newApptType,
                              status: newApptStatus,
                              appt_date: newApptDate
                            });
                            // Reset
                            setNewApptDate('');
                            setNewApptTime('09:00 AM');
                          }}
                          className="space-y-3"
                        >
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Date</label>
                            <input
                              type="date"
                              required
                              value={newApptDate}
                              onChange={(e) => setNewApptDate(e.target.value)}
                              className="w-full px-4 py-2 bg-surface rounded-full border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Time</label>
                            <TimePicker value={newApptTime || '09:00 AM'} onChange={setNewApptTime} className="mt-1" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Session Type</label>
                            <select
                              value={newApptType}
                              onChange={(e) => setNewApptType(e.target.value)}
                              className="w-full px-4 py-2 bg-surface rounded-full border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                            >
                              <option value="Initial Consult">Initial Consult</option>
                              <option value="Device Fitting">Device Fitting</option>
                              <option value="Device Checkout">Device Checkout</option>
                              <option value="Gait Evaluation">Gait Evaluation</option>
                              <option value="Adjustment Session">Adjustment Session</option>
                              <option value="Follow-up">Follow-up</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</label>
                            <select
                              value={newApptStatus}
                              onChange={(e) => setNewApptStatus(e.target.value as any)}
                              className="w-full px-4 py-2 bg-surface rounded-full border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                            >
                              <option value="Scheduled">Scheduled</option>
                              <option value="Checked In">Checked In</option>
                            </select>
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2.5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-all cursor-pointer mt-4"
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                            Schedule Now
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Right Column: Appointments List */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-lg">calendar_today</span>
                        Scheduled Appointments ({appointments.filter(a => a.patientName === selectedPatient.name).length})
                      </h3>

                      <div className="space-y-3">
                        {appointments.filter(a => a.patientName === selectedPatient.name).length > 0 ? (
                          appointments
                            .filter(a => a.patientName === selectedPatient.name)
                            .map((appt) => (
                              <div
                                key={appt.id}
                                className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest/60 flex justify-between items-center shadow-xs hover:border-secondary transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-secondary-container/10 text-on-secondary-container flex items-center justify-center text-sm font-black">
                                    {appt.type[0] || 'C'}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-on-surface">{appt.type}</h4>
                                    <p className="text-[10px] font-semibold text-on-surface-variant mt-0.5 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-xs">schedule</span>
                                      {appt.time} • {appt.status}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                                    appt.status === 'Checked In'
                                      ? 'bg-secondary/10 text-secondary'
                                      : 'bg-primary/10 text-primary'
                                  }`}>
                                    {appt.status}
                                  </span>

                                  <button
                                    onClick={async () => {
                                      const nextStatus = appt.status === 'Scheduled' ? 'Checked In' : 'Scheduled';
                                      await onUpdateAppointment(appt.id, { status: nextStatus });
                                    }}
                                    title="Toggle Status"
                                    className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-sm">sync_alt</span>
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="bg-surface-container-lowest border border-dashed border-surface-container-highest/60 rounded-2xl p-8 text-center text-on-surface-variant text-xs font-bold">
                            No scheduled appointments for this patient. Use the form to schedule a session.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeProfileTab === 'authorization' ? (
                <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Submit Authorization Form */}
                    <div className="lg:col-span-1 bg-surface-container-lowest rounded-3xl p-5 border border-surface-container-highest/40">
                      <h3 className="text-xs font-black text-on-surface flex items-center gap-1.5 border-b border-surface-container pb-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-sm">verified_user</span>
                        Submit Request
                      </h3>
                      <form
                        id="add-auth-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newAuthDevice || !newAuthPayer) return;
                          await onAddAuth({
                            patientName: selectedPatient.name,
                            device: newAuthDevice,
                            payer: newAuthPayer,
                            notes: newAuthNotes
                          });
                          // Reset
                          setNewAuthDevice('');
                          setNewAuthPayer('');
                          setNewAuthNotes('');
                        }}
                        className="space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Device Spec</label>
                          <input
                            type="text"
                            placeholder="e.g. Custom Carbon KAFO"
                            required
                            value={newAuthDevice}
                            onChange={(e) => setNewAuthDevice(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-full border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Insurance Payer</label>
                          <input
                            type="text"
                            placeholder="e.g. Medicare Part B"
                            required
                            value={newAuthPayer}
                            onChange={(e) => setNewAuthPayer(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-full border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Clinical Justification Notes</label>
                          <textarea
                            rows={3}
                            placeholder="Add brief clinical reasoning..."
                            value={newAuthNotes}
                            onChange={(e) => setNewAuthNotes(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-all cursor-pointer mt-4"
                        >
                          <span className="material-symbols-outlined text-xs">send</span>
                          Submit Request
                        </button>
                      </form>
                    </div>

                    {/* Right Column: Authorizations List */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-lg">shield</span>
                        Insurance Authorizations ({authorizations.filter(a => a.patientName === selectedPatient.name).length})
                      </h3>

                      <div className="space-y-3">
                        {authorizations.filter(a => a.patientName === selectedPatient.name).length > 0 ? (
                          authorizations
                            .filter(a => a.patientName === selectedPatient.name)
                            .map((auth) => (
                              <div
                                key={auth.id}
                                className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest/60 shadow-xs hover:border-secondary transition-all space-y-3"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="text-xs font-bold text-on-surface">{auth.device}</h4>
                                    <p className="text-[10px] font-semibold text-on-surface-variant mt-0.5">
                                      Payer: {auth.payer} • Submitted {auth.submittedDate}
                                    </p>
                                  </div>
                                  <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full ${
                                    auth.status === 'Approved'
                                      ? 'bg-secondary/15 text-secondary'
                                      : auth.status === 'Denied'
                                      ? 'bg-primary/10 text-primary'
                                      : auth.status === 'Needs More Info'
                                      ? 'bg-cyan-500/10 text-cyan-700'
                                      : 'bg-amber-500/10 text-amber-700'
                                  }`}>
                                    {auth.status}
                                  </span>
                                </div>

                                {auth.authNumber && (
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface bg-surface p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-xs text-secondary">verified</span>
                                    <span>Auth Code: {auth.authNumber}</span>
                                  </div>
                                )}

                                {auth.notes && (
                                  <p className="text-[10px] italic text-on-surface-variant leading-relaxed">
                                    "{auth.notes}"
                                  </p>
                                )}
                              </div>
                            ))
                        ) : (
                          <div className="bg-surface-container-lowest border border-dashed border-surface-container-highest/60 rounded-2xl p-8 text-center text-on-surface-variant text-xs font-bold">
                            No prior authorization filings. Use the form to submit a new claim request.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeProfileTab === 'billing' ? (
                <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Create Claim / Invoice */}
                    <div className="lg:col-span-1 bg-surface-container-lowest rounded-3xl p-5 border border-surface-container-highest/40">
                      <h3 className="text-xs font-black text-on-surface flex items-center gap-1.5 border-b border-surface-container pb-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-sm">receipt_long</span>
                        Generate Invoice
                      </h3>
                      <form
                        id="add-claim-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newClaimPayer || !newClaimAmount) return;
                          await onAddClaim({
                            patientId: selectedPatient.id,
                            patientName: selectedPatient.name,
                            payer: newClaimPayer,
                            amount: newClaimAmount,
                            doctor: newClaimDoc || selectedPatient.primaryClinician || 'Dr. Sarah Jenkins',
                            serviceDescription: newClaimDescription || 'Orthotic and prosthetic clinical services',
                            repairDetails: newClaimDetails,
                            paymentMethod: newClaimPaymentMethod,
                            serviceTotal: Number(newClaimAmount) - Number(newClaimTip || 0),
                            gratuity: Number(newClaimTip || 0),
                            warrantyDays: Number(newClaimWarranty || 30),
                            sendInvoice: true
                          });
                          // Reset
                          setNewClaimPayer('');
                          setNewClaimAmount('');
                          setNewClaimDoc('');
                          setNewClaimDescription(''); setNewClaimDetails(''); setNewClaimPaymentMethod('Cash / Self-Pay'); setNewClaimTip(''); setNewClaimWarranty('30');
                        }}
                        className="space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Billing Payer</label>
                          <input
                            type="text"
                            placeholder="e.g. Self Pay / Medicare"
                            required
                            value={newClaimPayer}
                            onChange={(e) => setNewClaimPayer(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Service description</label>
                          <input type="text" placeholder="e.g. Prosthetic repair and house visit" value={newClaimDescription} onChange={e => setNewClaimDescription(e.target.value)} className="w-full px-4 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Repair / service details</label>
                          <textarea rows={2} placeholder="Optional details shown on the receipt" value={newClaimDetails} onChange={e => setNewClaimDetails(e.target.value)} className="w-full px-4 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Payment method<select value={newClaimPaymentMethod} onChange={e => setNewClaimPaymentMethod(e.target.value)} className="w-full mt-1 px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold outline-none"><option>Cash / Self-Pay</option><option>Credit / Debit Card</option><option>Insurance</option><option>Check</option><option>Other</option></select></label>
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tip / gratuity<input type="number" min="0" step="0.01" placeholder="0.00" value={newClaimTip} onChange={e => setNewClaimTip(e.target.value)} className="w-full mt-1 px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold outline-none" /></label>
                        </div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Workmanship warranty (days)<input type="number" min="0" value={newClaimWarranty} onChange={e => setNewClaimWarranty(e.target.value)} className="w-full mt-1 px-3 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold outline-none" /></label>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Invoice Amount ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 1250.00"
                            required
                            value={newClaimAmount}
                            onChange={(e) => setNewClaimAmount(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Billing Clinician</label>
                          <input
                            type="text"
                            placeholder="e.g. Dr. Sarah Jenkins"
                            value={newClaimDoc}
                            onChange={(e) => setNewClaimDoc(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-all cursor-pointer mt-4"
                        >
                          <span className="material-symbols-outlined text-xs">post_add</span>
                          Generate Invoice &amp; Email
                        </button>
                      </form>
                    </div>

                    {/* Right Column: Claims / Invoices List */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-lg">credit_card</span>
                        Invoices &amp; Claims ({claims.filter(c => c.patientName === selectedPatient.name).length})
                      </h3>

                      <div className="space-y-3">
                        {claims.filter(c => c.patientName === selectedPatient.name).length > 0 ? (
                          claims
                            .filter(c => c.patientName === selectedPatient.name)
                            .map((claim) => (
                              <div
                                key={claim.id}
                                className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest/60 flex justify-between items-center shadow-xs hover:border-secondary transition-all"
                              >
                                <div>
                                  <h4 className="text-xs font-bold text-on-surface">{claim.claimNumber}</h4>
                                  <p className="text-[10px] font-semibold text-on-surface-variant mt-0.5">
                                    Payer: {claim.payer} • {claim.date} • Clinician: {claim.doctor}
                                  </p>
                                </div>

                              <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-on-surface">
                                    ${claim.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full ${
                                    claim.status === 'Paid'
                                      ? 'bg-secondary/15 text-secondary'
                                      : claim.status === 'Denied'
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-blue-500/10 text-blue-700'
                                  }`}>
                                    {claim.status}
                                  </span>
                                </div>
                                <a
                                  href={`/api/claims/${claim.id}/invoice.pdf`}
                                  download={`${claim.claimNumber}.pdf`}
                                  className="px-2.5 py-1 rounded bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all text-[10px] font-bold"
                                >
                                  Download PDF
                                </a>
                              </div>
                            ))
                        ) : (
                          <div className="bg-surface-container-lowest border border-dashed border-surface-container-highest/60 rounded-2xl p-8 text-center text-on-surface-variant text-xs font-bold">
                            No billing history exists. Use the invoice generator to log new billing claims.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeProfileTab === 'notes' ? (
                <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Write Quick Progress Note */}
                    <div className="lg:col-span-1 bg-surface-container-lowest rounded-3xl p-5 border border-surface-container-highest/40 space-y-4">
                      <h3 className="text-xs font-black text-on-surface flex items-center gap-1.5 border-b border-surface-container pb-2">
                        <span className="material-symbols-outlined text-primary text-sm">history_edu</span>
                        Add Progress Note
                      </h3>
                      <form
                        id="add-clinical-note-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newNoteText.trim()) return;

                          const newNote: ClinicalNote = {
                            id: `note_${Date.now()}`,
                            date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            author: newNoteAuthor || 'Dr. Aris Thorne',
                            text: newNoteText,
                            isFinalized: true
                          };

                          const existingNotes = selectedPatient.clinicalNotes || [];
                          const updatedNotes = [newNote, ...existingNotes];

                          await onUpdatePatient(selectedPatient.id, {
                            clinicalNotes: updatedNotes
                          });

                          // Reset
                          setNewNoteText('');
                        }}
                        className="space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Note Content</label>
                          <textarea
                            rows={5}
                            required
                            placeholder="Enter clinical assessment, physical findings, SOAP comments, or prescription details..."
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            className="w-full px-4 py-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Clinician / Author</label>
                          <select
                            value={newNoteAuthor}
                            onChange={(e) => setNewNoteAuthor(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          >
                            <option value="Dr. Deepak Kumar Bhardwaj">Dr. Deepak Kumar Bhardwaj</option>
                            <option value="Dr. Blake Jackson Sanders">Dr. Blake Jackson Sanders</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-all cursor-pointer mt-2"
                        >
                          <span className="material-symbols-outlined text-xs">save</span>
                          Save Progress Note
                        </button>
                      </form>
                    </div>

                    {/* Right Column: Clinical Note Timeline */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-lg">description</span>
                        Clinical Progress Log ({selectedPatient.clinicalNotes?.length || 0})
                      </h3>

                      <div className="relative border-l border-surface-container-highest/60 ml-4 pl-6 space-y-6">
                        {selectedPatient.clinicalNotes && selectedPatient.clinicalNotes.length > 0 ? (
                          selectedPatient.clinicalNotes.map((note) => (
                            <div key={note.id} className="relative group">
                              {/* Timeline indicator node */}
                              <span className="absolute -left-10 top-1.5 w-7 h-7 rounded-full bg-surface-container border-2 border-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined text-xs text-primary font-bold">medical_information</span>
                              </span>

                              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest/60 shadow-xs hover:border-secondary transition-all space-y-3">
                                <div className="flex flex-wrap justify-between items-center border-b border-surface-container/50 pb-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-secondary">{note.author}</span>
                                    {note.visitType && (
                                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-extrabold rounded-md uppercase">
                                        {note.visitType}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {note.isFinalized && (
                                      <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[10px]">verified</span> Finalized
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold text-on-surface-variant">{note.date}</span>
                                  </div>
                                </div>

                                {/* Free Text or Structured SOAP view */}
                                {note.subjective || note.objective || note.assessment || note.plan ? (
                                  <div className="space-y-2 text-xs">
                                    {note.subjective && (
                                      <div className="bg-surface p-2.5 rounded-xl border border-surface-container">
                                        <span className="text-[10px] font-extrabold uppercase text-secondary block mb-0.5">Subjective</span>
                                        <p className="text-on-surface-variant font-medium leading-relaxed">{note.subjective}</p>
                                      </div>
                                    )}
                                    {note.objective && (
                                      <div className="bg-surface p-2.5 rounded-xl border border-surface-container">
                                        <span className="text-[10px] font-extrabold uppercase text-secondary block mb-0.5">Objective / Findings</span>
                                        <p className="text-on-surface-variant font-medium leading-relaxed">{note.objective}</p>
                                      </div>
                                    )}
                                    {note.assessment && (
                                      <div className="bg-surface p-2.5 rounded-xl border border-surface-container">
                                        <span className="text-[10px] font-extrabold uppercase text-secondary block mb-0.5">Assessment</span>
                                        <p className="text-on-surface-variant font-medium leading-relaxed">{note.assessment}</p>
                                      </div>
                                    )}
                                    {note.plan && (
                                      <div className="bg-surface p-2.5 rounded-xl border border-surface-container">
                                        <span className="text-[10px] font-extrabold uppercase text-secondary block mb-0.5">Plan</span>
                                        <p className="text-on-surface-variant font-medium leading-relaxed">{note.plan}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-on-surface-variant font-semibold leading-relaxed whitespace-pre-wrap">
                                    {note.text}
                                  </p>
                                )}

                                {/* Outcome & Device Footer */}
                                {(note.outcome || note.deviceDetails?.lCodes?.length || note.nextTask?.description) && (
                                  <div className="pt-2 border-t border-surface-container/60 flex flex-wrap gap-2 text-[10px]">
                                    {note.outcome && (
                                      <span className="bg-secondary/10 text-secondary font-bold px-2 py-0.5 rounded-md capitalize">
                                        Outcome: {note.outcome.replace('_', ' ')}
                                      </span>
                                    )}
                                    {note.deviceDetails?.lCodes && note.deviceDetails.lCodes.length > 0 && (
                                      <span className="bg-surface-container-high text-on-surface font-mono font-bold px-2 py-0.5 rounded-md">
                                        L-Codes: {note.deviceDetails.lCodes.join(', ')}
                                      </span>
                                    )}
                                    {note.nextTask?.description && (
                                      <span className="bg-amber-500/10 text-amber-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">task</span>
                                        Next: {note.nextTask.description} ({note.nextTask.dueDate})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="-ml-6 bg-surface-container-lowest border border-dashed border-surface-container-highest/60 rounded-2xl p-8 text-center text-on-surface-variant text-xs font-bold">
                            No clinical notes recorded yet. Use the note writer or start a guided visit flow.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center max-w-md mx-auto">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-60 mb-2">
                    construction
                  </span>
                  <h3 className="font-extrabold text-sm text-on-surface capitalize mb-1">
                    {activeProfileTab} Dashboard Mode
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    This subsection is sync'd live to Genfinity clinical state. Detailed logs can be generated using standard Export tool.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG NEW TIMELINE ACTIVITY ENTRY */}
      {showAddTimelineModal && selectedPatient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-surface/50 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col border border-surface-container-highest animate-fade-in">
            <div className="px-6 py-4 flex justify-between items-center border-b border-surface-container-highest bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">history_edu</span>
                <h3 className="text-sm font-black text-on-surface">Log Timeline Activity Entry</h3>
              </div>
              <button
                onClick={() => setShowAddTimelineModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs font-bold">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTimelineEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Event Type</label>
                  <select
                    value={newTlEventType}
                    onChange={(e) => setNewTlEventType(e.target.value as TimelineEventType)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                  >
                    <option value="visit">Visit / Consult</option>
                    <option value="note">Clinical Assessment</option>
                    <option value="order">Order / Rx Created</option>
                    <option value="authorization">Prior Auth Update</option>
                    <option value="fabrication">Lab Fabrication Update</option>
                    <option value="document">Document / Attachment</option>
                    <option value="payment">Billing / Claim</option>
                    <option value="message">Patient Message</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Author / Clinician</label>
                  <input
                    type="text"
                    value={newTlAuthor}
                    onChange={(e) => setNewTlAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                    placeholder="e.g. Dr. Sarah Jenkins"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Title / Headline</label>
                <input
                  type="text"
                  required
                  value={newTlTitle}
                  onChange={(e) => setNewTlTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                  placeholder="e.g. 22 Jul 2026 · Initial Evaluation & 3D Foot Scan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Short Clinical Summary</label>
                <textarea
                  rows={3}
                  required
                  value={newTlSummary}
                  onChange={(e) => setNewTlSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none resize-none"
                  placeholder="e.g. Assessment recorded • Custom foot orthosis prescribed and 3D digital impression captured."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Outcome (Optional)</label>
                  <input
                    type="text"
                    value={newTlOutcome}
                    onChange={(e) => setNewTlOutcome(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                    placeholder="e.g. Approved by insurer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Next Action (Optional)</label>
                  <input
                    type="text"
                    value={newTlNextAction}
                    onChange={(e) => setNewTlNextAction(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                    placeholder="e.g. Submit L-Code prior auth request"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setShowAddTimelineModal(false)}
                  className="px-4 py-2 rounded-full border border-surface-container-highest text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-secondary text-white text-xs font-bold rounded-full hover:bg-secondary/90 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">post_add</span>
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW FILE / PREVIEW IMAGE */}
      {viewingFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-surface/50 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 flex justify-between items-center border-b border-surface-container-highest bg-surface-bright">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-on-surface truncate">{viewingFile.name}</h3>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                  {viewingFile.date} • {viewingFile.size}
                </p>
              </div>
              <button
                onClick={() => setViewingFile(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs font-bold">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-surface-container-low flex items-center justify-center min-h-[300px]">
              {viewingFile.content ? (
                viewingFile.content.startsWith('data:image/') || viewingFile.type === 'jpg' || viewingFile.type === 'png' ? (
                  <img
                    src={viewingFile.content}
                    alt={viewingFile.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm border border-surface-container-highest"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center p-8 bg-surface-container-lowest rounded-2xl border border-surface-container-highest/50 max-w-sm">
                    <span className="material-symbols-outlined text-4xl text-primary mb-3">description</span>
                    <h4 className="font-extrabold text-sm text-on-surface mb-1">Document Content Loaded</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                      This PDF file structure is stored securely on the live clinical database.
                    </p>
                    <a
                      href={viewingFile.content}
                      download={viewingFile.name}
                      className="px-5 py-2 bg-secondary text-white text-xs font-bold rounded-full hover:bg-secondary-container transition-colors shadow-sm inline-block"
                    >
                      Download File
                    </a>
                  </div>
                )
              ) : (
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40 mb-3">
                    {viewingFile.type === 'pdf' ? 'picture_as_pdf' : 'image'}
                  </span>
                  <h4 className="font-bold text-sm text-on-surface mb-1">Pre-Seeded Sample Document</h4>
                  <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
                    This document record represents an existing medical archive for {selectedPatient.name}. Real uploads will show direct visual rendering.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADMIN SECURITY CONFIRMATION FOR PERMANENT DELETE */}
      {deleteModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl p-6 border border-primary/30 relative animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-2xl font-bold">warning</span>
            </div>
            <h3 className="text-lg font-black text-on-surface text-center mb-1">
              Admin Security Confirmation Required
            </h3>
            <p className="text-xs text-on-surface-variant font-semibold text-center mb-4">
              Permanent destruction of record for <span className="font-bold text-on-surface">{deleteModalPatient.name}</span> (MRN: {deleteModalPatient.mrn}).
            </p>

            <div className="bg-surface-container-low p-3.5 rounded-2xl mb-4 border border-surface-container-highest/40 text-[11px] text-on-surface-variant space-y-1">
              <p>• All clinical notes, appointments, and authorizations will be destroyed.</p>
              <p>• All uploaded prescriptions and PDF documents will be removed.</p>
              <p>• Action will be permanently logged in the HIPAA Security Audit Trail.</p>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                Type <span className="text-primary font-black">{deleteModalPatient.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteModalPatient.name}
                className="w-full px-4 py-2.5 bg-surface rounded-xl border border-primary/40 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalPatient(null);
                  setDeleteConfirmInput('');
                }}
                className="flex-1 py-2.5 rounded-full border border-surface-container-highest text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmInput.trim().toLowerCase() !== deleteModalPatient.name.trim().toLowerCase()}
                onClick={async () => {
                  const targetId = deleteModalPatient.id;
                  setDeleteModalPatient(null);
                  setDeleteConfirmInput('');
                  await onDeletePatient(targetId);
                }}
                className="flex-1 py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">delete_forever</span>
                Confirm Destruction
              </button>
            </div>
          </div>
        </div>
      )}

      {emailPatient && (
        <PatientEmailModal patient={emailPatient} onClose={() => setEmailPatient(null)} />
      )}
      {smsPatient && (
        <PatientSmsModal patient={smsPatient} onClose={() => setSmsPatient(null)} />
      )}
    </div>
  );
}
