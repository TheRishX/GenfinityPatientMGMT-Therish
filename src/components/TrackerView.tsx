import React, { useState } from 'react';
import { Patient } from '../types';

interface TrackerViewProps {
  patients: Patient[];
  onUpdatePatientStatus: (patientId: string, status: Patient['status']) => Promise<void>;
  onNewPatientClick: () => void;
}

export default function TrackerView({
  patients,
  onUpdatePatientStatus,
  onNewPatientClick
}: TrackerViewProps) {
  // State to manage which card's status picker popup is currently open
  const [activePickerPatientId, setActivePickerPatientId] = useState<string | null>(null);
  const [kanbanFilter, setKanbanFilter] = useState<'active' | 'inactive'>('active');
  const [trackerSearch, setTrackerSearch] = useState('');

  // All possible statuses across the app
  const allStatuses: { id: Patient['status']; label: string; colorClass: string }[] = [
    { id: 'New Referral', label: 'New Referral', colorClass: 'bg-secondary' },
    { id: 'Consultation', label: 'Consultation', colorClass: 'bg-primary' },
    { id: 'Waiting for Rx', label: 'Waiting for Rx', colorClass: 'bg-outline-variant' },
    { id: 'Ready for Auth', label: 'Ready for Auth', colorClass: 'bg-secondary-container' },
    { id: 'Auth Pending', label: 'Auth Pending', colorClass: 'bg-tertiary-container' },
    { id: 'Fabrication', label: 'Fabrication', colorClass: 'bg-amber-500' },
    { id: 'In Progress', label: 'In Progress', colorClass: 'bg-green-500' },
    { id: 'Archived', label: 'Archived', colorClass: 'bg-slate-500' }
  ];

  // Column config based on filter
  const columns = kanbanFilter === 'active'
    ? [
        { id: 'New Referral' as Patient['status'], label: 'New Referral', colorClass: 'bg-secondary' },
        { id: 'Consultation' as Patient['status'], label: 'Consultation', colorClass: 'bg-primary' },
        { id: 'Waiting for Rx' as Patient['status'], label: 'Waiting for Rx', colorClass: 'bg-outline-variant' },
        { id: 'Ready for Auth' as Patient['status'], label: 'Ready for Auth', colorClass: 'bg-secondary-container' },
        { id: 'Auth Pending' as Patient['status'], label: 'Auth Pending', colorClass: 'bg-tertiary-container' }
      ]
    : [
        { id: 'Fabrication' as Patient['status'], label: 'Fabrication', colorClass: 'bg-amber-500' },
        { id: 'In Progress' as Patient['status'], label: 'In Progress', colorClass: 'bg-green-500' },
        { id: 'Archived' as Patient['status'], label: 'Archived', colorClass: 'bg-slate-500' }
      ];

  // Optional trailing columns (aesthetic scroll representation)
  const previewColumns = kanbanFilter === 'active' ? ['Fabrication', 'In Progress'] : [];

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

  const handleStatusChange = async (patientId: string, newStatus: Patient['status']) => {
    await onUpdatePatientStatus(patientId, newStatus);
    setActivePickerPatientId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in relative">
      {/* Tracker Header Area */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Workflow Tracker</h2>
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
              placeholder="Filter column..."
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

          {/* New Patient CTA */}
          <button
            onClick={onNewPatientClick}
            className="bg-primary hover:bg-primary-container text-white font-bold text-xs py-2 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none shrink-0"
          >
            <span className="material-symbols-outlined text-xs">add</span>
            New Patient
          </button>
        </div>
      </div>

      {/* Kanban Board Layout (Horizontal scroll) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden kanban-scroll pb-4 -mx-6 px-6">
        <div className="flex gap-5 h-full w-max py-2">
          {columns.map(col => {
            const colPatients = getPatientsByColumn(col.id);
            return (
              <div key={col.id} className="w-80 flex flex-col h-full bg-surface-container-low/20 p-2.5 rounded-2xl border border-surface-container-highest/20 shrink-0">
                {/* Column header */}
                <div className="flex items-center justify-between mb-4 px-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.colorClass}`} />
                    <h3 className="font-extrabold text-sm text-on-surface tracking-tight">{col.label}</h3>
                  </div>
                  <span className="bg-surface-container-high text-on-surface-variant font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {colPatients.length}
                  </span>
                </div>

                {/* Column Cards (Vertical Scrollable) */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 kanban-scroll">
                  {colPatients.length > 0 ? (
                    colPatients.map(p => {
                      const isPickerOpen = activePickerPatientId === p.id;
                      
                      // Custom rendering elements based on patients from mockups
                      const isRobertChen = p.name.includes('Robert');
                      const isJamesWilson = p.name.includes('James');
                      const isThomasWright = p.name.includes('Thomas');
                      const isElenaDavis = p.name.includes('Elena');

                      return (
                        <div
                          key={p.id}
                          className={`bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-xs hover:shadow-sm transition-all relative ${
                            isPickerOpen ? 'border-primary-container ring-2 ring-primary-container/10 z-30' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            {/* Urgent or Standard Badge */}
                            {isRobertChen ? (
                              <span className="bg-primary/10 text-primary font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px] font-bold">priority_high</span> Urgent
                              </span>
                            ) : isThomasWright ? (
                              <span className="bg-primary/10 text-primary font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px] font-bold">warning</span> Denied - Appeal
                              </span>
                            ) : (
                              <span className="bg-surface-container-high text-on-surface-variant font-bold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Standard
                              </span>
                            )}

                            {/* Dropdown status switcher action trigger */}
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

                          {/* Specific contextual descriptions based on mockups */}
                          {isRobertChen && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant bg-surface p-2 rounded-lg mb-3">
                              <span className="material-symbols-outlined text-xs text-primary">description</span>
                              <span>Missing Rx Details</span>
                            </div>
                          )}

                          {isJamesWilson && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant bg-surface p-2 rounded-lg mb-3">
                              <span className="material-symbols-outlined text-xs text-secondary">call</span>
                              <span>Called Dr. Smith 10/24</span>
                            </div>
                          )}

                          {isElenaDavis && (
                            <div className="mb-3 space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-bold text-on-surface-variant">
                                <span>Auth Progress</span>
                                <span>60%</span>
                              </div>
                              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-secondary w-[60%] rounded-full" />
                              </div>
                            </div>
                          )}

                          {isThomasWright && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/5 p-2 rounded-lg mb-3">
                              <span className="material-symbols-outlined text-xs">gavel</span>
                              <span>Appeal drafted 10/26</span>
                            </div>
                          )}

                          {/* Timeline / Footer */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-container/60 shrink-0">
                            <span className="text-[10px] font-semibold text-on-surface-variant opacity-80">
                              {isRobertChen ? 'Added Today' : isJamesWilson ? 'Waiting 4 days' : isThomasWright ? 'Aetna' : 'Standard Case'}
                            </span>

                            {/* Avatar or Initials bubble */}
                            {isThomasWright ? (
                              <img
                                className="w-7 h-7 rounded-full object-cover border border-surface shadow-xs shrink-0"
                                referrerPolicy="no-referrer"
                                alt={p.name}
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXOe40kmOfAjhO_cGJ9XZMzE8s3yvEW-lCDZIdF64og-2sEuH-NiqGWPOnNzPHnWHV0wRyekUe4FfxPTiSolT-OQYPYXjgJW-vBgfGVyz2mjhC6xOPKNHzxlQEJqBhvV4iUGfsvbQl1MgbB1rr-HyMgCUwev5QphUEjMKWE-nqcspiE7spSSVSyp3LJW1nY3-ZCiODT65SpaptCHJDWtt7FhfnvKBM4DXCtGdAt_oI-smRAvgUKC513g"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-secondary-container/35 text-on-secondary-container flex items-center justify-center font-bold text-[9px] shrink-0">
                                {p.avatarInitials}
                              </div>
                            )}
                          </div>

                          {/* Dynamic move-to status picker menu popups (matching Image 3 exactly) */}
                          {isPickerOpen && (
                            <div className="absolute top-[35px] right-2 w-48 bg-surface-container-lowest rounded-xl shadow-md border border-surface-container-high z-40 py-1.5 overflow-hidden animate-fade-in animate-duration-150">
                              <div className="px-3 py-1 border-b border-surface-container-high mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Move to...</span>
                              </div>
                              {allStatuses.map(option => (
                                <button
                                  key={option.id}
                                  onClick={() => handleStatusChange(p.id, option.id)}
                                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-surface-container-low flex items-center justify-between transition-colors cursor-pointer ${
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
                      <p className="text-[11px] font-bold text-on-surface-variant opacity-75">Drop card here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Aesthetic preview columns (to convey 16-column scroll mockup style) */}
          {previewColumns.map(label => (
            <div key={label} className="w-80 flex flex-col h-full opacity-40 p-2.5 rounded-2xl border border-dashed border-surface-container-highest/60 shrink-0 select-none">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-surface-dim" />
                <h3 className="font-extrabold text-sm text-on-surface truncate">{label}</h3>
              </div>
              <div className="flex-1 rounded-2xl border border-dashed border-surface-container-high bg-surface-container-low/10 flex items-center justify-center p-8">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Empty stage</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
