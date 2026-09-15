import React, { useEffect, useState } from 'react';
import ClinicLogo from './ClinicLogo';
import { ClinicSettings, DatabaseSchema, EmailTemplate } from '../types';
import { ClinicBackupPreview, createClinicBackup, downloadClinicBackup, readClinicBackup } from '../utils/clinicBackup';

interface SettingsViewProps {
  settings: ClinicSettings;
  database: DatabaseSchema;
  onSaveSettings: (settings: ClinicSettings) => Promise<void>;
  onImportDatabase: (database: DatabaseSchema) => Promise<void>;
}

export default function SettingsView({ settings, database, onSaveSettings, onImportDatabase }: SettingsViewProps) {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [primaryAddress, setPrimaryAddress] = useState(settings.primaryAddress);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(settings.appearance || 'light');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [doctorName, setDoctorName] = useState(settings.doctorName || 'Deepak Kumar Bhardwaj (BOCO)');
  const [doctorImageUrl, setDoctorImageUrl] = useState(settings.doctorImageUrl || '');
  const [defaultReferralSource, setDefaultReferralSource] = useState(settings.defaultReferralSource || '');
  const [defaultPrimaryClinician, setDefaultPrimaryClinician] = useState(settings.defaultPrimaryClinician || settings.doctorName || 'Deepak Kumar Bhardwaj (BOCO)');
  const [pinCode, setPinCode] = useState(settings.pinCode === '1234' ? '7770' : (settings.pinCode || '7770'));
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [configured, setConfigured] = useState(false);
  const [provider, setProvider] = useState('Brevo');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [transferMessage, setTransferMessage] = useState('');
  const [transferError, setTransferError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ database: DatabaseSchema; preview: ClinicBackupPreview; fileName: string } | null>(null);

  const exportBackup = async () => {
    setExporting(true); setTransferError(''); setTransferMessage('');
    try {
      const backup = await createClinicBackup(database);
      downloadClinicBackup(backup);
      setTransferMessage('Backup created. It includes the Excel workbook, complete restore data, and uploaded documents.');
    } catch (error: any) {
      setTransferError(error?.message || 'Unable to create the clinic backup.');
    } finally { setExporting(false); }
  };

  const inspectImport = async (file: File) => {
    setTransferError(''); setTransferMessage(''); setPendingImport(null); setImporting(true);
    try {
      const imported = await readClinicBackup(file);
      setPendingImport({ ...imported, fileName: file.name });
    } catch (error: any) {
      setTransferError(error?.message || 'This backup could not be validated.');
    } finally { setImporting(false); }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true); setTransferError('');
    try {
      await onImportDatabase(pendingImport.database);
      setTransferMessage(`Imported ${pendingImport.preview.patients} patients and ${pendingImport.preview.documents} documents successfully.`);
      setPendingImport(null);
    } catch (error: any) {
      setTransferError(error?.message || 'The clinic backup could not be imported. No changes were applied.');
    } finally { setImporting(false); }
  };

  const loadEmail = async () => {
    try {
      const response = await fetch('/api/email/config');
      const data = await response.json();
      const available: EmailTemplate[] = data.emailTemplates || [];
      setTemplates(available); setConfigured(Boolean(data.brevoConfigured)); setProvider(data.provider || 'Brevo');
      if (available.length && !selectedId) { setSelectedId(available[0].id); setSubject(available[0].subject); setBody(available[0].body); }
    } catch { setMessage('Email settings could not be loaded.'); } finally { setLoading(false); }
  };
  useEffect(() => { loadEmail(); }, []);

  const chooseTemplate = (id: string) => { const template = templates.find(item => item.id === id); if (template) { setSelectedId(id); setSubject(template.subject); setBody(template.body); } };
  const saveProfile = async (event: React.FormEvent) => { event.preventDefault(); await onSaveSettings({ clinicName, primaryAddress, contactPhone, supportEmail, requirePin: true, pinCode, appearance, logoUrl, doctorName, doctorImageUrl, defaultReferralSource, defaultPrimaryClinician }); setMessage('Clinic profile saved.'); };
  const readImage = (file: File, setter: (value: string) => void) => { const reader = new FileReader(); reader.onloadend = () => setter(String(reader.result || '')); reader.readAsDataURL(file); };
  const saveTemplate = async () => {
    const updated = templates.map(template => template.id === selectedId ? { ...template, subject, body } : template);
    const response = await fetch('/api/email/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailTemplates: updated }) });
    if (!response.ok) throw new Error('Template could not be saved.');
    setTemplates(updated); setMessage('Email template saved.');
  };
  const sendTest = async () => {
    if (!recipient.trim()) { setMessage('Enter an email address first.'); return; }
    setMessage('Sending test email…');
    try {
      const response = await fetch('/api/email/send-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testEmail: recipient.trim() }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Test email failed.');
      setMessage(`Test email sent to ${recipient.trim()}. Check inbox and spam.`);
    } catch (error: any) { setMessage(error.message); }
  };

  return <div className="space-y-6 animate-fade-in pb-16 max-w-4xl">
    <div className="border-b border-surface-container-highest/20 pb-4"><h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Settings</h2><p className="text-sm font-semibold text-on-surface-variant mt-1">Manage clinic information and patient communications.</p></div>
    <form onSubmit={saveProfile} className="workspace-section space-y-5 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div className="min-w-0"><h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">home_work</span>Clinic profile</h3><p className="text-sm text-on-surface-variant mt-1">This information appears on patient messages.</p></div><ClinicLogo size="sm" className="shrink-0" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="form-label">Clinic name<input required value={clinicName} onChange={e => setClinicName(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label">Clinic phone<input required value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label sm:col-span-2">Address<input required value={primaryAddress} onChange={e => setPrimaryAddress(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label">Reply/support email<input required type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label">Appearance<select value={appearance} onChange={e => setAppearance(e.target.value as 'light' | 'dark')} className="form-input mt-1"><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <label className="form-label">Doctor name<input required value={doctorName} onChange={e => setDoctorName(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label">Default referral source<input value={defaultReferralSource} onChange={e => setDefaultReferralSource(e.target.value)} placeholder="e.g., physician, hospital, website" className="form-input mt-1" /><span className="block mt-1 text-xs font-normal text-on-surface-variant">Used to pre-fill new patient records.</span></label>
        <label className="form-label">Default primary clinician<input value={defaultPrimaryClinician} onChange={e => setDefaultPrimaryClinician(e.target.value)} placeholder="e.g., Blake Jackson Sanders (CPO)" className="form-input mt-1" /><span className="block mt-1 text-xs font-normal text-on-surface-variant">Used to pre-fill the clinician for new patients.</span></label>
        <label className="form-label">Portal logo URL<input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://... or upload below" className="form-input mt-1" /><input type="file" accept="image/*" onChange={e => e.target.files?.[0] && readImage(e.target.files[0], setLogoUrl)} className="mt-2 block w-full text-xs" /></label>
        <label className="form-label">Doctor profile image URL<input value={doctorImageUrl} onChange={e => setDoctorImageUrl(e.target.value)} placeholder="https://... or upload below" className="form-input mt-1" /><input type="file" accept="image/*" onChange={e => e.target.files?.[0] && readImage(e.target.files[0], setDoctorImageUrl)} className="mt-2 block w-full text-xs" /></label>
        <label className="form-label">Device passcode<input required inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} value={pinCode} onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))} className="form-input mt-1" /><span className="block mt-1 text-xs font-normal text-on-surface-variant">Required after Sign Out. This device stays unlocked for 30 days.</span></label>
      </div><button type="submit" className="primary-button">Save clinic profile</button>
    </form>
    <section className="workspace-section space-y-5 p-5 sm:p-6" aria-labelledby="data-transfer-title">
      <div>
        <h3 id="data-transfer-title" className="flex items-center gap-2 text-lg font-extrabold text-on-surface"><span className="material-symbols-outlined text-primary">database</span>Data transfer</h3>
        <p className="mt-1 text-sm text-on-surface-variant">Create a complete clinic backup or restore one from an authorized backup package.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-surface-container-highest/60 bg-surface-container-low/40 p-4">
          <p className="text-sm font-extrabold text-on-surface">Export all patient data</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Downloads one ZIP package with Excel, lossless restore data, and uploaded documents.</p>
          <button type="button" onClick={exportBackup} disabled={exporting} className="primary-button mt-4 inline-flex items-center gap-2 disabled:opacity-60"><span className="material-symbols-outlined text-sm">download</span>{exporting ? 'Preparing backup…' : 'Export clinic backup'}</button>
        </div>
        <div className="rounded-2xl border border-surface-container-highest/60 bg-surface-container-low/40 p-4">
          <p className="text-sm font-extrabold text-on-surface">Import clinic backup</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Choose a Genfinity ZIP or JSON backup. The existing database is not changed until you confirm the validated preview.</p>
          <label className="secondary-button mt-4 inline-flex cursor-pointer items-center gap-2"><span className="material-symbols-outlined text-sm">upload</span>{importing ? 'Reading backup…' : 'Choose backup'}<input type="file" accept=".zip,.json,application/zip,application/json" className="sr-only" disabled={importing} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void inspectImport(file); }} /></label>
        </div>
      </div>
      {pendingImport && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-sm font-extrabold">Ready to import: {pendingImport.fileName}</p><p className="mt-1 text-xs">This will replace the current clinic database after confirmation.</p></div>
            <span className="rounded-full bg-amber-200 px-3 py-1 text-[10px] font-black uppercase tracking-wide">Validated</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><span><strong>{pendingImport.preview.patients}</strong> patients</span><span><strong>{pendingImport.preview.appointments}</strong> appointments</span><span><strong>{pendingImport.preview.claims}</strong> claims</span><span><strong>{pendingImport.preview.documents}</strong> documents</span></div>
          <button type="button" onClick={() => void confirmImport()} disabled={importing} className="mt-4 rounded-full bg-amber-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{importing ? 'Importing…' : 'Confirm and replace database'}</button>
        </div>
      )}
      {transferMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">{transferMessage}</p>}
      {transferError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{transferError}</p>}
      <p className="text-[11px] font-semibold text-on-surface-variant">Backups contain protected health information. Store them securely and share only with authorized clinic staff.</p>
    </section>
    <section className="workspace-section space-y-5 p-5 sm:p-6" aria-labelledby="email-settings-title">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div className="min-w-0"><h3 id="email-settings-title" className="text-lg font-extrabold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary">mail</span>Brevo email</h3><p className="text-sm text-on-surface-variant mt-1">Manage patient email templates and test delivery.</p></div><span className={`status-badge shrink-0 ${configured ? 'status-badge-success' : 'status-badge-warning'}`}><span className="h-2 w-2 rounded-full bg-current" />{configured ? `${provider} connected` : 'Brevo setup needed'}</span></div>
      {!configured && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Add the Brevo API key and verified sender in Hostinger environment settings, then restart the app.</div>}
      {loading ? <p className="text-sm text-on-surface-variant">Loading templates…</p> : templates.length === 0 ? <p className="text-sm text-on-surface-variant">No email templates available.</p> : <><label className="form-label">Choose a template<select value={selectedId} onChange={e => chooseTemplate(e.target.value)} className="form-input mt-1">{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label className="form-label">Subject<input value={subject} onChange={e => setSubject(e.target.value)} className="form-input mt-1" /></label><label className="form-label">Message<textarea rows={8} value={body} onChange={e => setBody(e.target.value)} className="form-input mt-1 resize-y" /></label><button type="button" onClick={saveTemplate} className="primary-button">Save template</button></>}
      <div className="border-t border-surface-container-highest/50 pt-5"><h4 className="text-base font-extrabold text-on-surface">Send a test email</h4><p className="text-sm text-on-surface-variant mt-1 mb-3">Confirm delivery before sending to a patient.</p><div className="flex flex-col sm:flex-row gap-2"><input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="your@email.com" className="form-input"/><button type="button" onClick={sendTest} className="secondary-button whitespace-nowrap">Send test</button></div>{message && <p className="text-sm font-semibold text-on-surface-variant mt-3" role="status">{message}</p>}</div>
    </section>
  </div>;
}
