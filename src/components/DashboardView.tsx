import React from 'react';
import { Patient, Appointment, AlertItem, Authorization, FabricationItem } from '../types';

interface DashboardViewProps {
  patients: Patient[];
  appointments: Appointment[];
  authorizations?: Authorization[];
  fabrication?: FabricationItem[];
  alerts: AlertItem[];
  onNavigateToTab: (tab: string) => void;
  onAlertAction: (actionTarget: string, alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
  onPatientClick?: (patientName: string) => void;
  onUpdatePatient?: (patientId: string, patientData: any) => Promise<void>;
  isWorkspaceEditMode?: boolean;
  customLabels?: Record<string, string>;
  onUpdateLabel?: (key: string, value: string) => void;
  onUpdateAppointment?: (apptId: string, updateData: any) => Promise<void>;
}

export default function DashboardView({
  patients,
  authorizations = [],
  alerts,
  onNavigateToTab,
  onPatientClick,
  onUpdatePatient,
  isWorkspaceEditMode = false,
  customLabels = {},
  onUpdateLabel
}: DashboardViewProps) {
  const importantPatients = patients.filter(patient => patient.important && patient.status !== 'Archived');
  const activePatients = patients.filter(patient => patient.status !== 'Archived');
  const needsAttention = activePatients.filter(patient => patient.blockerBadge).length
    + authorizations.filter(item => item.status === 'Pending' || item.status === 'Needs More Info').length
    + alerts.filter(item => item.type === 'warning').length;
  const title = customLabels.operations_header_title || 'Overview';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          {isWorkspaceEditMode ? (
            <input
              value={title}
              onChange={event => onUpdateLabel?.('operations_header_title', event.target.value)}
              className="bg-surface border border-primary text-2xl font-extrabold text-primary px-2 py-1 rounded-lg outline-none"
            />
          ) : (
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">{title}</h2>
          )}
          <p className="text-sm text-on-surface-variant mt-1">A focused view of the patients you chose to follow closely.</p>
        </div>
        <button
          onClick={() => onNavigateToTab('patients')}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-base">groups</span>
          View all patients
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Active patients', value: activePatients.length, icon: 'group', tone: 'text-secondary bg-secondary/10' },
          { label: 'Important', value: importantPatients.length, icon: 'star', tone: 'text-amber-700 bg-amber-500/10' },
          { label: 'Needs attention', value: needsAttention, icon: 'priority_high', tone: 'text-primary bg-primary/10' }
        ].map(item => (
          <div key={item.label} className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest/50 p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.tone}`}>
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
            </span>
            <div>
              <p className="text-2xl font-black text-on-surface leading-none">{item.value}</p>
              <p className="text-[11px] font-semibold text-on-surface-variant mt-1">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-container-highest/40 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 fill">star</span>
              Important patients
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Use the star on any patient card to pin or remove them here.</p>
          </div>
          <span className="text-xs font-bold text-on-surface-variant">{importantPatients.length} pinned</span>
        </div>

        {importantPatients.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">star_outline</span>
            <h4 className="mt-3 text-sm font-bold text-on-surface">No important patients yet</h4>
            <p className="mt-1 text-xs text-on-surface-variant">Open Patients and select the star on a card.</p>
            <button onClick={() => onNavigateToTab('patients')} className="mt-4 text-xs font-bold text-primary hover:underline cursor-pointer">
              Choose patients
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
            {importantPatients.map(patient => (
              <article key={patient.id} className="rounded-xl border border-surface-container-highest/50 p-4 bg-surface hover:border-secondary transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => onPatientClick?.(patient.name)} className="text-left min-w-0 cursor-pointer">
                    <h4 className="font-extrabold text-sm text-on-surface truncate hover:text-secondary">{patient.name}</h4>
                    <p className="text-[10px] font-mono text-on-surface-variant mt-0.5">{patient.mrn}</p>
                  </button>
                  <button
                    onClick={() => onUpdatePatient?.(patient.id, { important: false })}
                    aria-label={`Remove ${patient.name} from important patients`}
                    title="Unpin from dashboard"
                    className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center cursor-pointer hover:bg-amber-500/20"
                  >
                    <span className="material-symbols-outlined text-lg fill">star</span>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-bold text-on-surface-variant">Stage</span>
                    <span className="font-bold text-on-surface">{patient.careStage || patient.status}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-bold text-on-surface-variant">Next action</span>
                    <span className="font-bold text-on-surface line-clamp-2">{patient.nextRequiredAction || 'Review patient chart'}</span>
                  </div>
                </div>

                <button onClick={() => onPatientClick?.(patient.name)} className="mt-4 w-full py-2 rounded-lg bg-surface-container-low text-xs font-bold text-secondary cursor-pointer hover:bg-surface-container">
                  Open patient
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
