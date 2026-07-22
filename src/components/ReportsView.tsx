import React, { useState } from 'react';
import { Patient, Appointment } from '../types';
import ClinicalAnalyticsChart from './ClinicalAnalyticsChart';

interface ReportsViewProps {
  patients: Patient[];
  appointments: Appointment[];
}

export default function ReportsView({ patients, appointments }: ReportsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Compute key reporting metrics
  const totalPatients = patients.length;
  const totalAppointments = appointments.length;
  const fabricationCount = patients.filter(p => p.status === 'Fabrication').length;
  const activeTreatments = patients.filter(p => p.status !== 'Archived').length;

  return (
    <div id="reports-view-container" className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-highest/20 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight">
            Clinical &amp; Operational Reports
          </h2>
          <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
            Clinic performance metrics, O&amp;P device distribution, and patient outcome volume
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-300/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Analytics Engine Active
          </span>
        </div>
      </div>

      {/* Overview Stat Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/40">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Active Charts</p>
          <p className="text-3xl font-black text-on-surface mt-2">{activeTreatments}</p>
          <span className="text-[11px] font-semibold text-emerald-600">Out of {totalPatients} registered</span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/40">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Visits Recorded</p>
          <p className="text-3xl font-black text-secondary mt-2">{totalAppointments}</p>
          <span className="text-[11px] font-semibold text-on-surface-variant">Year to Date</span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/40">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">In Fabrication</p>
          <p className="text-3xl font-black text-primary mt-2">{fabricationCount}</p>
          <span className="text-[11px] font-semibold text-primary">Lab Queue</span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-highest/40">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Auth Approval Rate</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">94.2%</p>
          <span className="text-[11px] font-semibold text-emerald-600">Payer Acceptance</span>
        </div>
      </div>

      {/* Main Analytics Charts */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-surface-container-highest/40">
        <ClinicalAnalyticsChart
          patients={patients}
          appointments={appointments}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      </div>
    </div>
  );
}
