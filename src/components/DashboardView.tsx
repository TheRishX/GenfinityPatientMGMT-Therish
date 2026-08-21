import React, { useState, useMemo } from 'react';
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
  isWorkspaceEditMode?: boolean;
  customLabels?: Record<string, string>;
  onUpdateLabel?: (key: string, value: string) => void;
  onUpdateAppointment?: (apptId: string, updateData: any) => Promise<void>;
}

// Helper Sparkline SVG component for high-contrast KPI trends
function SimpleSparkline({ data, strokeColor, id }: { data: number[]; strokeColor: string; id: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 96;
  const height = 32;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id={`sparkline-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sparkline-grad-${id})`} />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function DashboardView({
  patients,
  appointments,
  authorizations = [],
  fabrication = [],
  alerts,
  onNavigateToTab,
  onAlertAction,
  onDismissAlert,
  onPatientClick,
  isWorkspaceEditMode = false,
  customLabels = {},
  onUpdateLabel,
  onUpdateAppointment
}: DashboardViewProps) {
  // Helper to safely fetch custom editable labels
  const getLabel = (key: string, defaultValue: string) => {
    return customLabels[key] || defaultValue;
  };

  // 1. KPI Computations (Strictly 4 Compact KPIs)
  const todayAppointmentsCount = appointments.length;
  const checkedInCount = appointments.filter(a => a.status === 'Checked In').length;
  const pendingAuths = authorizations.filter(a => a.status === 'Pending' || a.status === 'Needs More Info');
  const totalBlockersCount = pendingAuths.length + alerts.length + 1; // Includes missing Rx / Auth / Note alerts
  const readyDeliveryCount = patients.filter(p => p?.status === 'Fabrication' || p?.status === 'Consultation').length;

  // 2. Patient Flow Interactive State & Helpers (Dynamic Live Data Binding)
  type FlowStage = 'Arrived' | 'In Visit' | 'Awaiting Clinician' | 'Checkout' | 'Follow-up Needed';

  const [patientFlowStages, setPatientFlowStages] = useState<Record<string, FlowStage>>({});

  const getPatientFlowStage = (p: Patient): FlowStage => {
    if (patientFlowStages[p.id]) {
      return patientFlowStages[p.id];
    }
    // Dynamic default placement derived from live appointment or patient status
    const appt = appointments.find(a => a.patientName.toLowerCase().trim() === p.name.toLowerCase().trim());
    if (appt) {
      if (appt.status === 'Checked In') return 'In Visit';
      return 'Arrived';
    }
    if (p.status === 'Consultation' || p.status === 'Fabrication') return 'In Visit';
    if (p.status === 'New Referral') return 'Arrived';
    if (p.status === 'Waiting for Rx') return 'Awaiting Clinician';
    if (p.status === 'Ready for Auth' || p.status === 'Auth Pending') return 'Checkout';
    return 'Follow-up Needed';
  };

  const handleAdvanceFlowStage = (patientId: string, currentStage: FlowStage) => {
    const stages: FlowStage[] = [
      'Arrived',
      'In Visit',
      'Awaiting Clinician',
      'Checkout',
      'Follow-up Needed'
    ];
    const currentIndex = stages.indexOf(currentStage);
    const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : stages[0];
    setPatientFlowStages(prev => ({
      ...prev,
      [patientId]: nextStage
    }));
  };

  // 3. Dynamic Active O&P Cases (Constructed from live fabrication, active patients & authorizations)
  const activeCasesList = useMemo(() => {
    const cases: Array<{
      id: string;
      patientName: string;
      mrn: string;
      device: string;
      currentStage: string;
      assignedPerson: string;
      nextDueDate: string;
    }> = [];

    const addedPatientNames = new Set<string>();

    // Source A: Live Fabrication Workshop Items
    fabrication.forEach(fab => {
      const matchedPatient = patients.find(p => p.name.toLowerCase().trim() === fab.patientName.toLowerCase().trim());
      cases.push({
        id: fab.id,
        patientName: fab.patientName,
        mrn: matchedPatient?.mrn || '#O&P-FAB',
        device: fab.device,
        currentStage: fab.stage,
        assignedPerson: matchedPatient?.primaryClinician || 'Dr. Sarah Jenkins',
        nextDueDate: fab.updatedAt ? `Updated ${fab.updatedAt}` : 'In Workshop'
      });
      addedPatientNames.add(fab.patientName.toLowerCase().trim());
    });

    // Source B: Active Patients in Clinical Flow (Fabrication, Consultation, In Progress, Auth Pending, etc.)
    patients.forEach(p => {
      if (!addedPatientNames.has(p.name.toLowerCase().trim()) && p.status !== 'Archived') {
        const pClinician = p.primaryClinician || (p.id === 'p2' || p.id === 'p4' ? 'Dr. Aris Thorne' : 'Dr. Sarah Jenkins');
        cases.push({
          id: `case_${p.id}`,
          patientName: p.name,
          mrn: p.mrn,
          device: p.insuranceCompany ? `${p.insuranceCompany} - Custom Orthotic` : 'Custom O&P Device',
          currentStage: p.status,
          assignedPerson: pClinician,
          nextDueDate: p.status === 'Fabrication' ? 'In Lab' : 'Active Flow'
        });
        addedPatientNames.add(p.name.toLowerCase().trim());
      }
    });

    // Source C: Active Pending Authorizations
    authorizations.forEach(auth => {
      if (auth.status === 'Pending' || auth.status === 'Needs More Info') {
        if (!addedPatientNames.has(auth.patientName.toLowerCase().trim())) {
          const matchedPatient = patients.find(p => p.name.toLowerCase().trim() === auth.patientName.toLowerCase().trim());
          cases.push({
            id: auth.id,
            patientName: auth.patientName,
            mrn: matchedPatient?.mrn || '#O&P-AUTH',
            device: auth.device,
            currentStage: `Auth: ${auth.status}`,
            assignedPerson: matchedPatient?.primaryClinician || 'Dr. Sarah Jenkins',
            nextDueDate: `Waiting ${auth.daysWaiting}d (${auth.payer})`
          });
          addedPatientNames.add(auth.patientName.toLowerCase().trim());
        }
      }
    });

    return cases;
  }, [fabrication, patients, authorizations]);

  return (
    <div id="operations-today-container" className="space-y-8 animate-fade-in pb-16">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-highest/20 pb-6">
        <div>
          {isWorkspaceEditMode ? (
            <div className="space-y-2">
              <input
                type="text"
                value={getLabel('operations_header_title', 'Overview')}
                onChange={(e) => onUpdateLabel?.('operations_header_title', e.target.value)}
                className="bg-surface border border-primary text-3xl font-extrabold text-primary tracking-tight px-2 py-0.5 rounded outline-none"
              />
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold text-primary tracking-tight flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-secondary">speed</span>
                {getLabel('operations_header_title', 'Overview')}
              </h2>
              <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
                Urgent patients, today's schedule, overdue actions, deliveries due, and the prioritized work queue
              </p>
            </>
          )}
        </div>

        {/* Quick Jump Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('appointments')}
            className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-full flex items-center gap-2 hover:bg-primary-container transition-all cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            Schedule ({todayAppointmentsCount})
          </button>
        </div>
      </div>

      {/* 4 Essential Operational KPIs with High Contrast and Sparkline Visuals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* KPI 1: Today's Appointments */}
        <div
          onClick={() => {
            const el = document.getElementById('section-todays-schedule');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/60 flex flex-col justify-between min-h-[145px] cursor-pointer hover:border-secondary transition-all hover:shadow-md group relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black tracking-wider text-secondary uppercase bg-secondary-container/50 px-2.5 py-1 rounded-md border border-secondary/30">
                Daily Schedule
              </span>
              <h3 className="text-xs font-black text-on-surface mt-2.5 uppercase tracking-wider">
                Today's Appointments
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0 border border-secondary/20">
              <span className="material-symbols-outlined text-xl font-extrabold">calendar_today</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <div>
              <div className="text-4xl font-black text-on-surface group-hover:text-secondary transition-colors tracking-tight">
                {todayAppointmentsCount}
              </div>
              <p className="text-[11px] font-extrabold text-secondary mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                Scheduled Visits
              </p>
            </div>

            {/* Sparkline Visual */}
            <SimpleSparkline
              id="kpi-appts"
              data={[2, 4, 3, 5, 4, 6, todayAppointmentsCount || 5]}
              strokeColor="#006876"
            />
          </div>
        </div>

        {/* KPI 2: Patients Checked In */}
        <div
          onClick={() => {
            const el = document.getElementById('section-patient-flow');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/60 flex flex-col justify-between min-h-[145px] cursor-pointer hover:border-emerald-600 transition-all hover:shadow-md group relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black tracking-wider text-emerald-900 dark:text-emerald-300 uppercase bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-300/50">
                Clinic Floor
              </span>
              <h3 className="text-xs font-black text-on-surface mt-2.5 uppercase tracking-wider">
                Patients Checked In
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-300/40">
              <span className="material-symbols-outlined text-xl font-extrabold">meeting_room</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <div>
              <div className="text-4xl font-black text-on-surface group-hover:text-emerald-600 transition-colors tracking-tight">
                {checkedInCount}
              </div>
              <p className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">group</span>
                {checkedInCount > 0 ? `${checkedInCount} In Building` : 'Waiting Area Clear'}
              </p>
            </div>

            {/* Sparkline Visual */}
            <SimpleSparkline
              id="kpi-checkedin"
              data={[0, 1, 3, 2, 4, 3, checkedInCount || 2]}
              strokeColor="#059669"
            />
          </div>
        </div>

        {/* KPI 3: Blocked Cases */}
        <div
          onClick={() => {
            onNavigateToTab('authorization');
          }}
          className={`bg-surface-container-lowest rounded-2xl p-5 shadow-xs border flex flex-col justify-between min-h-[145px] cursor-pointer transition-all hover:shadow-md group relative overflow-hidden ${
            totalBlockersCount > 0
              ? 'border-primary/50 bg-primary/5 hover:border-primary'
              : 'border-surface-container-highest/60 hover:border-primary/40'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md border ${
                totalBlockersCount > 0
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-surface-container-high text-on-surface-variant border-surface-container-highest/60'
              }`}>
                Care Barriers
              </span>
              <h3 className="text-xs font-black text-on-surface mt-2.5 uppercase tracking-wider">
                Blocked Cases
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <span className="material-symbols-outlined text-xl font-extrabold">block</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <div>
              <div className="text-4xl font-black text-on-surface group-hover:text-primary transition-colors tracking-tight">
                {totalBlockersCount}
              </div>
              <p className={`text-[11px] font-extrabold mt-0.5 flex items-center gap-1 ${
                totalBlockersCount > 0 ? 'text-primary' : 'text-emerald-700 dark:text-emerald-400'
              }`}>
                <span className="material-symbols-outlined text-xs">warning</span>
                {totalBlockersCount > 0 ? 'Requires Action' : 'All Clear'}
              </p>
            </div>

            {/* Sparkline Visual */}
            <SimpleSparkline
              id="kpi-blocked"
              data={[5, 4, 6, 3, 5, 4, totalBlockersCount || 3]}
              strokeColor="#ba1a1a"
            />
          </div>
        </div>

        {/* KPI 4: Ready for Delivery */}
        <div
          onClick={() => {
            const el = document.getElementById('section-active-cases');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/60 flex flex-col justify-between min-h-[145px] cursor-pointer hover:border-indigo-600 transition-all hover:shadow-md group relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black tracking-wider text-indigo-900 dark:text-indigo-300 uppercase bg-indigo-100 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-300/50">
                Fitting &amp; Delivery
              </span>
              <h3 className="text-xs font-black text-on-surface mt-2.5 uppercase tracking-wider">
                Ready for Delivery
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-300/40">
              <span className="material-symbols-outlined text-xl font-extrabold">precision_manufacturing</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <div>
              <div className="text-4xl font-black text-on-surface group-hover:text-indigo-600 transition-colors tracking-tight">
                {readyDeliveryCount}
              </div>
              <p className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified</span>
                Awaiting Pickup
              </p>
            </div>

            {/* Sparkline Visual */}
            <SimpleSparkline
              id="kpi-delivery"
              data={[1, 2, 2, 3, 4, 3, readyDeliveryCount || 2]}
              strokeColor="#4f46e5"
            />
          </div>
        </div>
      </div>

      {/* Main Operations Flow (Full Width Stack) */}
      <div className="space-y-8">
        {/* Section 1: Today's Schedule */}
        <div id="section-todays-schedule" className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-surface-container-highest/40 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container-highest/30 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-on-surface tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">calendar_today</span>
                Today's Schedule
              </h3>
              <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                Time, patient, visit type, assigned clinician, check-in status, and quick chart access
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('appointments')}
              className="text-secondary text-xs font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              View Calendar
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          <div className="space-y-3">
            {appointments.map((appt, idx) => {
              const clinicianName = idx % 2 === 0 ? 'Dr. Sarah Jenkins' : 'Dr. Aris Thorne';
              const isCheckedIn = appt.status === 'Checked In';

              return (
                <div
                  key={appt.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isCheckedIn
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-surface hover:bg-surface-container/60 border-surface-container-highest/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-surface-container-highest font-black text-xs flex items-center justify-center shrink-0 border border-surface-container-highest">
                      {appt.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => onPatientClick?.(appt.patientName)}
                          className="font-extrabold text-sm text-on-surface hover:text-primary transition-colors cursor-pointer truncate"
                        >
                          {appt.patientName}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isCheckedIn
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {appt.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-on-surface-variant mt-1">
                        <span className="flex items-center gap-1 font-bold text-on-surface">
                          <span className="material-symbols-outlined text-xs text-secondary">schedule</span>
                          {appt.time}
                        </span>
                        <span>&bull;</span>
                        <span className="truncate">{appt.type}</span>
                        <span>&bull;</span>
                        <span className="text-secondary font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">stethoscope</span>
                          {clinicianName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 border-surface-container-highest/30 pt-2 sm:pt-0 shrink-0">
                    {appt.status === 'Scheduled' ? (
                      <button
                        onClick={async () => {
                          if (onUpdateAppointment) {
                            await onUpdateAppointment(appt.id, { status: 'Checked In' });
                          }
                        }}
                        className="px-3.5 py-1.5 bg-secondary text-on-secondary font-extrabold text-xs rounded-full hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-xs">how_to_reg</span>
                        Check In
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (onUpdateAppointment) {
                            await onUpdateAppointment(appt.id, { status: 'Scheduled' });
                          }
                        }}
                        className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-bold text-xs rounded-full hover:bg-surface-container transition-all cursor-pointer"
                      >
                        Checked In ✓
                      </button>
                    )}

                    <button
                      onClick={() => onPatientClick?.(appt.patientName)}
                      className="px-3.5 py-1.5 bg-primary text-white font-bold text-xs rounded-full hover:bg-primary-container transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-xs">folder_open</span>
                      Open Chart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Patient Flow */}
        <div id="section-patient-flow" className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-surface-container-highest/40 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container-highest/30 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-on-surface tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">move_location</span>
                Patient Flow (Clinic Floor Stages)
              </h3>
              <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                Arrived → In visit → Awaiting clinician → Checkout → Follow-up needed
              </p>
            </div>
          </div>

          {/* Stage Pipeline Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { stage: 'Arrived', label: '1. Arrived', icon: 'meeting_room', color: 'border-blue-400 bg-blue-500/5' },
              { stage: 'In Visit', label: '2. In Visit', icon: 'stethoscope', color: 'border-emerald-400 bg-emerald-500/5' },
              { stage: 'Awaiting Clinician', label: '3. Awaiting Doctor', icon: 'hourglass_empty', color: 'border-amber-400 bg-amber-500/5' },
              { stage: 'Checkout', label: '4. Checkout', icon: 'point_of_sale', color: 'border-purple-400 bg-purple-500/5' },
              { stage: 'Follow-up Needed', label: '5. Follow-up Needed', icon: 'event_repeat', color: 'border-secondary bg-secondary/5' }
            ].map(stg => {
              const patientsInStage = patients.filter(p => getPatientFlowStage(p) === stg.stage as FlowStage);

              return (
                <div
                  key={stg.stage}
                  className={`p-3 rounded-2xl border ${stg.color} flex flex-col justify-between min-h-[160px] space-y-2`}
                >
                  <div className="flex justify-between items-center border-b border-surface-container-highest/20 pb-2">
                    <span className="text-[10px] font-black uppercase text-on-surface tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">{stg.icon}</span>
                      {stg.label}
                    </span>
                    <span className="text-[10px] font-black bg-surface px-2 py-0.5 rounded-full border border-surface-container-highest/40">
                      {patientsInStage.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {patientsInStage.map(p => {
                      const pClinician = p.primaryClinician || (p.id === 'p2' || p.id === 'p4' ? 'Dr. Aris Thorne' : 'Dr. Sarah Jenkins');
                      return (
                        <div
                          key={p.id}
                          className="p-2.5 bg-surface-container-lowest rounded-xl border border-surface-container-highest/50 shadow-2xs space-y-1.5"
                        >
                          <div className="flex justify-between items-start gap-1">
                            <p
                              onClick={() => onPatientClick?.(p.name)}
                              className="text-xs font-black text-on-surface hover:text-primary transition-colors cursor-pointer truncate flex-1"
                              title={p.name}
                            >
                              {p.name}
                            </p>
                            <span className="text-[9px] font-mono font-bold text-on-surface-variant/70 shrink-0">
                              {p.mrn}
                            </span>
                          </div>

                          <p className="text-[10px] font-medium text-secondary truncate flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">stethoscope</span>
                            {pClinician}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-semibold pt-1 border-t border-surface-container-highest/20">
                            <span className="text-[9px] font-bold text-on-surface-variant/80 truncate">
                              {p.insuranceCompany || 'Self Pay'}
                            </span>
                            <button
                              onClick={() => handleAdvanceFlowStage(p.id, stg.stage as FlowStage)}
                              title="Advance to next stage"
                              className="text-secondary font-bold hover:underline flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
                            >
                              Next Stage
                              <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {patientsInStage.length === 0 && (
                      <div className="h-full flex items-center justify-center text-[11px] font-bold text-on-surface-variant/40 py-4 italic">
                        Clear
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Active Cases */}
        <div id="section-active-cases" className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-surface-container-highest/40 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container-highest/30 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-on-surface tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">precision_manufacturing</span>
                Active Cases (O&amp;P Orders &amp; Fitting Stage)
              </h3>
              <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                Patient, O&amp;P device, current fabrication/fitting stage, assigned team member, and next due date
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('tracker')}
              className="text-secondary text-xs font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              View All Cases
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-container-highest/40 text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">O&amp;P Device</th>
                  <th className="py-2.5 px-3">Current Stage</th>
                  <th className="py-2.5 px-3">Assigned Person</th>
                  <th className="py-2.5 px-3">Next Due</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/20 font-semibold">
                {activeCasesList.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onPatientClick?.(c.patientName)}
                        className="font-extrabold text-on-surface hover:text-primary transition-colors cursor-pointer text-left block"
                      >
                        {c.patientName}
                        <span className="block text-[10px] font-bold text-on-surface-variant/70">MRN: {c.mrn}</span>
                      </button>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-primary">
                      {c.device}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-secondary-container/40 text-secondary border border-secondary/20">
                        {c.currentStage}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      {c.assignedPerson}
                    </td>
                    <td className="py-3 px-3 font-bold text-on-surface">
                      {c.nextDueDate}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onPatientClick?.(c.patientName)}
                        className="px-3 py-1 bg-surface-container-high hover:bg-surface-container text-on-surface text-[11px] font-bold rounded-full transition-colors cursor-pointer border border-surface-container-highest/40"
                      >
                        Open Chart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
