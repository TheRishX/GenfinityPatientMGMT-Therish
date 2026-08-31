import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import PatientsView from './components/PatientsView';
import AppointmentsView from './components/AppointmentsView';
import TrackerView from './components/TrackerView';
import AuthView from './components/AuthView';
import BillingView from './components/BillingView';
import FabricationView from './components/FabricationView';
import SettingsView from './components/SettingsView';
import { DatabaseSchema, Patient, Appointment, Authorization, Claim, ClinicSettings, FabricationItem, AlertItem } from './types';
import { getInitials, generateMRN } from './utils/defaultDb';

export default function App() {
  // Clinical data must always come from the server-backed Hostinger database.
  // Do not initialize this state from browser storage: another browser/device
  // would otherwise see a different database.
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept as an explicit false value for child component compatibility. There
  // is intentionally no offline clinical-data mode.
  const isOfflineMode = false;

  // Layout navigation & search
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // New patient modal trigger inside PatientsView
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState<boolean>(false);

  // Selected patient state for syncing between Dashboard and Patient Profile Modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Workspace Customization (Edit Mode) States
  const [isWorkspaceEditMode, setIsWorkspaceEditMode] = useState<boolean>(false);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('genfinity_custom_labels');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('genfinity_enabled_modules');
      return saved ? JSON.parse(saved) : {
        dashboard: true,
        patients: true,
        appointments: true,
        tracker: true,
        settings: true
      };
    } catch {
      return {
        dashboard: true,
        patients: true,
        appointments: true,
        tracker: true,
        settings: true
      };
    }
  });

  const handleUpdateLabel = (key: string, value: string) => {
    setCustomLabels(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('genfinity_custom_labels', JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleModule = (moduleId: string) => {
    setEnabledModules(prev => {
      const current = prev[moduleId] !== false;
      const updated = { ...prev, [moduleId]: !current };
      localStorage.setItem('genfinity_enabled_modules', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectPatientByName = (patientName: string) => {
    if (!db) return;
    const target = db.patients.find(
      p => p.name.trim().toLowerCase() === patientName.trim().toLowerCase()
    );
    if (target) {
      setSelectedPatient(target);
      setActiveTab('patients');
    } else {
      // If the patient is not yet registered in patient list, set search term to let them find/add them easily
      setSearchTerm(patientName);
      setActiveTab('patients');
    }
  };

  // Guard legacy call sites while ensuring no clinical data can ever be
  // persisted in browser storage.
  const saveStateLocally = (_newDb: DatabaseSchema): never => {
    throw new Error('Local clinical-data persistence is disabled.');
  };

  // Fetch complete dataset
  const fetchState = async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const payload = await res.json();
        if (!res.ok) {
          const hint = payload.hint ? ` ${payload.hint}` : '';
          throw new Error(`${payload.error || `Hostinger API request failed (${res.status})`}${hint}`);
        }
        const data: DatabaseSchema = payload;
        setDb(data);
        setError(null);
      } else {
        throw new Error(`Hostinger API returned a non-JSON response (${res.status})`);
      }
    } catch (err: any) {
      console.error('Hostinger database connection failed.', err);
      setDb(null);
      setError(err?.message || 'The Hostinger database could not be reached. No local data is being used.');
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // API Call: Add Patient
  const handleAddPatient = async (patientData: any) => {
    if (isOfflineMode && db) {
      const generatedMrn = generateMRN();
      const initials = getInitials(patientData.name);
      
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
          patientId: newPatient.id,
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
    if (isOfflineMode && db) {
      const newFile = {
        id: 'f_' + Date.now(),
        name: fileData.name,
        type: fileData.type || 'pdf',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        size: fileData.size || '1.0 MB',
        content: fileData.content || ''
      };

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
    if (isOfflineMode && db) {
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
    if (isOfflineMode && db) {
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
          patientId: targetPatient.id,
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
    if (isOfflineMode && db) {
      const currentPatient = db.patients.find(p => p.id === patientId);
      if (!currentPatient) return;
      const nextName = patientData.name?.trim() || currentPatient.name;
      const isSamePatient = (linkedId?: string, linkedName?: string) =>
        linkedId === patientId || linkedName?.trim().toLowerCase() === currentPatient.name.trim().toLowerCase();
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
        patients: updatedPatients,
        appointments: db.appointments.map(item => isSamePatient(item.patientId, item.patientName)
          ? { ...item, patientId, patientName: nextName, initials: getInitials(nextName) }
          : item),
        authorizations: db.authorizations.map(item => isSamePatient(item.patientId, item.patientName)
          ? { ...item, patientId, patientName: nextName }
          : item),
        claims: db.claims.map(item => isSamePatient(item.patientId, item.patientName)
          ? { ...item, patientId, patientName: nextName }
          : item),
        fabrication: db.fabrication.map(item => isSamePatient(item.patientId, item.patientName)
          ? { ...item, patientId, patientName: nextName }
          : item)
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

  // API Call: Add Appointment
  const handleAddAppointment = async (apptData: any) => {
    if (isOfflineMode && db) {
      const patient = db.patients.find(p => p.name.trim().toLowerCase() === apptData.patientName.trim().toLowerCase());
      if (!patient) {
        alert('Select an existing patient.');
        return;
      }
      const newAppt = {
        id: 'a_' + Date.now(),
        patientId: patient.id,
        patientName: patient.name,
        time: apptData.time || '09:00 AM',
        type: apptData.type || 'Consultation',
        status: apptData.status || 'Scheduled',
        initials: getInitials(patient.name)
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
    if (isOfflineMode && db) {
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
    if (isOfflineMode && db) {
      const patient = db.patients.find(p => p.id === patientId);
      if (!patient) return;
      const patientName = patient.name.trim().toLowerCase();
      const belongsToPatient = (name?: string) => name?.trim().toLowerCase() === patientName;
      const updatedPatients = db.patients.filter(p => p.id !== patientId);
      saveStateLocally({
        ...db,
        patients: updatedPatients,
        appointments: db.appointments.filter(item => item.patientId !== patientId && !belongsToPatient(item.patientName)),
        authorizations: db.authorizations.filter(item => !belongsToPatient(item.patientName)),
        claims: db.claims.filter(item => !belongsToPatient(item.patientName)),
        fabrication: db.fabrication.filter(item => !belongsToPatient(item.patientName)),
        emailLogs: (db.emailLogs || []).filter(item => !belongsToPatient(item.patientName)),
        alerts: db.alerts.filter(item => !item.message.toLowerCase().includes(patientName))
      });
      setSelectedPatient(current => current?.id === patientId ? null : current);
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
    if (isOfflineMode && db) {
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
    if (isOfflineMode && db) {
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
    if (isOfflineMode && db) {
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
    if (isOfflineMode && db) {
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
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to post claim invoice');
      await fetchState();
      if (claimData.sendInvoice) {
        alert(payload.emailResult?.success
          ? `Invoice ${payload.claimNumber} was created and emailed to the patient.`
          : (payload.emailResult?.message || 'Invoice created, but the email could not be sent.'));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Update Invoice Claim Status
  const handleUpdateClaimStatus = async (claimId: string, status: Claim['status']) => {
    if (isOfflineMode && db) {
      const updatedClaims = db.claims.map(c => c.id === claimId ? { ...c, status } : c);
      saveStateLocally({
        ...db,
        claims: updatedClaims
      });
      return;
    }

    try {
      const res = await fetch(`/api/claims/${claimId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update claim status');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Save settings config
  const handleSaveSettings = async (settingsData: ClinicSettings) => {
    if (isOfflineMode && db) {
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

  // API Call: Add Fabrication Workshop item
  const handleAddFabricationItem = async (itemData: any) => {
    if (!db) return;
    const newItem: FabricationItem = {
      id: `fab_${Date.now()}`,
      patientName: itemData.patientName,
      device: itemData.device,
      stage: itemData.stage || 'Layout',
      priority: itemData.priority === 'High' || itemData.priority === 'Urgent' ? 'Urgent' : 'Standard',
      techNotes: itemData.specifications || 'Created from guided visit flow.',
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    if (isOfflineMode && db) {
      saveStateLocally({
        ...db,
        fabrication: [newItem, ...db.fabrication]
      });
      return;
    }

    try {
      const res = await fetch('/api/fabrication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (!res.ok) throw new Error('Failed to create fabrication item');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Update Fabrication Workshop item
  const handleUpdateFabrication = async (itemId: string, updateData: any) => {
    if (isOfflineMode && db) {
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
    if (isOfflineMode && db) {
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

  // Do not render the application shell until the authoritative database has
  // loaded. This also prevents dereferencing db while the initial request is
  // still pending or after a failed Hostinger connection.
  if (!db || error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface px-6 text-center select-none">
        <span className="material-symbols-outlined text-5xl text-primary mb-4">{error ? 'cloud_off' : 'sync'}</span>
        <h2 className="text-xl font-extrabold text-on-surface">{error ? 'Database Connection Error' : 'Loading clinical data…'}</h2>
        <p className="text-xs text-on-surface-variant max-w-sm mt-2 leading-relaxed">
          {error || 'Connecting to the Hostinger MySQL database. No browser-stored clinical data is being used.'}
        </p>
        <button
          onClick={fetchState}
          className="mt-6 px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <span className="material-symbols-outlined text-xs">sync</span> {error ? 'Retry Connection' : 'Refresh'}
        </button>
      </div>
    );
  }

  // Helper to safely access custom labels
  const getSidebarLabel = (id: string, defaultLabel: string) => {
    return customLabels[`sidebar_${id}`] || defaultLabel;
  };

  // Active Tab Rendering Router
  const renderTabContent = () => {
    if (!db) return null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            patients={db.patients}
            appointments={db.appointments}
            authorizations={db.authorizations}
            fabrication={db.fabrication}
            alerts={db.alerts}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onAlertAction={handleAlertActionRedirect}
            onDismissAlert={handleDismissAlert}
            onPatientClick={handleSelectPatientByName}
            onUpdatePatient={handleUpdatePatient}
            isWorkspaceEditMode={isWorkspaceEditMode}
            customLabels={customLabels}
            onUpdateLabel={handleUpdateLabel}
            onUpdateAppointment={handleUpdateAppointment}
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
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
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
            onAddPatient={handleAddPatient}
            isWorkspaceEditMode={isWorkspaceEditMode}
            customLabels={customLabels}
            onUpdateLabel={handleUpdateLabel}
          />
        );
      case 'authorization':
        return (
          <AuthView
            authorizations={db.authorizations}
            onUpdateAuth={handleUpdateAuth}
            onAddAuth={handleAddAuth}
            isWorkspaceEditMode={isWorkspaceEditMode}
            customLabels={customLabels}
            onUpdateLabel={handleUpdateLabel}
          />
        );
      case 'billing':
        return (
          <BillingView
            claims={db.claims}
            onAddClaim={handleAddClaim}
            onUpdateClaimStatus={handleUpdateClaimStatus}
            isWorkspaceEditMode={isWorkspaceEditMode}
            customLabels={customLabels}
            onUpdateLabel={handleUpdateLabel}
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
        isWorkspaceEditMode={isWorkspaceEditMode}
        setIsWorkspaceEditMode={setIsWorkspaceEditMode}
        customLabels={customLabels}
        onUpdateLabel={handleUpdateLabel}
        enabledModules={enabledModules}
        onToggleModule={handleToggleModule}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-64 md:pl-72 min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
        {/* App bar search / user utility */}
        <Header
          title={
            activeTab === 'dashboard'
              ? getSidebarLabel('dashboard', 'Overview')
              : activeTab === 'patients'
              ? getSidebarLabel('patients', 'Patient Database')
              : activeTab === 'appointments'
              ? getSidebarLabel('appointments', 'Schedule')
              : activeTab === 'tracker'
              ? getSidebarLabel('tracker', 'Orders')
              : activeTab === 'authorization'
              ? getSidebarLabel('authorization', 'Approval & Reimbursements')
              : activeTab === 'billing'
              ? getSidebarLabel('billing', 'Invoices Ledger')
              : activeTab === 'fabrication'
              ? getSidebarLabel('fabrication', 'Active Workshop')
              : activeTab === 'settings'
              ? getSidebarLabel('settings', 'Admin Settings')
              : activeTab === 'email'
              ? getSidebarLabel('email', 'Email')
              : 'Genfinity Clinical Portal'
          }
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSyncClick={fetchState}
          clinicName={db?.settings.clinicName}
          appointments={db.appointments}
          alerts={db.alerts}
          onAlertAction={handleAlertActionRedirect}
          onDismissAlert={handleDismissAlert}
        />

        {/* Inner Content stage */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-10 max-w-7xl mx-auto w-full">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
