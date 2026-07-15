import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { DatabaseSchema, Patient, PatientFile, Appointment, Authorization, Claim, ClinicSettings, FabricationItem, AlertItem } from './src/types.js';
import { supabase } from './src/utils/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'src', 'db.json');

// Helper to generate initials
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

// Helper to generate MRN
const generateMRN = (): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const c1 = chars[Math.floor(Math.random() * 26)];
  const c2 = chars[Math.floor(Math.random() * 26)];
  return `#${num}-${c1}${c2}`;
};

// Default Seed Data
const DEFAULT_DATABASE: DatabaseSchema = {
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
      files: []
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
      files: []
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
      files: []
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
      patientName: 'John Smith',
      time: '09:00 AM',
      type: 'Initial Evaluation - AFO',
      status: 'Checked In',
      initials: 'JS'
    },
    {
      id: 'a2',
      patientName: 'Emma Watson',
      time: '11:30 AM',
      type: 'Fitting & Delivery',
      status: 'Scheduled',
      initials: 'EW'
    },
    {
      id: 'a3',
      patientName: 'Marcus Thorne',
      time: '01:00 PM',
      type: 'Follow-up Alignment Check',
      status: 'Scheduled',
      initials: 'MT'
    },
    {
      id: 'a4',
      patientName: 'Elena Rodriguez',
      time: '03:30 PM',
      type: 'AFO Adjustment',
      status: 'Scheduled',
      initials: 'ER'
    }
  ],
  authorizations: [
    {
      id: 'au1',
      patientName: 'Sarah Jenkins',
      device: 'AFO - Right Ankle',
      status: 'Pending',
      submittedDate: 'Oct 12, 2023',
      daysWaiting: 14,
      payer: 'BlueCross BlueShield',
      notes: 'Initial claim submittal. Patient has prior auth history with BCBS.'
    },
    {
      id: 'au2',
      patientName: 'Marcus Thorne',
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
      patientName: 'Elena Rodriguez',
      device: 'Custom KAFO',
      status: 'Pending', // In Review in visual but maps to pending state with notes
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
      patientName: 'Sarah Jenkins',
      payer: 'Medicare',
      doctor: 'Dr. Sarah Jenkins',
      amount: 2450.00,
      date: 'Oct 25',
      status: 'Billed'
    },
    {
      id: 'c2',
      claimNumber: 'INV-2023-0890',
      patientName: 'David Chen',
      payer: 'BlueCross',
      doctor: 'Dr. David Chen',
      amount: 1120.00,
      date: 'Oct 24',
      status: 'Billed'
    },
    {
      id: 'c3',
      claimNumber: 'INV-2023-0889',
      patientName: 'Robert Vance',
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
      message: "Michael Brown's authorization expires in 3 days.",
      actionText: 'Review Auth',
      actionTarget: 'auth'
    },
    {
      id: 'al2',
      type: 'info',
      title: 'Missing Documentation',
      message: 'Sarah Davis needs LMN signed.',
      actionText: 'Upload Doc',
      actionTarget: 'documents'
    }
  ]
};

