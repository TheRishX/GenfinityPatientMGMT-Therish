export interface PatientFile {
  id: string;
  name: string;
  type: 'pdf' | 'jpg' | 'png' | 'doc';
  date: string;
  size: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  email: string;
  referralSource?: string;
  status: 'In Progress' | 'Consultation' | 'Fabrication' | 'New Referral' | 'Waiting for Rx' | 'Ready for Auth' | 'Auth Pending';
  mrn: string;
  avatarInitials: string;
  files: PatientFile[];
}

export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  time: string;
  type: string;
  status: 'Checked In' | 'Scheduled';
  initials: string;
}

export interface Authorization {
  id: string;
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

export interface DatabaseSchema {
  patients: Patient[];
  appointments: Appointment[];
  authorizations: Authorization[];
  claims: Claim[];
  settings: ClinicSettings;
  fabrication: FabricationItem[];
  alerts: AlertItem[];
}
