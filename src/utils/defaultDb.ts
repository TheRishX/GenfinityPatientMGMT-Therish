import { DatabaseSchema } from '../types';

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

export const generateMRN = (): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const c1 = chars[Math.floor(Math.random() * 26)];
  const c2 = chars[Math.floor(Math.random() * 26)];
  return `#${num}-${c1}${c2}`;
};

export const DEFAULT_DATABASE: DatabaseSchema = {
  patients: [
    {
      id: 'p1',
      name: 'Jane Doe',
      phone: '(555) 123-4567',
      dob: '1988-05-14',
      email: 'jane@example.com',
      referralSource: 'physician',
      status: 'In Progress',
      mrn: '#1293-JD',
      avatarInitials: 'JD',
      files: [],
      insuranceCompany: 'Medicare Blue Cross',
      insuranceId: 'MB-1293-JD',
      address: '123 Clinical Street, Apt 101',
      gender: 'Female',
      clinicalNotes: []
    },
    {
      id: 'p2',
      name: 'Alex Smith',
      phone: '(555) 987-6543',
      dob: '1992-11-23',
      email: 'alex@example.com',
      referralSource: 'hospital',
      status: 'Consultation',
      mrn: '#8832-AS',
      avatarInitials: 'AS',
      files: [],
      insuranceCompany: 'Aetna PPO',
      insuranceId: 'AE-8832-AS',
      address: '456 Healthcare Blvd',
      gender: 'Male',
      clinicalNotes: []
    },
    {
      id: 'p3',
      name: 'Michael Johnson',
      phone: '(555) 456-7890',
      dob: '1975-02-18',
      email: 'michael@example.com',
      referralSource: 'specialist',
      status: 'Fabrication',
      mrn: '#5521-MJ',
      avatarInitials: 'MJ',
      files: [],
      insuranceCompany: 'UnitedHealth',
      insuranceId: 'UH-5521-MJ',
      address: '789 Wellness Lane',
      gender: 'Male',
      clinicalNotes: []
    },
    {
      id: 'p4',
      name: 'Eleanor Vance',
      phone: '(555) 019-2834',
      dob: '1945-04-12',
      email: 'eleanor@example.com',
      referralSource: 'specialist',
      status: 'Fabrication',
      mrn: '#8492-AX',
      avatarInitials: 'EV',
      insuranceCompany: 'Medicare Part B',
      insuranceId: 'MC-8492-EV',
      address: '101 Vintage Way',
      gender: 'Female',
      clinicalNotes: [
        {
          id: 'note_1',
          date: 'Oct 26, 2023, 10:00 AM',
          author: 'Dr. Aris Thorne',
          text: 'Patient was fitted for custom AFO. Dynamic gait analysis shows significant reduction in ankle foot drop. Recommended adjustment to lateral strap.'
        }
      ],
      files: [
        { id: 'f1', name: 'Prescription_DrThorne.pdf', type: 'pdf', date: 'Oct 12, 2023', size: '1.2 MB' },
        { id: 'f2', name: 'Scan_Insurance_Card_Front.jpg', type: 'jpg', date: 'Oct 10, 2023', size: '3.4 MB' },
        { id: 'f3', name: 'Scan_Insurance_Card_Back.jpg', type: 'jpg', date: 'Oct 10, 2023', size: '3.1 MB' },
        { id: 'f4', name: 'Clinical_Notes_Orthopedics.pdf', type: 'pdf', date: 'Oct 05, 2023', size: '5.8 MB' }
      ]
    },
    {
      id: 'p5',
      name: 'Robert Chen',
      phone: '(555) 888-2321',
      dob: '1994-08-12',
      email: 'robert@example.com',
      referralSource: 'physician',
      status: 'New Referral',
      mrn: '#899-23A',
      avatarInitials: 'RC',
      files: []
    },
    {
      id: 'p6',
      name: 'Maria Gonzalez',
      phone: '(555) 777-1111',
      dob: '1985-03-24',
      email: 'maria@example.com',
      referralSource: 'physician',
      status: 'New Referral',
      mrn: '#442-90B',
      avatarInitials: 'MG',
      files: []
    },
    {
      id: 'p7',
      name: 'James Wilson',
      phone: '(555) 222-3333',
      dob: '1962-09-15',
      email: 'james@example.com',
      referralSource: 'specialist',
      status: 'Waiting for Rx',
      mrn: '#112-88C',
      avatarInitials: 'JW',
      files: []
    },
    {
      id: 'p8',
      name: 'Elena Davis',
      phone: '(555) 345-6789',
      dob: '1978-01-22',
      email: 'elena@example.com',
      referralSource: 'physician',
      status: 'Auth Pending',
      mrn: '#771-44D',
      avatarInitials: 'ED',
      files: []
    },
    {
      id: 'p9',
      name: 'Thomas Wright',
      phone: '(555) 543-2109',
      dob: '1950-10-09',
      email: 'thomas@example.com',
      referralSource: 'hospital',
      status: 'Auth Pending',
      mrn: '#220-91E',
      avatarInitials: 'TW',
      files: []
    }
  ],
  appointments: [
    {
      id: 'a1',
      patientName: 'Jane Doe',
      time: '09:00 AM',
      type: 'Initial Evaluation - AFO',
      status: 'Checked In',
      initials: 'JD'
    },
    {
      id: 'a2',
      patientName: 'Alex Smith',
      time: '11:30 AM',
      type: 'Fitting & Delivery',
      status: 'Scheduled',
      initials: 'AS'
    },
    {
      id: 'a3',
      patientName: 'Eleanor Vance',
      time: '01:00 PM',
      type: 'Follow-up Alignment Check',
      status: 'Scheduled',
      initials: 'EV'
    },
    {
      id: 'a4',
      patientName: 'Robert Chen',
      time: '03:30 PM',
      type: 'AFO Adjustment',
      status: 'Scheduled',
      initials: 'RC'
    }
  ],
  authorizations: [
    {
      id: 'au1',
      patientName: 'Elena Davis',
      device: 'AFO - Right Ankle',
      status: 'Pending',
      submittedDate: 'Oct 12, 2023',
      daysWaiting: 14,
      payer: 'BlueCross BlueShield',
      notes: 'Initial claim submittal. Patient has prior auth history with BCBS.'
    },
    {
      id: 'au2',
      patientName: 'Eleanor Vance',
      device: 'Trans-tibial Prosthesis',
      status: 'Approved',
      submittedDate: 'Oct 20, 2023',
      daysWaiting: 6,
      payer: 'Medicare',
      authNumber: 'A-99231',
      notes: 'LMN signed and loaded. Approved on first review.'
    },
    {
      id: 'au3',
      patientName: 'Thomas Wright',
      device: 'Custom KAFO',
      status: 'Pending',
      submittedDate: 'Oct 24, 2023',
      daysWaiting: 2,
      payer: 'Aetna',
      notes: 'Awaiting Response'
    }
  ],
  claims: [
    {
      id: 'c1',
      claimNumber: 'INV-2023-0891',
      patientName: 'Eleanor Vance',
      payer: 'Medicare',
      doctor: 'Dr. Sarah Jenkins',
      amount: 2450.00,
      date: 'Oct 25',
      status: 'Billed'
    },
    {
      id: 'c2',
      claimNumber: 'INV-2023-0890',
      patientName: 'Alex Smith',
      payer: 'BlueCross',
      doctor: 'Dr. David Chen',
      amount: 1120.00,
      date: 'Oct 24',
      status: 'Billed'
    },
    {
      id: 'c3',
      claimNumber: 'INV-2023-0889',
      patientName: 'Jane Doe',
      payer: 'Aetna',
      doctor: 'Dr. Robert Vance',
      amount: 3800.00,
      date: 'Oct 22',
      status: 'Billed'
    }
  ],
  settings: {
    clinicName: 'Genfinity O&P',
    primaryAddress: '123 Prosthetics Way, Suite 400',
    contactPhone: '(555) 123-4567',
    supportEmail: 'support@genfinity.com',
    requirePin: true,
    pinCode: '1234',
    appearance: 'light'
  },
  fabrication: [
    {
      id: 'fab1',
      patientName: 'Eleanor Vance',
      device: 'Custom AFO Brace - Thermoforming',
      stage: 'Thermoforming',
      priority: 'Standard',
      techNotes: 'Vacuum pressure looks stable. Cast corrected +1deg dorsiflexion.',
      updatedAt: 'Oct 26'
    },
    {
      id: 'fab2',
      patientName: 'Michael Johnson',
      device: 'Trans-tibial Socket Layout',
      stage: 'Layout',
      priority: 'Urgent',
      techNotes: 'Needs custom carbon fiber reinforcement layout.',
      updatedAt: 'Oct 26'
    },
    {
      id: 'fab3',
      patientName: 'Jane Doe',
      device: 'KAFO Joint Assembly',
      stage: 'Assembly',
      priority: 'Standard',
      techNotes: 'Becker joints checked and lubricated. Ready for final straps.',
      updatedAt: 'Oct 25'
    }
  ],
  alerts: [
    {
      id: 'al1',
      type: 'warning',
      title: 'Auth Expiring Soon',
      message: "Elena Davis's authorization expires in 3 days.",
      actionText: 'Review Auth',
      actionTarget: 'auth'
    },
    {
      id: 'al2',
      type: 'info',
      title: 'Missing Documentation',
      message: 'Jane Doe needs LMN signed.',
      actionText: 'Upload Doc',
      actionTarget: 'documents'
    }
  ]
};
