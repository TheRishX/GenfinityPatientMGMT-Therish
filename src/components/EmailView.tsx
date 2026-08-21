import React, { useEffect, useState } from 'react';
import { EmailLog, EmailTemplate, Patient, SmtpConfig } from '../types';
import PatientEmailModal from './PatientEmailModal';

interface EmailViewProps {
  patients: Patient[];
}

const emptyBrevo: SmtpConfig = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  user: '',
  pass: '',
  secure: false,
  fromEmail: '',
  senderName: 'Genfinity O&P',
  replyTo: ''
};

export default function EmailView({ patients }: EmailViewProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [smtp, setSmtp] = useState<SmtpConfig>(emptyBrevo);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [composePatient, setComposePatient] = useState<Patient | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const emailPatients = patients.filter(patient => Boolean(patient.email));
  const selectedPatient = patients.find(patient => patient.id === selectedPatientId);
  const isBrevoReady = smtp.host.includes('brevo') && Boolean(smtp.user && smtp.pass && smtp.fromEmail);

  const loadEmailData = async () => {
    const response = await fetch('/api/email/config');
    if (!response.ok) return;
    const data = await response.json();
    setTemplates(data.emailTemplates || []);
    setLogs(data.emailLogs || []);
    setSmtp(data.smtpConfig ? { ...emptyBrevo, ...data.smtpConfig } : emptyBrevo);
  };

  useEffect(() => {
    loadEmailData();
  }, []);

  const saveBrevo = async () => {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch('/api/email/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpConfig: smtp, emailTemplates: templates })
      });
      if (!response.ok) throw new Error('Brevo settings could not be saved.');
      setStatus('Brevo settings saved.');
      await loadEmailData();
    } catch (err: any) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Email</h2>
          <p className="text-sm text-on-surface-variant mt-1">Choose a patient, select a stage template, review, and send.</p>
        </div>
        <button onClick={() => setShowSetup(value => !value)} className="px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest text-xs font-bold text-on-surface cursor-pointer flex items-center gap-2">
          <span className="material-symbols-outlined text-base">settings</span>
          Brevo settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <section className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest/50 p-5">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined">outgoing_mail</span>
            </span>
            <div>
              <h3 className="text-base font-extrabold text-on-surface">New patient email</h3>
              <p className="text-xs text-on-surface-variant">Patient details are filled automatically.</p>
            </div>
          </div>

          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Patient</label>
          <select value={selectedPatientId} onChange={event => setSelectedPatientId(event.target.value)} className="mt-1.5 w-full px-3 py-3 rounded-xl bg-surface border border-surface-container-highest text-sm font-bold text-on-surface outline-none focus:border-secondary">
            <option value="">Select a patient…</option>
            {emailPatients.map(patient => (
              <option key={patient.id} value={patient.id}>{patient.name} · {patient.email}</option>
            ))}
          </select>

          {selectedPatient && (
            <div className="mt-4 rounded-xl bg-surface p-4 border border-surface-container-highest/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-on-surface">{selectedPatient.name}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{selectedPatient.careStage || selectedPatient.status} · {selectedPatient.email}</p>
              </div>
              <button onClick={() => setComposePatient(selectedPatient)} className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">edit</span>
                Choose template
              </button>
            </div>
          )}
        </section>

        <aside className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-on-surface">Delivery</h3>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${isBrevoReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              {isBrevoReady ? 'Brevo ready' : 'Setup required'}
            </span>
          </div>
          <dl className="mt-4 space-y-3 text-xs">
            <div><dt className="text-on-surface-variant">SMTP server</dt><dd className="font-bold text-on-surface mt-0.5">{smtp.host}</dd></div>
            <div><dt className="text-on-surface-variant">Sender</dt><dd className="font-bold text-on-surface mt-0.5 truncate">{smtp.fromEmail || 'Not configured'}</dd></div>
            <div><dt className="text-on-surface-variant">Templates</dt><dd className="font-bold text-on-surface mt-0.5">{templates.length} available</dd></div>
          </dl>
        </aside>
      </div>

      {showSetup && (
        <section className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-base font-extrabold text-on-surface">Brevo SMTP</h3><p className="text-xs text-on-surface-variant mt-0.5">Use an authenticated sender and SMTP key from Brevo.</p></div>
            <span className="text-[10px] font-mono text-on-surface-variant">TLS · Port 587</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Brevo SMTP login', key: 'user', type: 'text', placeholder: 'Brevo account login' },
              { label: 'Brevo SMTP key', key: 'pass', type: 'password', placeholder: 'SMTP key' },
              { label: 'Verified sender email', key: 'fromEmail', type: 'email', placeholder: 'care@yourdomain.com' },
              { label: 'Sender name', key: 'senderName', type: 'text', placeholder: 'Genfinity O&P' },
              { label: 'Reply-to email', key: 'replyTo', type: 'email', placeholder: 'support@yourdomain.com' }
            ].map(field => (
              <label key={field.key} className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {field.label}
                <input
                  type={field.type}
                  value={String(smtp[field.key as keyof SmtpConfig] || '')}
                  placeholder={field.placeholder}
                  onChange={event => setSmtp(current => ({ ...current, [field.key]: event.target.value, host: 'smtp-relay.brevo.com', port: 587, secure: false }))}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-sm normal-case tracking-normal font-medium text-on-surface outline-none focus:border-secondary"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant">{status}</p>
            <button onClick={saveBrevo} disabled={saving} className="px-5 py-2.5 rounded-xl bg-secondary text-white text-xs font-bold cursor-pointer disabled:opacity-50">{saving ? 'Saving…' : 'Save Brevo settings'}</button>
          </div>
        </section>
      )}

      <section className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-container-highest/40">
          <h3 className="text-base font-extrabold text-on-surface">Recent email</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Delivery history for current patients.</p>
        </div>
        {logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-on-surface-variant">No email has been sent yet.</div>
        ) : (
          <div className="divide-y divide-surface-container-highest/30">
            {logs.slice(0, 12).map(log => (
              <div key={log.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0"><p className="text-xs font-bold text-on-surface truncate">{log.patientName} · {log.subject}</p><p className="text-[10px] text-on-surface-variant mt-0.5">{log.sentAt} · {log.templateName}</p></div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${log.status === 'Sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{log.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {composePatient && <PatientEmailModal patient={composePatient} onClose={() => setComposePatient(null)} onSent={loadEmailData} />}
    </div>
  );
}