// Database Accessor Helpers
async function readDatabase(): Promise<DatabaseSchema> {
  let db: DatabaseSchema;
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    db = JSON.parse(data);
  } catch (e) {
    db = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }

  try {
    // A. Fetch Clinic Settings from Supabase
    const { data: sData, error: sErr } = await supabase.from('clinic_settings').select('*').single();
    if (sData && !sErr) {
      db.settings.clinicName = sData.clinic_name || db.settings.clinicName;
      db.settings.primaryAddress = sData.clinic_address || db.settings.primaryAddress;
      db.settings.contactPhone = sData.clinic_phone || db.settings.contactPhone;
      db.settings.supportEmail = sData.clinic_email || db.settings.supportEmail;
    }

    // B. Fetch Patients from Supabase
    const { data: pData, error: pErr } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (pData && !pErr) {
      db.patients = pData.map((sp: any) => ({
        id: sp.id,
        name: sp.name || '',
        phone: sp.phone || '',
        dob: sp.dob || '',
        email: sp.email || '',
        referralSource: sp.referral_source || 'other',
        status: sp.status || 'In Progress',
        mrn: sp.notes || '#0000-XX',
        avatarInitials: getInitials(sp.name || 'P'),
        files: sp.documents?.files || [],
        insuranceCompany: sp.auth_info?.insurance_company || '',
        insuranceId: sp.auth_info?.insurance_id || '',
        address: sp.auth_info?.address || '',
        gender: sp.auth_info?.gender || 'Not specified',
        clinicalNotes: sp.auth_info?.clinical_notes || []
      }));
    }

    // C. Fetch Appointments from Supabase
    const { data: aData, error: aErr } = await supabase.from('appointments').select('*').order('appt_date', { ascending: true });
    if (aData && !aErr) {
      db.appointments = aData.map((sa: any) => ({
        id: sa.id,
        patientName: sa.patient_name || '',
        time: sa.appt_time || '09:00 AM',
        type: sa.type || 'Consultation',
        status: sa.status || 'Scheduled',
        initials: getInitials(sa.patient_name || 'A')
      }));
    }
  } catch (supErr) {
    console.error('Supabase read synchronization failed:', supErr);
  }

  return db;
}

