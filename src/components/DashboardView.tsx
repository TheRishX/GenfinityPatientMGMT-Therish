import React, { useState } from 'react';
import { Patient, Appointment, AlertItem } from '../types';
import ClinicalAnalyticsChart from './ClinicalAnalyticsChart';

interface DashboardViewProps {
  patients: Patient[];
  appointments: Appointment[];
  alerts: AlertItem[];
  onNavigateToTab: (tab: string) => void;
  onAlertAction: (actionTarget: string, alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
  onPatientClick?: (patientName: string) => void;
  isWorkspaceEditMode?: boolean;
  customLabels?: Record<string, string>;
  onUpdateLabel?: (key: string, value: string) => void;
}

export default function DashboardView({
  patients,
  appointments,
  alerts,
  onNavigateToTab,
  onAlertAction,
  onDismissAlert,
  onPatientClick,
  isWorkspaceEditMode = false,
  customLabels = {},
  onUpdateLabel
}: DashboardViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Helper to safely fetch labels
  const getLabel = (key: string, defaultValue: string) => {
    return customLabels[key] || defaultValue;
  };

  // Dynamic counts for Stats Grid
  const apptCount = appointments.length;
  const newReferralsCount = patients.filter(p => p?.status === 'New Referral').length;
  const waitingAuthCount = patients.filter(p => p?.status === 'Waiting for Rx' || p?.status === 'Auth Pending').length;
  const readyDeliveryCount = patients.filter(p => p?.status === 'Fabrication').length;

  // Dynamically filter Today's Appointments based on selected D3 category
  const filteredAppointments = appointments.filter(appt => {
    if (!selectedCategory) return true;
    if (selectedCategory === 'AFO') return appt.type.includes('AFO');
    if (selectedCategory === 'KAFO') return appt.type.includes('KAFO');
    if (selectedCategory === 'Prosthesis') return appt.type.includes('Prosthesis') || appt.type.includes('Prosthetic');
    if (selectedCategory === 'Follow-up') return appt.type.includes('Align') || appt.type.includes('Check');
    return true;
  });

  return (
    <div id="dashboard-view-container" className="space-y-8 animate-fade-in pb-16">
      {/* Greeting Banner */}
      <div>
        {isWorkspaceEditMode ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs text-primary">edit</span>
              <input
                type="text"
                value={getLabel('dashboard_greeting', 'Good morning!')}
                onChange={(e) => onUpdateLabel?.('dashboard_greeting', e.target.value)}
                className="bg-surface border border-primary text-3xl font-extrabold text-primary tracking-tight px-2 py-0.5 rounded outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs text-primary">edit</span>
              <input
                type="text"
                value={getLabel('dashboard_subgreeting', "Here's today at Genfinity O&P")}
                onChange={(e) => onUpdateLabel?.('dashboard_subgreeting', e.target.value)}
                className="bg-surface border border-primary text-sm font-semibold text-on-surface-variant px-2 py-0.5 rounded outline-none w-80"
              />
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-4xl font-extrabold text-primary mb-1 tracking-tight">
              {getLabel('dashboard_greeting', 'Good morning!')}
            </h2>
            <p className="text-lg font-semibold text-on-surface-variant opacity-85">
              {getLabel('dashboard_subgreeting', "Here's today at Genfinity O&P")}
            </p>
          </>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div id="dashboard-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Appointments */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/20 flex flex-col justify-between min-h-[140px] hover:border-secondary/20 transition-all group">
          <div className="flex justify-between items-start">
            {isWorkspaceEditMode ? (
              <input
                type="text"
                value={getLabel('stat_label_appointments', 'Appointments')}
                onChange={(e) => onUpdateLabel?.('stat_label_appointments', e.target.value)}
                className="bg-surface border border-primary text-xs font-bold text-on-surface-variant px-1.5 py-0.5 rounded outline-none w-full"
              />
            ) : (
              <h3 className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">
                {getLabel('stat_label_appointments', 'Appointments')}
              </h3>
            )}
            <div className="w-9 h-9 rounded-full bg-secondary-container/60 flex items-center justify-center shrink-0 ml-2">
              <span className="material-symbols-outlined text-sm text-on-secondary-container">
                calendar_today
              </span>
            </div>
          </div>
          <div className="text-4xl font-black text-on-surface mt-2 group-hover:text-secondary transition-colors">
            {apptCount}
          </div>
        </div>

        {/* Stat 2: New Referrals */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/20 flex flex-col justify-between min-h-[140px] hover:border-primary/20 transition-all group">
          <div className="flex justify-between items-start">
            {isWorkspaceEditMode ? (
              <input
                type="text"
                value={getLabel('stat_label_referrals', 'New Referrals')}
                onChange={(e) => onUpdateLabel?.('stat_label_referrals', e.target.value)}
                className="bg-surface border border-primary text-xs font-bold text-on-surface-variant px-1.5 py-0.5 rounded outline-none w-full"
              />
            ) : (
              <h3 className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">
                {getLabel('stat_label_referrals', 'New Referrals')}
              </h3>
            )}
            <div className="w-9 h-9 rounded-full bg-primary-container/10 flex items-center justify-center shrink-0 ml-2">
              <span className="material-symbols-outlined text-sm text-primary">
                person_add
              </span>
            </div>
          </div>
          <div className="text-4xl font-black text-on-surface mt-2 group-hover:text-primary transition-colors">
            {newReferralsCount}
          </div>
        </div>

        {/* Stat 3: Waiting Auth */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/20 flex flex-col justify-between min-h-[140px] hover:border-on-surface-variant/20 transition-all group">
          <div className="flex justify-between items-start">
            {isWorkspaceEditMode ? (
              <input
                type="text"
                value={getLabel('stat_label_waiting_auth', 'Waiting Auth')}
                onChange={(e) => onUpdateLabel?.('stat_label_waiting_auth', e.target.value)}
                className="bg-surface border border-primary text-xs font-bold text-on-surface-variant px-1.5 py-0.5 rounded outline-none w-full"
              />
            ) : (
              <h3 className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">
                {getLabel('stat_label_waiting_auth', 'Waiting Auth')}
              </h3>
            )}
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 ml-2">
              <span className="material-symbols-outlined text-sm text-on-surface-variant">
                hourglass_empty
              </span>
            </div>
          </div>
          <div className="text-4xl font-black text-on-surface mt-2">
            {waitingAuthCount}
          </div>
        </div>

        {/* Stat 4: Ready Delivery */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/20 flex flex-col justify-between min-h-[140px] hover:border-on-surface-variant/20 transition-all group">
          <div className="flex justify-between items-start">
            {isWorkspaceEditMode ? (
              <input
                type="text"
                value={getLabel('stat_label_delivery', 'Ready Delivery')}
                onChange={(e) => onUpdateLabel?.('stat_label_delivery', e.target.value)}
                className="bg-surface border border-primary text-xs font-bold text-on-surface-variant px-1.5 py-0.5 rounded outline-none w-full"
              />
            ) : (
              <h3 className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">
                {getLabel('stat_label_delivery', 'Ready Delivery')}
              </h3>
            )}
            <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 ml-2">
              <span className="material-symbols-outlined text-sm text-on-surface-variant">
                local_shipping
              </span>
            </div>
          </div>
          <div className="text-4xl font-black text-on-surface mt-2">
            {readyDeliveryCount}
          </div>
        </div>
      </div>

      {/* D3 Analytics Section */}
      <ClinicalAnalyticsChart
        patients={patients}
        appointments={appointments}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Bottom Bento Grid */}
      <div id="dashboard-bento-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-surface-container-highest/25">
          <div className="flex justify-between items-center mb-6">
            <div>
              {isWorkspaceEditMode ? (
                <input
                  type="text"
                  value={getLabel('dashboard_heading_appointments', "Today's Appointments")}
                  onChange={(e) => onUpdateLabel?.('dashboard_heading_appointments', e.target.value)}
                  className="bg-surface border border-primary text-lg font-extrabold text-on-surface tracking-tight px-1.5 py-0.5 rounded outline-none"
                />
              ) : (
                <h3 className="text-lg font-extrabold text-on-surface tracking-tight">
                  {getLabel('dashboard_heading_appointments', "Today's Appointments")}
                </h3>
              )}
              {selectedCategory && (
                <p className="text-xs text-secondary font-semibold mt-1">
                  Filtered by category: <strong className="uppercase">{selectedCategory}</strong>
                </p>
              )}
            </div>
            <button
              onClick={() => onNavigateToTab('appointments')}
              className="text-secondary font-bold text-xs hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-0"
            >
              View All
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map(appt => (
                <div
                  key={appt.id}
                  onClick={() => onPatientClick?.(appt.patientName)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-surface hover:bg-surface-container transition-all border border-surface-container-highest/45 hover:border-secondary/25 cursor-pointer hover:shadow-xs"
                  title={`Click to open profile details for ${appt.patientName}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-black text-sm">
                    {appt.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-on-surface hover:text-secondary transition-colors truncate">
                      {appt.patientName}
                    </h4>
                    <p className="text-xs font-semibold text-on-surface-variant truncate">
                      {appt.type}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-on-surface">
                      {appt.time}
                    </div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${
                        appt.status === 'Checked In'
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-on-surface-variant text-sm font-semibold">
                No appointments matched the selection.
              </div>
            )}
          </div>
        </div>

        {/* Needs Attention Column (Takes 1 column) */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-surface-container-highest/25 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center gap-2.5 mb-6 text-primary">
              <span className="material-symbols-outlined font-extrabold text-lg">warning</span>
              {isWorkspaceEditMode ? (
                <input
                  type="text"
                  value={getLabel('dashboard_heading_attention', 'Needs Attention')}
                  onChange={(e) => onUpdateLabel?.('dashboard_heading_attention', e.target.value)}
                  className="bg-surface border border-primary text-lg font-extrabold text-on-surface tracking-tight px-1.5 py-0.5 rounded outline-none"
                />
              ) : (
                <h3 className="text-lg font-extrabold text-on-surface tracking-tight">
                  {getLabel('dashboard_heading_attention', 'Needs Attention')}
                </h3>
              )}
            </div>

            <div className="space-y-4">
              {alerts.map(alert => {
                const isUrgent = alert.type === 'warning';
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl relative ${
                      isUrgent
                        ? 'bg-primary-container/10 text-primary border border-primary-container/15'
                        : 'bg-surface-container-high text-on-surface-variant border border-surface-container-highest/40'
                    }`}
                  >
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="absolute top-3 right-3 text-on-surface-variant/40 hover:text-primary transition-colors p-1 cursor-pointer border-0 bg-transparent"
                      title="Dismiss Alert"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">close</span>
                    </button>
                    <h4 className="font-bold text-xs uppercase tracking-wider mb-1 pr-6">
                      {alert.title}
                    </h4>
                    <p className="text-xs font-semibold opacity-90 leading-normal mb-3 pr-6">
                      {alert.message}
                    </p>
                    <button
                      onClick={() => onAlertAction(alert.actionTarget, alert.id)}
                      className={`text-xs font-extrabold underline cursor-pointer hover:opacity-80 flex items-center gap-1 bg-transparent border-0 ${
                        isUrgent ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      {alert.actionText}
                      <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                    </button>
                  </div>
                );
              })}
              {alerts.length === 0 && (
                <div className="p-6 text-center border border-dashed border-surface-container-highest rounded-2xl bg-surface-container-lowest">
                  <p className="text-xs font-bold text-on-surface-variant opacity-75">All clear! No pending items needing attention.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-surface-container/30 mt-4 text-center">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Genfinity Compliance Audit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
