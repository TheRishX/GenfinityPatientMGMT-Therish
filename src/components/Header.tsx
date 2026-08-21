import React, { useState, useEffect, useRef } from 'react';
import { Appointment, AlertItem } from '../types';

interface HeaderProps {
  title: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSyncClick?: () => void;
  doctorName?: string;
  clinicName?: string;
  isOfflineMode?: boolean;
  appointments?: Appointment[];
  alerts?: AlertItem[];
  onAlertAction?: (target: string, id: string) => void;
  onDismissAlert?: (id: string) => void;
}

export default function Header({
  title,
  searchTerm,
  setSearchTerm,
  onSyncClick,
  doctorName = 'Dr. Sarah Jenkins',
  clinicName,
  isOfflineMode = false,
  appointments = [],
  alerts = [],
  onAlertAction,
  onDismissAlert
}: HeaderProps) {
  const [hostingerReady, setHostingerReady] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Notifications dropdown state
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/hostinger-status');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setHostingerReady(!!data.ready);
        if (data.latencyMs !== undefined) {
          setLatency(data.latencyMs);
        }
      } else {
        setHostingerReady(false);
      }
    } catch (err) {
      setHostingerReady(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse time helper (e.g. "12:00 PM" -> numeric hour 12.0)
  const parseTimeStr = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const amp = match[3].toUpperCase();
    if (amp === 'PM' && h < 12) h += 12;
    if (amp === 'AM' && h === 12) h = 0;
    return h + m / 60;
  };

  // Helper to construct actual real-time notifications
  const getDynamicNotifications = () => {
    const list: { id: string; title: string; message: string; type: 'appointment' | 'alert' | 'system'; timeText?: string; rawAlert?: AlertItem }[] = [];

    // 1. Database Connection Notification
    if (isOfflineMode || hostingerReady === false) {
      list.push({
        id: 'sys_offline',
        title: 'Local Fallback Active',
        message: 'The portal is usable now. Hostinger API or private storage readiness still needs attention.',
        type: 'system'
      });
    } else if (hostingerReady) {
      list.push({
        id: 'sys_online',
        title: 'Hostinger Backend Ready',
        message: `Connected through the server API with private storage checks active. Latency is ${latency || 12}ms.`,
        type: 'system'
      });
    }

    // 2. Upcoming Appointment Notifications (5-6 hours before appointment)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeFraction = currentHour + currentMinute / 60;

    appointments.forEach((appt) => {
      const apptTimeFraction = parseTimeStr(appt.time);
      if (apptTimeFraction !== null) {
        const hoursRemaining = apptTimeFraction - currentTimeFraction;
        // User requested: "Before the appointment time, for example, today someone has an appointment at 12 p.m., so show the notification 5-6 hours before"
        // Let's alert if appointment is within 6 hours (and is in the future)
        if (hoursRemaining > 0 && hoursRemaining <= 6) {
          const hoursLeftFormatted = Math.floor(hoursRemaining);
          const minutesLeftFormatted = Math.round((hoursRemaining - hoursLeftFormatted) * 60);
          const timeRemainingStr = hoursLeftFormatted > 0 
            ? `${hoursLeftFormatted} hr ${minutesLeftFormatted} min` 
            : `${minutesLeftFormatted} min`;

          list.push({
            id: `appt_${appt.id}`,
            title: `Upcoming Appointment: ${appt.patientName}`,
            message: `${appt.patientName} is scheduled for "${appt.type}" at ${appt.time} today (in ${timeRemainingStr}).`,
            type: 'appointment',
            timeText: appt.time
          });
        }
      }
    });

    // 3. HIPAA & Clinical Alerts
    alerts.forEach((alert) => {
      list.push({
        id: `alert_${alert.id}`,
        title: alert.title,
        message: alert.message,
        type: 'alert',
        rawAlert: alert
      });
    });

    return list;
  };

  const notificationsList = getDynamicNotifications();
  const unreadCount = notificationsList.length;

  return (
    <header id="app-header" className="bg-surface/90 backdrop-blur-md flex justify-between items-center w-full h-20 px-8 z-10 sticky top-0 border-b border-surface-container-highest/30">
      {/* Dynamic Context Title or Search */}
      <div className="flex-1 flex items-center gap-6">
        <h2 className="hidden md:block text-xl font-black text-on-surface mr-2 shrink-0 tracking-tight">
          {title}
        </h2>

        {/* Search input bar */}
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 rounded-full border border-surface-container-highest/80 bg-surface-container-lowest focus:border-secondary focus:ring-2 focus:ring-secondary/10 text-xs font-semibold outline-none transition-all placeholder:text-on-surface-variant/50 shadow-2xs"
            placeholder="Search patients by name, MRN, status..."
          />
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-3 ml-4 relative">
        {/* Sync status */}
        <button
          onClick={onSyncClick}
          title="Force Sync with Database"
          className="p-2.5 text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-full transition-all cursor-pointer flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-lg">sync</span>
        </button>

        {/* Notifications Icon with dropdown list */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Open Notifications Panel"
            className={`p-2.5 rounded-full transition-all relative cursor-pointer flex items-center justify-center ${
              showNotifications ? 'bg-primary-container text-white' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-lg">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Popover Dropdown list */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-surface-container-lowest border border-surface-container-highest rounded-2xl shadow-lg z-50 py-3 animate-fade-in animate-duration-150">
              <div className="px-4 pb-2 border-b border-surface-container flex justify-between items-center">
                <h3 className="font-extrabold text-sm text-on-surface">Clinical Alerts &amp; Schedules</h3>
                <span className="bg-primary/15 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount} active
                </span>
              </div>

              <div className="max-h-[360px] overflow-y-auto divide-y divide-surface-container/40">
                {notificationsList.length > 0 ? (
                  notificationsList.map((notif) => {
                    let iconName = 'info';
                    let iconColor = 'text-secondary';
                    if (notif.type === 'appointment') {
                      iconName = 'calendar_month';
                      iconColor = 'text-teal-600';
                    } else if (notif.type === 'system' && notif.id.includes('offline')) {
                      iconName = 'cloud_off';
                      iconColor = 'text-primary';
                    } else if (notif.type === 'system') {
                      iconName = 'cloud_queue';
                      iconColor = 'text-emerald-600';
                    }

                    return (
                      <div
                        key={notif.id}
                        className="p-4 hover:bg-surface-container-low/40 transition-colors flex gap-3 relative group"
                      >
                        <span className={`material-symbols-outlined text-sm ${iconColor} shrink-0 mt-0.5`}>
                          {iconName}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface leading-tight truncate">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-on-surface-variant font-medium mt-1 leading-normal">
                            {notif.message}
                          </p>
                          {notif.rawAlert && onAlertAction && (
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                onAlertAction(notif.rawAlert!.actionTarget, notif.rawAlert!.id);
                              }}
                              className="text-[10px] text-secondary font-bold underline hover:text-secondary-container mt-1.5 flex items-center gap-0.5"
                            >
                              {notif.rawAlert.actionText}
                              <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                            </button>
                          )}
                        </div>

                        {/* Dismiss alert check */}
                        {notif.type === 'alert' && onDismissAlert && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDismissAlert(notif.rawAlert!.id);
                            }}
                            className="text-on-surface-variant/40 hover:text-primary transition-colors p-1"
                            title="Dismiss Notification"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs font-semibold text-on-surface-variant">
                    No active notifications or alerts.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
