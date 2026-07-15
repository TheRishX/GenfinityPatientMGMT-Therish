import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import PatientsView from './components/PatientsView';
import AppointmentsView from './components/AppointmentsView';
import TrackerView from './components/TrackerView';
import AuthBillingView from './components/AuthBillingView';
import FabricationView from './components/FabricationView';
import SettingsView from './components/SettingsView';
import { DatabaseSchema, Patient, Appointment, Authorization, Claim, ClinicSettings, FabricationItem, AlertItem } from './types';
import { DEFAULT_DATABASE, getInitials, generateMRN } from './utils/defaultDb';
import { supabaseClient } from './utils/supabaseClient';

export default function App() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Layout navigation & search
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Security Lockscreen state (Launch Security)
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // New patient modal trigger inside PatientsView
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState<boolean>(false);

  const saveStateLocally = (newDb: DatabaseSchema) => {
    setDb(newDb);
    localStorage.setItem('genfinity_db', JSON.stringify(newDb));
  };

  // Fetch from Supabase directly in Vercel/Client-only environments
  const fetchStateDirectFromSupabase = async (baseDb: DatabaseSchema): Promise<DatabaseSchema> => {
    const updatedDb = { ...baseDb };
    try {
      // 1. Fetch settings from clinic_settings
      const { data: sData, error: sErr } = await supabaseClient.from('clinic_settings').select('*').limit(1);
      if (sData && sData.length > 0 && !sErr) {
        const row = sData[0];
        updatedDb.settings = {
          ...updatedDb.settings,
          clinicName: row.clinic_name || updatedDb.settings.clinicName,
          primaryAddress: row.clinic_address || updatedDb.settings.primaryAddress,
          contactPhone: row.clinic_phone || updatedDb.settings.contactPhone,
          supportEmail: row.clinic_email || updatedDb.settings.supportEmail,
        };
      }

      // 2. Fetch patients
      const { data: pData, error: pErr } = await supabaseClient.from('patients').select('*').order('created_at', { ascending: false });
      if (pData && !pErr) {
        updatedDb.patients = pData.map((sp: any) => ({
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
          clinicalNotes: sp.auth_info?.clinical_notes || [],
          billing: sp.billing || { date: '', amount: 0, status: '' }
        }));
      }

      // 3. Fetch appointments
      const { data: aData, error: aErr } = await supabaseClient.from('appointments').select('*').order('created_at', { ascending: false });
      if (aData && !aErr) {
        updatedDb.appointments = aData.map((sa: any) => ({
          id: sa.id,
          patientName: sa.patient_name || '',
          time: sa.appt_time || '09:00 AM',
          type: sa.type || 'Consultation',
          status: sa.status || 'Scheduled',
          initials: getInitials(sa.patient_name || 'A'),
          date: sa.appt_date || ''
        }));
      }
    } catch (err) {
      console.warn('Failed direct client-side Supabase query:', err);
    }
    return updatedDb;
  };

  // Fetch complete dataset
  const fetchState = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data: DatabaseSchema = await res.json();
        setDb(data);
        setIsOfflineMode(false);
        setError(null);
      } else {
        throw new Error('Static/Vercel or non-JSON API response detected');
      }
    } catch (err: any) {
      console.warn('Backend server connection failed or static deployment. Switching to direct browser-to-Supabase client connection.', err);
      
      let baseDb = DEFAULT_DATABASE;
      const localData = localStorage.getItem('genfinity_db');
      if (localData) {
        try {
          baseDb = JSON.parse(localData);
        } catch (e) {
          baseDb = DEFAULT_DATABASE;
        }
      }

      const liveDb = await fetchStateDirectFromSupabase(baseDb);
      setDb(liveDb);
      localStorage.setItem('genfinity_db', JSON.stringify(liveDb));
      setIsOfflineMode(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Sync state when lock screen requirement changes
  useEffect(() => {
    if (db && !db.settings.requirePin) {
      setIsLocked(false);
    }
  }, [db]);

  // Handle PIN input submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (pinInput === db.settings.pinCode) {
      setIsLocked(false);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 1500);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 4) {
      setPinInput(prev => prev + val);
    }
  };

  // API Call: Add Patient
  const handleAddPatient = async (patientData: any) => {
    if (isOfflineMode || !db) {
      const generatedMrn = generateMRN();
      const initials = getInitials(patientData.name);
      
      // Try direct client-side Supabase write if offline/Vercel
      try {
        const { data: newSupPatient, error } = await supabaseClient.from('patients').insert({
          name: patientData.name,
          phone: patientData.phone || '',
          dob: patientData.dob || '',
          email: patientData.email || '',
          referral_source: patientData.referralSource || 'other',
          status: patientData.status || 'In Progress',
          notes: generatedMrn,
          documents: { files: [] },
          auth_info: {
            insurance_company: '',
            insurance_id: '',
            address: '',
            gender: 'Not specified',
            clinical_notes: []
          },
          billing: { date: '', amount: 0, status: '' },
          pinned_flag: false
        }).select().single();

        if (error) throw error;

        if (patientData.status === 'Consultation') {
          await supabaseClient.from('appointments').insert({
            patient_name: patientData.name,
            appt_time: '02:00 PM',
            type: 'Initial Consult',
            status: 'Scheduled'
          });
        }
        
        await fetchState();
        return;
      } catch (err) {
        console.warn('Direct client-side Supabase write failed, falling back to local memory only', err);
      }

      const newPatient: Patient = {
        id: 'p_' + Date.now(),
        name: patientData.name,
        phone: patientData.phone || '',
        dob: patientData.dob || '',
        email: patientData.email || '',
        referralSource: patientData.referralSource || 'other',
        status: patientData.status || 'In Progress',
        mrn: generatedMrn,
        avatarInitials: initials,
        files: [],
        insuranceCompany: '',
        insuranceId: '',
        address: '',
        gender: 'Not specified',
        clinicalNotes: []
      };
      
      const updatedPatients = [newPatient, ...db.patients];
      let updatedAppointments = [...db.appointments];
      if (newPatient.status === 'Consultation') {
        const newAppt = {
          id: 'a_' + Date.now(),
          patientName: newPatient.name,
          time: '02:00 PM',
          type: 'Initial Consult',
          status: 'Scheduled' as const,
          initials
        };
        updatedAppointments = [newAppt, ...updatedAppointments];
      }

      saveStateLocally({
        ...db,
        patients: updatedPatients,
        appointments: updatedAppointments
      });
      return;
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });
      if (!res.ok) throw new Error('Failed to save patient');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Add Document File
  const handleAddFile = async (patientId: string, fileData: any) => {
    if (isOfflineMode || !db) {
      const newFile = {
        id: 'f_' + Date.now(),
        name: fileData.name,
        type: fileData.type || 'pdf',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        size: fileData.size || '1.0 MB',
        content: fileData.content || ''
      };

      // Try direct client-side Supabase update
      try {
        const target = db.patients.find(p => p.id === patientId);
        if (target) {
          const currentFiles = target.files || [];
          const updatedFiles = [newFile, ...currentFiles];
          const { error } = await supabaseClient
            .from('patients')
            .update({ documents: { files: updatedFiles } })
            .eq('id', patientId);
          if (!error) {
            await fetchState();
            return;
          }
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase file upload failed, using offline fallback:', directErr);
      }

      const updatedPatients = db.patients.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            files: [newFile, ...(p.files || [])]
          };
        }
        return p;
      });

      saveStateLocally({
        ...db,
        patients: updatedPatients
      });
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileData)
      });
      if (!res.ok) throw new Error('Failed to upload file');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Delete Document File
  const handleDeleteFile = async (patientId: string, fileId: string) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase update
      try {
        const target = db.patients.find(p => p.id === patientId);
        if (target) {
          const updatedFiles = (target.files || []).filter(f => f.id !== fileId);
          const { error } = await supabaseClient
            .from('patients')
            .update({ documents: { files: updatedFiles } })
            .eq('id', patientId);
          if (!error) {
            await fetchState();
            return;
          }
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase file delete failed, using offline fallback:', directErr);
      }

      const updatedPatients = db.patients.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            files: (p.files || []).filter(f => f.id !== fileId)
          };
        }
        return p;
      });

      saveStateLocally({
        ...db,
        patients: updatedPatients
      });
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patientId}/files/${fileId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete file');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Update Patient workflow column
  const handleUpdatePatientStatus = async (patientId: string, status: Patient['status']) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase status update
      try {
        const { error } = await supabaseClient
          .from('patients')
          .update({ status })
          .eq('id', patientId);
        
        if (!error) {
          if (status === 'Consultation') {
            const targetPatient = db.patients.find(p => p.id === patientId);
            if (targetPatient) {
              await supabaseClient.from('appointments').insert({
                patient_name: targetPatient.name,
                appt_time: '02:00 PM',
                type: 'Initial Consult',
                status: 'Scheduled'
              });
            }
          }
          await fetchState();
          return;
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase status update failed, using offline fallback:', directErr);
      }

      const updatedPatients = db.patients.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            status
          };
        }
        return p;
      });

      let updatedAppointments = [...db.appointments];
      const targetPatient = db.patients.find(p => p.id === patientId);
      if (status === 'Consultation' && targetPatient) {
        const newAppt = {
          id: 'a_' + Date.now(),
          patientName: targetPatient.name,
          time: '02:00 PM',
          type: 'Initial Consult',
          status: 'Scheduled' as const,
          initials: getInitials(targetPatient.name)
        };
        updatedAppointments = [newAppt, ...updatedAppointments];
      }

      saveStateLocally({
        ...db,
        patients: updatedPatients,
        appointments: updatedAppointments
      });
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patientId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to transition patient status');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Comprehensive Patient Update (Demographics, Insurance, Notes)
  const handleUpdatePatient = async (patientId: string, patientData: any) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase update
      try {
        const { error } = await supabaseClient
          .from('patients')
          .update({
            name: patientData.name,
            phone: patientData.phone,
            dob: patientData.dob,
            email: patientData.email,
            referral_source: patientData.referralSource,
            status: patientData.status,
            notes: patientData.mrn,
            pinned_flag: patientData.pinned_flag,
            auth_info: {
              insurance_company: patientData.insuranceCompany || '',
              insurance_id: patientData.insuranceId || '',
              address: patientData.address || '',
              gender: patientData.gender || 'Not specified',
              clinical_notes: patientData.clinicalNotes || []
            },
            billing: patientData.billing || { date: '', amount: 0, status: '' }
          })
          .eq('id', patientId);
        
        if (!error) {
          await fetchState();
          return;
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase patient update failed, using offline fallback:', directErr);
      }

      const updatedPatients = db.patients.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            ...patientData
          };
        }
        return p;
      });

      saveStateLocally({
        ...db,
        patients: updatedPatients
      });
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });
      if (!res.ok) throw new Error('Failed to update patient data');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Add Appointment in Supabase
  const handleAddAppointment = async (apptData: any) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase insert
      try {
        const { error } = await supabaseClient.from('appointments').insert({
          patient_name: apptData.patientName,
          appt_time: apptData.time || '09:00 AM',
          type: apptData.type || 'Consultation',
          status: apptData.status || 'Scheduled',
          appt_date: apptData.date || ''
        });
        if (!error) {
          await fetchState();
          return;
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase appointment insert failed, using offline fallback:', directErr);
      }

      const newAppt = {
        id: 'a_' + Date.now(),
        patientName: apptData.patientName,
        time: apptData.time || '09:00 AM',
        type: apptData.type || 'Consultation',
        status: apptData.status || 'Scheduled',
        initials: getInitials(apptData.patientName)
      };

      saveStateLocally({
        ...db,
        appointments: [newAppt, ...db.appointments]
      });
      return;
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apptData)
      });
      if (!res.ok) throw new Error('Failed to create appointment');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Update Appointment Status / Details
  const handleUpdateAppointment = async (apptId: string, updateData: any) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase update
      try {
        const { error } = await supabaseClient
          .from('appointments')
          .update({
            patient_name: updateData.patientName,
            appt_time: updateData.time,
            type: updateData.type,
            status: updateData.status,
            appt_date: updateData.date
          })
          .eq('id', apptId);
        if (!error) {
          await fetchState();
          return;
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase appointment update failed, using offline fallback:', directErr);
      }

      const updatedAppointments = db.appointments.map(a => {
        if (a.id === apptId) {
          return {
            ...a,
            ...updateData
          };
        }
        return a;
      });

      saveStateLocally({
        ...db,
        appointments: updatedAppointments
      });
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error('Failed to update appointment');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Delete Patient (Admin)
  const handleDeletePatient = async (patientId: string) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase delete
      try {
        const { error } = await supabaseClient
          .from('patients')
          .delete()
          .eq('id', patientId);
        if (!error) {
          await fetchState();
          return;
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase patient delete failed, using offline fallback:', directErr);
      }

      const updatedPatients = db.patients.filter(p => p.id !== patientId);
      saveStateLocally({
        ...db,
        patients: updatedPatients
      });
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete patient');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Delete Appointment (Admin)
  const handleDeleteAppointment = async (apptId: string) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase delete
      try {
        const { error } = await supabaseClient
          .from('appointments')
          .delete()
          .eq('id', apptId);
        if (!error) {
          await fetchState();
          return;
        }
      } catch (directErr) {
        console.warn('Direct client-side Supabase appointment delete failed, using offline fallback:', directErr);
      }

      const updatedAppointments = db.appointments.filter(a => a.id !== apptId);
      saveStateLocally({
        ...db,
        appointments: updatedAppointments
      });
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete appointment');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Update Authorization
  const handleUpdateAuth = async (authId: string, updateData: any) => {
    if (isOfflineMode || !db) {
      const updatedAuths = db.authorizations.map(a => {
        if (a.id === authId) {
          return {
            ...a,
            ...updateData
          };
        }
        return a;
      });

      saveStateLocally({
        ...db,
        authorizations: updatedAuths
      });
      return;
    }

    try {
      const res = await fetch(`/api/authorizations/${authId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error('Failed to update authorization record');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Add Authorization request
  const handleAddAuth = async (authData: any) => {
    if (isOfflineMode || !db) {
      const newAuth: Authorization = {
        id: 'au_' + Date.now(),
        patientName: authData.patientName,
        device: authData.device,
        status: authData.status || 'Pending',
        submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        daysWaiting: 1,
        payer: authData.payer || 'Private Pay',
        notes: authData.notes || ''
      };

      saveStateLocally({
        ...db,
        authorizations: [newAuth, ...db.authorizations]
      });
      return;
    }

    try {
      const res = await fetch('/api/authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      if (!res.ok) throw new Error('Failed to register authorization');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Add Invoice Claim
  const handleAddClaim = async (claimData: any) => {
    if (isOfflineMode || !db) {
      const count = db.claims.length + 890;
      const newClaim: Claim = {
        id: 'c_' + Date.now(),
        claimNumber: `INV-2023-0${count}`,
        patientName: claimData.patientName,
        payer: claimData.payer || 'Self',
        doctor: claimData.doctor || 'Dr. Sarah Jenkins',
        amount: parseFloat(claimData.amount),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        status: claimData.status || 'Billed'
      };

      saveStateLocally({
        ...db,
        claims: [newClaim, ...db.claims]
      });
      return;
    }

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimData)
      });
      if (!res.ok) throw new Error('Failed to post claim invoice');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Save settings config
  const handleSaveSettings = async (settingsData: ClinicSettings) => {
    if (isOfflineMode || !db) {
      // Try direct client-side Supabase update for clinic_settings
      try {
        const { data: existing } = await supabaseClient.from('clinic_settings').select('id').limit(1);
        if (existing && existing.length > 0) {
          await supabaseClient
            .from('clinic_settings')
            .update({
              clinic_name: settingsData.clinicName,
              clinic_address: settingsData.primaryAddress,
              clinic_phone: settingsData.contactPhone,
              clinic_email: settingsData.supportEmail
            })
            .eq('id', existing[0].id);
        } else {
          await supabaseClient.from('clinic_settings').insert({
            clinic_name: settingsData.clinicName,
            clinic_address: settingsData.primaryAddress,
            clinic_phone: settingsData.contactPhone,
            clinic_email: settingsData.supportEmail
          });
        }
        saveStateLocally({
          ...db,
          settings: settingsData
        });
        await fetchState();
        return;
      } catch (directErr) {
        console.warn('Direct client-side Supabase settings update failed, using offline fallback:', directErr);
      }

      saveStateLocally({
        ...db,
        settings: settingsData
      });
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      if (!res.ok) throw new Error('Failed to commit settings');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Update Fabrication Workshop item
  const handleUpdateFabrication = async (itemId: string, updateData: any) => {
    if (isOfflineMode || !db) {
      const updatedFabs = db.fabrication.map(f => {
        if (f.id === itemId) {
          return {
            ...f,
            ...updateData
          };
        }
        return f;
      });

      saveStateLocally({
        ...db,
        fabrication: updatedFabs
      });
      return;
    }

    try {
      const res = await fetch(`/api/fabrication/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error('Failed to update workshop specs');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Needs Attention Alerts Actions (Routing)
  const handleAlertActionRedirect = (target: string, alertId: string) => {
    if (target === 'auth') {
      setActiveTab('authorization');
    } else if (target === 'documents') {
      setActiveTab('patients');
      // Resolve patient from alert message (e.g. "Jane Doe needs LMN signed." or similar)
      const foundAlert = db?.alerts?.find(a => a.id === alertId);
      if (foundAlert) {
        const matched = foundAlert.message.match(/^([^'s]+)('s)?\s+(needs|expires)/i);
        if (matched && matched[1]) {
          setSearchTerm(matched[1].trim());
          return;
        }
      }
      setSearchTerm('Jane Doe');
    } else {
      setActiveTab(target);
    }
  };

  // API Call: Dismiss Alert
  const handleDismissAlert = async (alertId: string) => {
    if (isOfflineMode || !db) {
      const updatedAlerts = db ? db.alerts.filter(a => a.id !== alertId) : [];
      if (db) {
        saveStateLocally({
          ...db,
          alerts: updatedAlerts
        });
      }
      return;
    }

    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to dismiss alert');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Return Loading skeleton
  if (loading && !db) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface select-none">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">sync</span>
        <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">Initializing Genfinity Clinical Link</h2>
        <p className="text-[10px] text-on-surface-variant font-bold mt-1">Checking HIPAA compliance protocols...</p>
      </div>
    );
  }

  // Return server Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface px-6 text-center select-none">
        <span className="material-symbols-outlined text-5xl text-primary mb-4">cloud_off</span>
        <h2 className="text-xl font-extrabold text-on-surface">Connection Timeout</h2>
        <p className="text-xs text-on-surface-variant max-w-sm mt-2 leading-relaxed">
          The Genfinity Clinical local server couldn't be reached. Ensure terminal task is running or restart the dev sandbox.
        </p>
        <button
          onClick={fetchState}
          className="mt-6 px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <span className="material-symbols-outlined text-xs">sync</span> Retry Connection
        </button>
      </div>
    );
  }

  // HIPAA PIN GUARD LOCKSCREEN (Launch Security, Mockup #3)
  if (isLocked && db?.settings.requirePin) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#fbf9f8] flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-xs text-center space-y-6">
          {/* Lock Icon logo area */}
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl text-primary fill mb-3">lock</span>
            <h1 className="text-2xl font-black text-primary tracking-tight">{db.settings.clinicName}</h1>
            <p className="text-xs font-bold text-on-surface-variant tracking-wide mt-1 uppercase">
              HIPAA Compliant Session Lock
            </p>
          </div>

          {/* Keypad PIN dots */}
          <div className="flex justify-center gap-4 py-2">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4.5 h-4.5 rounded-full border-2 transition-all ${
                  pinInput.length > idx
                    ? 'bg-primary border-primary scale-110 shadow-xs'
                    : 'bg-transparent border-surface-container-highest'
                }`}
              />
            ))}
          </div>

          {/* Error / Instructions */}
          <div className="h-6">
            {pinError ? (
              <p className="text-xs font-extrabold text-primary animate-bounce">
                Incorrect clinical PIN. Access Denied.
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-on-surface-variant leading-relaxed">
                Enter your 4-digit security code to resume session.
              </p>
            )}
          </div>

          {/* Keypad Grid (Touch targets & aesthetics matching Image 3) */}
          <div className="grid grid-cols-3 gap-3.5 max-w-[240px] mx-auto select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="w-14 h-14 rounded-full bg-surface-container-low hover:bg-surface-container text-lg font-black text-on-surface flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-surface-container-highest/20"
              >
                {num}
              </button>
            ))}
            {/* Backspace */}
            <button
              type="button"
              onClick={() => setPinInput(p => p.slice(0, -1))}
              className="w-14 h-14 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined">backspace</span>
            </button>
            {/* 0 */}
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="w-14 h-14 rounded-full bg-surface-container-low hover:bg-surface-container text-lg font-black text-on-surface flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-surface-container-highest/20"
            >
              0
            </button>
            {/* Submit */}
            <button
              type="button"
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 4}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                pinInput.length === 4
                  ? 'bg-primary text-white hover:bg-primary-container shadow-xs cursor-pointer'
                  : 'bg-surface-container-low text-on-surface-variant/40 border border-surface-container-highest/10 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined font-black">login</span>
            </button>
          </div>

          <p className="text-[10px] text-on-surface-variant opacity-75 font-semibold">
            Default sandbox credentials: <strong className="text-secondary select-all">1234</strong>
          </p>
        </div>
      </div>
    );
  }

  // Active Tab Rendering Router
  const renderTabContent = () => {
    if (!db) return null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            patients={db.patients}
            appointments={db.appointments}
            alerts={db.alerts}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onAlertAction={handleAlertActionRedirect}
            onDismissAlert={handleDismissAlert}
          />
        );
      case 'patients':
      case 'documents':
        return (
          <PatientsView
            patients={db.patients}
            appointments={db.appointments}
            authorizations={db.authorizations}
            claims={db.claims}
            searchTerm={searchTerm}
            onAddPatient={handleAddPatient}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onUpdatePatient={handleUpdatePatient}
            onDeletePatient={handleDeletePatient}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointment={handleUpdateAppointment}
            onAddAuth={handleAddAuth}
            onAddClaim={handleAddClaim}
            isNewPatientModalOpen={isNewPatientModalOpen}
            setIsNewPatientModalOpen={setIsNewPatientModalOpen}
          />
        );
      case 'appointments':
        return (
          <AppointmentsView
            patients={db.patients}
            appointments={db.appointments}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointment={handleUpdateAppointment}
            onDeleteAppointment={handleDeleteAppointment}
          />
        );
      case 'tracker':
        return (
          <TrackerView
            patients={db.patients}
            onUpdatePatientStatus={handleUpdatePatientStatus}
            onNewPatientClick={() => setIsNewPatientModalOpen(true)}
          />
        );
      case 'authorization':
      case 'billing':
        return (
          <AuthBillingView
            authorizations={db.authorizations}
            claims={db.claims}
            onUpdateAuth={handleUpdateAuth}
            onAddAuth={handleAddAuth}
            onAddClaim={handleAddClaim}
          />
        );
      case 'fabrication':
        return (
          <FabricationView
            items={db.fabrication}
            onUpdateItem={handleUpdateFabrication}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={db.settings}
            onSaveSettings={handleSaveSettings}
          />
        );
      case 'support':
        return (
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container-highest/40 shadow-xs max-w-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-secondary mb-6">
              <span className="material-symbols-outlined text-3xl">support_agent</span>
              <h2 className="text-2xl font-black text-on-surface">Genfinity Clinical Support</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6 font-semibold">
              If you require immediate technical assistance with your clinical workspace synchronization, please reach out to our team.
            </p>
            <div className="space-y-4 font-bold text-xs text-on-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">mail</span>
                <span>Email Support: <a href="mailto:support@genfinity.com" className="text-secondary underline">support@genfinity.com</a></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">phone</span>
                <span>Clinical hotline: (555) 123-4567</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-8 text-center text-on-surface-variant font-bold text-sm">
            This module is being updated. Use standard tabs navigation.
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen flex ${db?.settings.appearance === 'dark' ? 'dark bg-slate-900 text-white' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab === 'documents' ? 'patients' : activeTab}
        setActiveTab={setActiveTab}
        onNewPatientClick={() => {
          setActiveTab('patients');
          setIsNewPatientModalOpen(true);
        }}
        clinicName={db?.settings.clinicName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-72 min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
        {/* App bar search / user utility */}
        <Header
          title={
            activeTab === 'dashboard'
              ? 'Dashboard Overview'
              : activeTab === 'patients'
              ? 'Patient Database'
              : activeTab === 'appointments'
              ? 'Appointments Schedule'
              : activeTab === 'tracker'
              ? 'Clinical Workflow Board'
              : activeTab === 'authorization'
              ? 'Approval & Reimbursements'
              : activeTab === 'billing'
              ? 'Invoices Ledger'
              : activeTab === 'fabrication'
              ? 'Active Workshop'
              : 'Genfinity Clinical Portal'
          }
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSyncClick={fetchState}
          clinicName={db?.settings.clinicName}
          isOfflineMode={isOfflineMode}
        />

        {/* Inner Content stage */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
