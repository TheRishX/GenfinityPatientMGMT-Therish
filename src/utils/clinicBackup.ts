import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { DatabaseSchema, Patient } from '../types';

export const CLINIC_BACKUP_FORMAT = 'genfinity-clinic-backup-v1';

export interface ClinicBackupPreview {
  patients: number;
  appointments: number;
  authorizations: number;
  claims: number;
  fabrication: number;
  alerts: number;
  intakeSubmissions: number;
  documents: number;
  exportedAt?: string;
}

export interface ClinicBackupImport {
  database: DatabaseSchema;
  preview: ClinicBackupPreview;
}

function jsonValue(value: unknown): string {
  return value == null ? '' : JSON.stringify(value);
}

function dataUrlBytes(value: string): { bytes: Uint8Array; extension: string } | null {
  const match = value.match(/^data:([^;,]+)?;base64,(.*)$/s);
  if (!match) return null;
  const mime = match[1] || 'application/octet-stream';
  const extension = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes, extension };
}

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '_').replace(/^\.+/, '') || 'document';
}

function sheetFromRows(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Notice: 'No records' }]);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

export async function createClinicBackup(database: DatabaseSchema): Promise<Blob> {
  const exportedAt = new Date().toISOString();
  const documents: Array<{ patientId: string; fileId: string; name: string; path: string; bytes: number }> = [];
  const zip = new JSZip();

  database.patients.forEach(patient => {
    (patient.files || []).forEach(file => {
      if (!file.content) return;
      const decoded = dataUrlBytes(file.content);
      if (!decoded) return;
      const fileName = `${safeFileName(file.name || file.id)}.${decoded.extension}`;
      const path = `documents/${safeFileName(patient.id)}/${fileName}`;
      zip.file(path, decoded.bytes);
      documents.push({ patientId: patient.id, fileId: file.id, name: file.name, path, bytes: decoded.bytes.byteLength });
    });
  });

  const workbook = XLSX.utils.book_new();
  sheetFromRows(workbook, 'Patients', database.patients.map(patient => ({
    ...patient,
    files: jsonValue(patient.files),
    clinicalNotes: jsonValue(patient.clinicalNotes),
    allergies: jsonValue(patient.allergies),
    timeline: jsonValue(patient.timeline)
  })));
  sheetFromRows(workbook, 'Appointments', database.appointments.map(item => ({ ...item, reminderStatus: jsonValue(item.reminderStatus) })));
  sheetFromRows(workbook, 'Authorizations', database.authorizations.map(item => ({ ...item })));
  sheetFromRows(workbook, 'Claims', database.claims.map(item => ({ ...item })));
  sheetFromRows(workbook, 'Fabrication', database.fabrication.map(item => ({ ...item })));
  sheetFromRows(workbook, 'Alerts', database.alerts.map(item => ({ ...item })));
  sheetFromRows(workbook, 'Intake Submissions', (database.intakeSubmissions || []).map(item => ({ ...item, data: jsonValue(item.data) })));
  sheetFromRows(workbook, 'Documents', documents);
  sheetFromRows(workbook, 'Clinic Settings', [{ ...database.settings, exportedAt }]);
  sheetFromRows(workbook, 'Export Metadata', [{ format: CLINIC_BACKUP_FORMAT, exportedAt, documentCount: documents.length, patientCount: database.patients.length }]);
  const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  const preview: ClinicBackupPreview = {
    patients: database.patients.length,
    appointments: database.appointments.length,
    authorizations: database.authorizations.length,
    claims: database.claims.length,
    fabrication: database.fabrication.length,
    alerts: database.alerts.length,
    intakeSubmissions: database.intakeSubmissions?.length || 0,
    documents: documents.length,
    exportedAt
  };
  zip.file('genfinity-clinic-data.xlsx', workbookBytes);
  zip.file('database.json', JSON.stringify(database, null, 2));
  zip.file('manifest.json', JSON.stringify({ format: CLINIC_BACKUP_FORMAT, exportedAt, preview }, null, 2));
  zip.file('README.txt', 'Genfinity O&P clinic backup. The Excel workbook is for review and reporting; database.json is the lossless restore source. Keep this package encrypted and share it only with authorized staff.');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateDatabase(value: unknown): DatabaseSchema {
  if (!isRecord(value)) throw new Error('Backup database is not a valid object.');
  const requiredArrays = ['patients', 'appointments', 'authorizations', 'claims', 'fabrication', 'alerts'];
  if (!requiredArrays.every(key => Array.isArray(value[key]))) throw new Error('Backup is missing one or more required data collections.');
  if (!isRecord(value.settings)) throw new Error('Backup is missing clinic settings.');
  const patients = value.patients as Patient[];
  if (patients.some(patient => !isRecord(patient) || typeof patient.id !== 'string' || typeof patient.name !== 'string' || !Array.isArray(patient.files))) {
    throw new Error('Backup contains an invalid patient record.');
  }
  const ids = new Set<string>();
  if (patients.some(patient => ids.has(patient.id) || !ids.add(patient.id))) throw new Error('Backup contains duplicate patient IDs.');
  return value as DatabaseSchema;
}

function previewFor(database: DatabaseSchema, exportedAt?: string): ClinicBackupPreview {
  return {
    patients: database.patients.length,
    appointments: database.appointments.length,
    authorizations: database.authorizations.length,
    claims: database.claims.length,
    fabrication: database.fabrication.length,
    alerts: database.alerts.length,
    intakeSubmissions: database.intakeSubmissions?.length || 0,
    documents: database.patients.reduce((total, patient) => total + (patient.files || []).filter(file => Boolean(file.content)).length, 0),
    exportedAt
  };
}

export async function readClinicBackup(file: File): Promise<ClinicBackupImport> {
  if (file.name.toLowerCase().endsWith('.json')) {
    const database = validateDatabase(JSON.parse(await file.text()));
    return { database, preview: previewFor(database) };
  }
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestFile = zip.file('manifest.json');
  const databaseFile = zip.file('database.json');
  if (!databaseFile) throw new Error('This file is not a Genfinity backup. database.json is missing.');
  const database = validateDatabase(JSON.parse(await databaseFile.async('text')));
  const manifest = manifestFile ? JSON.parse(await manifestFile.async('text')) : null;
  if (manifest?.format && manifest.format !== CLINIC_BACKUP_FORMAT) throw new Error('This backup was created by an unsupported format version.');
  return { database, preview: previewFor(database, manifest?.exportedAt) };
}

export function downloadClinicBackup(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `genfinity-clinic-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
