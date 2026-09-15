import React from 'react';
import ClinicLogo from './ClinicLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewPatientClick: () => void;
  clinicName?: string;
  logoUrl?: string;
  doctorImageUrl?: string;
  doctorName?: string;
  isWorkspaceEditMode?: boolean;
  setIsWorkspaceEditMode?: (val: boolean) => void;
  customLabels?: Record<string, string>;
  onUpdateLabel?: (key: string, value: string) => void;
  enabledModules?: Record<string, boolean>;
  onToggleModule?: (moduleId: string) => void;
  onSignOut?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onNewPatientClick,
  clinicName = 'Genfinity O&P',
  logoUrl,
  doctorImageUrl,
  doctorName = 'Deepak Kumar Bhardwaj (BOCO)',
  isWorkspaceEditMode = false,
  setIsWorkspaceEditMode,
  customLabels = {},
  onUpdateLabel,
  enabledModules = {},
  onToggleModule,
  onSignOut,
  collapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: 'today' },
    { id: 'appointments', label: 'Appointments', icon: 'event_note' },
    { id: 'patients', label: 'Patients', icon: 'groups' },
    { id: 'tracker', label: 'Patient tracking', icon: 'timeline' },
    { id: 'communications', label: 'Communication', icon: 'forum' },
    { id: 'billing', label: 'Invoices', icon: 'receipt_long' }
  ];

  const getLabel = (id: string, defaultLabel: string) => {
    return customLabels[`sidebar_${id}`] || defaultLabel;
  };

  return (
    <nav id="app-sidebar" aria-label="Main navigation" className={`relative sticky top-0 bg-surface-container-low dark:bg-surface-container-low shadow-sm h-screen ${collapsed ? 'w-20 md:w-24' : 'w-64 md:w-72'} flex-shrink-0 flex flex-col py-6 z-20 border-r border-surface-container-highest/30 transition-[width] duration-300`}>
      {/* Brand area */}
      <div className={`mb-5 flex items-center ${collapsed ? 'flex-col justify-center gap-2 px-2' : 'justify-between px-5'}`}>
        <ClinicLogo size={collapsed ? 'sm' : 'md'} clinicName={clinicName} logoUrl={logoUrl} onClick={() => setActiveTab('dashboard')} className={collapsed ? 'w-12 overflow-hidden' : ''} />
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-container-highest/50 bg-surface-container-lowest text-on-surface-variant shadow-xs transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[18px]">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
        </button>
      </div>

      {/* New Patient CTA */}
      <div className={`${collapsed ? 'px-3' : 'px-4'} mb-4`}>
        <button
          id="sidebar-new-patient-cta"
          onClick={onNewPatientClick}
          title={collapsed ? 'New Patient' : undefined}
          className={`w-full bg-primary-container text-white rounded-full py-3 text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center shadow-sm cursor-pointer ${collapsed ? 'gap-0' : 'gap-2'}`}
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {!collapsed && 'New Patient'}
        </button>
      </div>

      <div className={`${collapsed ? 'px-3' : 'px-4'} mb-4`}>
        <a
          href="https://clinic.genfinityoandp.com/intake"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Share intake form' : undefined}
          className={`w-full bg-secondary text-white rounded-full py-3 text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center shadow-sm ${collapsed ? 'gap-0' : 'gap-2'}`}
        >
          <span className="material-symbols-outlined text-sm">share</span>
          {!collapsed && 'Share intake form'}
        </a>
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
                className={`group flex items-center justify-between rounded-full ${collapsed ? 'px-1.5' : 'px-3'} py-1.5 transition-all duration-200 ${
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
                  title={collapsed ? getLabel(item.id, item.label) : undefined}
                  className={`flex items-center rounded-full ${collapsed ? 'justify-center gap-0 px-2' : 'gap-3.5 px-3'} py-2 text-sm font-semibold transition-all duration-150 cursor-pointer text-left flex-1 min-w-0 ${
                    isActive && isEnabled
                      ? 'bg-secondary-container text-on-secondary-container dark:bg-secondary dark:text-white font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive && isEnabled ? 'fill' : ''} shrink-0`}>
                    {item.icon}
                  </span>

                  {!collapsed && isWorkspaceEditMode ? (
                    <input
                      type="text"
                      value={getLabel(item.id, item.label)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateLabel?.(`sidebar_${item.id}`, e.target.value)}
                      className="bg-surface border border-primary text-xs text-on-surface font-extrabold px-1.5 py-0.5 rounded outline-none w-full"
                    />
                  ) : !collapsed ? (
                    <span className="truncate">{getLabel(item.id, item.label)}</span>
                  ) : null}
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

      {/* Admin and account controls stay outside the clinical workflow. */}
      <div className="mt-auto px-2 pt-4 border-t border-surface-container-highest/40 space-y-1">
        <button
          onClick={() => setActiveTab('settings')}
          title={collapsed ? 'Settings' : undefined}
          className={`w-full flex items-center rounded-full py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer ${collapsed ? 'justify-center gap-0 px-2' : 'gap-4 px-5'}`}
        >
          <span className="material-symbols-outlined">settings</span>
          {!collapsed && <span>Settings</span>}
        </button>

        <button
          onClick={() => {
            onSignOut?.();
          }}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center rounded-full py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer ${collapsed ? 'justify-center gap-0 px-2' : 'gap-4 px-5'}`}
        >
          <span className="material-symbols-outlined">logout</span>
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Lead Doctor info block */}
        <div className={`mt-3 py-2 flex items-center bg-surface-container-lowest/50 rounded-2xl mx-2 border border-surface-container/20 ${collapsed ? 'justify-center px-1' : 'gap-3 px-4'}`} title={collapsed ? doctorName : undefined}>
          {!doctorImageUrl && <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">{doctorName.split(' ').map(part => part[0]).slice(0, 2).join('')}</div>}
          <img
            className={`${doctorImageUrl ? '' : 'hidden '}w-10 h-10 rounded-full object-cover border border-surface shadow-xs shrink-0`}
            alt={doctorName}
            referrerPolicy="no-referrer"
            src={doctorImageUrl || ''}
          />
          {!collapsed && <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{doctorName}</p>
            <p className="text-[10px] text-on-surface-variant truncate">Lead Orthotist</p>
          </div>}
        </div>
      </div>
    </nav>
  );
}
