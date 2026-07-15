import React from 'react';

interface HeaderProps {
  title: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSyncClick?: () => void;
  doctorName?: string;
  clinicName?: string;
  isOfflineMode?: boolean;
}

export default function Header({
  title,
  searchTerm,
  setSearchTerm,
  onSyncClick,
  doctorName = 'Dr. Sarah Jenkins',
  clinicName,
  isOfflineMode = false
}: HeaderProps) {
  return (
    <header className="bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-md flex justify-between items-center w-full h-20 px-6 z-10 sticky top-0 border-b border-surface-container-highest/20">
      {/* Dynamic Context Title or Search */}
      <div className="flex-1 flex items-center gap-4">
        <h2 className="hidden md:block text-lg font-extrabold text-on-surface mr-2 shrink-0 tracking-tight">
          {title}
        </h2>
        <span className="bg-emerald-100/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 shrink-0 border border-emerald-200/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Supabase Online
        </span>
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full border-2 border-surface-container-highest bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/10 text-sm outline-none transition-all placeholder:text-on-surface-variant/60"
            placeholder="Search patients by name, MRN, status..."
          />
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-4 ml-4">
        {/* Sync status */}
        <button
          onClick={onSyncClick}
          title="Force Sync with Database"
          className="p-2.5 text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-full transition-all cursor-pointer flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-lg">sync</span>
        </button>

        {/* Notifications */}
        <button className="p-2.5 text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-full transition-all relative cursor-pointer flex items-center justify-center">
          <span className="material-symbols-outlined text-lg">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* User profile picture */}
        <div className="flex items-center gap-3 border-l border-surface-container-highest/60 pl-4">
          <img
            className="w-9 h-9 rounded-full object-cover border border-surface-container-highest"
            referrerPolicy="no-referrer"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlc5eW89oFLhxkWhbcqvfXUSPr-QBhECg-K3I7ysVAyhotpdE1_5HUGPlpT-wv6wQh1hi5eDwPfAJnWFmD47efUWRrznOAFh-gf_6y1QVRhe61qyFzYsn-72GDzs9JhamBVe0qN0P8uG-O1q0JwLlUjCeRecGewuIlMEDQCidiHmGTh5Du5WswqHmJHtHIqshjcIsi2e2KvNwj_19Af8pS6icq6rbRtykEN0Vq80Br30yyPiJp1RY8Mg"
            alt={doctorName}
          />
        </div>
      </div>
    </header>
  );
}
