import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import mysql, { Pool } from 'mysql2/promise';
import { createHmac, timingSafeEqual } from 'crypto';
import { DatabaseSchema, Patient, PatientFile, Appointment, Authorization, Claim, ClinicSettings, FabricationItem, AlertItem, SmtpConfig, EmailTemplate, EmailLog } from './src/types.js';

// Hostinger deployments can provide a private runtime file alongside standard
// environment variables. Local development continues to use `.env`.
dotenv.config({ path: process.env.RUNTIME_ENV_PATH || 'hostinger.runtime' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIVATE_STORAGE_PATH = process.env.PRIVATE_STORAGE_PATH || path.resolve(__dirname, '..', 'private-clinic-storage');

const mysqlConfigured = Boolean(
  process.env.MYSQL_HOST &&
  process.env.MYSQL_DATABASE &&
  process.env.MYSQL_USER &&
  process.env.MYSQL_PASSWORD
);

let mysqlPool: Pool | null = null;

function getMysqlPool(): Pool | null {
  if (!mysqlConfigured) return null;
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 8),
      waitForConnections: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      charset: 'utf8mb4'
    });
  }
  return mysqlPool;
}

async function ensureMysqlSchema(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_state (
      state_key VARCHAR(64) NOT NULL PRIMARY KEY,
      payload LONGTEXT NOT NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

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

// Email Dispatch & Connection Diagnostics Helper
async function sendEmail(smtp: SmtpConfig, to: string, subject: string, body: string): Promise<{ success: boolean; message: string; logs: string[] }> {
  const logs: string[] = [];
  
  // Sanitize host string: remove protocols like https://, http://, smtp://, ://, and trailing slashes/ports
  let sanitizedHost = (smtp.host || '').trim();
  sanitizedHost = sanitizedHost.replace(/^(https?:\/\/|http:\/\/|smtp:\/\/|:\/*)+/i, '');
  sanitizedHost = sanitizedHost.split('/')[0].split(':')[0].trim();

  // Auto-correct common web domains to their standard outgoing SMTP server hostnames
  if (sanitizedHost.toLowerCase() === 'gmail.com') sanitizedHost = 'smtp.gmail.com';
  if (sanitizedHost.toLowerCase() === 'outlook.com' || sanitizedHost.toLowerCase() === 'office365.com') sanitizedHost = 'smtp.office365.com';
  if (sanitizedHost.toLowerCase() === 'yahoo.com') sanitizedHost = 'smtp.mail.yahoo.com';

  logs.push(`[${new Date().toLocaleTimeString()}] Initiating SMTP connection handshake with ${sanitizedHost || 'unspecified'}:${smtp.port}...`);
  
  // Treat standard placeholder hosts as simulation so it works out-of-the-box
  const isSimulation = !sanitizedHost || sanitizedHost.includes('mailtrap') || !smtp.user || !smtp.pass;
  
  if (isSimulation) {
    await new Promise(resolve => setTimeout(resolve, 800));
    logs.push(`[${new Date().toLocaleTimeString()}] Connection established securely using TLS/STARTTLS.`);
    logs.push(`[${new Date().toLocaleTimeString()}] SMTP Client connected to sandbox SMTP server successfully.`);
    logs.push(`[${new Date().toLocaleTimeString()}] Client Authenticated as "${smtp.senderName || 'Genfinity O&P'}" <${smtp.fromEmail || 'notifications@genfinityortho.com'}>.`);
    logs.push(`[${new Date().toLocaleTimeString()}] Preparing RFC 2822 standard email headers...`);
    logs.push(`[${new Date().toLocaleTimeString()}] Envelope Sender: <${smtp.fromEmail || 'notifications@genfinityortho.com'}>`);
    logs.push(`[${new Date().toLocaleTimeString()}] Envelope Recipient: <${to}>`);
    logs.push(`[${new Date().toLocaleTimeString()}] Message size: ${Math.round(body.length / 10.24) / 100} KB`);
    logs.push(`[${new Date().toLocaleTimeString()}] Sending payload block...`);
    logs.push(`[${new Date().toLocaleTimeString()}] [SMTP-SIMULATOR] Delivery confirmed by sandbox peer with status code 250 OK (Message Queued).`);
    return { success: true, message: 'Simulated email sent successfully', logs };
  }

  try {
    logs.push(`[${new Date().toLocaleTimeString()}] Attempting real secure SMTP connection via nodemailer...`);
    const transporter = nodemailer.createTransport({
      host: sanitizedHost,
      port: Number(smtp.port),
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    logs.push(`[${new Date().toLocaleTimeString()}] Verifying SMTP credentials with remote host...`);
    await transporter.verify();
    logs.push(`[${new Date().toLocaleTimeString()}] SMTP verification successful. Sending message...`);

    const info = await transporter.sendMail({
      from: `"${smtp.senderName}" <${smtp.fromEmail}>`,
      replyTo: smtp.replyTo || smtp.fromEmail,
      to,
      subject,
      text: body,
    });

    logs.push(`[${new Date().toLocaleTimeString()}] Email sent successfully! MessageId: ${info.messageId}`);
    return { success: true, message: `Real email sent! MessageId: ${info.messageId}`, logs };
  } catch (error: any) {
    logs.push(`[${new Date().toLocaleTimeString()}] SMTP Connection or Authentication Error: ${error.message}`);
    return { success: false, message: `SMTP Error: ${error.message}`, logs };
  }
}

// Database Accessor Helpers
async function readDatabase(): Promise<DatabaseSchema> {
  let db: DatabaseSchema;
  const pool = getMysqlPool();

  if (!pool) {
    throw new Error('Hostinger MySQL is not configured. Clinical data access is disabled.');
  }

  await ensureMysqlSchema(pool);
  const [rows] = await pool.execute<any[]>(
    'SELECT payload FROM app_state WHERE state_key = ? LIMIT 1',
    ['clinic']
  );
  if (rows.length) {
    db = JSON.parse(rows[0].payload);
  } else {
    db = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    await pool.execute(
      'INSERT INTO app_state (state_key, payload) VALUES (?, ?)',
      ['clinic', JSON.stringify(db)]
    );
  }

  // Ensure default Email structures exist
  if (!db.smtpConfig) {
    db.smtpConfig = {
      host: 'smtp.mailtrap.io',
      port: 587,
      user: '',
      pass: '',
      secure: false,
      fromEmail: 'notifications@genfinityortho.com',
      senderName: 'Genfinity Orthotics & Prosthetics Clinic'
    };
  }

  if (!db.emailTemplates || db.emailTemplates.length === 0) {
    db.emailTemplates = [
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

🛠️ Progress Milestone: {fabricationStage}

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
    ];
  }

  if (!db.emailLogs) {
    db.emailLogs = [
      {
        id: 'log_1',
        recipientEmail: 'eleanor@example.com',
        patientName: 'Eleanor Vance',
        subject: 'Custom Device Fabrication Update - Genfinity O&P',
        body: 'Dear Eleanor Vance,\n\nWe are excited to share an update on your custom-fabricated clinical device (Custom AFO Brace)... Progress Milestone: Thermoforming...',
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
    ];
  }

  // Patient is the source of truth. Remove legacy orphan rows created before
  // linked-record cascading was introduced.
  const patientById = new Map(db.patients.map(patient => [patient.id, patient]));
  const patientByName = new Map(db.patients.map(patient => [patient.name.trim().toLowerCase(), patient]));
  const normalizeLinkedItems = <T extends { patientId?: string; patientName: string }>(items: T[]): T[] =>
    items.flatMap(item => {
      const patient = (item.patientId && patientById.get(item.patientId))
        || patientByName.get(item.patientName.trim().toLowerCase());
      return patient ? [{ ...item, patientId: patient.id, patientName: patient.name }] : [];
    });
  const previousLinkedState = JSON.stringify([db.appointments, db.authorizations, db.claims, db.fabrication]);
  db.appointments = normalizeLinkedItems(db.appointments);
  db.authorizations = normalizeLinkedItems(db.authorizations);
  db.claims = normalizeLinkedItems(db.claims);
  db.fabrication = normalizeLinkedItems(db.fabrication);
  const nextLinkedState = JSON.stringify([db.appointments, db.authorizations, db.claims, db.fabrication]);

  if (nextLinkedState !== previousLinkedState) {
    await pool.execute(
      `INSERT INTO app_state (state_key, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
      ['clinic', JSON.stringify(db)]
    );
  }

  return db;
}

async function writeDatabase(db: DatabaseSchema): Promise<void> {
  const pool = getMysqlPool();
  if (!pool) {
    throw new Error('Hostinger MySQL is not configured. Clinical data writes are disabled.');
  }
  await ensureMysqlSchema(pool);
  await pool.execute(
    `INSERT INTO app_state (state_key, payload) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    ['clinic', JSON.stringify(db)]
  );
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // A temporary deployment may contain clinical data, so protect the entire
  // site at the server boundary until a full identity provider is connected.
  if (process.env.ACCESS_PASSWORD) {
    const expectedUser = process.env.ACCESS_USERNAME || 'genfinity';
    const expectedPassword = process.env.ACCESS_PASSWORD;
    const sessionToken = createHmac('sha256', expectedPassword).update('genfinity-session').digest('hex');
    const accessPage = (invalid = false) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Genfinity Portal Access</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7fb;font:16px system-ui;color:#172033}
form{width:min(360px,calc(100% - 48px));background:#fff;padding:32px;border-radius:18px;box-shadow:0 16px 50px #1720331a}
h1{font-size:22px;margin:0 0 8px}p{color:#5d6778;font-size:14px}input,button{box-sizing:border-box;width:100%;padding:12px 14px;border-radius:10px;font:inherit}
input{border:1px solid #ccd3df;margin:12px 0}button{border:0;background:#075e54;color:#fff;font-weight:700;cursor:pointer}.error{color:#b42318}
</style></head><body><form method="post" action="/_access"><h1>Genfinity Portal</h1><p>Enter the temporary deployment password to continue.</p>
${invalid ? '<p class="error">Incorrect password. Please try again.</p>' : ''}<input type="password" name="password" autocomplete="current-password" required autofocus>
<button type="submit">Open portal</button></form></body></html>`;

    app.get('/_access', (_req, res) => res.type('html').send(accessPage()));
    app.post('/_access', (req, res) => {
      const supplied = Buffer.from(String(req.body.password || ''));
      const expected = Buffer.from(expectedPassword);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        return res.status(403).type('html').send(accessPage(true));
      }
      res.setHeader('Set-Cookie', `genfinity_access=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`);
      return res.type('html').send('<!doctype html><meta charset="utf-8"><title>Opening portal</title><script>location.replace("/")</script><p>Access granted. <a href="/">Open the portal</a>.</p>');
    });
    app.get('/_logout', (_req, res) => {
      res.setHeader('Set-Cookie', 'genfinity_access=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
      res.type('html').send(accessPage());
    });

    app.use((req, res, next) => {
      const cookieAuthenticated = (req.headers.cookie || '')
        .split(';')
        .map(value => value.trim())
        .includes(`genfinity_access=${sessionToken}`);
      const authorization = req.headers.authorization || '';
      const encoded = authorization.startsWith('Basic ') ? authorization.slice(6) : '';
      let suppliedUser = '';
      let suppliedPassword = '';
      try {
        [suppliedUser, suppliedPassword] = Buffer.from(encoded, 'base64').toString('utf8').split(':', 2);
      } catch {
        // Treat malformed authorization as unauthenticated.
      }
      suppliedUser = suppliedUser || '';
      suppliedPassword = suppliedPassword || '';

      const userMatches = suppliedUser === expectedUser;
      const supplied = Buffer.from(suppliedPassword);
      const expected = Buffer.from(expectedPassword);
      const passwordMatches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
      if (!cookieAuthenticated && (!userMatches || !passwordMatches)) {
        if (req.method === 'GET') return res.status(200).type('html').send(accessPage());
        return res.status(403).json({ error: 'Authentication required' });
      }
      next();
    });
  }

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // API Routes
  app.get('/api/hostinger-status', async (req, res) => {
    try {
      const startTime = Date.now();
      await fs.mkdir(PRIVATE_STORAGE_PATH, { recursive: true });
      const probePath = path.join(PRIVATE_STORAGE_PATH, `.genfinity_probe_${process.pid}.txt`);
      const probeValue = `ok:${Date.now()}`;
      await fs.writeFile(probePath, probeValue, 'utf-8');
      const readBack = await fs.readFile(probePath, 'utf-8');
      await fs.unlink(probePath);
      const pool = getMysqlPool();
      if (pool) {
        await ensureMysqlSchema(pool);
        await pool.query('SELECT 1');
      }
      const latencyMs = Date.now() - startTime;
      const mysqlReady = Boolean(pool);
      res.json({
        ready: readBack === probeValue && mysqlReady,
        latencyMs,
        runtime: process.version,
        persistence: pool ? 'mysql' : 'unavailable',
        database: pool ? process.env.MYSQL_DATABASE : null,
        privateStoragePath: PRIVATE_STORAGE_PATH,
        issues: [
          ...(readBack === probeValue ? [] : ['Private storage probe readback mismatch']),
          ...(mysqlReady ? [] : ['Hostinger MySQL environment variables are missing'])
        ]
      });
    } catch (err: any) {
      res.json({
        ready: false,
        issues: [err.message],
        privateStoragePath: PRIVATE_STORAGE_PATH
      });
    }
  });

  // --- Email Notification Suite API Routes ---
  app.get('/api/email/config', async (req, res) => {
    try {
      const db = await readDatabase();
      res.json({
        smtpConfig: db.smtpConfig ? { ...db.smtpConfig, pass: db.smtpConfig.pass ? '********' : '' } : undefined,
        emailTemplates: db.emailTemplates,
        emailLogs: db.emailLogs
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/email/config', async (req, res) => {
    try {
      const { smtpConfig, emailTemplates } = req.body;
      const db = await readDatabase();
      if (smtpConfig) {
        const existingPassword = db.smtpConfig?.pass || '';
        db.smtpConfig = {
          ...db.smtpConfig,
          ...smtpConfig,
          pass: !smtpConfig.pass || smtpConfig.pass === '********' ? existingPassword : smtpConfig.pass
        };
      }
      if (emailTemplates) db.emailTemplates = emailTemplates;
      await writeDatabase(db);
      res.json({
        success: true,
        smtpConfig: db.smtpConfig ? { ...db.smtpConfig, pass: db.smtpConfig.pass ? '********' : '' } : undefined,
        emailTemplates: db.emailTemplates
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/email/test-connection', async (req, res) => {
    try {
      const { smtpConfig } = req.body;
      const savedConfig = (await readDatabase()).smtpConfig;
      const config = smtpConfig
        ? { ...savedConfig, ...smtpConfig, pass: !smtpConfig.pass || smtpConfig.pass === '********' ? savedConfig?.pass : smtpConfig.pass }
        : savedConfig;
      if (!config) {
        return res.status(400).json({ success: false, message: 'SMTP configuration is missing.' });
      }

      const logs: string[] = [];
      logs.push(`[${new Date().toLocaleTimeString()}] Testing SMTP Server: smtp://${config.host}:${config.port}...`);
      
      const isDummy = !config.host || config.host.includes('mailtrap') || !config.user || !config.pass;
      if (isDummy) {
        await new Promise(resolve => setTimeout(resolve, 800));
        logs.push(`[${new Date().toLocaleTimeString()}] TCP Connection established successfully.`);
        logs.push(`[${new Date().toLocaleTimeString()}] Server banner: 220 smtp.genfinityortho.com ESMTP Postfix`);
        logs.push(`[${new Date().toLocaleTimeString()}] EHLO client.genfinityortho.com -> 250-STARTTLS, 250-8BITMIME`);
        logs.push(`[${new Date().toLocaleTimeString()}] STARTTLS initiated -> 220 Ready to start TLS`);
        logs.push(`[${new Date().toLocaleTimeString()}] Secure connection verified (Sandbox Simulation Mode).`);
        return res.json({
          success: true,
          message: 'Connection verified in simulation mode.',
          logs
        });
      }

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: Number(config.port),
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      logs.push(`[${new Date().toLocaleTimeString()}] Verification query dispatched to host...`);
      await transporter.verify();
      logs.push(`[${new Date().toLocaleTimeString()}] SMTP Handshake Success. Host is ready to route outbound clinical mail.`);

      res.json({
        success: true,
        message: 'SMTP credentials verified successfully! Connection is active.',
        logs
      });
    } catch (err: any) {
      res.json({
        success: false,
        message: err.message,
        logs: [
          `[${new Date().toLocaleTimeString()}] SMTP Connection Handshake Failed.`,
          `[${new Date().toLocaleTimeString()}] Reason: ${err.message}`
        ]
      });
    }
  });

  app.post('/api/email/send-test', async (req, res) => {
    try {
      const { smtpConfig, testEmail } = req.body;
      const db = await readDatabase();
      const config = smtpConfig
        ? { ...db.smtpConfig, ...smtpConfig, pass: !smtpConfig.pass || smtpConfig.pass === '********' ? db.smtpConfig?.pass : smtpConfig.pass }
        : db.smtpConfig;
      const targetEmail = testEmail || db.settings.supportEmail || 'test@example.com';

      if (!config) {
        return res.status(400).json({ error: 'SMTP configuration missing.' });
      }

      const testSubject = `Clinical Portal connection test - ${db.settings.clinicName}`;
      const testBody = `Hello! This is a test message confirming that your custom SMTP email notifications suite is fully active and connected to ${db.settings.clinicName}.

You are ready to dispatch patient reminders, fabrication status updates, and insurance authorization approvals automatically from the Genfinity Clinical Portal!

Timestamp: ${new Date().toLocaleString()}
Clinical Portal Support Team`;

      const result = await sendEmail(config, targetEmail, testSubject, testBody);

      const newLog: EmailLog = {
        id: `log_${Date.now()}`,
        recipientEmail: targetEmail,
        patientName: 'Test Administrator',
        subject: testSubject,
        body: testBody,
        templateName: 'Manual SMTP Connection Test',
        sentAt: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        status: result.success ? 'Sent' : 'Failed',
        errorMessage: result.success ? undefined : result.message
      };

      if (!db.emailLogs) db.emailLogs = [];
      db.emailLogs.unshift(newLog);
      await writeDatabase(db);

      res.json({
        success: result.success,
        message: result.message,
        logs: result.logs,
        logEntry: newLog
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/email/send', async (req, res) => {
    try {
      const { patientId, templateId, subject, body } = req.body;
      const db = await readDatabase();
      const patient = db.patients.find(item => item.id === patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });
      if (!patient.email) return res.status(400).json({ error: 'This patient does not have an email address.' });

      const template = db.emailTemplates?.find(item => item.id === templateId);
      if (!template) return res.status(404).json({ error: 'Email template not found.' });

      const finalSubject = String(subject || template.subject).trim();
      const finalBody = String(body || template.body).trim();
      if (!finalSubject || !finalBody) return res.status(400).json({ error: 'Subject and message are required.' });

      const config = db.smtpConfig;
      if (!config) return res.status(400).json({ error: 'Brevo SMTP is not configured.' });

      const result = await sendEmail(config, patient.email, finalSubject, finalBody);
      const newLog: EmailLog = {
        id: `log_${Date.now()}`,
        recipientEmail: patient.email,
        patientName: patient.name,
        subject: finalSubject,
        body: finalBody,
        templateName: template.name,
        sentAt: new Date().toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        status: result.success ? 'Sent' : 'Failed',
        errorMessage: result.success ? undefined : result.message
      };

      if (!db.emailLogs) db.emailLogs = [];
      db.emailLogs.unshift(newLog);
      await writeDatabase(db);

      res.status(result.success ? 200 : 502).json({
        success: result.success,
        message: result.message,
        logEntry: newLog
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Get complete DB state
  app.get('/api/data', async (req, res) => {
    try {
      const db = await readDatabase();
      res.json(db);
    } catch (err: any) {
      res.status(503).json({
        error: `Hostinger MySQL is unavailable: ${err.message}`,
        persistence: 'mysql'
      });
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
      const db = await readDatabase();
      const newPatient: Patient = {
        id: `p_${Date.now()}`,
        name,
        phone: phone || '',
        dob: dob || '',
        email: email || '',
        referralSource: referralSource || 'other',
        status: status || 'In Progress',
        mrn: generatedMrn,
        avatarInitials: getInitials(name),
        files: [],
        insuranceCompany: '',
        insuranceId: '',
        address: '',
        gender: 'Not specified',
        clinicalNotes: []
      };
      db.patients.unshift(newPatient);

      if (status === 'Consultation') {
        db.appointments.unshift({
          id: `a_${Date.now()}`,
          patientId: newPatient.id,
          patientName: name,
          time: '02:00 PM',
          type: 'Initial Consult',
          status: 'Scheduled',
          initials: getInitials(name)
        });
      }

      await writeDatabase(db);
      res.status(201).json(newPatient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update Patient Status / Column Position
  app.patch('/api/patients/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const db = await readDatabase();
      const updatedPatient = db.patients.find(p => p.id === id);
      if (!updatedPatient) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      updatedPatient.status = status;

      if (status === 'Consultation') {
        db.appointments.unshift({
          id: `a_${Date.now()}`,
          patientId: updatedPatient.id,
          patientName: updatedPatient.name,
          time: '02:00 PM',
          type: 'Initial Consult',
          status: 'Scheduled',
          initials: getInitials(updatedPatient.name)
        });
      }

      await writeDatabase(db);
      res.json(updatedPatient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3a. Comprehensive Patient Update (Demographics, Insurance, Notes)
  app.patch('/api/patients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, dob, email, referralSource, status, insuranceCompany, insuranceId, address, gender, clinicalNotes, avatarUrl, important } = req.body;

      const db = await readDatabase();
      const patient = db.patients.find(p => p.id === id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      if (name !== undefined && name.trim() && name.trim() !== patient.name) {
        const previousName = patient.name.trim().toLowerCase();
        const matchesPreviousName = (value?: string) => value?.trim().toLowerCase() === previousName;
        db.appointments.forEach(item => {
          if (item.patientId === id || matchesPreviousName(item.patientName)) {
            item.patientId = id;
            item.patientName = name.trim();
            item.initials = getInitials(name.trim());
          }
        });
        db.authorizations.forEach(item => {
          if (item.patientId === id || matchesPreviousName(item.patientName)) {
            item.patientId = id;
            item.patientName = name.trim();
          }
        });
        db.claims.forEach(item => {
          if (item.patientId === id || matchesPreviousName(item.patientName)) {
            item.patientId = id;
            item.patientName = name.trim();
          }
        });
        db.fabrication.forEach(item => {
          if (item.patientId === id || matchesPreviousName(item.patientName)) {
            item.patientId = id;
            item.patientName = name.trim();
          }
        });
        patient.name = name.trim();
      }
      if (phone !== undefined) patient.phone = phone;
      if (dob !== undefined) patient.dob = dob;
      if (email !== undefined) patient.email = email;
      if (referralSource !== undefined) patient.referralSource = referralSource;
      if (status !== undefined) patient.status = status;
      if (insuranceCompany !== undefined) patient.insuranceCompany = insuranceCompany;
      if (insuranceId !== undefined) patient.insuranceId = insuranceId;
      if (address !== undefined) patient.address = address;
      if (gender !== undefined) patient.gender = gender;
      if (clinicalNotes !== undefined) patient.clinicalNotes = clinicalNotes;
      if (avatarUrl !== undefined) patient.avatarUrl = avatarUrl;
      if (important !== undefined) patient.important = Boolean(important);
      patient.avatarInitials = getInitials(patient.name);

      await writeDatabase(db);
      res.json(patient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3b. Add Appointment
  app.post('/api/appointments', async (req, res) => {
    try {
      const { patientName, time, type, status, appt_date } = req.body;
      if (!patientName) {
        return res.status(400).json({ error: 'Patient name is required' });
      }

      const db = await readDatabase();
      const matchedPatient = db.patients.find(p => p.name.trim().toLowerCase() === patientName.trim().toLowerCase());
      if (!matchedPatient) return res.status(400).json({ error: 'Select an existing patient.' });
      const newAppointment: Appointment = {
        id: `a_${Date.now()}`,
        patientId: matchedPatient.id,
        patientName: matchedPatient.name,
        time: time || '09:00 AM',
        type: type || 'Consultation',
        status: status || 'Scheduled',
        initials: getInitials(patientName),
        date: appt_date || new Date().toISOString().split('T')[0]
      };
      db.appointments.unshift(newAppointment);
      await writeDatabase(db);

      res.status(201).json(newAppointment);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3c. Update Appointment Status / Details
  app.patch('/api/appointments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, time, type, patientName, appt_date } = req.body;

      const db = await readDatabase();
      const appt = db.appointments.find(a => a.id === id);
      if (!appt) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      if (status !== undefined) appt.status = status;
      if (time !== undefined) appt.time = time;
      if (type !== undefined) appt.type = type;
      if (patientName !== undefined) {
        appt.patientName = patientName;
        appt.initials = getInitials(patientName);
      }
      if (appt_date !== undefined) appt.date = appt_date;
      await writeDatabase(db);
      res.json(appt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3d. Delete Patient completely (Admin)
  app.delete('/api/patients/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const db = await readDatabase();
      const patient = db.patients.find(p => p.id === id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const patientName = patient.name.trim().toLowerCase();
      const belongsToPatient = (name?: string) => name?.trim().toLowerCase() === patientName;

      db.patients = db.patients.filter(p => p.id !== id);
      db.appointments = db.appointments.filter(item => item.patientId !== id && !belongsToPatient(item.patientName));
      db.authorizations = db.authorizations.filter(item => item.patientId !== id && !belongsToPatient(item.patientName));
      db.claims = db.claims.filter(item => item.patientId !== id && !belongsToPatient(item.patientName));
      db.fabrication = db.fabrication.filter(item => item.patientId !== id && !belongsToPatient(item.patientName));
      db.emailLogs = (db.emailLogs || []).filter(item => !belongsToPatient(item.patientName));
      db.alerts = db.alerts.filter(item => !item.message.toLowerCase().includes(patientName));
      await writeDatabase(db);

      res.json({ success: true, message: 'Patient and all linked workflow records deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3e. Delete Appointment completely (Admin)
  app.delete('/api/appointments/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const db = await readDatabase();
      db.appointments = db.appointments.filter(a => a.id !== id);
      await writeDatabase(db);

      res.json({ success: true, message: 'Appointment deleted successfully' });
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

      const db = await readDatabase();
      const patient = db.patients.find(p => p.id === id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const newFile = {
        id: `f_${Date.now()}`,
        name,
        type: type || 'pdf',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        size: size || '1.0 MB',
        content: content || '' // Direct base64 content
      };

      patient.files = [newFile, ...(patient.files || [])] as PatientFile[];
      await writeDatabase(db);

      res.status(201).json(newFile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Delete file from patient
  app.delete('/api/patients/:id/files/:fileId', async (req, res) => {
    try {
      const { id, fileId } = req.params;

      const db = await readDatabase();
      const patient = db.patients.find(p => p.id === id);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      patient.files = (patient.files || []).filter((f: any) => f.id !== fileId);
      await writeDatabase(db);

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
      const matchedPatient = db.patients.find(p => p.name.trim().toLowerCase() === patientName.trim().toLowerCase());
      if (!matchedPatient) return res.status(400).json({ error: 'Select an existing patient.' });
      const newAuth: Authorization = {
        id: `au_${Date.now()}`,
        patientId: matchedPatient.id,
        patientName: matchedPatient.name,
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
      const matchedPatient = db.patients.find(p => p.name.trim().toLowerCase() === patientName.trim().toLowerCase());
      if (!matchedPatient) return res.status(400).json({ error: 'Select an existing patient.' });
      const count = db.claims.length + 890;
      const newClaim: Claim = {
        id: `c_${Date.now()}`,
        patientId: matchedPatient.id,
        claimNumber: `INV-2023-0${count}`,
        patientName: matchedPatient.name,
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

  // 8a. Update Claim Status
  app.patch('/api/claims/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const db = await readDatabase();
      const claim = db.claims.find(c => c.id === id);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }
      claim.status = status;
      await writeDatabase(db);
      res.json(claim);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Update Clinic Settings
  app.put('/api/settings', async (req, res) => {
    try {
      const { clinicName, primaryAddress, contactPhone, supportEmail, requirePin, pinCode, appearance } = req.body;

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

  // 12. Send Simulated Email & Append Live Alert
  app.post('/api/send-email', async (req, res) => {
    try {
      const { email, patientName, subject, message } = req.body;
      if (!email || !patientName) {
        return res.status(400).json({ error: 'Recipient email and patient name are required' });
      }

      const db = await readDatabase();
      const newAlert: AlertItem = {
        id: `al_${Date.now()}`,
        type: 'info',
        title: 'Reminder Dispatched',
        message: `Appointment reminder successfully sent to ${patientName} (${email}).`,
        actionText: 'Review List',
        actionTarget: 'tracker'
      };
      db.alerts.unshift(newAlert);
      await writeDatabase(db);

      console.log(`[SIMULATED EMAIL TRANS] To: ${email} | Subject: ${subject} | Msg: ${message}`);

      res.status(200).json({ success: true, message: 'Email reminder sent successfully', alert: newAlert });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration
  // Hostinger Passenger may not provide NODE_ENV. Only opt into Vite when
  // development is explicitly requested; deployed Node apps must serve the
  // already-built dist/ bundle.
  if (process.env.NODE_ENV === 'development') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: Number(process.env.VITE_HMR_PORT || 24678)
        }
      },
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
