import React, { useEffect, useMemo, useState } from 'react';
import { Patient, SmsTemplate } from '../types';

interface Props { patient: Patient; appointmentType?: string; appointmentDate?: string; appointmentTime?: string; onClose: () => void; onSent?: () => void; }

const preferredTrigger = (stage?: string) => {
  if (stage === 'Authorization') return 'auth_status_approved';
  if (stage === 'Fitting' || stage === 'Delivery') return 'fitting_reminder';
  if (stage === 'Evaluation' || stage === 'Referral') return 'documents_needed';
  return 'appointment_booked';
};

export default function PatientSmsModal({ patient, appointmentType, appointmentDate, appointmentTime, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const variables = useMemo(() => ({ patientName: patient.name, clinicName: 'Genfinity O&P', appointmentType: appointmentType || patient.deviceCategory || 'appointment', appointmentTime: appointmentDate && appointmentTime ? `${appointmentDate} at ${appointmentTime}` : patient.nextAppointment || 'To be confirmed' }), [appointmentDate, appointmentTime, appointmentType, patient]);
  const render = (value: string) => Object.entries(variables).reduce<string>((text, [key, replacement]) => text.replace(new RegExp(`{${key}}`, 'g'), String(replacement)), value);
  const apply = (template: SmsTemplate) => { setTemplateId(template.id); setBody(render(template.body)); setError(''); setSuccess(''); };

  useEffect(() => {
    fetch('/api/sms/templates').then(async response => {
      if (!response.ok) throw new Error('Unable to load SMS templates.');
      const data = await response.json();
      const available: SmsTemplate[] = data.smsTemplates || [];
      setTemplates(available);
      const preferred = available.find(item => item.triggerEvent === preferredTrigger(patient.careStage)) || available[0];
      if (preferred) apply(preferred);
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [patient.id]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id, templateId, body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'SMS could not be sent.');
      setSuccess(`Text message sent to ${patient.phone}.`); onSent?.();
    } catch (err: any) { setError(err.message); } finally { setSending(false); }
  };

  return <div onClick={onClose} className="fixed inset-0 z-[90] bg-on-surface/45 modal-backdrop-blur flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="patient-sms-title">
    <div onClick={(event) => event.stopPropagation()} className="w-full max-w-xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-highest">
      <header className="px-5 py-4 border-b border-surface-container-highest/50 flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Text patient</p><h2 id="patient-sms-title" className="text-lg font-extrabold text-on-surface mt-0.5">{patient.name}</h2><p className="text-xs text-on-surface-variant mt-0.5">{patient.phone} · {patient.careStage || patient.status}</p></div><button onClick={onClose} aria-label="Close SMS composer" className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center cursor-pointer hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></header>
      <div className="p-5 space-y-4">{loading ? <div className="py-12 text-center text-sm text-on-surface-variant">Loading message templates…</div> : <>
        <div><label className="form-label">Message template</label><select aria-label="Choose an SMS template" value={templateId} onChange={e => { const template = templates.find(item => item.id === e.target.value); if (template) apply(template); }} className="form-input">{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select><p className="mt-1.5 text-xs text-on-surface-variant">Choose a template, then personalize the message if needed.</p></div>
        <div><label className="form-label">Message</label><textarea value={body} onChange={e => setBody(e.target.value)} rows={6} maxLength={1000} className="form-input resize-y" placeholder="Write a short text message"/><p className="text-xs text-on-surface-variant mt-1 text-right">{body.length}/1000</p></div>
        {error && <p className="px-3 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200">{error}</p>}{success && <p className="px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">{success}</p>}
        <footer className="flex justify-end gap-2 pt-1"><button onClick={onClose} className="secondary-button">Cancel</button><button onClick={send} disabled={sending || !patient.phone || !body.trim()} className="primary-button flex items-center gap-2 disabled:opacity-50"><span className="material-symbols-outlined text-sm">send</span>{sending ? 'Sending…' : 'Send text'}</button></footer>
      </>}</div>
    </div>
  </div>;
}
