import React, { useState } from 'react';
import ClinicLogo from './ClinicLogo';

interface Props { clinicName?: string; logoUrl?: string; passcode: string; onUnlock: () => void; }

export default function PasscodeGate({ clinicName, logoUrl, passcode, onUnlock }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (value === passcode) { localStorage.setItem('genfinity_device_unlock_until', String(Date.now() + 30 * 24 * 60 * 60 * 1000)); onUnlock(); } else { setValue(''); setError('That passcode is not correct. Try again.'); } };
  return <main className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl border border-surface-container-highest/50 shadow-lg p-7 text-center"><ClinicLogo size="md" clinicName={clinicName} logoUrl={logoUrl} className="justify-center mb-6" /><h1 className="text-2xl font-black text-on-surface">Enter passcode</h1><p className="text-sm text-on-surface-variant mt-2">Unlock {clinicName || 'Genfinity Portal'} on this device.</p><label className="sr-only" htmlFor="portal-passcode">Passcode</label><input id="portal-passcode" autoFocus type="password" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} value={value} onChange={e => { setValue(e.target.value.replace(/\D/g, '')); setError(''); }} className="form-input mt-6 text-center text-2xl tracking-[0.45em]" placeholder="••••" /><button type="submit" className="primary-button w-full mt-4">Unlock portal</button>{error && <p className="text-sm font-semibold text-red-700 mt-3" role="alert">{error}</p>}<p className="text-xs text-on-surface-variant mt-5">You will not be asked again on this device for 30 days.</p></form></main>;
}
