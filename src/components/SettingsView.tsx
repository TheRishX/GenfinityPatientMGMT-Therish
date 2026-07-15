import React, { useState } from 'react';
import { ClinicSettings } from '../types';

interface SettingsViewProps {
  settings: ClinicSettings;
  onSaveSettings: (settings: ClinicSettings) => Promise<void>;
}

export default function SettingsView({
  settings,
  onSaveSettings
}: SettingsViewProps) {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [primaryAddress, setPrimaryAddress] = useState(settings.primaryAddress);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [requirePin, setRequirePin] = useState(settings.requirePin);
  const [pinCode, setPinCode] = useState(settings.pinCode);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(settings.appearance || 'light');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-3xl">
      {/* View Title */}
      <div className="border-b border-surface-container-highest/20 pb-6">
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Clinic Configuration</h2>
        <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
          Configure security requirements, contact listings, and client metadata
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Clinic Metadata Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-base">home_work</span>
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

        {/* UI Appearance Prefernce (Theme) */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-highest/50 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-base animate-spin animate-duration-[10s]">palette</span>
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
            className="px-8 py-3.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all shadow-xs cursor-pointer"
          >
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
    </div>
  );
}
