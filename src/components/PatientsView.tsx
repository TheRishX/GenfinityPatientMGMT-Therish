import React, { useState, useEffect } from 'react';
import { Patient, PatientFile, Appointment, Authorization, Claim, ClinicalNote } from '../types';

interface PatientsViewProps {
  patients: Patient[];
  appointments: Appointment[];
  authorizations: Authorization[];
  claims: Claim[];
  searchTerm: string;
  onAddPatient: (patientData: any) => Promise<void>;
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
}

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
  setIsNewPatientModalOpen
}: PatientsViewProps) {
  // Active selected patient for profile modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [activeProfileTab, setActiveProfileTab] = useState<string>('documents');
  const [viewingFile, setViewingFile] = useState<PatientFile | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Appointments Tab States
  const [newApptDate, setNewApptDate] = useState('');
  const [newApptTime, setNewApptTime] = useState('');
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

  // Clinical Notes Tab States
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteAuthor, setNewNoteAuthor] = useState('Dr. Aris Thorne');

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
      setIsEditingInfo(false);
    }
  }, [selectedPatient?.id]);

  // Add Patient Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newReferral, setNewReferral] = useState('');

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
      (p.phone && p.phone.includes(term))
    );
    if (!matchesSearch) return false;

    if (archiveFilter === 'active') {
      return p.status !== 'Archived';
    } else if (archiveFilter === 'archived') {
      return p.status === 'Archived';
    }
    return true;
  });

  // Handle saving new patient
  const handleSavePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await onAddPatient({
      name: newName,
      phone: newPhone,
      dob: newDob,
      email: newEmail,
      referralSource: newReferral,
      status: 'In Progress'
    });

    // Reset Form
    setNewName('');
    setNewPhone('');
    setNewDob('');
    setNewEmail('');
    setNewReferral('');
    setIsNewPatientModalOpen(false);
  };

  // Real File Upload handlers (drag, drop, click)
  const processUploadedFile = (file: File) => {
    if (!selectedPatient) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      let type: 'pdf' | 'jpg' | 'png' | 'doc' = 'pdf';
      if (['jpg', 'jpeg'].includes(extension)) type = 'jpg';
      else if (extension === 'png') type = 'png';
      else if (extension === 'doc' || extension === 'docx') type = 'doc';

      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      await onAddFile(selectedPatient.id, {
        name: file.name,
        type: type,
        size: sizeStr,
        content: base64String
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
          content: base64String
        };
        return {
          ...prev,
          files: [newFile, ...(prev.files || [])]
        };
      });
    };
    reader.readAsDataURL(file);
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
            Patient Management
          </h2>
          <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
            Browse profile folders, intake requirements, and clinical history
          </p>
        </div>
        <button
          onClick={() => setIsNewPatientModalOpen(true)}
          className="w-full sm:w-auto bg-primary text-white font-bold text-sm px-6 py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 duration-200 shrink-0"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Patient
        </button>
      </div>

      {/* Patient archive filter tabs */}
      <div className="flex bg-surface-container-high rounded-full p-0.5 border border-surface-container-highest/60 w-fit select-none">
        <button
          onClick={() => setArchiveFilter('active')}
          className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            archiveFilter === 'active' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Active Records
        </button>
        <button
          onClick={() => setArchiveFilter('archived')}
          className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            archiveFilter === 'archived' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Archived / Closed
        </button>
        <button
          onClick={() => setArchiveFilter('all')}
          className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            archiveFilter === 'all' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          All Records
        </button>
      </div>

      {/* Grid of Patients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPatients.map(p => {
          // Determine status color theme
          let statusStyle = 'bg-secondary/10 text-secondary';
          if (p.status === 'Consultation') statusStyle = 'bg-surface-variant text-on-surface-variant';
          else if (p.status === 'Fabrication') statusStyle = 'bg-primary-container/10 text-primary';
          else if (p.status === 'New Referral') statusStyle = 'bg-secondary-container text-on-secondary-container';
          else if (p.status === 'Archived') statusStyle = 'bg-primary/10 text-primary opacity-60';

          return (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPatient(p);
                setActiveProfileTab('documents');
              }}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/50 cursor-pointer hover:border-primary/35 transition-all hover:shadow-sm group flex flex-col justify-between min-h-[190px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-secondary-container/30 text-on-secondary-container flex items-center justify-center font-extrabold text-sm">
                  {p.avatarInitials}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusStyle}`}>
                  {p.status}
                </span>
              </div>
              <div className="mt-4 flex-1">
                <h3 className="font-extrabold text-base text-on-surface group-hover:text-primary transition-colors truncate">
                  {p.name}
                </h3>
                <p className="font-semibold text-xs text-on-surface-variant flex items-center gap-1.5 mt-1 opacity-80">
                  <span className="material-symbols-outlined text-sm">call</span>
                  {p.phone || 'No phone'}
                </p>
                <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider mt-2">
                  MRN: {p.mrn}
                </p>
              </div>

              {/* Admin quick actions */}
              <div className="mt-4 pt-3 border-t border-surface-container-highest/30 flex items-center justify-end gap-1 shrink-0">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newStatus = p.status === 'Archived' ? 'In Progress' : 'Archived';
                    await onUpdatePatient(p.id, { ...p, status: newStatus });
                  }}
                  title={p.status === 'Archived' ? 'Activate / Unarchive' : 'Archive'}
                  className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-base">
                    {p.status === 'Archived' ? 'unarchive' : 'archive'}
                  </span>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you absolutely sure you want to permanently delete patient ${p.name}? All medical records and uploaded files will be destroyed.`)) {
                      await onDeletePatient(p.id);
                    }
                  }}
                  title="Delete patient permanently"
                  className="p-1.5 rounded-full hover:bg-primary-container/15 text-primary transition-all cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-base">
                    delete
                  </span>
                </button>
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
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 flex justify-between items-center border-b border-surface-container-highest bg-surface-bright">
              <div>
                <h2 className="text-lg font-extrabold text-on-surface">Add New Patient</h2>
                <p className="text-xs text-on-surface-variant font-semibold mt-0.5">
                  Enter patient details to create a new record.
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
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Full Name</label>
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
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/40"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={e => setNewDob(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm text-on-surface focus:border-secondary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/40"
                  placeholder="sarah@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Referral Source (Optional)</label>
                <select
                  value={newReferral}
                  onChange={e => setNewReferral(e.target.value)}
                  className="w-full px-4 py-3 bg-surface rounded-full border-2 border-surface-container-highest text-sm focus:border-secondary outline-none transition-all text-on-surface"
                >
                  <option value="">Select a source...</option>
                  <option value="physician">Primary Care Physician</option>
                  <option value="hospital">Hospital Discharge</option>
                  <option value="specialist">Orthopedic Specialist</option>
                  <option value="other">Other</option>
                </select>
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
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PATIENT PROFILE (Eleanor Vance Setup, Image 5) */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-5xl rounded-3xl shadow-xl relative flex flex-col max-h-[95vh] overflow-hidden">
            {/* Close trigger */}
            <button
              onClick={() => setSelectedPatient(null)}
              className="absolute top-5 right-5 w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface hover:bg-surface-dim transition-colors z-10 cursor-pointer"
            >
              <span className="material-symbols-outlined font-bold text-sm">close</span>
            </button>

            {/* Profile header */}
            <div className="px-6 pt-8 pb-5 border-b border-surface-container-highest">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-surface shadow-xs shrink-0 bg-surface-container-highest flex items-center justify-center font-black">
                  {selectedPatient.id === 'p4' ? (
                    <img
                      className="w-full h-full object-cover"
                      alt="Eleanor Vance"
                      referrerPolicy="no-referrer"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrDX68ppEAqs_qFiQjVZ-pjvW7nzC-y8ew8jUnTQi7M9LMden4EQEWwD2_PRQqRVHVV3n7ttr8RpOpeaz60eJLFdqbjCSOnjD8r_W0OjndDWD52zlRvf8D_DEfPtq6gyyyu7r8kvL-YqlXnRZscJ8nufW2zl8p2wwoAcWoy8h0qLy227ryQ2OwvXAQsDdt9aZluBpQRPTd0bCQV8WFXtfOpEXnI3cOUsvRMaqWGuJVo9o1eJdyf4mpZg"
                    />
                  ) : (
                    <span className="text-lg text-on-surface-variant">{selectedPatient.avatarInitials}</span>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-black text-on-surface tracking-tight leading-none mb-1">
                    {selectedPatient.name}
                  </h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant/75">calendar_today</span>
                      DOB: {selectedPatient.dob || '01/01/1980'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant/75">badge</span>
                      MRN: {selectedPatient.mrn}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant/75">phone_iphone</span>
                      {selectedPatient.phone || 'No phone'}
                    </span>
                  </div>
                </div>
                <div className="ml-auto pr-10 hidden sm:block">
                  <div className="px-3.5 py-1.5 rounded-full bg-secondary-container/20 text-on-secondary-container text-xs font-bold flex items-center gap-2 border border-secondary-container/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    Active Patient
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Tab List */}
            <nav className="px-6 flex gap-1 border-b border-surface-container-highest bg-surface-container-lowest shrink-0 overflow-x-auto select-none">
              {['info', 'appointments', 'documents', 'authorization', 'billing', 'notes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveProfileTab(tab)}
                  className={`px-5 py-3.5 font-bold text-xs uppercase tracking-wider hover:bg-surface-container-low transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                    activeProfileTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-surface">
              {activeProfileTab === 'documents' ? (
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
                      <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-xl text-on-secondary-container">cloud_upload</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-on-surface mb-1">Upload File</h3>
                      <p className="text-[10px] font-semibold text-on-surface-variant leading-relaxed mb-4">
                        Drag and drop PDFs, JPGs, or scan directly.
                      </p>
                      <button className="w-full py-2.5 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                        <span className="material-symbols-outlined text-xs">add</span>
                        Select Files
                      </button>
                    </div>
                  </div>

                  {/* Bottom: Patient File Grid */}
                  <div>
                    <h2 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg">folder_open</span>
                      Patient Files
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
                          insuranceCompany: editInfoInsuranceCompany,
                          insuranceId: editInfoInsuranceId,
                          address: editInfoAddress,
                          gender: editInfoGender
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
                            <option value="physician">Primary Care Physician</option>
                            <option value="hospital">Hospital Discharge</option>
                            <option value="specialist">Orthopedic Specialist</option>
                            <option value="other">Other</option>
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
                            setNewApptTime('');
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
                            <input
                              type="text"
                              placeholder="e.g. 10:30 AM"
                              required
                              value={newApptTime}
                              onChange={(e) => setNewApptTime(e.target.value)}
                              className="w-full px-4 py-2 bg-surface rounded-full border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                            />
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
                            patientName: selectedPatient.name,
                            payer: newClaimPayer,
                            amount: newClaimAmount,
                            doctor: newClaimDoc || 'Dr. Sarah Jenkins'
                          });
                          // Reset
                          setNewClaimPayer('');
                          setNewClaimAmount('');
                          setNewClaimDoc('');
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
                          Generate Claim
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
                    {/* Left Column: Write Clinical Note Form */}
                    <div className="lg:col-span-1 bg-surface-container-lowest rounded-3xl p-5 border border-surface-container-highest/40">
                      <h3 className="text-xs font-black text-on-surface flex items-center gap-1.5 border-b border-surface-container pb-2 mb-4">
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
                            text: newNoteText
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
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Note Text</label>
                          <textarea
                            rows={5}
                            required
                            placeholder="Enter clinical assessment, physical findings, or prescription comments..."
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Clinician / Author</label>
                          <select
                            value={newNoteAuthor}
                            onChange={(e) => setNewNoteAuthor(e.target.value)}
                            className="w-full px-4 py-2 bg-surface rounded-md border border-surface-container-highest text-xs font-semibold focus:border-primary outline-none"
                          >
                            <option value="Dr. Aris Thorne">Dr. Aris Thorne</option>
                            <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                            <option value="Dr. Michael Jenkins">Dr. Michael Jenkins</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-md bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-all cursor-pointer mt-4"
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

                              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-highest/60 shadow-xs hover:border-secondary transition-all">
                                <div className="flex justify-between items-center border-b border-surface-container/50 pb-2 mb-2">
                                  <span className="text-[10px] font-extrabold text-secondary">{note.author}</span>
                                  <span className="text-[9px] font-bold text-on-surface-variant">{note.date}</span>
                                </div>
                                <p className="text-xs text-on-surface-variant font-semibold leading-relaxed whitespace-pre-wrap">
                                  {note.text}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="-ml-6 bg-surface-container-lowest border border-dashed border-surface-container-highest/60 rounded-2xl p-8 text-center text-on-surface-variant text-xs font-bold">
                            No clinical notes recorded yet. Use the note writer to document treatments.
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

      {/* MODAL 3: VIEW FILE / PREVIEW IMAGE */}
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
    </div>
  );
}