async function writeDatabase(db: DatabaseSchema): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  // 1. Get complete DB state
  app.get('/api/data', async (req, res) => {
    try {
      const db = await readDatabase();
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Add Patient
  app.post('/api/patients', async (req, res) => {
    try {
      const { name, phone, dob, email, referralSource, status } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const generatedMrn = generateMRN();

      // Insert directly into live Supabase patients table!
      const { data: newSupPatient, error } = await supabase.from('patients').insert({
        name,
        phone: phone || '',
        dob: dob || '',
        email: email || '',
        referral_source: referralSource || 'other',
        status: status || 'In Progress',
        notes: generatedMrn, // Store MRN here
        documents: { files: [] },
        auth_info: { insurance_company: '' },
        billing: { date: '', amount: 0, status: '' },
        pinned_flag: false
      }).select().single();

      if (error) {
        throw new Error(error.message);
      }

      // Automatically schedule a consult appointment if patient is in Consultation stage
      if (status === 'Consultation') {
        const { error: apptErr } = await supabase.from('appointments').insert({
          patient_name: name,
          appt_time: '02:00 PM',
          type: 'Initial Consult',
          status: 'Scheduled'
        });
        if (apptErr) console.error('Auto appointment insert failed:', apptErr.message);
      }

      res.status(201).json({
        id: newSupPatient.id,
        name: newSupPatient.name,
        phone: newSupPatient.phone,
        dob: newSupPatient.dob,
        email: newSupPatient.email,
        referralSource: newSupPatient.referral_source,
        status: newSupPatient.status,
        mrn: generatedMrn,
        avatarInitials: getInitials(newSupPatient.name),
        files: []
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update Patient Status / Column Position
  app.patch('/api/patients/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { data: updatedPatient, error } = await supabase
        .from('patients')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // If transition to "Consultation", auto-schedule appointment in Supabase
      if (status === 'Consultation') {
        const { error: apptErr } = await supabase.from('appointments').insert({
          patient_name: updatedPatient.name,
          appt_time: '02:00 PM',
          type: 'Initial Consult',
          status: 'Scheduled'
        });
        if (apptErr) console.error('Auto appointment transition insert failed:', apptErr.message);
      }

      res.json({
        id: updatedPatient.id,
        name: updatedPatient.name,
        status: updatedPatient.status
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3a. Comprehensive Patient Update (Demographics, Insurance, Notes)
  app.patch('/api/patients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, dob, email, referralSource, status, insuranceCompany, insuranceId, address, gender, clinicalNotes } = req.body;

      // Fetch current row to merge auth_info properly
      const { data: patient, error: fetchErr } = await supabase.from('patients').select('*').eq('id', id).single();
      if (fetchErr || !patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const updatedAuthInfo = {
        ...(patient.auth_info || {}),
        ...(insuranceCompany !== undefined ? { insurance_company: insuranceCompany } : {}),
        ...(insuranceId !== undefined ? { insurance_id: insuranceId } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(clinicalNotes !== undefined ? { clinical_notes: clinicalNotes } : {})
      };

      const updatePayload: any = {};
      if (name !== undefined) updatePayload.name = name;
      if (phone !== undefined) updatePayload.phone = phone;
      if (dob !== undefined) updatePayload.dob = dob;
      if (email !== undefined) updatePayload.email = email;
      if (referralSource !== undefined) updatePayload.referral_source = referralSource;
      if (status !== undefined) updatePayload.status = status;
      updatePayload.auth_info = updatedAuthInfo;

      const { data: updatedPatient, error: updateErr } = await supabase
        .from('patients')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      res.json({
        id: updatedPatient.id,
        name: updatedPatient.name,
        phone: updatedPatient.phone,
        dob: updatedPatient.dob,
        email: updatedPatient.email,
        referralSource: updatedPatient.referral_source,
        status: updatedPatient.status,
        mrn: updatedPatient.notes || '#0000-XX',
        avatarInitials: getInitials(updatedPatient.name),
        files: updatedPatient.documents?.files || [],
        insuranceCompany: updatedPatient.auth_info?.insurance_company || '',
        insuranceId: updatedPatient.auth_info?.insurance_id || '',
        address: updatedPatient.auth_info?.address || '',
        gender: updatedPatient.auth_info?.gender || 'Not specified',
        clinicalNotes: updatedPatient.auth_info?.clinical_notes || []
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3b. Add Appointment in Supabase
  app.post('/api/appointments', async (req, res) => {
    try {
      const { patientName, time, type, status, appt_date } = req.body;
      if (!patientName) {
        return res.status(400).json({ error: 'Patient name is required' });
      }

      const { data, error } = await supabase.from('appointments').insert({
        patient_name: patientName,
        appt_time: time || '09:00 AM',
        type: type || 'Consultation',
        status: status || 'Scheduled',
        appt_date: appt_date || new Date().toISOString().split('T')[0]
      }).select().single();

      if (error) {
        throw new Error(error.message);
      }

      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3c. Update Appointment Status / Details
  app.patch('/api/appointments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, time, type } = req.body;

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (time !== undefined) updateData.appt_time = time;
      if (type !== undefined) updateData.type = type;

      const { data, error } = await supabase.from('appointments').update(updateData).eq('id', id).select().single();
      if (error) {
        throw new Error(error.message);
      }

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. "Upload" file to patient
  app.post('/api/patients/:id/files', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, size, content } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Filename is required' });
      }

      // Get current files to append the new file
      const { data: patient, error: fetchErr } = await supabase.from('patients').select('documents').eq('id', id).single();
      if (fetchErr || !patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const existingFiles = patient.documents?.files || [];
      const newFile = {
        id: `f_${Date.now()}`,
        name,
        type: type || 'pdf',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        size: size || '1.0 MB',
        content: content || '' // Direct base64 content
      };

      const updatedFiles = [newFile, ...existingFiles];

      const { error: updateErr } = await supabase
        .from('patients')
        .update({ documents: { files: updatedFiles } })
        .eq('id', id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      res.status(201).json(newFile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Delete file from patient
  app.delete('/api/patients/:id/files/:fileId', async (req, res) => {
    try {
      const { id, fileId } = req.params;

      const { data: patient, error: fetchErr } = await supabase.from('patients').select('documents').eq('id', id).single();
      if (fetchErr || !patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const existingFiles = patient.documents?.files || [];
      const updatedFiles = existingFiles.filter((f: any) => f.id !== fileId);

      const { error: updateErr } = await supabase
        .from('patients')
        .update({ documents: { files: updatedFiles } })
        .eq('id', id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      res.json({ success: true, message: 'File deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Update/Create Authorization
  app.patch('/api/authorizations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, payer, authNumber, notes } = req.body;

      const db = await readDatabase();
      const auth = db.authorizations.find(a => a.id === id);

      if (!auth) {
        return res.status(404).json({ error: 'Authorization not found' });
      }

      if (status !== undefined) auth.status = status;
      if (payer !== undefined) auth.payer = payer;
      if (authNumber !== undefined) auth.authNumber = authNumber;
      if (notes !== undefined) auth.notes = notes;

      await writeDatabase(db);
      res.json(auth);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Add Authorization
  app.post('/api/authorizations', async (req, res) => {
    try {
      const { patientName, device, payer, status, notes } = req.body;
      if (!patientName || !device) {
        return res.status(400).json({ error: 'patientName and device are required' });
      }

      const db = await readDatabase();
      const newAuth: Authorization = {
        id: `au_${Date.now()}`,
        patientName,
        device,
        status: status || 'Pending',
        submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        daysWaiting: 1,
        payer: payer || 'Private Pay',
        notes: notes || ''
      };

      db.authorizations.unshift(newAuth);
      await writeDatabase(db);
      res.status(201).json(newAuth);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Add Claim
  app.post('/api/claims', async (req, res) => {
    try {
      const { patientName, payer, doctor, amount, status } = req.body;
      if (!patientName || !amount) {
        return res.status(400).json({ error: 'patientName and amount are required' });
      }

      const db = await readDatabase();
      const count = db.claims.length + 890;
      const newClaim: Claim = {
        id: `c_${Date.now()}`,
        claimNumber: `INV-2023-0${count}`,
        patientName,
        payer: payer || 'Self',
        doctor: doctor || 'Dr. Sarah Jenkins',
        amount: parseFloat(amount),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        status: status || 'Billed'
      };

      db.claims.unshift(newClaim);
      await writeDatabase(db);
      res.status(201).json(newClaim);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Update Clinic Settings
  app.put('/api/settings', async (req, res) => {
    try {
      const { clinicName, primaryAddress, contactPhone, supportEmail, requirePin, pinCode, appearance } = req.body;

      try {
        // Update live database row with id=1
        await supabase.from('clinic_settings').update({
          clinic_name: clinicName,
          clinic_address: primaryAddress,
          clinic_phone: contactPhone,
          clinic_email: supportEmail
        }).eq('id', 1);
      } catch (err) {
        console.error('Supabase settings update failed:', err);
      }

      const db = await readDatabase();
      db.settings = {
        clinicName: clinicName || db.settings.clinicName,
        primaryAddress: primaryAddress || db.settings.primaryAddress,
        contactPhone: contactPhone || db.settings.contactPhone,
        supportEmail: supportEmail || db.settings.supportEmail,
        requirePin: requirePin !== undefined ? requirePin : db.settings.requirePin,
        pinCode: pinCode || db.settings.pinCode,
        appearance: appearance || db.settings.appearance
      };

      await writeDatabase(db);
      res.json(db.settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Update Fabrication Item
  app.patch('/api/fabrication/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { stage, techNotes, priority } = req.body;

      const db = await readDatabase();
      const item = db.fabrication.find(f => f.id === id);

      if (!item) {
        return res.status(404).json({ error: 'Fabrication item not found' });
      }

      if (stage !== undefined) item.stage = stage;
      if (techNotes !== undefined) item.techNotes = techNotes;
      if (priority !== undefined) item.priority = priority;
      item.updatedAt = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

      await writeDatabase(db);
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Dismiss Alert Notification
  app.delete('/api/alerts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const db = await readDatabase();
      db.alerts = db.alerts.filter(a => a.id !== id);
      await writeDatabase(db);
      res.json({ success: true, message: 'Alert notification dismissed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
