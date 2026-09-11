import React, { useState } from 'react';
import { Patient, Appointment, Authorization, Claim, TimelineEvent, TimelineEventType } from '../types';
import { compressImageFile, CompressionResult } from '../utils/imageCompressor';

interface PatientTimelineProps {
  patient: Patient;
  appointments: Appointment[];
  authorizations: Authorization[];
  claims: Claim[];
  onNavigateTab: (tabId: string) => void;
  onAddTimelineEntry: (entry: Omit<TimelineEvent, 'id'>) => Promise<void>;
}

export interface GalleryMediaItem {
  id: string;
  name: string;
  url?: string;
  category: 'casting' | 'scan' | 'document' | 'other';
  date: string;
  author: string;
  size?: string;
  compressedStats?: string;
  sourceTitle: string;
  eventType: string;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  patient,
  appointments,
  authorizations,
  claims,
  onNavigateTab,
  onAddTimelineEntry
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'stream' | 'gallery'>('stream');
  const [filterCategory, setFilterCategory] = useState<'all' | 'visits' | 'notes' | 'orders' | 'auth' | 'fabrication' | 'documents'>('all');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'casting' | 'scan' | 'document'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Lightbox Modal State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Direct Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadStats, setUploadStats] = useState<CompressionResult | null>(null);

  // Quick Add Form States
  const [newEventType, setNewEventType] = useState<TimelineEventType>('visit');
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newNextAction, setNewNextAction] = useState('');
  const [newAuthor, setNewAuthor] = useState('Deepak Kumar Bhardwaj (BOCO)');
  const [newStatus, setNewStatus] = useState('Completed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to parse dates into timestamp for sorting
  const getTimestamp = (dateStr: string): number => {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;
    const cleaned = dateStr.split('·')[0].trim();
    const fallback = Date.parse(cleaned);
    return isNaN(fallback) ? Date.now() : fallback;
  };

  // 1. Build unified event list
  const unifiedEvents: Array<{
    id: string;
    dateTime: string;
    author: string;
    eventType: TimelineEventType;
    title: string;
    summary: string;
    outcome?: string;
    nextAction?: string;
    status?: string;
    dueDate?: string;
    attachments?: Array<{ name: string; url?: string; type?: string; size?: string }>;
    icon: string;
    badgeStyle: string;
    tabTarget: string;
    sortKey: number;
    isHighPriority?: boolean;
    priorityReason?: string;
    workflowStage?: 'Auth Pending' | 'Casting' | 'Fabrication' | 'Fitting/Delivery' | 'Overdue';
  }> = [];

  // A. Native Timeline Events from Patient
  (patient.timeline || []).forEach(e => {
    let icon = 'event_note';
    let badgeStyle = 'bg-primary/10 text-primary border-primary/20';
    let tabTarget = 'notes';
    let workflowStage: 'Auth Pending' | 'Casting' | 'Fabrication' | 'Fitting/Delivery' | 'Overdue' | undefined;

    if (e.eventType === 'visit') {
      icon = 'stethoscope';
      badgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200';
      tabTarget = 'appointments';
      workflowStage = 'Fitting/Delivery';
    } else if (e.eventType === 'order' || e.eventType === 'fabrication') {
      icon = 'precision_manufacturing';
      badgeStyle = 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200';
      tabTarget = 'info';
      workflowStage = 'Fabrication';
    } else if (e.eventType === 'authorization') {
      icon = 'verified_user';
      badgeStyle = 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
      tabTarget = 'authorization';
      workflowStage = 'Auth Pending';
    } else if (e.eventType === 'payment') {
      icon = 'receipt_long';
      badgeStyle = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200';
      tabTarget = 'billing';
    } else if (e.eventType === 'document') {
      icon = 'attach_file';
      badgeStyle = 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200';
      tabTarget = 'documents';
    }

    const isHighPriority = e.status === 'Urgent' || e.status === 'Overdue' || (e.nextAction && e.nextAction.toLowerCase().includes('urgent'));

    unifiedEvents.push({
      id: e.id,
      dateTime: e.dateTime,
      author: e.author,
      eventType: e.eventType,
      title: e.title,
      summary: e.summary,
      outcome: e.outcome,
      nextAction: e.nextAction,
      status: e.status,
      dueDate: e.dueDate,
      attachments: e.attachments,
      icon,
      badgeStyle,
      tabTarget,
      sortKey: getTimestamp(e.dateTime),
      isHighPriority,
      priorityReason: isHighPriority ? (e.nextAction || 'Action Required') : undefined,
      workflowStage
    });
  });

  // B. Clinical Notes
  (patient.clinicalNotes || []).forEach(n => {
    const exists = unifiedEvents.some(item => item.summary.includes(n.text));
    if (!exists) {
      unifiedEvents.push({
        id: `note_${n.id}`,
        dateTime: n.date,
        author: n.author || 'Dr. Sarah Jenkins',
        eventType: 'note',
        title: `Clinical Progress Note`,
        summary: n.text,
        icon: 'description',
        badgeStyle: 'bg-primary/10 text-primary border-primary/20',
        tabTarget: 'notes',
        sortKey: getTimestamp(n.date)
      });
    }
  });

  // C. Patient Files / Uploads
  (patient.files || []).forEach(f => {
    const exists = unifiedEvents.some(item => item.title.includes(f.name));
    if (!exists) {
      unifiedEvents.push({
        id: `file_${f.id}`,
        dateTime: f.date,
        author: 'Clinical Records',
        eventType: 'document',
        title: `Document Uploaded: ${f.name}`,
        summary: `Format: ${f.type.toUpperCase()} (${f.size}). Stored in medical record attachments.`,
        attachments: [{ name: f.name, url: f.content, type: f.type, size: f.size }],
        icon: 'attach_file',
        badgeStyle: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200',
        tabTarget: 'documents',
        sortKey: getTimestamp(f.date)
      });
    }
  });

  // D. Appointments
  appointments
    .filter(a => a.patientName.toLowerCase() === patient.name.toLowerCase() || (a.patientId && a.patientId === patient.id))
    .forEach(a => {
      const exists = unifiedEvents.some(item => item.title.includes(a.type) && item.dateTime.includes(a.date || ''));
      if (!exists) {
        const isPastScheduled = a.status === 'Scheduled' && a.date && new Date(a.date) < new Date();
        unifiedEvents.push({
          id: `appt_${a.id}`,
          dateTime: `${a.date || 'Scheduled'} · ${a.time}`,
          author: patient.primaryClinician || 'Dr. Sarah Jenkins',
          eventType: 'visit',
          title: `Appointment (${a.type})`,
          summary: `Clinical visit session scheduled for ${a.type}.`,
          status: isPastScheduled ? 'Overdue Follow-up' : a.status,
          nextAction: 'Confirm patient arrival & prepare clinical suite',
          icon: 'calendar_today',
          badgeStyle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200',
          tabTarget: 'appointments',
          sortKey: getTimestamp(a.date || ''),
          isHighPriority: isPastScheduled,
          priorityReason: isPastScheduled ? 'Overdue Follow-up Visit' : undefined,
          workflowStage: isPastScheduled ? 'Overdue' : 'Fitting/Delivery'
        });
      }
    });

  // E. Authorizations (High priority triggers for pending / expiring)
  authorizations
    .filter(a => a.patientName.toLowerCase() === patient.name.toLowerCase())
    .forEach(a => {
      const exists = unifiedEvents.some(item => item.title.includes(a.device) && item.dateTime.includes(a.submittedDate));
      if (!exists) {
        const isExpiringSoon = a.expirationDate && (new Date(a.expirationDate).getTime() - Date.now() < 14 * 86400000);
        const isPendingLong = a.status === 'Pending' || a.daysWaiting > 7;
        const isUrgent = isExpiringSoon || isPendingLong || a.status === 'Denied';

        unifiedEvents.push({
          id: `auth_${a.id}`,
          dateTime: a.submittedDate,
          author: 'Prior Auth Specialist',
          eventType: 'authorization',
          title: `Prior Authorization: ${a.device}`,
          summary: `Payer: ${a.payer}. Waiting time: ${a.daysWaiting} days. ${a.notes || ''}`,
          status: a.status,
          outcome: `Auth Status: ${a.status}`,
          nextAction: a.status === 'Approved' ? 'Ready for fabrication' : 'Follow up with payer medical director',
          icon: 'verified_user',
          badgeStyle: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200',
          tabTarget: 'authorization',
          sortKey: getTimestamp(a.submittedDate),
          isHighPriority: isUrgent,
          priorityReason: isExpiringSoon ? 'Expiring Auth (<14 Days)' : isPendingLong ? `Pending Auth (${a.daysWaiting} days waiting)` : undefined,
          workflowStage: 'Auth Pending'
        });
      }
    });

  // F. Billing Claims
  claims
    .filter(c => c.patientName.toLowerCase() === patient.name.toLowerCase())
    .forEach(c => {
      const exists = unifiedEvents.some(item => item.title.includes(c.claimNumber));
      if (!exists) {
        unifiedEvents.push({
          id: `claim_${c.id}`,
          dateTime: c.date,
          author: 'Billing Department',
          eventType: 'payment',
          title: `Billing Claim ${c.claimNumber} ($${c.amount})`,
          summary: `Claim submitted to ${c.payer} by ${c.doctor}.`,
          status: c.status,
          icon: 'receipt_long',
          badgeStyle: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200',
          tabTarget: 'billing',
          sortKey: getTimestamp(c.date)
        });
      }
    });

  // Sort newest first
  unifiedEvents.sort((a, b) => b.sortKey - a.sortKey);

  // High Priority Action Items Aggregation
  const highPriorityItems = unifiedEvents.filter(e => e.isHighPriority);

  // 2. Aggregate Gallery Media Items (Photos, Scans, Casting Attachments)
  const aggregatedMedia: GalleryMediaItem[] = [];

  // Gather from files
  (patient.files || []).forEach(f => {
    const isImage = f.type.toLowerCase().includes('png') || f.type.toLowerCase().includes('jpg') || f.type.toLowerCase().includes('jpeg') || f.type.toLowerCase().includes('photo') || f.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/);
    const isScan = f.name.toLowerCase().includes('scan') || f.name.toLowerCase().includes('3d') || f.name.toLowerCase().includes('cast');
    
    aggregatedMedia.push({
      id: f.id,
      name: f.name,
      url: f.content || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
      category: isScan ? 'scan' : isImage ? 'casting' : 'document',
      date: f.date,
      author: 'Clinical Records',
      size: f.size,
      sourceTitle: 'Document Record',
      eventType: 'document'
    });
  });

  // Gather from timeline attachments
  unifiedEvents.forEach(e => {
    if (e.attachments && e.attachments.length > 0) {
      e.attachments.forEach((att, idx) => {
        const isImage = att.type?.includes('jpg') || att.type?.includes('png') || att.type?.includes('photo') || att.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/);
        const isScan = att.name.toLowerCase().includes('scan') || att.name.toLowerCase().includes('3d') || att.name.toLowerCase().includes('stl');

        // Avoid duplication
        if (!aggregatedMedia.some(m => m.name === att.name)) {
          aggregatedMedia.push({
            id: `att_${e.id}_${idx}`,
            name: att.name,
            url: att.url || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
            category: isScan ? 'scan' : isImage ? 'casting' : 'document',
            date: e.dateTime,
            author: e.author,
            size: att.size || '1.2 MB',
            sourceTitle: e.title,
            eventType: e.eventType
          });
        }
      });
    }
  });

  // Filter gallery media
  const filteredGalleryMedia = aggregatedMedia.filter(m => {
    if (galleryFilter === 'all') return true;
    return m.category === galleryFilter;
  });

  // Filter stream events
  const filteredEvents = unifiedEvents.filter(item => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'visits') return item.eventType === 'visit';
    if (filterCategory === 'notes') return item.eventType === 'note';
    if (filterCategory === 'orders') return item.eventType === 'order';
    if (filterCategory === 'auth') return item.eventType === 'authorization';
    if (filterCategory === 'fabrication') return item.eventType === 'fabrication';
    if (filterCategory === 'documents') return item.eventType === 'document';
    return true;
  });

  // Handle Image Upload with Compression
  const handleFileUploadWithCompression = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploadingImage(true);

    try {
      const isImg = file.type.startsWith('image/');
      let compressedUrl = '';
      let stats: CompressionResult | null = null;

      if (isImg) {
        stats = await compressImageFile(file);
        compressedUrl = stats.compressedDataUrl;
        setUploadStats(stats);
      } else {
        compressedUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} · ${now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

      await onAddTimelineEntry({
        dateTime: dateStr,
        author: 'Dr. Sarah Jenkins',
        eventType: 'document',
        title: `Casting / Scan Photo Upload: ${file.name}`,
        summary: stats 
          ? `Uploaded casting imagery. Compressed from ${stats.originalSizeKB} KB to ${stats.compressedSizeKB} KB (${stats.savingsPercentage}% storage saved).`
          : `Uploaded file attachment (${Math.round(file.size / 1024)} KB).`,
        attachments: [
          {
            name: file.name,
            url: compressedUrl,
            type: file.type.includes('png') ? 'png' : 'jpg',
            size: stats ? `${stats.compressedSizeKB} KB` : `${Math.round(file.size / 1024)} KB`
          }
        ],
        status: 'Uploaded'
      });
    } catch (err) {
      console.error('Error during image upload and compression:', err);
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmitNewEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;

    setIsSubmitting(true);
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} · ${now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

    await onAddTimelineEntry({
      dateTime: dateStr,
      author: newAuthor || 'Deepak Kumar Bhardwaj (BOCO)',
      eventType: newEventType,
      title: newTitle.trim(),
      summary: newSummary.trim(),
      outcome: newOutcome.trim() || undefined,
      nextAction: newNextAction.trim() || undefined,
      status: newStatus.trim() || 'Completed'
    });

    setIsSubmitting(false);
    setShowAddModal(false);
    setNewTitle('');
    setNewSummary('');
    setNewOutcome('');
    setNewNextAction('');
  };

  return (
    <div className="space-y-4 max-w-none animate-fade-in">
      {/* 1. TOP HIGH-PRIORITY ACTION ITEMS BANNER (Color-coded O&P Badges) */}
      {highPriorityItems.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/15 border border-amber-500/25 rounded-2xl p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">priority_high</span>
              </span>
              <h3 className="text-xs font-bold text-on-surface">Needs attention</h3>
            </div>
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">{highPriorityItems.length} open</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {highPriorityItems.map(item => (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.tabTarget)}
                className="p-3 bg-surface-container-lowest rounded-xl border border-amber-500/15 hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.workflowStage && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        item.workflowStage === 'Auth Pending'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : item.workflowStage === 'Overdue'
                          ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                          : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {item.workflowStage}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-on-surface-variant font-bold">{item.dateTime.split('·')[0]}</span>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-on-surface group-hover:text-secondary transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-bold line-clamp-2">
                    ⚠️ {item.priorityReason || item.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-secondary pt-1">
                  <span>Review</span>
                  <span className="material-symbols-outlined text-xs group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. MODE NAVIGATION & SEARCH BAR */}
      <div className="bg-surface-container-lowest p-3 rounded-xl border border-surface-container-highest/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-on-surface">Activity</h2>
            {uploadStats && (
              <span className="text-[9.5px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                {uploadStats.savingsPercentage}% smaller
              </span>
            )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-container-low p-1 rounded-xl">
            <button
              onClick={() => setActiveViewMode('stream')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === 'stream'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">history_edu</span>
              Timeline
            </button>
            <button
              onClick={() => setActiveViewMode('gallery')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === 'gallery'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">photo_library</span>
              Media
              <span className="ml-0.5 px-1.5 py-0.5 bg-black/10 dark:bg-white/15 text-current text-[9px] rounded-full font-bold">
                {aggregatedMedia.length}
              </span>
            </button>
          </div>

          {/* Quick Upload Button */}
          <label className="px-3 py-2 bg-primary text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:bg-primary-container">
            <span className="material-symbols-outlined text-sm">
              {isUploadingImage ? 'sync' : 'add_a_photo'}
            </span>
            <span>{isUploadingImage ? 'Uploading…' : 'Add file'}</span>
            <input
              type="file"
              accept="image/*,.stl,.pdf"
              className="hidden"
              onChange={handleFileUploadWithCompression}
              disabled={isUploadingImage}
            />
          </label>
        </div>
      </div>

      {/* 3. VIEW MODE A: CASTING & SCANS GALLERY VIEW */}
      {activeViewMode === 'gallery' && (
        <div className="space-y-4 animate-fade-in">
          {/* Gallery Filter & Summary Header */}
          <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'casting', 'scan', 'document'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setGalleryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer capitalize ${
                    galleryFilter === cat
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat === 'casting' ? 'Casting' : cat === 'scan' ? '3D scans' : 'Documents'}
                </button>
              ))}
          </div>

          {/* Media Grid */}
          {filteredGalleryMedia.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-lowest rounded-3xl border border-dashed border-surface-container p-6 space-y-2">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">photo_library</span>
              <p className="text-xs font-bold text-on-surface-variant">No media or casting photos found for this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGalleryMedia.map((media, idx) => (
                <div
                  key={media.id}
                  onClick={() => setLightboxIndex(idx)}
                  className="bg-surface-container-lowest rounded-xl border border-surface-container-highest/60 overflow-hidden hover:border-secondary transition-all cursor-pointer group flex flex-col justify-between"
                >
                  {/* Image Preview Container */}
                  <div className="relative aspect-4/3 bg-surface-container-high overflow-hidden">
                    <img
                      src={media.url}
                      alt={media.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white">
                      <span className="text-xs font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">zoom_in</span> Click to open clinical lightbox
                      </span>
                    </div>

                    {/* Category Tag */}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md text-white text-[9px] font-black rounded-lg uppercase tracking-wider">
                      {media.category}
                    </span>

                    {/* Compression Pill */}
                    {media.compressedStats && (
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-emerald-600/90 text-white text-[9px] font-extrabold rounded-md backdrop-blur-xs">
                        Compressed
                      </span>
                    )}
                  </div>

                  {/* Metadata Breakdown */}
                  <div className="p-3 space-y-1.5">
                    <h4 className="text-xs font-extrabold text-on-surface truncate group-hover:text-secondary transition-colors" title={media.name}>
                      {media.name}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-semibold border-t border-surface-container/50 pt-2">
                      <span className="flex items-center gap-1 truncate max-w-[60%]">
                        <span className="material-symbols-outlined text-[11px]">person</span>
                        {media.author}
                      </span>
                      <span className="font-mono bg-surface p-1 rounded border border-surface-container text-on-surface">
                        {media.size || 'Compressed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW MODE B: STANDARD UNIFIED TIMELINE STREAM */}
      {activeViewMode === 'stream' && (
        <div className="space-y-6">
          {/* Category Filter & Log Action Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 text-[10.5px] font-bold overflow-x-auto">
              {(['all', 'visits', 'notes', 'orders', 'auth', 'fabrication', 'documents'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer capitalize whitespace-nowrap ${
                    filterCategory === cat
                      ? 'bg-primary text-white shadow-2xs font-black'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-secondary text-white text-[11px] font-bold rounded-lg hover:bg-secondary/90 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">post_add</span>
              Add note
            </button>
          </div>

          {/* Vertical Feed Stream */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-dashed border-surface-container-highest p-6">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">find_in_page</span>
              <p className="text-xs font-bold text-on-surface-variant">No timeline entries matching selected category.</p>
              <button
                onClick={() => setFilterCategory('all')}
                className="mt-3 text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                Reset category filter
              </button>
            </div>
          ) : (
            <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-container-highest">
              {filteredEvents.map(item => (
                <div key={item.id} className="relative group animate-fade-in">
                  {/* Node Icon */}
                  <div className={`absolute -left-7 top-1 w-6 h-6 rounded-full flex items-center justify-center border text-xs shadow-2xs z-10 ${item.badgeStyle}`}>
                    <span className="material-symbols-outlined text-xs">{item.icon}</span>
                  </div>

                  {/* Event Content Card */}
                  <div className={`bg-surface-container-lowest rounded-2xl p-4 border transition-all space-y-3 ${
                    item.isHighPriority
                      ? 'border-2 border-amber-500/60 shadow-xs'
                      : 'border-surface-container-highest/40 hover:border-primary/40 shadow-2xs'
                  }`}>
                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs font-black text-on-surface">
                            {item.title}
                          </h3>
                          <span className="uppercase text-[8.5px] font-black px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">
                            {item.eventType}
                          </span>
                          {item.workflowStage && (
                            <span className="px-2 py-0.5 rounded-md text-[8.5px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary">
                              {item.workflowStage}
                            </span>
                          )}
                          {item.status && (
                            <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold border ${
                              item.isHighPriority
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300/30'
                            }`}>
                              {item.status}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-semibold mt-1">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">person</span>
                            {item.author}
                          </span>
                          {item.dueDate && (
                            <span className="text-amber-700 dark:text-amber-300 font-bold">
                              • Due: {item.dueDate}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-on-surface-variant/80 bg-surface px-2.5 py-1 rounded-lg border border-surface-container-highest/30">
                        {item.dateTime}
                      </span>
                    </div>

                    {/* Summary Text */}
                    <p className="text-xs text-on-surface font-medium leading-relaxed bg-surface-container-low/50 p-3 rounded-xl border border-surface-container-highest/20">
                      {item.summary}
                    </p>

                    {/* Outcomes & Next Actions */}
                    {(item.outcome || item.nextAction) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                        {item.outcome && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50">
                            <span className="block text-[8.5px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">Clinical Outcome</span>
                            <p className="text-on-surface font-semibold mt-0.5">{item.outcome}</p>
                          </div>
                        )}
                        {item.nextAction && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50">
                            <span className="block text-[8.5px] font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">Next Required Action</span>
                            <p className="text-on-surface font-semibold mt-0.5">{item.nextAction}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachments / Photos Preview */}
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="pt-2 border-t border-surface-container-highest/20 space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block">
                          Attached Documents &amp; Photos ({item.attachments.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.attachments.map((att, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                const matchedIndex = aggregatedMedia.findIndex(m => m.name === att.name);
                                if (matchedIndex >= 0) {
                                  setActiveViewMode('gallery');
                                  setLightboxIndex(matchedIndex);
                                }
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-surface-container-highest/40 hover:border-primary transition-all text-xs font-bold text-on-surface cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm text-primary">
                                {att.type === 'jpg' || att.type === 'png' || att.type === 'photo' ? 'photo' : 'description'}
                              </span>
                              <span className="truncate max-w-[180px]">{att.name}</span>
                              <span className="text-[9px] font-mono text-on-surface-variant">({att.size || 'View'})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation Button */}
                    <div className="pt-2 border-t border-surface-container-highest/20 flex justify-end">
                      <button
                        onClick={() => onNavigateTab(item.tabTarget)}
                        className="text-[10px] font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        View in {item.tabTarget.toUpperCase()} module
                        <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. CLINICAL MEDIA LIGHTBOX MODAL */}
      {lightboxIndex !== null && filteredGalleryMedia[lightboxIndex] && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-5xl bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl border border-surface-container-highest flex flex-col max-h-[90vh]">
            {/* Lightbox Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-surface-container-highest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">zoom_in</span>
                </span>
                <div>
                  <h3 className="text-sm font-black text-on-surface truncate max-w-md">
                    {filteredGalleryMedia[lightboxIndex].name}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-bold">
                    Patient: {patient.name} ({patient.mrn}) · Uploaded on {filteredGalleryMedia[lightboxIndex].date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={filteredGalleryMedia[lightboxIndex].url}
                  download={filteredGalleryMedia[lightboxIndex].name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-surface text-on-surface text-xs font-bold rounded-xl border border-surface-container hover:bg-surface-container transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download
                </a>
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm font-bold">close</span>
                </button>
              </div>
            </div>

            {/* Lightbox Main Image Canvas */}
            <div className="relative flex-1 bg-black flex items-center justify-center p-6 overflow-hidden min-h-[360px]">
              <img
                src={filteredGalleryMedia[lightboxIndex].url}
                alt={filteredGalleryMedia[lightboxIndex].name}
                className="max-h-[60vh] w-auto object-contain rounded-xl shadow-lg transition-all"
              />

              {/* Prev / Next Buttons */}
              {lightboxIndex > 0 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
              )}

              {lightboxIndex < filteredGalleryMedia.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              )}
            </div>

            {/* Lightbox Footer Details */}
            <div className="p-5 bg-surface-container-lowest border-t border-surface-container-highest grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Category</span>
                <span className="font-extrabold text-on-surface uppercase">{filteredGalleryMedia[lightboxIndex].category}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Author / Clinician</span>
                <span className="font-extrabold text-on-surface">{filteredGalleryMedia[lightboxIndex].author}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">File Footprint</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {filteredGalleryMedia[lightboxIndex].size || 'Lossless Compressed'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Source Record</span>
                <span className="font-extrabold text-on-surface truncate block">{filteredGalleryMedia[lightboxIndex].sourceTitle}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. LOG ACTIVITY ENTRY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-surface/50 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col border border-surface-container-highest animate-fade-in">
            <div className="px-6 py-4 flex justify-between items-center border-b border-surface-container-highest bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">history_edu</span>
                <h3 className="text-sm font-black text-on-surface">Log Timeline Activity Entry</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs font-bold">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitNewEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Event Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as TimelineEventType)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                  >
                    <option value="visit">Visit / Consult</option>
                    <option value="note">Clinical Assessment</option>
                    <option value="order">Order / Rx Created</option>
                    <option value="authorization">Prior Auth Update</option>
                    <option value="fabrication">Lab Fabrication Update</option>
                    <option value="document">Document / Attachment</option>
                    <option value="payment">Billing / Claim</option>
                    <option value="message">Patient Message</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Author / Clinician</label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                    placeholder="e.g. Deepak Kumar Bhardwaj (BOCO)"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Title / Headline</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                  placeholder="e.g. Initial Evaluation & 3D Foot Scan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Clinical Summary</label>
                <textarea
                  rows={3}
                  required
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none resize-none"
                  placeholder="e.g. Assessment completed. Prescribed custom foot orthosis and captured digital 3D impression."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Outcome (Optional)</label>
                  <input
                    type="text"
                    value={newOutcome}
                    onChange={(e) => setNewOutcome(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                    placeholder="e.g. Prescription approved"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Next Action (Optional)</label>
                  <input
                    type="text"
                    value={newNextAction}
                    onChange={(e) => setNewNextAction(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold focus:border-secondary outline-none"
                    placeholder="e.g. Submit L-Code authorization"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full border border-surface-container-highest text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-secondary text-white text-xs font-bold rounded-full hover:bg-secondary/90 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">post_add</span>
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
