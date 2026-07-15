import React, { useState } from 'react';
import { Patient, PatientFile } from '../types';

interface PatientsViewProps {
  patients: Patient[];
  searchTerm: string;
  onAddPatient: (patientData: any) => Promise<void>;
  onAddFile: (patientId: string, fileData: any) => Promise<void>;
  onDeleteFile: (patientId: string, fileId: string) => Promise<void>;
  isNewPatientModalOpen: boolean;
  setIsNewPatientModalOpen: (open: boolean) => void;
}

export default function PatientsView({
  patients,
  searchTerm,
  onAddPatient,
  onAddFile,
  onDeleteFile,
  isNewPatientModalOpen,
  setIsNewPatientModalOpen
}: PatientsViewProps) {
  // Active selected patient for profile modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<string>('documents');

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
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.mrn.toLowerCase().includes(term) ||
      p.status.toLowerCase().includes(term) ||
      (p.phone && p.phone.includes(term))
    );
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

  // Mock File Upload dialog
  const handleMockUpload = async () => {
    if (!selectedPatient) return;
    const filename = prompt('Enter a filename to simulate PDF/JPG upload:', 'Scan_Medical_LMN.pdf');
    if (!filename) return;

    const extension = filename.split('.').pop()?.toLowerCase();
    const type = (extension === 'jpg' || extension === 'jpeg' || extension === 'png') ? 'jpg' : 'pdf';
    
    await onAddFile(selectedPatient.id, {
      name: filename,
      type: type,
      size: `${(Math.random() * 4 + 1).toFixed(1)} MB`
    });

    // Re-sync local selection modal
    const updatedPatient = patients.find(p => p.id === selectedPatient.id);
    if (updatedPatient) {
      setSelectedPatient({
        ...updatedPatient,
        files: [
          {
            id: `temp_${Date.now()}`,
            name: filename,
            type: type,
            date: 'Today',
            size: '2.4 MB'
          },
          ...(updatedPatient.files || [])
        ]
      });
    }
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

      {/* Grid of Patients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPatients.map(p => {
          // Determine status color theme
          let statusStyle = 'bg-secondary/10 text-secondary';
          if (p.status === 'Consultation') statusStyle = 'bg-surface-variant text-on-surface-variant';
          else if (p.status === 'Fabrication') statusStyle = 'bg-primary-container/10 text-primary';
          else if (p.status === 'New Referral') statusStyle = 'bg-secondary-container text-on-secondary-container';

          return (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPatient(p);
                setActiveProfileTab('documents');
              }}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/50 cursor-pointer hover:border-primary/35 transition-all hover:shadow-sm group flex flex-col justify-between min-h-[170px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-secondary-container/30 text-on-secondary-container flex items-center justify-center font-extrabold text-sm">
                  {p.avatarInitials}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusStyle}`}>
                  {p.status}
                </span>
              </div>
              <div className="mt-4">
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
                      onClick={handleMockUpload}
                      className="bg-surface-container-low hover:bg-surface-container-high rounded-2xl p-5 flex flex-col items-center justify-center text-center border-2 border-dashed border-outline-variant hover:border-secondary transition-all cursor-pointer group"
                    >
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
                                onClick={() => alert(`Simulating viewing file: ${file.name}`)}
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
    </div>
  );
}
