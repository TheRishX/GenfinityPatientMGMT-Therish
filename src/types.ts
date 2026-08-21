export interface PatientFile {
  id: string;
  name: string;
  type: 'pdf' | 'jpg' | 'png' | 'doc';
  date: string;
  size: string;
  content?: string;
}

export interface ClinicalNote {
  id: string;
  date: string;
  author: string;
  visitType?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  deviceDetails?: {
    deviceCategory?: string;
    lCodes?: string[];
    fabricationSpecs?: string;
    affectedSide?: string;
  };
  measurements?: Record<string, string>;
  goals?: string;
  outcome?: 'completed' | 'needs authorization' | 'sent to fabrication' | 'follow-up required' | string;
  nextTask?: string;
  nextTaskDueDate?: string;
  followUpDate?: string;
  isFinalized?: boolean;
  signedBy?: string;
  signedAt?: string;
  text: string;
}

export type TimelineEventType = 
  | 'visit' 
  | 'note' 
  | 'order' 
  | 'document' 
  | 'authorization' 
  | 'payment' 
  | 'fabrication' 
  | 'message';

export interface TimelineAttachment {
  name: string;
  url?: string;
  type?: 'photo' | 'pdf' | 'doc';
  size?: string;
}

export interface TimelineEvent {
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
  attachments?: TimelineAttachment[];
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  email: string;
  referralSource?: string;
  status: 'In Progress' | 'Consultation' | 'Fabrication' | 'New Referral' | 'Waiting for Rx' | 'Ready for Auth' | 'Auth Pending' | 'Archived';
  mrn: string;
  avatarInitials: string;
  avatarUrl?: string;
  files: PatientFile[];
  insuranceCompany?: string;
  insuranceId?: string;
  primaryClinician?: string;
  address?: string;
  gender?: string;
  clinicalNotes?: ClinicalNote[];

  // O&P Clinical Snapshot Fields
  diagnosis?: string;
  affectedSide?: 'Left' | 'Right' | 'Bilateral';
  deviceCategory?: 'AFO' | 'KAFO' | 'Custom Foot Orthosis' | 'Prosthesis' | 'Spinal Brace' | 'Upper Limb' | 'Repair / Mod';
  careStage?: 'Referral' | 'Evaluation' | 'Authorization' | 'Casting/scan' | 'Fabrication' | 'Fitting' | 'Delivery' | 'Follow-up' | 'Closed';
  fabricationOwner?: string;
  authStatus?: string;
  lastVisit?: string;
  nextAppointment?: string;
  nextRequiredAction?: string;
  allergies?: string[];
  consentStatus?: string;
  communicationPreference?: 'SMS Text' | 'Email' | 'Phone Call' | 'Patient Portal';
  blockerBadge?: string;
  important?: boolean;
  timeline?: TimelineEvent[];
}

export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  time: string;
  type: string;
  status: 'Checked In' | 'Scheduled';
  initials: string;
  date?: string;
}

export interface Authorization {
  id: string;
  patientId?: string;
  patientName: string;
  device: string;
  status: 'Approved' | 'Pending' | 'Denied' | 'Needs More Info';
  submittedDate: string;
  daysWaiting: number;
  payer: string;
  authNumber?: string;
  notes?: string;
}

export interface Claim {
  id: string;
  patientId?: string;
  claimNumber: string;
  patientName: string;
  payer: string;
  doctor: string;
  amount: number;
  date: string;
  status: 'Billed' | 'Paid' | 'Denied';
}

export interface ClinicSettings {
  clinicName: string;
  primaryAddress: string;
  contactPhone: string;
  supportEmail: string;
  requirePin: boolean;
  pinCode: string;
  appearance: 'light' | 'dark';
}

export interface FabricationItem {
  id: string;
  patientId?: string;
  patientName: string;
  device: string;
  stage: 'Layout' | 'Thermoforming' | 'Grinding' | 'Assembly' | 'QA';
  priority: 'Urgent' | 'Standard';
  techNotes: string;
  updatedAt: string;
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'info';
  title: string;
  message: string;
  actionText: string;
  actionTarget: 'auth' | 'documents' | 'tracker' | 'settings';
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromEmail: string;
  senderName: string;
  replyTo?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  triggerEvent: string;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  patientName: string;
  subject: string;
  body: string;
  templateName: string;
  sentAt: string;
  status: 'Sent' | 'Failed' | 'Pending';
  errorMessage?: string;
}

export interface DatabaseSchema {
  patients: Patient[];
  appointments: Appointment[];
  authorizations: Authorization[];
  claims: Claim[];
  settings: ClinicSettings;
  fabrication: FabricationItem[];
  alerts: AlertItem[];
  smtpConfig?: SmtpConfig;
  emailTemplates?: EmailTemplate[];
  emailLogs?: EmailLog[];
}
