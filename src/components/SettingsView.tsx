import React, { useEffect, useState } from 'react';
import ClinicLogo from './ClinicLogo';
import { ClinicSettings, EmailTemplate } from '../types';

interface SettingsViewProps { settings: ClinicSettings; onSaveSettings: (settings: ClinicSettings) => Promise<void>; }

export default function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [primaryAddress, setPrimaryAddress] = useState(settings.primaryAddress);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(settings.appearance || 'light');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [configured, setConfigured] = useState(false);
  const [provider, setProvider] = useState('Brevo');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

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
  const saveProfile = async (event: React.FormEvent) => { event.preventDefault(); await onSaveSettings({ clinicName, primaryAddress, contactPhone, supportEmail, requirePin: false, pinCode: settings.pinCode, appearance }); setMessage('Clinic profile saved.'); };
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
    <form onSubmit={saveProfile} className="workspace-section space-y-5">
      <div className="flex items-center justify-between gap-4"><div><h3 className="section-heading"><span className="material-symbols-outlined text-primary">home_work</span>Clinic profile</h3><p className="text-sm text-on-surface-variant mt-1">This information appears on patient messages.</p></div><ClinicLogo size="sm" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="form-label">Clinic name<input required value={clinicName} onChange={e => setClinicName(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label">Clinic phone<input required value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label sm:col-span-2">Address<input required value={primaryAddress} onChange={e => setPrimaryAddress(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label">Reply/support email<input required type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="form-input mt-1" /></label>
        <label className="form-label">Appearance<select value={appearance} onChange={e => setAppearance(e.target.value as 'light' | 'dark')} className="form-input mt-1"><option value="light">Light</option><option value="dark">Dark</option></select></label>
      </div><button type="submit" className="primary-button">Save clinic profile</button>
    </form>
    <section className="workspace-section space-y-5" aria-labelledby="email-settings-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 id="email-settings-title" className="section-heading"><span className="material-symbols-outlined text-primary">mail</span>Brevo email</h3><p className="text-sm text-on-surface-variant mt-1">Manage patient email templates and test delivery.</p></div><span className={`status-badge ${configured ? 'status-badge-success' : 'status-badge-warning'}`}><span className="h-2 w-2 rounded-full bg-current" />{configured ? `${provider} connected` : 'Brevo setup needed'}</span></div>
      {!configured && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Add the Brevo API key and verified sender in Hostinger environment settings, then restart the app.</div>}
      {loading ? <p className="text-sm text-on-surface-variant">Loading templates…</p> : templates.length === 0 ? <p className="text-sm text-on-surface-variant">No email templates available.</p> : <><label className="form-label">Choose a template<select value={selectedId} onChange={e => chooseTemplate(e.target.value)} className="form-input mt-1">{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label className="form-label">Subject<input value={subject} onChange={e => setSubject(e.target.value)} className="form-input mt-1" /></label><label className="form-label">Message<textarea rows={8} value={body} onChange={e => setBody(e.target.value)} className="form-input mt-1 resize-y" /></label><button type="button" onClick={saveTemplate} className="primary-button">Save template</button></>}
      <div className="border-t border-surface-container-highest/50 pt-5"><h4 className="text-base font-extrabold text-on-surface">Send a test email</h4><p className="text-sm text-on-surface-variant mt-1 mb-3">Confirm delivery before sending to a patient.</p><div className="flex flex-col sm:flex-row gap-2"><input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="your@email.com" className="form-input"/><button type="button" onClick={sendTest} className="secondary-button whitespace-nowrap">Send test</button></div>{message && <p className="text-sm font-semibold text-on-surface-variant mt-3" role="status">{message}</p>}</div>
    </section>
  </div>;
}
