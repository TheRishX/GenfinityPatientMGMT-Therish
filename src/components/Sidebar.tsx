import React from 'react';
import ClinicLogo from './ClinicLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewPatientClick: () => void;
  clinicName?: string;
  doctorName?: string;
  isWorkspaceEditMode?: boolean;
  setIsWorkspaceEditMode?: (val: boolean) => void;
  customLabels?: Record<string, string>;
  onUpdateLabel?: (key: string, value: string) => void;
  enabledModules?: Record<string, boolean>;
  onToggleModule?: (moduleId: string) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onNewPatientClick,
  clinicName = 'Genfinity O&P',
  doctorName = 'Dr. Sarah Jenkins',
  isWorkspaceEditMode = false,
  setIsWorkspaceEditMode,
  customLabels = {},
  onUpdateLabel,
  enabledModules = {},
  onToggleModule
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Operations Today', icon: 'speed' },
    { id: 'patients', label: 'Patients', icon: 'groups' },
    { id: 'appointments', label: 'Appointments', icon: 'calendar_month' },
    { id: 'tracker', label: 'Tracker', icon: 'monitoring' },
    { id: 'authorization', label: 'Authorization', icon: 'verified_user' },
    { id: 'billing', label: 'Billing', icon: 'payments' },
    { id: 'documents', label: 'Documents', icon: 'description' },
    { id: 'fabrication', label: 'Fabrication', icon: 'precision_manufacturing' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  const getLabel = (id: string, defaultLabel: string) => {
    return customLabels[`sidebar_${id}`] || defaultLabel;
  };

  return (
    <nav id="app-sidebar" className="bg-surface-container-low dark:bg-surface-container-low shadow-sm h-screen w-72 flex-shrink-0 fixed left-0 top-0 h-full flex flex-col py-6 z-20 border-r border-surface-container-highest/30">
      {/* Brand area */}
      <div className="px-5 mb-5 flex items-center gap-3">
        <ClinicLogo size="md" />
        <div>
          {isWorkspaceEditMode ? (
            <input
              type="text"
              value={customLabels['clinic_branding_title'] || clinicName}
              onChange={(e) => onUpdateLabel?.('clinic_branding_title', e.target.value)}
              className="bg-surface border border-primary text-sm font-extrabold text-primary tracking-tight px-1 py-0.5 rounded outline-none w-44"
              title="Edit Clinic Name Branding"
            />
          ) : (
            <h1 className="text-xl font-extrabold text-primary tracking-tight leading-tight">
              {customLabels['clinic_branding_title'] || clinicName}
            </h1>
          )}
          <p className="text-xs font-semibold text-on-surface-variant opacity-85 mt-0.5">
            Clinical Portal
          </p>
        </div>
      </div>

      {/* New Patient CTA */}
      <div className="px-4 mb-4">
        <button
          id="sidebar-new-patient-cta"
          onClick={onNewPatientClick}
          className="w-full bg-primary-container text-white rounded-full py-3 text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Patient
        </button>
      </div>

      {/* Customizable Workspace Banner Indicator */}
      {isWorkspaceEditMode && (
        <div className="mx-4 mb-3 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl text-center">
          <p className="text-[10px] font-black text-primary uppercase tracking-wider animate-pulse">
            🛠️ Editing Workspace Layout
          </p>
          <p className="text-[9px] text-primary font-bold mt-0.5">
            Rename tabs or click 👁️ to hide
          </p>
        </div>
      )}

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-none">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          const isEnabled = enabledModules[item.id] !== false;

          // If not editing, hide disabled modules
          if (!isWorkspaceEditMode && !isEnabled) {
            return null;
          }

          return (
            <div
              key={item.id}
              className={`group flex items-center justify-between rounded-full px-3 py-1.5 transition-all duration-200 ${
                isWorkspaceEditMode ? 'border border-dashed border-primary/20 bg-surface/20' : ''
              } ${!isEnabled ? 'opacity-40 bg-surface-container-high/25' : ''}`}
            >
              {/* Active navigation button or custom text input */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    if (isEnabled) {
                      setActiveTab(item.id);
                    }
                  }}
                  disabled={!isEnabled && !isWorkspaceEditMode}
                  className={`flex items-center gap-3.5 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer text-left flex-1 min-w-0 ${
                    isActive && isEnabled
                      ? 'bg-secondary-container text-on-secondary-container dark:bg-secondary dark:text-white font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive && isEnabled ? 'fill' : ''} shrink-0`}>
                    {item.icon}
                  </span>

                  {isWorkspaceEditMode ? (
                    <input
                      type="text"
                      value={getLabel(item.id, item.label)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateLabel?.(`sidebar_${item.id}`, e.target.value)}
                      className="bg-surface border border-primary text-xs text-on-surface font-extrabold px-1.5 py-0.5 rounded outline-none w-full"
                    />
                  ) : (
                    <span className="truncate">{getLabel(item.id, item.label)}</span>
                  )}
                </button>
              </div>

              {/* Toggle visibility eye switch (Workspace Editor mode) */}
              {isWorkspaceEditMode && (
                <button
                  onClick={() => onToggleModule?.(item.id)}
                  className={`p-1.5 rounded-full hover:bg-surface transition-all shrink-0 cursor-pointer ${
                    isEnabled ? 'text-primary' : 'text-on-surface-variant/40'
                  }`}
                  title={isEnabled ? 'Hide module from sidebar' : 'Show module in sidebar'}
                >
                  <span className="material-symbols-outlined text-sm font-black">
                    {isEnabled ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Profile / Support & Customize togglers */}
      <div className="mt-auto px-2 pt-4 border-t border-surface-container-highest/40 space-y-1">
        {/* Workspace Customization Toggle Button */}
        {setIsWorkspaceEditMode && (
          <button
            onClick={() => setIsWorkspaceEditMode(!isWorkspaceEditMode)}
            className={`w-full flex items-center gap-3 rounded-full px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              isWorkspaceEditMode
                ? 'bg-primary text-white shadow-md font-black animate-pulse'
                : 'bg-surface-container text-on-surface border border-surface-container-highest/60 hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-sm font-bold">
              {isWorkspaceEditMode ? 'task_alt' : 'tune'}
            </span>
            <span>{isWorkspaceEditMode ? 'Save Custom Layout' : 'Customize Workspace'}</span>
          </button>
        )}

        <button
          onClick={() => {
            alert('Signing out is disabled in Dev Mode');
          }}
          className="w-full flex items-center gap-4 rounded-full px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>

        {/* Lead Doctor info block */}
        <div className="mt-3 px-4 py-2 flex items-center gap-3 bg-surface-container-lowest/50 rounded-2xl mx-2 border border-surface-container/20">
          <img
            className="w-10 h-10 rounded-full object-cover border border-surface shadow-xs shrink-0"
            alt={doctorName}
            referrerPolicy="no-referrer"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvfLEXk4bMT-A7W-x1bqrduVGRKwngE-nhzs84lU6yGX-DX9UJDUo1JCQr-C0eDq9yuvRY7B2zKHj3ZLxBi-_8Y5zpLVvtHoVn-x2QH_thaHd375Fvcll1Ulk3I63xZjPeRxglkZGxVL7BAGmn_knQ_7QBEnCCDYd4nY8pdAfKoT5uNhHSCtayeekgLJdSrD5Tj2ZE5FGc8AkYeNvEcsfNoAhFqbvtq9ICtMOF4-GluADzdxQLsXpuuw"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{doctorName}</p>
            <p className="text-[10px] text-on-surface-variant truncate">Lead Orthotist</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
