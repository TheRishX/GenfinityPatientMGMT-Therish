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
      primaryClinician: 'Dr. Sarah Jenkins',
      address: '123 Clinical Street, Apt 101',
      gender: 'Female',
      clinicalNotes: [],
      diagnosis: 'M21.41 Flat Foot [Pes Planus], Posterior Tibial Tendon Dysfunction',
      affectedSide: 'Left',
      deviceCategory: 'Custom Foot Orthosis',
      careStage: 'Evaluation',
      fabricationOwner: 'Tech Mike',
      authStatus: 'Approved (Expires 12 Oct 2026)',
      lastVisit: '15 May 2026',
      nextAppointment: 'Today · 2:00 PM',
      nextRequiredAction: 'Capture 3D scan and submit l-code authorization',
      allergies: ['Latex Sensitivity'],
      consentStatus: 'Signed & Active (HIPAA)',
      communicationPreference: 'SMS Text',
      blockerBadge: 'Awaiting 3D Scan',
      timeline: [
        {
          id: 'tl_p1_1',
          dateTime: '22 Jul 2026 · 2:00 PM',
          author: 'Dr. Sarah Jenkins',
          eventType: 'visit',
          title: 'Initial Consultation & Biomechanical Assessment',
          summary: 'Assessment recorded. Severe calcaneal valgus on left ankle noted. Custom foot orthosis discussed.',
          outcome: 'Patient agreed with recommended custom rigid triplane arch support.',
          nextAction: 'Capture 3D scanner model & obtain written prescription.',
          status: 'In Progress',
          dueDate: '25 Jul 2026'
        },
        {
          id: 'tl_p1_2',
          dateTime: '15 May 2026 · 10:30 AM',
          author: 'Dr. Sarah Jenkins',
          eventType: 'note',
          title: 'Follow-up Evaluation & Heel Adjustment',
          summary: 'Device discomfort on left heel noted after 2 weeks of full wear.',
          outcome: '0.25" medial heel skive relief adjustment completed.',
          nextAction: 'Monitor skin integrity over 7 days.',
          status: 'Completed',
          attachments: [{ name: 'Heel_Relief_Photo.jpg', type: 'photo' }]
        },
        {
          id: 'tl_p1_3',
          dateTime: '12 Apr 2026 · 9:15 AM',
          author: 'Insurance Auth Dept',
          eventType: 'authorization',
          title: 'Prior Authorization Approved',
          summary: 'Medicare Blue Cross approved L3000 custom foot orthotics.',
          outcome: 'Full coverage confirmed with $0 patient co-pay.',
          status: 'Approved',
          dueDate: '12 Oct 2026'
        },
        {
          id: 'tl_p1_4',
          dateTime: '10 Apr 2026 · 4:00 PM',
          author: 'Tech Mike',
          eventType: 'order',
          title: 'Fabrication Order Created',
          summary: 'Custom orthotic sole created. Casting impression received from clinical floor.',
          outcome: 'Work order #O&P-9012 dispatched to Central Fabrication.',
          status: 'In Lab',
          dueDate: '20 Apr 2026'
        }
      ]
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
      primaryClinician: 'Dr. Aris Thorne',
      address: '456 Healthcare Blvd',
      gender: 'Male',
      clinicalNotes: [],
      diagnosis: 'G81.91 Hemiparesis, Ankle Drop secondary to Stroke',
      affectedSide: 'Right',
      deviceCategory: 'AFO',
      careStage: 'Evaluation',
      fabricationOwner: 'In-House Lab',
      authStatus: 'Prior Auth Pending',
      lastVisit: '10 Jun 2026',
      nextAppointment: 'Today · 3:30 PM',
      nextRequiredAction: 'Review gait video with neurologist & sign L1970 auth',
      allergies: ['None Known'],
      consentStatus: 'Signed & Active',
      communicationPreference: 'Email',
      blockerBadge: '⏳ Auth Pending',
      timeline: [
        {
          id: 'tl_p2_1',
          dateTime: '10 Jun 2026 · 11:00 AM',
          author: 'Dr. Aris Thorne',
          eventType: 'visit',
          title: 'O&P Comprehensive Evaluation',
          summary: 'Right foot drop with moderate spasticity. Evaluated for carbon fiber dynamic response AFO (L1970).',
          outcome: 'Selected custom solid-ankle AFO with articular hinge.',
          nextAction: 'Submit prior auth packet to Aetna PPO.',
          status: 'Auth Pending',
          dueDate: '30 Jun 2026'
        },
        {
          id: 'tl_p2_2',
          dateTime: '02 Jun 2026 · 2:30 PM',
          author: 'Dr. Aris Thorne',
          eventType: 'document',
          title: 'Physician Order & Progress Notes Received',
          summary: 'Received L-code prescription signed by Dr. Reynolds (Neurology).',
          status: 'Rx On File'
        }
      ]
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
      insuranceCompany: 'UnitedHealth Care',
      insuranceId: 'UH-5521-MJ',
      primaryClinician: 'Dr. Sarah Jenkins',
      address: '789 Wellness Lane',
      gender: 'Male',
      clinicalNotes: [],
      diagnosis: 'S82.201A Tibial Shaft Fracture, Non-union',
      affectedSide: 'Bilateral',
      deviceCategory: 'KAFO',
      careStage: 'Fabrication',
      fabricationOwner: 'Tech Mike',
      authStatus: 'Approved',
      lastVisit: '01 Jul 2026',
      nextAppointment: '28 Jul 2026 · 10:00 AM',
      nextRequiredAction: 'Complete thermoforming & joint alignment check in lab',
      allergies: ['Acrylates'],
      consentStatus: 'Signed & Active',
      communicationPreference: 'SMS Text',
      blockerBadge: '🔧 Thermoforming',
      timeline: [
        {
          id: 'tl_p3_1',
          dateTime: '01 Jul 2026 · 9:00 AM',
          author: 'Tech Mike',
          eventType: 'fabrication',
          title: 'Negative Mold Modifications Completed',
          summary: 'Plaster model modified for 3mm relief over fibular head and tibial crest.',
          outcome: 'Vacuum thermoforming scheduled with carbon reinforcement.',
          status: 'In Progress',
          dueDate: '25 Jul 2026'
        },
        {
          id: 'tl_p3_2',
          dateTime: '20 Jun 2026 · 1:15 PM',
          author: 'Dr. Sarah Jenkins',
          eventType: 'visit',
          title: 'Casting & Scanning Session',
          summary: 'Plaster wrap impression taken for bilateral knee-ankle-foot orthosis.',
          nextAction: 'Send plaster positive mold to fabrication shop.',
          status: 'Completed'
        }
      ]
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
      primaryClinician: 'Dr. Aris Thorne',
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
      ],
      diagnosis: 'M21.371 Foot Drop, Right Ankle instability',
      affectedSide: 'Right',
      deviceCategory: 'AFO',
      careStage: 'Fitting',
      fabricationOwner: 'Tech Mike',
      authStatus: 'Approved #MC-8492-EV',
      lastVisit: '18 Jul 2026',
      nextAppointment: 'Today · 1:30 PM',
      nextRequiredAction: 'Trial fitting of custom AFO socket with static alignment check',
      allergies: ['Latex'],
      consentStatus: 'Signed & Active (HIPAA)',
      communicationPreference: 'Phone Call',
      blockerBadge: 'Ready for Trial Fitting',
      timeline: [
        {
          id: 'tl_p4_1',
          dateTime: '18 Jul 2026 · 11:30 AM',
          author: 'Tech Mike',
          eventType: 'fabrication',
          title: 'Final Assembly & QA Completed',
          summary: 'Carbon flex-cuff and posterior spring strut mounted. Padded liner bonded.',
          outcome: 'Device passed quality control. Ready for patient fitting session.',
          status: 'Ready for Fitting',
          attachments: [{ name: 'AFO_Assembled_Front.jpg', type: 'photo' }]
        },
        {
          id: 'tl_p4_2',
          dateTime: '12 Jul 2026 · 2:00 PM',
          author: 'Dr. Aris Thorne',
          eventType: 'visit',
          title: 'Diagnostic Fitting & Trimline Check',
          summary: 'Clear check socket tried on patient. Good total contact observed. Minor pinch at calf band alleviated.',
          outcome: 'Trimline approved for final lamination.',
          nextAction: 'Proceed with carbon fiber lamination.',
          status: 'Completed'
        },
        {
          id: 'tl_p4_3',
          dateTime: '01 Jul 2026 · 10:00 AM',
          author: 'Insurance Dept',
          eventType: 'authorization',
          title: 'Medicare Part B Auth Approved',
          summary: 'Authorization #MC-8492-EV approved L1960 custom polypropylene AFO.',
          status: 'Approved',
          dueDate: '01 Jan 2027'
        }
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
      insuranceCompany: 'Cigna Health',
      insuranceId: 'CG-8992-RC',
      primaryClinician: 'Dr. Sarah Jenkins',
      files: [],
      diagnosis: 'Z89.512 Acquired Absence of Left Leg below Knee',
      affectedSide: 'Left',
      deviceCategory: 'Prosthesis',
      careStage: 'Referral',
      fabricationOwner: 'In-House Lab',
      authStatus: 'Pending Initial Intake',
      lastVisit: 'None',
      nextAppointment: '24 Jul 2026 · 9:00 AM',
      nextRequiredAction: 'Conduct intake evaluation & request operative notes',
      allergies: ['None Known'],
      consentStatus: 'Pending Intake Signature',
      communicationPreference: 'SMS Text',
      blockerBadge: '📋 New Intake',
      timeline: [
        {
          id: 'tl_p5_1',
          dateTime: '21 Jul 2026 · 4:15 PM',
          author: 'Intake Coordinator',
          eventType: 'message',
          title: 'New Referral Received from Metro Rehab',
          summary: 'Transtibial prosthetic consultation referral received from Dr. Vance.',
          outcome: 'Appointment scheduled for 24 Jul 2026.',
          nextAction: 'Send digital welcome packet & insurance verification.',
          status: 'Scheduled'
        }
      ]
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
      insuranceCompany: 'Humana Gold',
      insuranceId: 'HM-4429-MG',
      primaryClinician: 'Dr. Aris Thorne',
      files: [],
      diagnosis: 'M20.12 Hallux Valgus, Plantar Fasciitis',
      affectedSide: 'Bilateral',
      deviceCategory: 'Custom Foot Orthosis',
      careStage: 'Referral',
      fabricationOwner: 'In-House Lab',
      authStatus: 'Verified',
      lastVisit: 'None',
      nextAppointment: '25 Jul 2026 · 11:15 AM',
      nextRequiredAction: 'Perform pressure mat scanning and physical exam',
      allergies: ['None Known'],
      consentStatus: 'Signed & Active',
      communicationPreference: 'Phone Call',
      blockerBadge: 'Awaiting Consult',
      timeline: [
        {
          id: 'tl_p6_1',
          dateTime: '20 Jul 2026 · 10:00 AM',
          author: 'Front Desk',
          eventType: 'visit',
          title: 'Referral Intake & Insurance Verification',
          summary: 'Humana Gold authorization bypass confirmed for custom orthotics.',
          status: 'Ready for Consult'
        }
      ]
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
      insuranceCompany: 'Blue Shield PPO',
      insuranceId: 'BS-1128-JW',
      primaryClinician: 'Dr. Sarah Jenkins',
      files: [],
      diagnosis: 'M54.5 Low Back Pain, Lumbar Spondylosis',
      affectedSide: 'Bilateral',
      deviceCategory: 'Spinal Brace',
      careStage: 'Evaluation',
      fabricationOwner: 'Offsite Vendor',
      authStatus: 'Rx Required from MD',
      lastVisit: '14 Jul 2026',
      nextAppointment: 'Pending Rx',
      nextRequiredAction: 'Fax signed L0637 prescription request to Dr. Miller',
      allergies: ['None Known'],
      consentStatus: 'Signed & Active',
      communicationPreference: 'Patient Portal',
      blockerBadge: '⚠️ Missing Rx',
      timeline: [
        {
          id: 'tl_p7_1',
          dateTime: '14 Jul 2026 · 3:00 PM',
          author: 'Dr. Sarah Jenkins',
          eventType: 'note',
          title: 'TLSO / LSO Spinal Evaluation',
          summary: 'Patient evaluated for custom rigid LSO orthosis following spinal fusion.',
          outcome: 'Selected Aspen Horizon 637 LSO framework.',
          nextAction: 'Obtain detailed clinical diagnosis & physician Rx signature.',
          status: 'Waiting for Rx'
        }
      ]
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
      insuranceCompany: 'Medicare Advantage',
      insuranceId: 'MA-7714-ED',
      primaryClinician: 'Dr. Aris Thorne',
      files: [],
      diagnosis: 'G57.52 Tarsal Tunnel Syndrome, Bilateral Neuropathy',
      affectedSide: 'Left',
      deviceCategory: 'AFO',
      careStage: 'Authorization',
      fabricationOwner: 'Tech Mike',
      authStatus: 'Auth Submitted (8 days waiting)',
      lastVisit: '08 Jul 2026',
      nextAppointment: 'Pending Prior Auth',
      nextRequiredAction: 'Follow up with Medicare Advantage medical director',
      allergies: ['Latex'],
      consentStatus: 'Signed & Active',
      communicationPreference: 'SMS Text',
      blockerBadge: '⏳ Auth Pending',
      timeline: [
        {
          id: 'tl_p8_1',
          dateTime: '08 Jul 2026 · 1:30 PM',
          author: 'Auth Specialist',
          eventType: 'authorization',
          title: 'Prior Auth Request #MA-9921 Submitted',
          summary: 'Submitted clinical documentation & L1930 AFO code justification to insurer.',
          status: 'Pending Approval',
          dueDate: '22 Jul 2026'
        }
      ]
    },
    {
      id: 'p9',
      name: 'Thomas Wright',
      phone: '(555) 543-2109',
      dob: '1950-10-09',
      email: 'thomas@example.com',
      referralSource: 'hospital',
      status: 'In Progress',
      mrn: '#220-91E',
      avatarInitials: 'TW',
      insuranceCompany: 'Kaiser Permanente',
      insuranceId: 'KP-2209-TW',
      primaryClinician: 'Dr. Sarah Jenkins',
      files: [],
      diagnosis: 'E11.621 Type 2 Diabetes with Foot Ulcer',
      affectedSide: 'Bilateral',
      deviceCategory: 'Custom Foot Orthosis',
      careStage: 'Fitting',
      fabricationOwner: 'In-House Lab',
      authStatus: 'Approved #KP-8821',
      lastVisit: '19 Jul 2026',
      nextAppointment: 'Tomorrow · 10:00 AM',
      nextRequiredAction: 'Deliver diabetic depth shoes & custom multi-density inserts',
      allergies: ['None Known'],
      consentStatus: 'Signed & Active',
      communicationPreference: 'Phone Call',
      blockerBadge: 'Ready for Delivery',
      timeline: [
        {
          id: 'tl_p9_1',
          dateTime: '19 Jul 2026 · 11:00 AM',
          author: 'Tech Mike',
          eventType: 'order',
          title: 'Custom Insole Fabrication Complete',
          summary: 'Multi-density EVA with Plastazote top-cover fabricated & inspected.',
          status: 'Ready for Delivery'
        }
      ]
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
    pinCode: '7770',
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
  ],
  smtpConfig: {
    host: 'smtp-relay.brevo.com',
    port: 587,
    user: '',
    pass: '',
    secure: false,
    fromEmail: 'notifications@genfinityortho.com',
    senderName: 'Genfinity Orthotics & Prosthetics Clinic'
  },
  emailTemplates: [
    {
      id: 'temp_appt',
      name: 'Appointment Confirmed & Instructions',
      subject: 'Appointment Confirmed - {clinicName}',
      triggerEvent: 'appointment_booked',
      body: `Dear {patientName},

Your upcoming appointment for {appointmentType} at {clinicName} is confirmed!

📅 Date/Time: {appointmentTime}
📍 Location: {clinicAddress}

O&P Clinical Guidance & Preparations:
1. For lower-limb orthotic fittings (AFO, KAFO, foot orthoses): Please bring or wear stable, lace-up athletic shoes with clean socks.
2. For prosthetic fittings (trans-tibial, trans-femoral evaluations): Please wear loose-fitting clothing or shorts to ensure our clinical specialists can perform precise alignment checks.
3. Documentation: Remember to bring your active insurance card, valid photo ID, and the signed physician prescription if you have not already submitted it.

If you have any questions or need to reschedule, please contact our care team at {clinicPhone} or email us at {supportEmail}.

Warm regards,
Clinical Patient Care
{clinicName}`
    },
    {
      id: 'temp_fab',
      name: 'Custom Device Fabrication Progress',
      subject: 'Custom Device Fabrication Update - {clinicName}',
      triggerEvent: 'fabrication_status_changed',
      body: `Dear {patientName},

We are excited to share an update on your custom-fabricated clinical device ({deviceName})!

🛠️ Current Progress Stage: {fabricationStage}

Our specialized clinical laboratory is hand-crafting your device with the highest standard of bio-mechanical alignment. Each modification, thermoforming, and grinding process is performed by our certified technicians to meet your precise anatomical prescription.

What happens next?
Once the fabrication is fully completed and passes our multi-point Quality Assurance (QA) inspection, we will contact you immediately to schedule your custom fitting and delivery appointment!

Best regards,
Lab Operations & Technical Staff
{clinicName}`
    },
    {
      id: 'temp_auth',
      name: 'Insurance Authorization Approved',
      subject: 'Good News! Insurance Authorization Approved - {clinicName}',
      triggerEvent: 'auth_status_approved',
      body: `Dear {patientName},

Excellent news! We have received formal insurance authorization approval from {payerName} for your custom device ({deviceName}).

📝 Authorization Details:
- Status: APPROVED & ACTIVE
- Auth Reference: {authNumber}

This approval clears our team to proceed with hand-crafting your custom device. Our technical lab has been notified, and materials are being prepared to begin fabrication immediately.

Our administrative team will keep you updated as the device proceeds through development. If you have any immediate questions, feel free to reach us at {clinicPhone}.

Warm regards,
Clinical Care Coordination
{clinicName}`
    },
    {
      id: 'temp_bill',
      name: 'Invoice Statement Alert',
      subject: 'Statement of Account & Patient Co-Pay Statement - {clinicName}',
      triggerEvent: 'invoice_billed',
      body: `Dear {patientName},

Please find summary details of the statement from your recent orthotic/prosthetic treatment.

📄 Account Statement Summary:
- Invoice Number: {claimNumber}
- Insurer Group: {payerName}
- Patient Co-Pay Balance: \${claimAmount}

You can pay this balance securely inside our clinical portal or at our reception desk during your next alignment fitting.

If you have questions about your billing, deductibles, or would like to coordinate a flexible payment schedule, please call our billing desk at {clinicPhone} or reply to {supportEmail}.

Sincerely,
Billing & Patient Accounts
{clinicName}`
    }
  ],
  emailLogs: [
    {
      id: 'log_1',
      recipientEmail: 'eleanor@example.com',
      patientName: 'Eleanor Vance',
      subject: 'Custom Device Fabrication Update - Genfinity O&P',
      body: 'Dear Eleanor Vance,\n\nWe are excited to share an update on your custom-fabricated clinical device (Custom AFO Brace)... Current Progress Stage: Thermoforming...',
      templateName: 'Custom Device Fabrication Progress',
      sentAt: 'Jul 14, 2026, 02:45 PM',
      status: 'Sent'
    },
    {
      id: 'log_2',
      recipientEmail: 'maria@example.com',
      patientName: 'Maria Gonzalez',
      subject: 'Appointment Confirmed - Genfinity O&P',
      body: 'Dear Maria Gonzalez,\n\nYour upcoming appointment for Initial Evaluation - AFO at Genfinity O&P is confirmed!\n\nDate/Time: 09:00 AM...',
      templateName: 'Appointment Confirmed & Instructions',
      sentAt: 'Jul 14, 2026, 11:15 AM',
      status: 'Sent'
    }
  ]
};
