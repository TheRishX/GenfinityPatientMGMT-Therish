import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewPatientClick: () => void;
  clinicName?: string;
  doctorName?: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onNewPatientClick,
  clinicName = 'Genfinity O&P',
  doctorName = 'Dr. Sarah Jenkins'
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'patients', label: 'Patients', icon: 'groups' },
    { id: 'tracker', label: 'Tracker', icon: 'monitoring' },
    { id: 'authorization', label: 'Authorization', icon: 'verified_user' },
    { id: 'billing', label: 'Billing', icon: 'payments' },
    { id: 'documents', label: 'Documents', icon: 'description' },
    { id: 'fabrication', label: 'Fabrication', icon: 'precision_manufacturing' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <nav className="bg-surface-container-low dark:bg-surface-container-low shadow-sm h-screen w-72 flex-shrink-0 fixed left-0 top-0 h-full flex flex-col py-8 z-20 border-r border-surface-container-highest/30">
      {/* Brand area */}
      <div className="px-6 mb-8 flex items-center gap-4">
        <span className="material-symbols-outlined text-4xl text-primary fill">healing</span>
        <div>
          <h1 className="text-xl font-extrabold text-primary tracking-tight leading-tight">
            {clinicName}
          </h1>
          <p className="text-xs font-semibold text-on-surface-variant opacity-85">
            Clinical Portal
          </p>
        </div>
      </div>

      {/* New Patient CTA */}
      <div className="px-4 mb-6">
        <button
          onClick={onNewPatientClick}
          className="w-full bg-primary-container text-white rounded-full py-3.5 text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Patient
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-none">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container dark:bg-secondary dark:text-white shadow-sm font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'fill' : ''}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Profile / Support */}
      <div className="mt-auto px-2 pt-4 border-t border-surface-container-highest/40 space-y-1">
        <button
          onClick={() => setActiveTab('support')}
          className={`w-full flex items-center gap-4 rounded-full px-5 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'support'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined">help_outline</span>
          <span>Support</span>
        </button>
        <button
          onClick={() => {
            alert('Signing out is disabled in Dev Mode');
          }}
          className="w-full flex items-center gap-4 rounded-full px-5 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>

        {/* Lead Doctor info block (from mockup #3) */}
        <div className="mt-4 px-4 py-3 flex items-center gap-3 bg-surface-container-lowest/50 rounded-2xl mx-2 border border-surface-container/20">
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
