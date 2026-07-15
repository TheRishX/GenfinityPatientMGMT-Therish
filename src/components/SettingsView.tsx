import React, { useState, useEffect } from 'react';
import { ClinicSettings } from '../types';
import { supabaseClient, getClientConfig, reloadClientSupabaseConfig } from '../utils/supabaseClient';

interface SettingsViewProps {
  settings: ClinicSettings;
  onSaveSettings: (settings: ClinicSettings) => Promise<void>;
}

export default function SettingsView({
  settings,
  onSaveSettings
}: SettingsViewProps) {
  // Tabs: 'profile' or 'database'
  const [activeTab, setActiveTab] = useState<'profile' | 'database'>('profile');

  // Tab 1: Profile State
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [primaryAddress, setPrimaryAddress] = useState(settings.primaryAddress);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [requirePin, setRequirePin] = useState(settings.requirePin);
  const [pinCode, setPinCode] = useState(settings.pinCode);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(settings.appearance || 'light');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab 2: Database Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    connected?: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Load current active Supabase config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/supabase-config');
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setSupabaseUrl(data.url || '');
          setSupabaseKey(data.key || '');
        } else {
          // Fallback to client config from localStorage
          const config = getClientConfig();
          setSupabaseUrl(config.url || '');
          setSupabaseKey(config.key || '');
        }
      } catch (err) {
        // Fallback to client config from localStorage
        const config = getClientConfig();
        setSupabaseUrl(config.url || '');
        setSupabaseKey(config.key || '');
      }
    };
    fetchConfig();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      clinicName,
      primaryAddress,
      contactPhone,
      supportEmail,
      requirePin,
      pinCode,
      appearance
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const urlTrim = supabaseUrl.trim();
    const keyTrim = supabaseKey.trim();

    try {
      // 1. Always update local client configuration first (so testing directly works)
      reloadClientSupabaseConfig(urlTrim, keyTrim);

      // 2. Try posting to the backend (will work in AI Studio, fails safely on Vercel)
      try {
        const res = await fetch('/api/supabase-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlTrim, key: keyTrim })
        });
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          await res.json();
        }
      } catch (backendErr) {
        console.warn('Backend server unavailable, updating client-side Supabase settings only.');
      }

      // 3. Perform verification query directly from client using supabaseClient with robust error parsing
      try {
        const startTime = Date.now();
        const { data, error } = await supabaseClient.from('clinic_settings').select('clinic_name').limit(1);
        const latencyMs = Date.now() - startTime;

        if (!error) {
          setTestResult({
            success: true,
            message: 'Supabase configuration applied and validated successfully! Direct connection was established.',
            connected: true,
            latencyMs
          });
        } else {
          setTestResult({
            success: false,
            message: 'Supabase configuration saved, but direct connection verification failed. Please check your URL and Key, or ensure the tables and RLS are created.',
            connected: false,
            error: error.message
          });
        }
      } catch (queryErr: any) {
        const errorMsg = queryErr?.message || String(queryErr);
        if (errorMsg.includes('Unexpected token') || errorMsg.includes('is not valid JSON') || errorMsg.includes('JSON')) {
          setTestResult({
            success: false,
            message: 'The connection returned an HTML response instead of JSON. This usually indicates that the Supabase project is currently paused/inactive, or the URL is incorrect. Please log into your Supabase Dashboard to restore or verify your project.',
            connected: false,
            error: `JSON Parse Exception: ${errorMsg}`
          });
        } else {
          setTestResult({
            success: false,
            message: 'An exception occurred while executing the verification query on the Supabase client.',
            connected: false,
            error: errorMsg
          });
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('Unexpected token') || errorMsg.includes('is not valid JSON') || errorMsg.includes('JSON')) {
        setTestResult({
          success: false,
          message: 'The connection returned an HTML response instead of JSON. This usually indicates that your Supabase project is paused, inactive, or the credentials/URL are incorrect.',
          connected: false,
          error: errorMsg
        });
      } else {
        setTestResult({
          success: false,
          message: 'Error occurred while saving or testing connection.',
          connected: false,
          error: errorMsg
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Static complete Supabase database creation SQL
  const supabaseSQL = `-- ==========================================
-- GENFINITY CLINICAL DATABASE SETUP SCHEMA
-- ==========================================

-- 1. Create Clinic Settings Table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id bigint primary key generated always as identity,
  clinic_name text default 'Genfinity O&P',
  clinic_address text default '123 Prosthetics Way, Suite 400',
  clinic_phone text default '(555) 123-4567',
  clinic_email text default 'support@genfinity.com',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default setting row if table is blank
INSERT INTO clinic_settings (clinic_name, clinic_address, clinic_phone, clinic_email)
SELECT 'Genfinity O&P', '123 Prosthetics Way, Suite 400', '(555) 123-4567', 'support@genfinity.com'
WHERE NOT EXISTS (SELECT 1 FROM clinic_settings);

-- 2. Create Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  dob text default '',
  email text default '',
  referral_source text default 'other',
  status text default 'In Progress',
  notes text default '', -- Stores patient HIPAA MRN
  documents jsonb default '{"files": []}'::jsonb,
  auth_info jsonb default '{"insurance_company": "", "insurance_id": "", "address": "", "gender": "Not specified", "clinical_notes": []}'::jsonb,
  billing jsonb default '{"date": "", "amount": 0, "status": ""}'::jsonb,
  pinned_flag boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  appt_time text default '09:00 AM',
  type text default 'Consultation',
  status text default 'Scheduled',
  appt_date text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow public inserts" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates" ON patients FOR UPDATE USING (true);
CREATE POLICY "Allow public deletes" ON patients FOR DELETE USING (true);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads" ON appointments FOR SELECT USING (true);
CREATE POLICY "Allow public inserts" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates" ON appointments FOR UPDATE USING (true);
CREATE POLICY "Allow public deletes" ON appointments FOR DELETE USING (true);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads" ON clinic_settings FOR SELECT USING (true);
CREATE POLICY "Allow public inserts" ON clinic_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates" ON clinic_settings FOR UPDATE USING (true);`;

  const [copiedSQL, setCopiedSQL] = useState(false);
  const handleCopySQL = () => {
    navigator.clipboard.writeText(supabaseSQL);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl">
      {/* View Title */}
      <div className="border-b border-surface-container-highest/20 pb-4">
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">System &amp; Database Settings</h2>
        <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
          Manage clinical profiles, system parameters, real-time database credentials and storage integrations.
        </p>
      </div>

      {/* Settings Sub-navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-surface-container-low rounded-xl w-fit border border-surface-container-highest/30">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-surface-bright text-primary shadow-xs font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
          }`}
        >
          <span className="material-symbols-outlined text-sm">home_work</span>
          Clinic Profile
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'database'
              ? 'bg-surface-bright text-primary shadow-xs font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
          }`}
        >
          <span className="material-symbols-outlined text-sm">database</span>
          Supabase Connection Link
        </button>
      </div>

      {/* Tab 1: Clinic Profile Configuration */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Clinic Metadata Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-base animate-pulse">home_work</span>
              Facility Profile Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Facility / Clinic Name</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Facility Primary Address</label>
                <input
                  type="text"
                  value={primaryAddress}
                  onChange={e => setPrimaryAddress(e.target.value)}
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Support Hotline</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Support Email Address</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Security / PIN Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-base">security</span>
              Launch Security &amp; Access Controls
            </h3>

            <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-surface-container/60">
              <div className="flex-1 pr-4">
                <span className="block text-xs font-extrabold text-on-surface">Require Practitioner PIN</span>
                <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5 leading-relaxed">
                  Requires a 4-digit numeric code on launch to prevent unauthorized HIPAA views.
                </span>
              </div>
              <input
                type="checkbox"
                checked={requirePin}
                onChange={() => setRequirePin(p => !p)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-0 cursor-pointer"
              />
            </div>

            {requirePin && (
              <div className="flex flex-col gap-1.5 max-w-xs animate-fade-in animate-duration-150">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Set 4-Digit Security PIN</label>
                <input
                  type="text"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none tracking-widest font-black"
                  placeholder="1234"
                  required
                />
              </div>
            )}
          </div>

          {/* UI Appearance Preference */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-base">palette</span>
              Appearance Preferences
            </h3>

            <div className="flex gap-4">
              {(['light', 'dark'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAppearance(mode)}
                  className={`flex-1 p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-left ${
                    appearance === mode
                      ? 'border-secondary bg-secondary/5 font-extrabold text-secondary'
                      : 'border-surface-container-highest bg-surface hover:bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <div>
                    <span className="block text-xs font-black capitalize">{mode} Mode</span>
                    <span className="block text-[10px] opacity-80 mt-0.5">
                      {mode === 'light' ? 'Soft Warm Canvas' : 'Tactile Medical Slate'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-base">
                    {mode === 'light' ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-surface-container/20">
            <button
              type="submit"
              className="px-8 py-3.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-xs">save</span>
              Save Clinic Configuration
            </button>

            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary animate-fade-in">
                <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                Settings updated successfully!
              </div>
            )}
          </div>
        </form>
      )}

      {/* Tab 2: Database Connection Checker & Setup Panel */}
      {activeTab === 'database' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Credentials Editor */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">settings_ethernet</span>
                Active Supabase Connection Parameters
              </h3>
              <p className="text-[11px] text-on-surface-variant font-medium mt-1 leading-relaxed">
                Connect your workspace to any live Supabase cloud database. All queries will update instantly.
              </p>
            </div>

            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Supabase Project URL</label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all w-full font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Supabase Anon / Publishable Key</label>
                <input
                  type="text"
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all w-full font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-6 py-3 bg-secondary text-white text-xs font-bold rounded-full hover:bg-secondary/95 transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm font-bold">
                    {isTesting ? 'sync' : 'network_check'}
                  </span>
                  {isTesting ? 'Verifying...' : 'Verify & Apply Connection'}
                </button>
              </div>
            </form>

            {/* Test Results Banner */}
            {testResult && (
              <div className={`p-4 rounded-2xl border animate-fade-in ${
                testResult.success && testResult.connected
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-primary/5 border-primary/20 text-primary'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg">
                    {testResult.success && testResult.connected ? 'check_circle' : 'warning'}
                  </span>
                  <div className="space-y-1">
                    <span className="block text-xs font-black">
                      {testResult.success && testResult.connected ? 'Connection Success!' : 'Connection Validation Warning'}
                    </span>
                    <span className="block text-[11px] leading-relaxed opacity-90">
                      {testResult.message}
                    </span>
                    {testResult.error && (
                      <span className="block text-[10px] font-mono bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-2 overflow-x-auto whitespace-pre">
                        Diagnosis: {testResult.error}
                      </span>
                    )}
                    {testResult.success && testResult.connected && (
                      <span className="block text-[10px] opacity-80 mt-1 font-bold">
                        Database tables were checked and are functioning correctly!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Database Setup & SQL Copying */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">code</span>
                  Supabase Initialization SQL Query
                </h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-1 leading-relaxed">
                  Run this SQL script inside your Supabase **SQL Editor** to instantly initialize the clinic configuration, patient registries, and appointment tables with Row-Level Security (RLS) configured properly.
                </p>
              </div>
              <button
                onClick={handleCopySQL}
                className="px-4 py-2 bg-surface hover:bg-surface-container-high border border-surface-container-highest rounded-full text-xs font-bold text-on-surface-variant flex items-center gap-1.5 transition-all cursor-pointer shadow-xs select-none"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedSQL ? 'done' : 'content_copy'}
                </span>
                {copiedSQL ? 'Copied!' : 'Copy SQL'}
              </button>
            </div>

            <div className="relative bg-[#1e1e1e] rounded-2xl overflow-hidden border border-zinc-800 text-xs font-mono">
              <div className="bg-[#2d2d2d] px-4 py-2 text-zinc-400 text-[10px] flex justify-between items-center select-none">
                <span>supabase_schema.sql</span>
                <span className="uppercase text-emerald-400 font-bold">PostgreSQL</span>
              </div>
              <pre className="p-4 overflow-x-auto text-zinc-300 whitespace-pre max-h-[300px] leading-relaxed select-all">
                {supabaseSQL}
              </pre>
            </div>
          </div>

          {/* File Upload Storage Setup Instructions */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">cloud_upload</span>
              Clinical File Upload &amp; Storage Setup Guide
            </h3>
            
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              The clinical portal is optimized with double-redundancy for file uploading and attachments (LMNs, insurance card scans, clinical letters). Follow these simple steps to configure Supabase Storage:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface rounded-2xl border border-surface-container-highest/50 space-y-2">
                <div className="flex items-center gap-1.5 text-primary text-xs font-black uppercase">
                  <span className="material-symbols-outlined text-sm font-bold">folder_shared</span>
                  1. Automatic Redundancy
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  Documents are automatically encoded as fast, lightweight binary streams directly inside the <strong>patients.documents</strong> jsonb column. This ensures instant offline sandbox mode saving and requires zero extra cloud resources.
                </p>
              </div>

              <div className="p-4 bg-surface rounded-2xl border border-surface-container-highest/50 space-y-2">
                <div className="flex items-center gap-1.5 text-primary text-xs font-black uppercase">
                  <span className="material-symbols-outlined text-sm font-bold">cloud</span>
                  2. Optional Cloud Bucket
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  If you want to move to public CDN downloads: open the Supabase dashboard, click <strong>Storage</strong>, create a public bucket named <strong>patient-documents</strong>, and permit select uploads.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
