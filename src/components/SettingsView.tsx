import React, { useState, useEffect, useRef } from 'react';
import ClinicLogo from './ClinicLogo';
import { ClinicSettings, SmtpConfig, EmailTemplate, EmailLog } from '../types';

interface SettingsViewProps {
  settings: ClinicSettings;
  onSaveSettings: (settings: ClinicSettings) => Promise<void>;
}

export default function SettingsView({
  settings,
  onSaveSettings
}: SettingsViewProps) {
  // Tabs: 'profile', 'database' or 'email'
  const [activeTab, setActiveTab] = useState<'profile' | 'database' | 'email'>('profile');

  // Tab 1: Profile State
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [primaryAddress, setPrimaryAddress] = useState(settings.primaryAddress);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(settings.appearance || 'light');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab 2: Hostinger deployment readiness
  const [nodeRuntime, setNodeRuntime] = useState('Node.js 20+');
  const [mysqlDatabase, setMysqlDatabase] = useState('genfinity_clinic_prod');
  const [privateStoragePath, setPrivateStoragePath] = useState('../private-clinic-storage');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    ready?: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      clinicName,
      primaryAddress,
      contactPhone,
      supportEmail,
      requirePin: false,
      pinCode: settings.pinCode,
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

    try {
      const startTime = Date.now();
      const res = await fetch('/api/hostinger-status');
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        throw new Error('The Hostinger readiness endpoint did not return JSON.');
      }
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      setTestResult({
        success: !!data.ready,
        ready: !!data.ready,
        latencyMs,
        message: data.ready
          ? 'Hostinger-style backend is reachable and the private storage directory passed the read/write check.'
          : 'The backend is reachable, but one or more Hostinger readiness checks still need attention.',
        error: data.issues?.join(' | ')
      });
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      setTestResult({
        success: false,
        ready: false,
        message: 'Unable to run the Hostinger readiness check from this browser session.',
        error: errorMsg
      });
    } finally {
      setIsTesting(false);
    }
  };

  const mysqlSQL = `-- GENFINITY CLINICAL MYSQL STARTER SCHEMA
-- Hostinger Business / MySQL 8+ / InnoDB

CREATE TABLE IF NOT EXISTS clinic_settings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  clinic_name VARCHAR(160) NOT NULL DEFAULT 'Genfinity O&P',
  clinic_address VARCHAR(255) NOT NULL DEFAULT '',
  clinic_phone VARCHAR(40) NOT NULL DEFAULT '',
  clinic_email VARCHAR(160) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  display_name VARCHAR(160) NOT NULL,
  role_admin BOOLEAN NOT NULL DEFAULT FALSE,
  role_clinical BOOLEAN NOT NULL DEFAULT FALSE,
  role_office BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patients (
  id CHAR(36) PRIMARY KEY,
  patient_number VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  date_of_birth DATE NULL,
  priority ENUM('Routine','High','Urgent') NOT NULL DEFAULT 'Routine',
  most_urgent_case_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_search (full_name, patient_number, phone, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS care_cases (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  stage ENUM('New inquiry','Registration','Evaluation','Documentation','Self-pay or insurance','Insurance verification','Prior authorization','Measurement or casting','Device/component ordering','Fabrication','Quality check','Fitting','Delivery','Follow-up','Adjustment, repair, or replacement','Closed','Archived') NOT NULL DEFAULT 'New inquiry',
  priority ENUM('Routine','High','Urgent') NOT NULL DEFAULT 'Routine',
  owner_staff_id CHAR(36) NULL,
  next_action VARCHAR(255) NOT NULL DEFAULT 'Register patient',
  next_action_due_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cases_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_cases_owner FOREIGN KEY (owner_staff_id) REFERENCES staff_users(id),
  INDEX idx_cases_work_queue (stage, priority, next_action_due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_metadata (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  care_case_id CHAR(36) NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  storage_path VARCHAR(512) NOT NULL,
  sha256_checksum CHAR(64) NOT NULL,
  encryption_version VARCHAR(40) NOT NULL,
  nonce VARBINARY(32) NOT NULL,
  auth_tag VARBINARY(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_docs_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_docs_case FOREIGN KEY (care_case_id) REFERENCES care_cases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

  // Tab 3: Email Notification Suite State
  const [emailSmtpHost, setEmailSmtpHost] = useState('');
  const [emailSmtpPort, setEmailSmtpPort] = useState(587);
  const [emailSmtpUser, setEmailSmtpUser] = useState('');
  const [emailSmtpPass, setEmailSmtpPass] = useState('');
  const [emailSmtpSecure, setEmailSmtpSecure] = useState(false);
  const [emailSmtpFrom, setEmailSmtpFrom] = useState('');
  const [emailSmtpSenderName, setEmailSmtpSenderName] = useState('');

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  const [testRecipient, setTestRecipient] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [smtpDiagnosticLogs, setSmtpDiagnosticLogs] = useState<string[]>([]);
  const [emailTestStatus, setEmailTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState(false);
  
  // Sub-tabs for Email View: 'smtp' | 'templates' | 'logs'
  const [emailSubTab, setEmailSubTab] = useState<'smtp' | 'templates' | 'logs'>('smtp');

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the diagnostics terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [smtpDiagnosticLogs]);

  const fetchEmailConfig = async () => {
    try {
      const res = await fetch('/api/email/config');
      if (res.ok) {
        const data = await res.json();
        if (data.smtpConfig) {
          setEmailSmtpHost(data.smtpConfig.host || '');
          setEmailSmtpPort(data.smtpConfig.port || 587);
          setEmailSmtpUser(data.smtpConfig.user || '');
          setEmailSmtpPass(data.smtpConfig.pass || '');
          setEmailSmtpSecure(data.smtpConfig.secure || false);
          setEmailSmtpFrom(data.smtpConfig.fromEmail || '');
          setEmailSmtpSenderName(data.smtpConfig.senderName || '');
        }
        if (data.emailTemplates && data.emailTemplates.length > 0) {
          setEmailTemplates(data.emailTemplates);
          // Only auto-select if none selected
          if (!selectedTemplate) {
            setSelectedTemplate(data.emailTemplates[0]);
            setTemplateSubject(data.emailTemplates[0].subject);
            setTemplateBody(data.emailTemplates[0].body);
          } else {
            const current = data.emailTemplates.find((t: any) => t.id === selectedTemplate.id);
            if (current) {
              setSelectedTemplate(current);
              setTemplateSubject(current.subject);
              setTemplateBody(current.body);
            }
          }
        }
        if (data.emailLogs) {
          setEmailLogs(data.emailLogs);
        }
      }
    } catch (err) {
      console.error('Failed to load email configs:', err);
    }
  };

  // Fetch configs on mount or when switching to email tab
  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailConfig();
    }
  }, [activeTab]);

  const handleSaveEmailConfig = async (newSmtp: SmtpConfig, newTemplates: EmailTemplate[]) => {
    try {
      const res = await fetch('/api/email/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig: newSmtp, emailTemplates: newTemplates })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.smtpConfig) {
          setEmailSmtpHost(data.smtpConfig.host || '');
          setEmailSmtpPort(data.smtpConfig.port || 587);
          setEmailSmtpUser(data.smtpConfig.user || '');
          setEmailSmtpPass(data.smtpConfig.pass || '');
          setEmailSmtpSecure(data.smtpConfig.secure || false);
          setEmailSmtpFrom(data.smtpConfig.fromEmail || '');
          setEmailSmtpSenderName(data.smtpConfig.senderName || '');
        }
        setEmailTemplates(data.emailTemplates || []);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedHost = emailSmtpHost.trim().replace(/^(https?:\/\/|http:\/\/|smtp:\/\/|:\/*)+/i, '').split('/')[0].split(':')[0].trim();
    if (cleanedHost.toLowerCase() === 'gmail.com') cleanedHost = 'smtp.gmail.com';
    if (cleanedHost.toLowerCase() === 'outlook.com' || cleanedHost.toLowerCase() === 'office365.com') cleanedHost = 'smtp.office365.com';
    if (cleanedHost.toLowerCase() === 'yahoo.com') cleanedHost = 'smtp.mail.yahoo.com';

    setEmailSmtpHost(cleanedHost);

    const config: SmtpConfig = {
      host: cleanedHost,
      port: Number(emailSmtpPort),
      user: emailSmtpUser.trim(),
      pass: emailSmtpPass.trim(),
      secure: emailSmtpSecure,
      fromEmail: emailSmtpFrom.trim(),
      senderName: emailSmtpSenderName.trim()
    };
    const success = await handleSaveEmailConfig(config, emailTemplates);
    if (success) {
      setEmailSaveSuccess(true);
      setTimeout(() => setEmailSaveSuccess(false), 3000);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateSubject(template.subject);
    setTemplateBody(template.body);
  };

  const handleSaveTemplateChanges = async () => {
    if (!selectedTemplate) return;
    const updatedTemplates = emailTemplates.map(t => 
      t.id === selectedTemplate.id 
        ? { ...t, subject: templateSubject, body: templateBody }
        : t
    );
    setEmailTemplates(updatedTemplates);
    
    const config: SmtpConfig = {
      host: emailSmtpHost.trim(),
      port: Number(emailSmtpPort),
      user: emailSmtpUser.trim(),
      pass: emailSmtpPass.trim(),
      secure: emailSmtpSecure,
      fromEmail: emailSmtpFrom.trim(),
      senderName: emailSmtpSenderName.trim()
    };
    
    const success = await handleSaveEmailConfig(config, updatedTemplates);
    if (success) {
      setEmailSaveSuccess(true);
      setTimeout(() => setEmailSaveSuccess(false), 3000);
    }
  };

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setSmtpDiagnosticLogs([`[${new Date().toLocaleTimeString()}] Querying connection suite...`]);
    
    try {
      const config: SmtpConfig = {
        host: emailSmtpHost.trim(),
        port: Number(emailSmtpPort),
        user: emailSmtpUser.trim(),
        pass: emailSmtpPass.trim(),
        secure: emailSmtpSecure,
        fromEmail: emailSmtpFrom.trim(),
        senderName: emailSmtpSenderName.trim()
      };

      const res = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig: config })
      });
      const data = await res.json();
      if (data.logs) {
        setSmtpDiagnosticLogs(data.logs);
      }
    } catch (err: any) {
      setSmtpDiagnosticLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Connection crashed with exception.`,
        `[${new Date().toLocaleTimeString()}] Error message: ${err.message}`
      ]);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      alert('Please enter a recipient email address.');
      return;
    }
    setIsSendingTest(true);
    setEmailTestStatus(null);
    try {
      const config: SmtpConfig = {
        host: emailSmtpHost.trim(),
        port: Number(emailSmtpPort),
        user: emailSmtpUser.trim(),
        pass: emailSmtpPass.trim(),
        secure: emailSmtpSecure,
        fromEmail: emailSmtpFrom.trim(),
        senderName: emailSmtpSenderName.trim()
      };

      const res = await fetch('/api/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig: config, testEmail: testRecipient.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setEmailTestStatus({ success: true, message: `Success! Test email sent successfully to ${testRecipient}.` });
        fetchEmailConfig(); // Reload log outbox
      } else {
        setEmailTestStatus({ success: false, message: `Failed: ${data.message}` });
      }
    } catch (err: any) {
      setEmailTestStatus({ success: false, message: `Exception: ${err.message}` });
    } finally {
      setIsSendingTest(false);
    }
  };

  const [copiedSQL, setCopiedSQL] = useState(false);
  const handleCopySQL = () => {
    navigator.clipboard.writeText(mysqlSQL);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl">
      {/* View Title */}
      <div className="border-b border-surface-container-highest/20 pb-4">
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">System &amp; Database Settings</h2>
        <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
          Manage clinical profiles, Hostinger backend readiness, private storage, and email automation.
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
          Hostinger Setup
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'email'
              ? 'bg-surface-bright text-primary shadow-xs font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
          }`}
        >
          <span className="material-symbols-outlined text-sm">mail</span>
          Email Suite &amp; Templates
        </button>
      </div>

      {/* Tab 1: Clinic Profile Configuration */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Clinic Metadata Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base animate-pulse">home_work</span>
                Facility Profile Details
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-surface-container-highest/60">
                <ClinicLogo size="sm" />
                <span className="text-[10px] font-black text-primary uppercase tracking-wider">Active O&amp;P Brand Logo</span>
              </div>
            </div>

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
          {/* Main Hostinger Readiness Editor */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">settings_ethernet</span>
                Hostinger Business Runtime Mapping
              </h3>
              <p className="text-[11px] text-on-surface-variant font-medium mt-1 leading-relaxed">
                The browser only talks to this Node API. MySQL credentials, storage paths, and secrets stay on the Hostinger server.
              </p>
            </div>

            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Node Runtime</label>
                <input
                  type="text"
                  value={nodeRuntime}
                  onChange={e => setNodeRuntime(e.target.value)}
                  placeholder="Node.js 20+"
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all w-full font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">MySQL Database</label>
                <input
                  type="text"
                  value={mysqlDatabase}
                  onChange={e => setMysqlDatabase(e.target.value)}
                  placeholder="genfinity_clinic_prod"
                  className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all w-full font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Private Storage Directory</label>
                <input
                  type="text"
                  value={privateStoragePath}
                  onChange={e => setPrivateStoragePath(e.target.value)}
                  placeholder="../private-clinic-storage"
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
                  {isTesting ? 'Checking...' : 'Run Readiness Check'}
                </button>
              </div>
            </form>

            {/* Test Results Banner */}
            {testResult && (
              <div className={`p-4 rounded-2xl border animate-fade-in ${
                testResult.success && testResult.ready
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-primary/5 border-primary/20 text-primary'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg">
                    {testResult.success && testResult.ready ? 'check_circle' : 'warning'}
                  </span>
                  <div className="space-y-1">
                    <span className="block text-xs font-black">
                      {testResult.success && testResult.ready ? 'Hostinger Ready' : 'Readiness Attention Needed'}
                    </span>
                    <span className="block text-[11px] leading-relaxed opacity-90">
                      {testResult.message}
                    </span>
                    {testResult.error && (
                      <span className="block text-[10px] font-mono bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-2 overflow-x-auto whitespace-pre">
                        Diagnosis: {testResult.error}
                      </span>
                    )}
                    {testResult.success && testResult.ready && (
                      <span className="block text-[10px] opacity-80 mt-1 font-bold">
                        Private storage can be written and read through the server process.
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
                  MySQL Starter Schema
                </h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-1 leading-relaxed">
                  Run this in Hostinger's MySQL database after creating the database and user. It sets the launch foundation for patients, cases, staff, and encrypted document metadata.
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
                <span>hostinger_mysql_schema.sql</span>
                <span className="uppercase text-emerald-400 font-bold">MySQL / InnoDB</span>
              </div>
              <pre className="p-4 overflow-x-auto text-zinc-300 whitespace-pre max-h-[300px] leading-relaxed select-all">
                {mysqlSQL}
              </pre>
            </div>
          </div>

          {/* File Upload Storage Setup Instructions */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">cloud_upload</span>
              Private Document Storage Setup
            </h3>
            
            <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
              Uploads must live in a private Hostinger directory outside public_html and outside the deployed app target. The API encrypts file contents before writing them.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface rounded-2xl border border-surface-container-highest/50 space-y-2">
                <div className="flex items-center gap-1.5 text-primary text-xs font-black uppercase">
                  <span className="material-symbols-outlined text-sm font-bold">folder_shared</span>
                  1. Private Disk
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  Store encrypted files under <strong>private-clinic-storage</strong>. MySQL stores metadata, checksum, nonce, and authentication tag only.
                </p>
              </div>

              <div className="p-4 bg-surface rounded-2xl border border-surface-container-highest/50 space-y-2">
                <div className="flex items-center gap-1.5 text-primary text-xs font-black uppercase">
                  <span className="material-symbols-outlined text-sm font-bold">cloud</span>
                  2. Backup Gate
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  Confirm Hostinger backups include this directory, then mirror encrypted backups to Google Drive for independent recovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Email Notification Suite & Templates */}
      {activeTab === 'email' && (
        <div className="space-y-6 animate-fade-in animate-duration-300">
          
          {/* Status Indicator Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-surface-container-lowest rounded-3xl border border-surface-container-highest/50 shadow-xs">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">mail_lock</span>
                O&amp;P Email Automation Service Status
              </h3>
              <p className="text-[11px] text-on-surface-variant font-medium max-w-xl leading-relaxed">
                Configure clinic-wide SMTP servers to automatically send appointment reminders, fabrication updates, and billing statements. 
              </p>
            </div>
            
            {/* glowing status badge requested by user */}
            <div className="flex items-center gap-2">
              {emailSmtpHost && emailSmtpUser && emailSmtpFrom ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider select-none">
                    Active Connected Mode
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 animate-pulse"></span>
                  </span>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider select-none">
                    Sandbox Simulation Active
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sub Navigation inside Email Suite */}
          <div className="flex border-b border-surface-container-highest/30 gap-6 select-none">
            <button
              onClick={() => setEmailSubTab('smtp')}
              className={`pb-3 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${
                emailSubTab === 'smtp'
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">dns</span>
              1. SMTP Configuration &amp; Checker
            </button>
            <button
              onClick={() => setEmailSubTab('templates')}
              className={`pb-3 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${
                emailSubTab === 'templates'
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit_document</span>
              2. Clinical Template Library
            </button>
            <button
              onClick={() => setEmailSubTab('logs')}
              className={`pb-3 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all flex items-center gap-1.5 ${
                emailSubTab === 'logs'
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">outbox</span>
              3. Sent Mail Outbox ({emailLogs.length})
            </button>
          </div>

          {/* Sub-Tab 1: SMTP Config */}
          {emailSubTab === 'smtp' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* SMTP configuration Form */}
              <form onSubmit={handleSmtpSubmit} className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
                <div className="border-b border-surface-container-highest/20 pb-3 mb-2 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-base">settings_ethernet</span>
                      Outgoing SMTP Server Settings
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 leading-relaxed">
                      Enter the SMTP parameters provided by your corporate hosting provider or clinic administrator.
                    </p>
                  </div>
                  {emailSaveSuccess && (
                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase animate-fade-in flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">done_all</span>
                      Saved
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-8 flex flex-col gap-1">
                    <label className="text-[10px] font-black text-on-surface uppercase tracking-wide">SMTP Host Name</label>
                    <input
                      type="text"
                      value={emailSmtpHost}
                      onChange={e => setEmailSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com"
                      className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-4 flex flex-col gap-1">
                    <label className="text-[10px] font-black text-on-surface uppercase tracking-wide">SMTP Port</label>
                    <input
                      type="number"
                      value={emailSmtpPort}
                      onChange={e => setEmailSmtpPort(Number(e.target.value))}
                      placeholder="587"
                      className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 font-sans">
                    <label className="text-[10px] font-black text-on-surface uppercase tracking-wide font-sans">SMTP Username</label>
                    <input
                      type="text"
                      value={emailSmtpUser}
                      onChange={e => setEmailSmtpUser(e.target.value)}
                      placeholder="e.g. notifications@clinic.org"
                      className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1 font-sans">
                    <label className="text-[10px] font-black text-on-surface uppercase tracking-wide font-sans">SMTP Password</label>
                    <input
                      type="password"
                      value={emailSmtpPass}
                      onChange={e => setEmailSmtpPass(e.target.value)}
                      placeholder="••••••••••••••"
                      className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 font-sans">
                    <label className="text-[10px] font-black text-on-surface uppercase tracking-wide font-sans">Sender Email Address</label>
                    <input
                      type="email"
                      value={emailSmtpFrom}
                      onChange={e => setEmailSmtpFrom(e.target.value)}
                      placeholder="notifications@genfinityortho.com"
                      className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1 font-sans">
                    <label className="text-[10px] font-black text-on-surface uppercase tracking-wide font-sans">Sender Display Name</label>
                    <input
                      type="text"
                      value={emailSmtpSenderName}
                      onChange={e => setEmailSmtpSenderName(e.target.value)}
                      placeholder="Genfinity Orthotics &amp; Prosthetics"
                      className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface rounded-2xl border border-surface-container/60">
                  <div className="flex-1 pr-4">
                    <span className="block text-xs font-extrabold text-on-surface">Use Secure SSL/TLS Protocol</span>
                    <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5 leading-relaxed">
                      Check this option if your SMTP host requires explicit SSL (typically on port 465).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailSmtpSecure}
                    onChange={() => setEmailSmtpSecure(s => !s)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-primary text-on-primary hover:bg-primary-hover rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">save</span>
                    Save SMTP Configuration
                  </button>
                </div>
              </form>

              {/* SMTP Checker Diagnostic Panel */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-base">terminal</span>
                      Connection Checker &amp; Diagnostics
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 leading-relaxed font-sans">
                      Instantly diagnose port, TLS handshakes, and credential verification processes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSmtpConnection}
                    disabled={isTestingSmtp}
                    className="w-full py-2.5 bg-surface hover:bg-surface-container-high text-primary border border-primary/20 rounded-full font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer select-none disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-sm ${isTestingSmtp ? 'animate-spin' : ''}`}>
                      {isTestingSmtp ? 'autorenew' : 'network_check'}
                    </span>
                    {isTestingSmtp ? 'Testing Handshake...' : 'Verify SMTP Connection'}
                  </button>

                  {/* STDOUT Diagnostics logs terminal screen */}
                  <div className="bg-[#121212] rounded-2xl p-4 border border-zinc-800 text-[10px] font-mono text-zinc-300 space-y-1.5 h-44 overflow-y-auto max-w-full">
                    <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-800 pb-1 mb-1.5 select-none font-bold">
                      <span>STDOUT DIAGNOSTICS</span>
                      <span className="text-[9px] text-primary uppercase">Handshake Analyzer</span>
                    </div>
                    {smtpDiagnosticLogs.length === 0 ? (
                      <span className="text-zinc-600 italic">No logs generated yet. Click "Verify SMTP Connection" to start diagnostics.</span>
                    ) : (
                      smtpDiagnosticLogs.map((log, index) => (
                        <div key={index} className="leading-relaxed animate-fade-in text-[10px]">
                          {log}
                        </div>
                      ))
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>

                {/* Dispatch Test Email panel */}
                <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-3">
                  <div>
                    <h3 className="font-extrabold text-xs text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-primary text-base">send_and_archive</span>
                      Dispatch Manual Test Email
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 leading-relaxed font-sans">
                      Send a physical test email to check delivery to a real inbox.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      placeholder="Enter recipient email..."
                      className="flex-1 px-4 py-2 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTest}
                      className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-on-secondary rounded-full font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer select-none disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">{isSendingTest ? 'hourglass_empty' : 'send'}</span>
                      {isSendingTest ? 'Sending...' : 'Send'}
                    </button>
                  </div>

                  {emailTestStatus && (
                    <div className={`p-3 rounded-2xl text-[11px] font-bold border animate-fade-in ${
                      emailTestStatus.success 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-sans' 
                        : 'bg-red-500/10 border-red-500/20 text-red-600 font-sans'
                    }`}>
                      {emailTestStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Clinical Templates Library */}
          {emailSubTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Template List Selector */}
              <div className="lg:col-span-4 bg-surface-container-lowest rounded-3xl p-5 border border-surface-container-highest/50 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2 pb-2 border-b border-surface-container-highest/20">
                  <span className="material-symbols-outlined text-primary text-base">collections_bookmark</span>
                  O&amp;P Clinical Templates
                </h3>
                
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {emailTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        selectedTemplate?.id === tpl.id
                          ? 'bg-primary/5 border-primary shadow-xs'
                          : 'bg-surface hover:bg-surface-container/30 border-surface-container-highest/40'
                      }`}
                    >
                      <span className={`text-xs font-black tracking-tight ${
                        selectedTemplate?.id === tpl.id ? 'text-primary' : 'text-on-surface'
                      }`}>
                        {tpl.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Trigger: {tpl.triggerEvent.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Editor */}
              <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs flex flex-col gap-4">
                {selectedTemplate ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="border-b border-surface-container-highest/20 pb-3 flex justify-between items-center">
                      <div>
                        <h4 className="font-extrabold text-sm text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-base font-bold">edit</span>
                          Edit: {selectedTemplate.name}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                          Define custom clinical messages and instructions using placeholder tags.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveTemplateChanges}
                        className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-hover rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">save_as</span>
                        Save Template Changes
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 font-sans">
                      <label className="text-[10px] font-black text-on-surface uppercase tracking-wide font-sans">Email Subject Line</label>
                      <input
                        type="text"
                        value={templateSubject}
                        onChange={e => setTemplateSubject(e.target.value)}
                        className="px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1 font-sans">
                      <label className="text-[10px] font-black text-on-surface uppercase tracking-wide font-sans">Template Email Body (Plain Text)</label>
                      <textarea
                        rows={12}
                        value={templateBody}
                        onChange={e => setTemplateBody(e.target.value)}
                        className="p-4 bg-surface rounded-2xl border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none transition-all font-mono leading-relaxed resize-none"
                      />
                    </div>

                    {/* O&P Placement Placeholders Library (Beautiful Bento Tag Block) */}
                    <div className="p-4 bg-surface rounded-2xl border border-surface-container-highest/45 space-y-2">
                      <div className="text-[10px] font-black text-primary uppercase tracking-wide flex items-center gap-1 font-sans">
                        <span className="material-symbols-outlined text-xs font-black">token</span>
                        Clinical Placeholders Library
                      </div>
                      <p className="text-[10px] font-medium text-on-surface-variant leading-relaxed font-sans">
                        These parameters will be automatically computed and replaced with live patient record variables upon event dispatch:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {[
                          { tag: '{patientName}', desc: 'Full Name' },
                          { tag: '{clinicName}', desc: 'Clinic Brand Name' },
                          { tag: '{appointmentType}', desc: 'Clinical Session Title' },
                          { tag: '{appointmentTime}', desc: 'Schedule Date & Time' },
                          { tag: '{clinicAddress}', desc: 'Office Location' },
                          { tag: '{clinicPhone}', desc: 'Office Telephone' },
                          { tag: '{supportEmail}', desc: 'Inbound Inquiries' },
                          { tag: '{deviceName}', desc: 'O&P Fabricated Device' },
                          { tag: '{fabricationStage}', desc: 'Current Milestones' },
                          { tag: '{payerName}', desc: 'Insurance Carrier' },
                          { tag: '{authNumber}', desc: 'Approval Code' },
                          { tag: '{claimNumber}', desc: 'Statement Invoice #' },
                          { tag: '{claimAmount}', desc: 'Co-Pay Balance' }
                        ].map(ph => (
                          <div
                            key={ph.tag}
                            onClick={() => {
                              navigator.clipboard.writeText(ph.tag);
                            }}
                            className="px-2.5 py-1 bg-surface-container/60 hover:bg-primary/5 hover:border-primary/40 border border-surface-container-highest rounded-full text-[9px] text-on-surface font-semibold font-mono cursor-pointer transition-all select-none flex items-center gap-1"
                            title="Click to copy placeholder to clipboard"
                          >
                            <span className="text-primary font-bold">{ph.tag}</span>
                            <span className="text-[8px] text-on-surface-variant font-normal opacity-75">({ph.desc})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">edit_document</span>
                    <span className="text-xs font-bold">Select a template from the list to preview or customize.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Sent Mail Outbox logs */}
          {emailSubTab === 'logs' && (
            <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4 animate-fade-in">
              <div className="border-b border-surface-container-highest/20 pb-3 mb-2 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">history_toggle_off</span>
                    Outbound Mail Log &amp; Delivery Statements
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                    Complete HIPAA audit records of automated patient communications and SMTP transmission confirmations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchEmailConfig}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-container-high border border-surface-container-highest text-[10px] font-black uppercase rounded-full text-primary transition-all flex items-center gap-1 cursor-pointer select-none"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  Refresh Log
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-surface-container-highest/55">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container text-on-surface-variant text-[9px] font-black uppercase tracking-wider select-none border-b border-surface-container-highest">
                    <tr>
                      <th className="p-3.5 pl-5">Status</th>
                      <th className="p-3.5">Patient / Recipient</th>
                      <th className="p-3.5">Template / Subject</th>
                      <th className="p-3.5">Sent Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-highest/25">
                    {emailLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-on-surface-variant italic font-semibold">
                          No outbound notifications recorded. Trigger a fabrication change, appointment booking, or billing update to send automatic clinical alerts.
                        </td>
                      </tr>
                    ) : (
                      emailLogs.map(log => (
                        <tr key={log.id} className="hover:bg-surface-container/10 transition-colors">
                          <td className="p-3.5 pl-5">
                            {log.status === 'Sent' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Delivered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 text-[9px] font-black uppercase rounded-full" title={log.errorMessage}>
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="block font-black text-on-surface leading-tight">{log.patientName}</span>
                            <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5">{log.recipientEmail}</span>
                          </td>
                          <td className="p-3.5 max-w-[280px]">
                            <span className="block text-[10px] font-black bg-surface-container-highest text-on-surface px-1.5 py-0.5 rounded w-fit select-none uppercase tracking-wide text-[8px]">{log.templateName}</span>
                            <span className="block font-bold text-on-surface mt-1 truncate" title={log.subject}>{log.subject}</span>
                          </td>
                          <td className="p-3.5 text-[10px] font-black text-on-surface-variant tracking-tight whitespace-nowrap">
                            {log.sentAt}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
