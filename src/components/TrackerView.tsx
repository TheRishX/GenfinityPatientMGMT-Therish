import React, { useState } from 'react';
import { Patient, REASONS_FOR_VISIT } from '../types';

interface TrackerViewProps {
  patients: Patient[];
  onUpdatePatientStatus: (patientId: string, status: Patient['status']) => Promise<void>;
  onNewPatientClick: () => void;
  onAddPatient: (patientData: any) => Promise<any>;
  isWorkspaceEditMode?: boolean;
  customLabels?: Record<string, string>;
  onUpdateLabel?: (key: string, value: string) => void;
}

export default function TrackerView({
  patients,
  onUpdatePatientStatus,
  onNewPatientClick,
  onAddPatient,
  isWorkspaceEditMode = false,
  customLabels = {},
  onUpdateLabel
}: TrackerViewProps) {
  // State to manage which card's status picker popup is currently open
  const [activePickerPatientId, setActivePickerPatientId] = useState<string | null>(null);
  const [kanbanFilter, setKanbanFilter] = useState<'active' | 'inactive'>('active');
  const [trackerSearch, setTrackerSearch] = useState('');

  // Add Patient to Stage Modal State
  const [addingToStage, setAddingToStage] = useState<Patient['status'] | null>(null);
  const [addMethod, setAddMethod] = useState<'existing' | 'new'>('existing');
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState<string>('');
  const [existingPatientSearch, setExistingPatientSearch] = useState<string>('');

  // Quick register patient form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientReferral, setNewPatientReferral] = useState('orthotics');

  // Helpers to get stage label safely
  const getStageLabel = (id: string, defaultLabel: string) => {
    const key = `stage_${id.toLowerCase().replace(/\s+/g, '_')}`;
    return customLabels[key] || defaultLabel;
  };

  // All possible statuses across the app
  const allStatuses: { id: Patient['status']; label: string; colorClass: string }[] = [
    { id: 'New Referral', label: getStageLabel('New Referral', 'New Referral'), colorClass: 'bg-secondary' },
    { id: 'Consultation', label: getStageLabel('Consultation', 'Consultation'), colorClass: 'bg-primary' },
    { id: 'Waiting for Rx', label: getStageLabel('Waiting for Rx', 'Waiting for Rx'), colorClass: 'bg-outline-variant' },
    { id: 'Ready for Auth', label: getStageLabel('Ready for Auth', 'Ready for Auth'), colorClass: 'bg-secondary-container' },
    { id: 'Auth Pending', label: getStageLabel('Auth Pending', 'Auth Pending'), colorClass: 'bg-tertiary-container' },
    { id: 'Fabrication', label: getStageLabel('Fabrication', 'Fabrication'), colorClass: 'bg-amber-500' },
    { id: 'In Progress', label: getStageLabel('In Progress', 'In Progress'), colorClass: 'bg-green-500' },
    { id: 'Archived', label: getStageLabel('Archived', 'Archived'), colorClass: 'bg-slate-500' }
  ];

  // Column config based on filter
  const columns = kanbanFilter === 'active'
    ? [
        { id: 'New Referral' as Patient['status'], label: getStageLabel('New Referral', 'New Referral'), colorClass: 'bg-secondary' },
        { id: 'Consultation' as Patient['status'], label: getStageLabel('Consultation', 'Consultation'), colorClass: 'bg-primary' },
        { id: 'Waiting for Rx' as Patient['status'], label: getStageLabel('Waiting for Rx', 'Waiting for Rx'), colorClass: 'bg-outline-variant' },
        { id: 'Ready for Auth' as Patient['status'], label: getStageLabel('Ready for Auth', 'Ready for Auth'), colorClass: 'bg-secondary-container' },
        { id: 'Auth Pending' as Patient['status'], label: getStageLabel('Auth Pending', 'Auth Pending'), colorClass: 'bg-tertiary-container' }
      ]
    : [
        { id: 'Fabrication' as Patient['status'], label: getStageLabel('Fabrication', 'Fabrication'), colorClass: 'bg-amber-500' },
        { id: 'In Progress' as Patient['status'], label: getStageLabel('In Progress', 'In Progress'), colorClass: 'bg-green-500' },
        { id: 'Archived' as Patient['status'], label: getStageLabel('Archived', 'Archived'), colorClass: 'bg-slate-500' }
      ];

  // Filter patients for search
  const filteredPatients = patients.filter(p => {
    if (!p) return false;
    const term = trackerSearch.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(term) || p.mrn.toLowerCase().includes(term);
    return matchesSearch;
  });

  const getPatientsByColumn = (colId: Patient['status']) => {
    return filteredPatients.filter(p => p.status === colId);
  };

  const activePatientCount = filteredPatients.filter(p => p.status !== 'Archived').length;
  const trackedPatientCount = filteredPatients.length;

  const handleStatusChange = async (patientId: string, newStatus: Patient['status']) => {
    await onUpdatePatientStatus(patientId, newStatus);
    setActivePickerPatientId(null);
  };

  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingToStage) return;

    if (addMethod === 'existing') {
      if (!selectedExistingPatientId) return;
      await onUpdatePatientStatus(selectedExistingPatientId, addingToStage);
    } else {
      if (!newPatientName.trim()) return;
      await onAddPatient({
        name: newPatientName,
        phone: newPatientPhone,
        dob: newPatientDob,
        email: newPatientEmail,
        referralSource: newPatientReferral,
        status: addingToStage
      });
    }

    // Reset Form
    setAddingToStage(null);
    setSelectedExistingPatientId('');
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientDob('');
    setNewPatientEmail('');
    setNewPatientReferral('physician');
    setExistingPatientSearch('');
  };

  // List of existing patients not currently in the selected stage
  const eligibleExistingPatients = patients.filter(p => {
    if (!p) return false;
    if (addingToStage && p.status === addingToStage) return false;
    if (existingPatientSearch) {
      return p.name.toLowerCase().includes(existingPatientSearch.toLowerCase()) || 
             p.mrn.toLowerCase().includes(existingPatientSearch.toLowerCase());
    }
    return true;
  });

  return (
    <div id="tracker-workflow-container" className="flex flex-col h-[calc(100vh-120px)] animate-fade-in relative">
      {/* Tracker Header Area */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          {isWorkspaceEditMode ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs text-primary">edit</span>
              <input
                type="text"
                value={customLabels['tracker_page_title'] || 'Workflow Tracker'}
                onChange={(e) => onUpdateLabel?.('tracker_page_title', e.target.value)}
                className="bg-surface border border-primary text-2xl font-extrabold text-on-surface tracking-tight px-2 py-0.5 rounded outline-none"
              />
            </div>
          ) : (
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
              {customLabels['tracker_page_title'] || 'Workflow Tracker'}
            </h2>
          )}
          <p className="text-xs font-semibold text-on-surface-variant opacity-85 mt-0.5">
            Manage patient journey through clinical and fabrication stages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tracker search */}
          <div className="relative w-full sm:w-48">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">
              search
            </span>
            <input
              type="text"
              value={trackerSearch}
              onChange={e => setTrackerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-full border border-surface-container-highest bg-surface-container-lowest text-xs focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/55"
              placeholder="Search patient or MRN"
            />
          </div>

          {/* Active / Inactive switch */}
          <div className="flex bg-surface-container-high rounded-full p-0.5 border border-surface-container-highest/60 shrink-0">
            <button
              onClick={() => setKanbanFilter('active')}
              className={`px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                kanbanFilter === 'active' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setKanbanFilter('inactive')}
              className={`px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                kanbanFilter === 'inactive' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant'
              }`}
            >
              Closed/Other
            </button>
          </div>

          {/* New Patient CTA (Fixed linking to Central Patients Modal) */}
          <button
            onClick={onNewPatientClick}
            className="bg-primary hover:bg-primary-container text-white font-bold text-xs py-2 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none shrink-0"
          >
            <span className="material-symbols-outlined text-xs">add</span>
            New Patient
          </button>
        </div>
      </div>

      {/* At-a-glance pipeline summary */}
      <section className="mb-4 shrink-0 rounded-3xl border border-surface-container-highest/40 bg-surface-container-lowest p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Patient journey</p>
            <h3 className="mt-1 text-lg font-extrabold text-on-surface">Every patient, one clear next step</h3>
          </div>
          <p className="text-xs font-semibold text-on-surface-variant">{activePatientCount} active · {trackedPatientCount} tracked</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {allStatuses.map((stage, index) => {
            const count = getPatientsByColumn(stage.id).length;
            const isClosed = stage.id === 'Archived' || stage.id === 'In Progress';
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setKanbanFilter(isClosed ? 'inactive' : 'active')}
                className="min-w-[132px] rounded-2xl border border-surface-container-highest/45 bg-surface-container-low/45 px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stage.colorClass}`} />
                  <span className="text-lg font-black text-on-surface">{count}</span>
                </span>
                <span className="mt-2 block truncate text-[10px] font-extrabold text-on-surface-variant">{stage.label}</span>
                <span className="mt-2 block h-1 rounded-full bg-surface-container-high">
                  <span className={`block h-full rounded-full ${stage.colorClass}`} style={{ width: `${count ? Math.min(100, Math.max(18, count * 16)) : 0}%` }} />
                </span>
                {index < allStatuses.length - 1 && <span className="mt-1 block text-[9px] font-bold text-on-surface-variant/60">Stage {index + 1}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Kanban Board Layout */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden kanban-scroll pb-4 -mx-6 px-6">
        <div className="flex gap-5 h-full w-max py-2">
          {columns.map(col => {
            const colPatients = getPatientsByColumn(col.id);
            return (
              <div key={col.id} className="w-80 flex flex-col h-full bg-surface-container-low/20 p-2.5 rounded-2xl border border-surface-container-highest/20 shrink-0">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1.5 shrink-0">
                  <div className="flex items-center gap-2 max-w-[80%] min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.colorClass}`} />
                    {isWorkspaceEditMode ? (
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => onUpdateLabel?.(`stage_${col.id.toLowerCase().replace(/\s+/g, '_')}`, e.target.value)}
                        className="bg-surface border border-primary text-xs font-extrabold text-on-surface px-1 py-0.5 rounded outline-none w-full"
                        title="Rename Stage"
                      />
                    ) : (
                      <h3 className="font-extrabold text-sm text-on-surface tracking-tight truncate">{col.label}</h3>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="bg-surface-container-high text-on-surface-variant font-bold text-[10px] px-2 py-0.5 rounded-full">
                      {colPatients.length}
                    </span>
                    {/* Add patient directly to this stage button */}
                    <button
                      onClick={() => {
                        setAddingToStage(col.id);
                        setAddMethod('existing');
                      }}
                      className="w-6 h-6 rounded-full bg-primary/10 hover:bg-primary hover:text-white transition-all flex items-center justify-center text-primary text-xs cursor-pointer"
                      title={`Add patient to ${col.label}`}
                    >
                      <span className="material-symbols-outlined text-sm font-bold">add</span>
                    </button>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 kanban-scroll">
                  {colPatients.length > 0 ? (
                    colPatients.map(p => {
                      const isPickerOpen = activePickerPatientId === p.id;
                      const stageIndex = Math.max(0, allStatuses.findIndex(status => status.id === p.status));
                      const progress = Math.round(((stageIndex + 1) / allStatuses.length) * 100);

                      return (
                        <div
                          key={p.id}
                          className={`bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-xs hover:shadow-sm transition-all relative ${
                            isPickerOpen ? 'border-primary-container ring-2 ring-primary-container/10 z-30' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            {p.important ? (
                              <span className="bg-primary/10 text-primary font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px] font-bold">priority_high</span> Priority
                              </span>
                            ) : (
                              <span className="bg-surface-container-high text-on-surface-variant font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Standard
                              </span>
                            )}

                            <button
                              onClick={() => setActivePickerPatientId(isPickerOpen ? null : p.id)}
                              className={`p-1 hover:bg-surface-container rounded-full cursor-pointer transition-colors ${
                                isPickerOpen ? 'bg-primary-container/15 text-primary' : 'text-on-surface-variant'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm font-bold">more_vert</span>
                            </button>
                          </div>

                          <h4 className="font-bold text-sm text-on-surface mb-0.5">{p.name}</h4>
                          <p className="text-[10px] font-bold text-on-surface-variant opacity-75 flex items-center gap-1 mb-3">
                            <span className="material-symbols-outlined text-xs">id_card</span> ID: {p.mrn}
                          </p>

                          {p.blockerBadge && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant bg-surface p-2 rounded-lg mb-3">
                              <span className="material-symbols-outlined text-xs text-primary">error_outline</span>
                              <span>{p.blockerBadge}</span>
                            </div>
                          )}

                          <div className="mb-3 space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] font-bold text-on-surface-variant">
                              <span>Journey progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                              <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-container/60 shrink-0">
                            <span className="text-[10px] font-semibold text-on-surface-variant opacity-80">
                              {p.nextRequiredAction || (p.lastVisit ? `Last visit ${p.lastVisit}` : 'No next action recorded')}
                            </span>

                            <div className="w-7 h-7 rounded-full bg-secondary-container/35 text-on-secondary-container flex items-center justify-center font-bold text-[9px] shrink-0">
                              {p.avatarInitials}
                            </div>
                          </div>

                          {/* Move to dropdown picker menu */}
                          {isPickerOpen && (
                            <div className="absolute top-[35px] right-2 w-48 bg-surface-container-lowest rounded-xl shadow-md border border-surface-container-high z-40 py-1.5 overflow-hidden">
                              <div className="px-3 py-1 border-b border-surface-container-high mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Move to...</span>
                              </div>
                              {allStatuses.map(option => (
                                <button
                                  key={option.id}
                                  onClick={() => handleStatusChange(p.id, option.id)}
                                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-surface-container-low flex items-center justify-between transition-colors cursor-pointer border-0 bg-transparent ${
                                    p.status === option.id ? 'bg-primary/5 text-primary font-bold' : 'text-on-surface'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${option.colorClass}`} />
                                    <span className="truncate">{option.label}</span>
                                  </div>
                                  {p.status === option.id && (
                                    <span className="material-symbols-outlined text-xs text-primary font-bold">check</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center rounded-2xl border border-dashed border-surface-container-highest/60 bg-surface-container-low/20">
                      <p className="text-[11px] font-bold text-on-surface-variant opacity-75">Empty stage</p>
                    </div>
                  )}

                  {/* Inline quick + button at bottom of columns */}
                  <button
                    onClick={() => {
                      setAddingToStage(col.id);
                      setAddMethod('existing');
                    }}
                    className="w-full py-2.5 border border-dashed border-surface-container-highest hover:border-primary rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-all bg-surface-container-lowest/40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Add Patient to Stage
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POPUP MODAL: ADD PATIENT DIRECTLY TO CLINICAL STAGE */}
      {addingToStage && (
        <div id="add-to-stage-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-surface-container bg-surface-bright flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-on-surface">
                  Add Patient to "{getStageLabel(addingToStage, addingToStage)}"
                </h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  Link an existing registered record or check-in a new profile.
                </p>
              </div>
              <button
                onClick={() => setAddingToStage(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer border-0"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Methods toggler pills */}
            <div className="px-6 pt-5">
              <div className="flex bg-surface-container p-0.5 rounded-full border border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setAddMethod('existing')}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    addMethod === 'existing' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  Get Existing Patient
                </button>
                <button
                  type="button"
                  onClick={() => setAddMethod('new')}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    addMethod === 'new' ? 'bg-surface shadow-xs text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  Create New Patient
                </button>
              </div>
            </div>

            <form onSubmit={handleAddPatientSubmit} className="p-6 space-y-4">
              {addMethod === 'existing' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">
                      search
                    </span>
                    <input
                      type="text"
                      value={existingPatientSearch}
                      onChange={e => setExistingPatientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-full border border-surface-container-highest bg-surface-container-lowest text-xs focus:border-secondary outline-none transition-all placeholder:text-on-surface-variant/55"
                      placeholder="Type name or MRN to filter list..."
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                      Select Patient
                    </label>
                    <select
                      required
                      value={selectedExistingPatientId}
                      onChange={e => setSelectedExistingPatientId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                    >
                      <option value="">-- Choose Patient --</option>
                      {eligibleExistingPatients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.mrn}) - Currently: {p.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Patient Full Name</label>
                    <input
                      type="text"
                      required
                      value={newPatientName}
                      onChange={e => setNewPatientName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                      placeholder="e.g. Liam Sterling"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={newPatientDob}
                      onChange={e => setNewPatientDob(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Phone Number</label>
                    <input
                      type="text"
                      value={newPatientPhone}
                      onChange={e => setNewPatientPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                      placeholder="e.g. (555) 012-3456"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Email Address</label>
                    <input
                      type="email"
                      value={newPatientEmail}
                      onChange={e => setNewPatientEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                      placeholder="e.g. liam@example.com"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Referral Source</label>
                    <select
                      value={newPatientReferral}
                      onChange={e => setNewPatientReferral(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs focus:border-secondary outline-none"
                    >
                      {REASONS_FOR_VISIT.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-surface-container flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingToStage(null)}
                  className="px-4 py-2 border border-surface-container-highest rounded-full text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-full text-xs font-bold cursor-pointer"
                >
                  {addMethod === 'existing' ? 'Link Existing Patient' : 'Register & Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
