import React, { useEffect, useMemo, useState } from 'react';
import { EmailTemplate, Patient } from '../types';

interface PatientEmailModalProps {
  patient: Patient;
  appointmentDate?: string;
  appointmentTime?: string;
  onClose: () => void;
  onSent?: () => void;
}

const preferredTriggerForStage = (stage?: string) => {
  if (stage === 'Authorization') return 'auth_status_approved';
  if (stage === 'Casting/scan' || stage === 'Fabrication') return 'fabrication_status_changed';
  if (stage === 'Closed') return 'invoice_billed';
  return 'appointment_booked';
};

export default function PatientEmailModal({ patient, appointmentDate, appointmentTime, onClose, onSent }: PatientEmailModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const variables = useMemo<Record<string, string>>(() => ({
    patientName: patient.name,
    clinicName: 'Genfinity O&P',
    clinicAddress: 'Clinic address',
    clinicPhone: 'Clinic phone',
    supportEmail: 'Clinic support',
    appointmentType: patient.deviceCategory || 'Clinical appointment',
    appointmentTime: appointmentDate && appointmentTime ? `${appointmentDate} at ${appointmentTime}` : patient.nextAppointment || 'To be confirmed',
    deviceName: patient.deviceCategory || 'Custom device',
    fabricationStage: patient.careStage || patient.status,
    payerName: patient.insuranceCompany || 'Insurance provider',
    authNumber: patient.authStatus || 'Current authorization',
    claimNumber: 'Current claim',
    claimAmount: '0.00'
  }), [appointmentDate, appointmentTime, patient]);

  const renderTemplate = (value: string) => (Object.entries(variables) as Array<[string, string]>).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`{${key}}`, 'g'), replacement),
    value
  );

  const applyTemplate = (template: EmailTemplate) => {
    setTemplateId(template.id);
    setSubject(renderTemplate(template.subject));
    setBody(renderTemplate(template.body));
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/email/config');
        if (!response.ok) throw new Error('Unable to load email templates.');
        const data = await response.json();
        const available: EmailTemplate[] = data.emailTemplates || [];
        setTemplates(available);
        const preferred = available.find(item => item.triggerEvent === preferredTriggerForStage(patient.careStage))
          || available[0];
        if (preferred) applyTemplate(preferred);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, [patient.id]);

  const sendEmail = async () => {
    if (!templateId || !subject.trim() || !body.trim()) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, templateId, subject, body })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Email could not be sent.');
      setSuccess(`Email sent to ${patient.email}.`);
      onSent?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[90] bg-on-surface/45 modal-backdrop-blur flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="patient-email-title">
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-highest">
        <header className="px-5 py-4 border-b border-surface-container-highest/50 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Email patient</p>
            <h2 id="patient-email-title" className="text-lg font-extrabold text-on-surface mt-0.5">{patient.name}</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{patient.email || 'No email address'} · {patient.careStage || patient.status}</p>
          </div>
          <button onClick={onClose} aria-label="Close email composer" className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center cursor-pointer hover:bg-surface-container">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-14 text-center text-sm text-on-surface-variant">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div className="py-14 text-center text-sm text-on-surface-variant">No email templates are configured.</div>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Template for current stage</label>
                <select
                  value={templateId}
                  onChange={event => {
                    const template = templates.find(item => item.id === event.target.value);
                    if (template) applyTemplate(template);
                  }}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-sm font-bold text-on-surface outline-none focus:border-secondary"
                >
                  {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Subject</label>
                <input value={subject} onChange={event => setSubject(event.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-sm text-on-surface outline-none focus:border-secondary" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Message</label>
                <textarea value={body} onChange={event => setBody(event.target.value)} rows={12} className="mt-1.5 w-full px-3 py-3 rounded-xl bg-surface border border-surface-container-highest text-sm leading-relaxed text-on-surface outline-none focus:border-secondary resize-y" />
              </div>

              {error && <p className="px-3 py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">{error}</p>}
              {success && <p className="px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">{success}</p>}

              <footer className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <p className="text-[10px] text-on-surface-variant">Review the generated message before sending.</p>
                <div className="flex gap-2">
                  <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-low cursor-pointer">Cancel</button>
                  <button
                    onClick={sendEmail}
                    disabled={sending || !patient.email}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    {sending ? 'Sending…' : 'Send email'}
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
