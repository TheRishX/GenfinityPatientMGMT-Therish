import React, { useState, useEffect } from 'react';
import { Patient, Appointment, ClinicalNote, TimelineEvent, FabricationItem } from '../types';

interface GuidedVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  appointments: Appointment[];
  initialPatientId?: string;
  initialAppointmentId?: string;
  onUpdatePatient: (patientId: string, updates: Partial<Patient>) => Promise<void>;
  onUpdateAppointment: (apptId: string, updates: Partial<Appointment>) => Promise<void>;
  onAddAppointment: (apptData: any) => Promise<void>;
  onAddFabricationItem?: (fabItem: Omit<FabricationItem, 'id'>) => Promise<void>;
  onAddNewPatient?: (patientData: any) => Promise<Patient>;
}

// Preset Clinical Templates
const VISIT_TEMPLATES = [
  {
    id: 'initial_eval',
    name: 'Initial Evaluation & Assessment',
    description: 'Comprehensive clinical assessment, ROM, muscle strength, and prescription planning.',
    subjective: 'Patient reports progressive gait instability and pain in lower extremity during weight-bearing activities. Daily goals include returning to independent community ambulation without fall risk.',
    objective: 'Gait observation reveals heel strike deficit and calcaneal valgus. Muscle strength 4/5 dorsiflexors. Skin intact, no edema. Range of motion within functional limits.',
    assessment: 'Patient presents with anatomical deficit requiring custom O&P structural support to restore mechanical alignment, reduce pain, and prevent deformity progression.',
    plan: 'Recommend custom molded orthosis / prosthesis with functional dynamic response. Obtain prior authorization and capture anatomical impressions.',
    deviceCategory: 'AFO',
    lCodes: ['L1960', 'L2820', 'L2275'],
    measurements: {
      calfCircumference: '38 cm',
      ankleCircumference: '24 cm',
      footLength: '26 cm',
      mlWidth: '9.5 cm'
    }
  },
  {
    id: 'casting_scan',
    name: 'Casting / Impression / 3D Scan',
    description: 'Capturing non-weight-bearing 3D digital scan or fiberglass anatomical cast.',
    subjective: 'Patient present for anatomical capture. Expresses readiness for device fabrication and reports current symptoms unchanged.',
    objective: '3D digital optical scan / negative fiberglass cast taken in corrected neutral position. Ankle subtalar joint held in neutral, forefoot locked. Landmarks identified.',
    assessment: 'High-fidelity anatomical impression successfully obtained without skin compromise or pressure point distortion.',
    plan: 'Prepare digital CAD file / rectifying plaster model. Send order specs to central fabrication lab with target fitting date.',
    deviceCategory: 'AFO',
    lCodes: ['L1960', 'L2820'],
    measurements: {
      calfCircumference: '38.2 cm',
      ankleCircumference: '24.1 cm',
      footLength: '26.0 cm'
    }
  },
  {
    id: 'fitting_alignment',
    name: 'Diagnostic Fitting & Dynamic Alignment',
    description: 'Check-socket or trial fitting, static/dynamic alignment, trimline adjustments.',
    subjective: 'Patient testing diagnostic fitting device. Reports good heel cup stability and improved confidence during stance phase.',
    objective: 'Static alignment verified in parallel bars. Dynamic trial shows optimal heel-to-toe gait progression. Trimline modified by 3mm around fibular head to relieve mild pressure.',
    assessment: 'Diagnostic fitting achieves biomechanical goals with minor trimline adjustment. Ready for final lamination / assembly.',
    plan: 'Proceed to final fabrication and assembly. Schedule final delivery appointment upon lab completion.',
    deviceCategory: 'AFO',
    lCodes: ['L1960', 'L2820', 'L2275'],
    measurements: {
      heelWidth: '7.2 cm',
      instepGirth: '25.5 cm'
    }
  },
  {
    id: 'final_delivery',
    name: 'Final Delivery & Gait Training',
    description: 'Final device fitting, patient education, wear schedule, and care instructions.',
    subjective: 'Patient receives finished device. Expresses satisfaction with fit, cosmetic appearance, and ease of donning/doffing.',
    objective: 'Final device delivered and inspected for smooth edge finish. Stance and swing phase alignment checked on flat surface. Donning/doffing demonstrated successfully.',
    assessment: 'Device fits securely without localized erythema after 20 minutes of gait trial. Biomechanical alignment restored.',
    plan: 'Issue progressive wear schedule (2 hrs day 1, increase by 2 hrs daily). Instructed on hygiene and skin checks. Scheduled 2-week follow-up.',
    deviceCategory: 'AFO',
    lCodes: ['L1960', 'L2820', 'L2275', 'L2280'],
    measurements: {}
  },
  {
    id: 'followup_adjustment',
    name: 'Follow-Up, Adjustment & Repair',
    description: 'Routine follow-up, strap replacement, lining padding, or alignment fine-tuning.',
    subjective: 'Patient returns for 2-week follow-up. Reports improved mobility but notes slight pressure over medial malleolus after 4 hours of continuous wear.',
    objective: 'Inspection reveals localized mild hyperemia over medial malleolus. Device padded with 1/8" PPT and heat-flared slightly at medial trimline.',
    assessment: 'Pressure point successfully relieved with thermal modification and localized padding.',
    plan: 'Patient to resume normal wear schedule. Follow up as needed or in 6 months for routine maintenance check.',
    deviceCategory: 'AFO',
    lCodes: ['L2755'],
    measurements: {}
  }
];

const COMMON_L_CODES = [
  { code: 'L1960', desc: 'AFO, rigid plastic, custom fabricated' },
  { code: 'L1970', desc: 'AFO, plastic with ankle joint, custom' },
  { code: 'L2820', desc: 'Addition to lower extremity, soft interface material' },
  { code: 'L2275', desc: 'Addition to lower extremity, dorsiflexion assist' },
  { code: 'L3000', desc: 'Foot insert, removable, molded to patient model' },
  { code: 'L5301', desc: 'Below knee, molded socket, SACH foot' },
  { code: 'L5637', desc: 'Addition to lower extremity, flexible socket' },
  { code: 'L0637', desc: 'Lumbar-sacral orthosis, sagittal-coronal control' }
];

export const GuidedVisitModal: React.FC<GuidedVisitModalProps> = ({
  isOpen,
  onClose,
  patients,
  appointments,
  initialPatientId,
  initialAppointmentId,
  onUpdatePatient,
  onUpdateAppointment,
  onAddAppointment,
  onAddFabricationItem,
  onAddNewPatient
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Patient & Appointment selection
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || (patients[0]?.id || ''));
  const [selectedApptId, setSelectedApptId] = useState<string>(initialAppointmentId || '');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  
  // Quick Add Patient state if creating on the fly
  const [isQuickCreatePatient, setIsQuickCreatePatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientInsurance, setNewPatientInsurance] = useState('Medicare Blue Cross');

  // Step 2: Template Selection & Visit Type
  const [selectedTemplateId, setSelectedTemplateId] = useState('initial_eval');
  const [visitType, setVisitType] = useState('Initial Evaluation');

  // Step 3: Structured Note SOAP Fields
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Step 4: Measurements, Goals & Attachments
  const [calfCircum, setCalfCircum] = useState('38 cm');
  const [ankleCircum, setAnkleCircum] = useState('24 cm');
  const [footLength, setFootLength] = useState('26 cm');
  const [mlWidth, setMlWidth] = useState('9.5 cm');
  const [residualLimbLength, setResidualLimbLength] = useState('18 cm');
  const [goals, setGoals] = useState('Restore independent community ambulation without pain or fall risk.');
  const [attachments, setAttachments] = useState<Array<{ name: string; url?: string; type?: string; size?: string }>>([]);

  // Step 5: Device & Order Details
  const [deviceCategory, setDeviceCategory] = useState<'AFO' | 'KAFO' | 'Custom Foot Orthosis' | 'Prosthesis' | 'Spinal Brace' | 'Upper Limb' | 'Repair / Mod'>('AFO');
  const [affectedSide, setAffectedSide] = useState<'Left' | 'Right' | 'Bilateral'>('Left');
  const [selectedLCodes, setSelectedLCodes] = useState<string[]>(['L1960', 'L2820']);
  const [customLCodeInput, setCustomLCodeInput] = useState('');
  const [fabSpecs, setFabSpecs] = useState('Carbon composite frame, dual density EVA footbed, anterior tibial strap with padding.');
  const [fabTech, setFabTech] = useState('Tech Mike');

  // Step 6: Outcome & Next Task
  const [outcome, setOutcome] = useState<'completed' | 'needs authorization' | 'sent to fabrication' | 'follow-up required'>('sent to fabrication');
  const [nextTaskTitle, setNextTaskTitle] = useState('Thermoform carbon frame in fabrication lab');
  const [nextTaskDueDate, setNextTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });

  // Step 7: Checkout, Signature & Schedule Follow-Up
  const [isFinalized, setIsFinalized] = useState(true);
  const [signedBy, setSignedBy] = useState('Deepak Kumar Bhardwaj (BOCO)');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [followUpTime, setFollowUpTime] = useState('10:00 AM');
  const [followUpType, setFollowUpType] = useState('Diagnostic Fitting & Alignment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial props
  useEffect(() => {
    if (initialPatientId) setSelectedPatientId(initialPatientId);
    if (initialAppointmentId) setSelectedApptId(initialAppointmentId);
  }, [initialPatientId, initialAppointmentId]);

  // Load template defaults when selectedTemplateId changes
  useEffect(() => {
    const tmpl = VISIT_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (tmpl) {
      setVisitType(tmpl.name);
      setSubjective(tmpl.subjective);
      setObjective(tmpl.objective);
      setAssessment(tmpl.assessment);
      setPlan(tmpl.plan);
      setDeviceCategory(tmpl.deviceCategory as any || 'AFO');
      setSelectedLCodes(tmpl.lCodes || []);
      if (tmpl.measurements) {
        if (tmpl.measurements.calfCircumference) setCalfCircum(tmpl.measurements.calfCircumference);
        if (tmpl.measurements.ankleCircumference) setAnkleCircum(tmpl.measurements.ankleCircumference);
        if (tmpl.measurements.footLength) setFootLength(tmpl.measurements.footLength);
        if (tmpl.measurements.mlWidth) setMlWidth(tmpl.measurements.mlWidth);
      }
    }
  }, [selectedTemplateId]);

  if (!isOpen) return null;

  const currentPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  const handleToggleLCode = (code: string) => {
    if (selectedLCodes.includes(code)) {
      setSelectedLCodes(selectedLCodes.filter(c => c !== code));
    } else {
      setSelectedLCodes([...selectedLCodes, code]);
    }
  };

  const handleAddCustomLCode = () => {
    if (customLCodeInput.trim() && !selectedLCodes.includes(customLCodeInput.trim().toUpperCase())) {
      setSelectedLCodes([...selectedLCodes, customLCodeInput.trim().toUpperCase()]);
      setCustomLCodeInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachments(prev => [
        ...prev,
        {
          name: file.name,
          type: file.type.includes('image') ? 'photo' : 'doc',
          size: `${(file.size / 1024).toFixed(1)} KB`,
          url: URL.createObjectURL(file)
        }
      ]);
    }
  };

  const handleCompleteVisit = async () => {
    let patientToUse = currentPatient;

    try {
      setIsSubmitting(true);

      // Handle quick patient creation if toggled
      if (isQuickCreatePatient && onAddNewPatient) {
        if (!newPatientName.trim()) {
          alert('Please enter patient name');
          setIsSubmitting(false);
          return;
        }
        patientToUse = await onAddNewPatient({
          name: newPatientName,
          phone: newPatientPhone || '(555) 019-2834',
          dob: newPatientDob || '1985-05-12',
          insuranceCompany: newPatientInsurance,
          primaryClinician: signedBy
        });
      }

      if (!patientToUse) {
        alert('Please select or create a patient');
        setIsSubmitting(false);
        return;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      // Consolidated text summary
      const formattedText = `
VISIT TYPE: ${visitType}
PROVIDER: ${signedBy}

[S] SUBJECTIVE:
${subjective}

[O] OBJECTIVE & MEASUREMENTS:
${objective}
Measurements: Calf (${calfCircum}), Ankle (${ankleCircum}), Foot (${footLength}), M-L (${mlWidth}), Limb (${residualLimbLength})

[A] ASSESSMENT:
${assessment}

[P] PLAN & DEVICE DETAILS:
${plan}
Device Category: ${deviceCategory} (${affectedSide} side)
L-Codes: ${selectedLCodes.join(', ') || 'None'}
Fabrication Specs: ${fabSpecs}

OUTCOME: ${outcome.toUpperCase()}
NEXT TASK: ${nextTaskTitle} (Due: ${nextTaskDueDate})
      `.trim();

      // 1. Build structured ClinicalNote
      const newNote: ClinicalNote = {
        id: `cn_${Date.now()}`,
        date: `${dateStr} · ${timeStr}`,
        author: signedBy || 'Deepak Kumar Bhardwaj (BOCO)',
        visitType,
        subjective,
        objective,
        assessment,
        plan,
        deviceDetails: {
          deviceCategory,
          lCodes: selectedLCodes,
          fabricationSpecs: fabSpecs,
          affectedSide
        },
        measurements: {
          Calf: calfCircum,
          Ankle: ankleCircum,
          'Foot Length': footLength,
          'M-L Width': mlWidth,
          'Residual Limb': residualLimbLength
        },
        goals,
        outcome,
        nextTask: nextTaskTitle,
        nextTaskDueDate,
        followUpDate: scheduleFollowUp ? followUpDate : undefined,
        isFinalized,
        signedBy: isFinalized ? signedBy : undefined,
        signedAt: isFinalized ? `${dateStr} ${timeStr}` : undefined,
        text: formattedText
      };

      // 2. Build TimelineEvent
      const newTlEvent: TimelineEvent = {
        id: `tl_visit_${Date.now()}`,
        dateTime: `${dateStr} · ${timeStr}`,
      author: signedBy || 'Deepak Kumar Bhardwaj (BOCO)',
        eventType: outcome === 'sent to fabrication' ? 'fabrication' : outcome === 'needs authorization' ? 'authorization' : 'visit',
        title: `Clinical Visit (${visitType})`,
        summary: `${visitType} completed by ${signedBy}. ${assessment.slice(0, 120)}...`,
        outcome: `Outcome: ${outcome.replace(/_/g, ' ')}`,
        nextAction: `${nextTaskTitle} (Due: ${nextTaskDueDate})`,
        status: 'Completed',
        dueDate: nextTaskDueDate,
        attachments: attachments.map(a => ({ name: a.name, url: a.url, type: a.type as any }))
      };

      // Update Patient State
      const existingNotes = patientToUse.clinicalNotes || [];
      const existingTl = patientToUse.timeline || [];

      let careStage: Patient['careStage'] = 'Fitting';
      if (outcome === 'sent to fabrication') careStage = 'Fabrication';
      else if (outcome === 'needs authorization') careStage = 'Authorization';
      else if (visitType.includes('Evaluation') || visitType.includes('Casting')) careStage = 'Casting/scan';
      else if (visitType.includes('Delivery')) careStage = 'Delivery';

      await onUpdatePatient(patientToUse.id, {
        clinicalNotes: [newNote, ...existingNotes],
        timeline: [newTlEvent, ...existingTl],
        lastVisit: dateStr,
        nextAppointment: scheduleFollowUp ? `${followUpDate} ${followUpTime}` : patientToUse.nextAppointment,
        nextRequiredAction: `${nextTaskTitle} (Due ${nextTaskDueDate})`,
        careStage,
        deviceCategory,
        affectedSide,
        status: outcome === 'sent to fabrication' ? 'Fabrication' : outcome === 'needs authorization' ? 'Auth Pending' : 'In Progress'
      });

      // 3. Update appointment status to Checked In if linked
      if (selectedApptId) {
        await onUpdateAppointment(selectedApptId, { status: 'Checked In' });
      }

      // 4. Create Fabrication Item if outcome is 'sent to fabrication'
      if (outcome === 'sent to fabrication' && onAddFabricationItem) {
        await onAddFabricationItem({
          patientName: patientToUse.name,
          device: `${affectedSide} ${deviceCategory} (${selectedLCodes.join(', ')})`,
          stage: 'Layout',
          priority: 'Standard',
          techNotes: `Lab Spec: ${fabSpecs}. Assigned Tech: ${fabTech}. Target completion: ${nextTaskDueDate}.`,
          updatedAt: dateStr
        });
      }

      // 5. Schedule follow-up appointment if requested
      if (scheduleFollowUp && followUpDate) {
        await onAddAppointment({
          patientName: patientToUse.name,
          time: followUpTime,
          type: followUpType,
          status: 'Scheduled',
          appt_date: followUpDate
        });
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving guided visit session');
      setIsSubmitting(false);
    }
  };

  const filteredPatientsList = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-on-surface/60 modal-backdrop-blur">
      <div className="bg-surface-container-lowest w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-surface-container-highest animate-fade-in">
        
        {/* Header Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-surface-container-highest bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">clinical_notes</span>
            </div>
            <div>
              <h2 className="text-base font-black text-on-surface">Guided Clinical Visit Flow</h2>
              <p className="text-[11px] text-on-surface-variant font-semibold">
                Step {step} of 7: {
                  step === 1 ? 'Patient & Check-In' :
                  step === 2 ? 'Template & Visit Type' :
                  step === 3 ? 'Structured SOAP Assessment' :
                  step === 4 ? 'Measurements & Photos' :
                  step === 5 ? 'O&P Order & L-Codes' :
                  step === 6 ? 'Outcome & Tasks' : 'Checkout & Signature'
                }
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs font-bold">close</span>
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="px-6 py-2.5 bg-surface-container-lowest border-b border-surface-container-highest flex items-center justify-between text-[11px] font-extrabold overflow-x-auto gap-2">
          {[
            { num: 1, label: 'Patient' },
            { num: 2, label: 'Template' },
            { num: 3, label: 'SOAP Note' },
            { num: 4, label: 'Measurements' },
            { num: 5, label: 'O&P Order' },
            { num: 6, label: 'Outcome' },
            { num: 7, label: 'Checkout' }
          ].map(s => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                step === s.num
                  ? 'bg-primary text-white shadow-xs'
                  : step > s.num
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-surface-container-low text-on-surface-variant/70'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[9px] font-black">
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface">
          
          {/* STEP 1: PATIENT SELECTION / CHECK-IN */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
                <div>
                  <h3 className="text-sm font-black text-on-surface">Select Patient for Visit</h3>
                  <p className="text-xs text-on-surface-variant">Search existing patient database or register a new patient on the fly.</p>
                </div>
                <button
                  onClick={() => setIsQuickCreatePatient(!isQuickCreatePatient)}
                  className="px-3.5 py-1.5 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl text-xs font-bold hover:bg-secondary/20 cursor-pointer transition-colors"
                >
                  {isQuickCreatePatient ? '← Search Existing List' : '+ Register New Patient'}
                </button>
              </div>

              {isQuickCreatePatient ? (
                <div className="p-5 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-4">
                  <h4 className="text-xs font-black text-primary uppercase tracking-wider">Quick Patient Registration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface uppercase">Full Patient Name *</label>
                      <input
                        type="text"
                        value={newPatientName}
                        onChange={e => setNewPatientName(e.target.value)}
                        placeholder="e.g. Eleanor Vance"
                        className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none focus:border-secondary mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface uppercase">Phone Number</label>
                      <input
                        type="text"
                        value={newPatientPhone}
                        onChange={e => setNewPatientPhone(e.target.value)}
                        placeholder="(555) 019-2834"
                        className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface outline-none focus:border-secondary mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface uppercase">Date of Birth</label>
                      <input
                        type="date"
                        value={newPatientDob}
                        onChange={e => setNewPatientDob(e.target.value)}
                        className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface outline-none focus:border-secondary mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface uppercase">Insurance Provider</label>
                      <input
                        type="text"
                        value={newPatientInsurance}
                        onChange={e => setNewPatientInsurance(e.target.value)}
                        className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface outline-none focus:border-secondary mt-1"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/70 text-sm">search</span>
                    <input
                      type="text"
                      value={patientSearchTerm}
                      onChange={e => setPatientSearchTerm(e.target.value)}
                      placeholder="Search patient by name or MRN..."
                      className="w-full pl-9 pr-3 py-2.5 bg-surface-container-lowest rounded-2xl border border-surface-container-highest text-xs font-semibold outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                    {filteredPatientsList.map(p => {
                      const isSelected = p.id === selectedPatientId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPatientId(p.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-primary/5 border-primary ring-2 ring-primary/20'
                              : 'bg-surface-container-lowest border-surface-container-highest hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xs text-on-surface">
                              {p.avatarInitials || p.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-on-surface">{p.name}</p>
                              <p className="text-[10px] text-on-surface-variant font-mono">MRN: {p.mrn} • {p.insuranceCompany || 'Medicare'}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-sm font-black">check_circle</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Scheduled Appointments Check-in Link */}
                  {appointments.length > 0 && (
                    <div className="pt-3 border-t border-surface-container-highest space-y-2">
                      <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Link Today's Appointment (Optional)</label>
                      <select
                        value={selectedApptId}
                        onChange={e => {
                          setSelectedApptId(e.target.value);
                          const appt = appointments.find(a => a.id === e.target.value);
                          if (appt) {
                            const matchedP = patients.find(p => p.name.toLowerCase() === appt.patientName.toLowerCase());
                            if (matchedP) setSelectedPatientId(matchedP.id);
                            setVisitType(appt.type);
                          }
                        }}
                        className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-surface-container-highest text-xs font-semibold outline-none"
                      >
                        <option value="">-- No scheduled appointment linked --</option>
                        {appointments.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.time} - {a.patientName} ({a.type}) [{a.status}]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: TEMPLATE SELECTION */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
                <h3 className="text-sm font-black text-on-surface">Choose Visit Note Template</h3>
                <p className="text-xs text-on-surface-variant">Selecting a template pre-fills clinical SOAP structure, required measurements, and standard L-codes.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VISIT_TEMPLATES.map(tmpl => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-secondary/10 border-secondary ring-2 ring-secondary/20 shadow-xs'
                          : 'bg-surface-container-lowest border-surface-container-highest hover:border-secondary/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-black text-on-surface">{tmpl.name}</h4>
                        {isSelected && <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>}
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">{tmpl.description}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                          Device: {tmpl.deviceCategory}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                          L-Codes: {tmpl.lCodes.join(', ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Custom Visit Title / Reason</label>
                <input
                  type="text"
                  value={visitType}
                  onChange={e => setVisitType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none focus:border-secondary mt-1"
                />
              </div>
            </div>
          )}

          {/* STEP 3: STRUCTURED SOAP NOTE */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-highest">
                <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">clinical_notes</span>
                  Structured SOAP Clinical Assessment
                </h3>
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-md">
                  Template: {visitType}
                </span>
              </div>

              <div className="space-y-3">
                {/* Subjective */}
                <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-1.5">
                  <label className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px]">S</span>
                    Subjective / Patient Concern &amp; Functional Goals
                  </label>
                  <textarea
                    rows={3}
                    value={subjective}
                    onChange={e => setSubjective(e.target.value)}
                    className="w-full p-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-medium text-on-surface outline-none focus:border-primary resize-none"
                    placeholder="Chief complaint, pain scale (0-10), daily activity limitations..."
                  />
                </div>

                {/* Objective */}
                <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-1.5">
                  <label className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-secondary/10 text-secondary flex items-center justify-center text-[10px]">O</span>
                    Objective Findings, Physical Exam &amp; Alignment
                  </label>
                  <textarea
                    rows={3}
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    className="w-full p-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-medium text-on-surface outline-none focus:border-secondary resize-none"
                    placeholder="Physical examination, range of motion, muscle strength, skin inspection..."
                  />
                </div>

                {/* Assessment */}
                <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-1.5">
                  <label className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">A</span>
                    Assessment &amp; Biomechanical Necessity
                  </label>
                  <textarea
                    rows={3}
                    value={assessment}
                    onChange={e => setAssessment(e.target.value)}
                    className="w-full p-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-medium text-on-surface outline-none focus:border-emerald-500 resize-none"
                    placeholder="Clinical diagnosis summary, functional K-level, prognosis..."
                  />
                </div>

                {/* Plan */}
                <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-1.5">
                  <label className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px]">P</span>
                    Plan &amp; Treatment Recommendations
                  </label>
                  <textarea
                    rows={3}
                    value={plan}
                    onChange={e => setPlan(e.target.value)}
                    className="w-full p-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-medium text-on-surface outline-none focus:border-indigo-500 resize-none"
                    placeholder="Prescription recommendations, wear schedule, follow-up timeline..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: MEASUREMENTS, GOALS & ATTACHMENTS */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
                <h3 className="text-sm font-black text-on-surface">Anatomical Measurements &amp; Clinical Photos</h3>
                <p className="text-xs text-on-surface-variant">Record precise limb dimensions, rehabilitation mobility goals, and attach digital 3D scans or photos.</p>
              </div>

              {/* Key Measurements */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-3">
                <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">O&amp;P Limb Measurements</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface uppercase">Calf Circumference</label>
                    <input
                      type="text"
                      value={calfCircum}
                      onChange={e => setCalfCircum(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface uppercase">Ankle Circumference</label>
                    <input
                      type="text"
                      value={ankleCircum}
                      onChange={e => setAnkleCircum(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface uppercase">Foot Length</label>
                    <input
                      type="text"
                      value={footLength}
                      onChange={e => setFootLength(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface uppercase">M-L Width</label>
                    <input
                      type="text"
                      value={mlWidth}
                      onChange={e => setMlWidth(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface uppercase">Residual Limb Length</label>
                    <input
                      type="text"
                      value={residualLimbLength}
                      onChange={e => setResidualLimbLength(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Goals */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-2">
                <label className="text-xs font-black text-on-surface uppercase tracking-wider">Functional Rehabilitation Goals</label>
                <input
                  type="text"
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none"
                />
              </div>

              {/* Photo & Scan Attachments */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">Clinical Photos &amp; 3D Scan Files</h4>
                  <label className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 cursor-pointer transition-all flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Attach Photo / Scan
                    <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.stl" />
                  </label>
                </div>

                {attachments.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">No photos or scan files attached to this visit session yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold">
                        <span className="material-symbols-outlined text-sm text-primary">
                          {att.type === 'photo' ? 'photo' : 'description'}
                        </span>
                        <span>{att.name} ({att.size})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: DEVICE & ORDER DETAILS */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
                <h3 className="text-sm font-black text-on-surface">O&amp;P Device Specs &amp; L-Code Billing Selection</h3>
                <p className="text-xs text-on-surface-variant">Assign device category, affected side, billing L-codes, and central fabrication lab instructions.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-on-surface uppercase">Device Category</label>
                  <select
                    value={deviceCategory}
                    onChange={e => setDeviceCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                  >
                    <option value="AFO">AFO (Ankle Foot Orthosis)</option>
                    <option value="KAFO">KAFO (Knee Ankle Foot Orthosis)</option>
                    <option value="Custom Foot Orthosis">Custom Foot Orthosis</option>
                    <option value="Prosthesis">Lower / Upper Limb Prosthesis</option>
                    <option value="Spinal Brace">Spinal Orthosis / TLSO</option>
                    <option value="Upper Limb">Upper Limb Orthosis</option>
                    <option value="Repair / Mod">Device Repair / Modification</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-on-surface uppercase">Anatomical Side</label>
                  <select
                    value={affectedSide}
                    onChange={e => setAffectedSide(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                  >
                    <option value="Left">Left Side</option>
                    <option value="Right">Right Side</option>
                    <option value="Bilateral">Bilateral (Both Sides)</option>
                  </select>
                </div>
              </div>

              {/* L-Code Chips */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">HCPCS L-Code Selection</h4>
                  <span className="text-[10px] font-bold text-primary">{selectedLCodes.length} Selected</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {COMMON_L_CODES.map(item => {
                    const isSelected = selectedLCodes.includes(item.code);
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleToggleLCode(item.code)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-2xs'
                            : 'bg-surface text-on-surface-variant border-surface-container-highest hover:border-primary'
                        }`}
                        title={item.desc}
                      >
                        <span>{item.code}</span>
                        <span className="text-[10px] opacity-80">({item.desc.slice(0, 18)}...)</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-2 border-t border-surface-container-highest">
                  <input
                    type="text"
                    value={customLCodeInput}
                    onChange={e => setCustomLCodeInput(e.target.value)}
                    placeholder="Enter custom L-Code (e.g. L1907)..."
                    className="flex-1 px-3 py-1.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLCode}
                    className="px-4 py-1.5 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary/90 cursor-pointer"
                  >
                    + Add L-Code
                  </button>
                </div>
              </div>

              {/* Fabrication Specs */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-3">
                <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">Fabrication &amp; Technical Lab Specs</h4>
                <textarea
                  rows={3}
                  value={fabSpecs}
                  onChange={e => setFabSpecs(e.target.value)}
                  className="w-full p-2.5 bg-surface rounded-xl border border-surface-container-highest text-xs font-medium text-on-surface outline-none resize-none"
                  placeholder="Material specs, lining padding, color/pattern, straps, trimline instructions..."
                />

                <div>
                  <label className="text-[10px] font-bold text-on-surface uppercase">Assigned Lab Technician</label>
                  <input
                    type="text"
                    value={fabTech}
                    onChange={e => setFabTech(e.target.value)}
                    className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: OUTCOME & NEXT TASK */}
          {step === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
                <h3 className="text-sm font-black text-on-surface">Set Visit Outcome &amp; Assign Next Clinical Task</h3>
                <p className="text-xs text-on-surface-variant">Define the care pipeline state outcome and schedule the next task due date.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'completed',
                    title: 'Visit Completed',
                    desc: 'Routine consultation or evaluation complete without immediate lab order.',
                    icon: 'check_circle',
                    badge: 'bg-emerald-100 text-emerald-800'
                  },
                  {
                    id: 'sent_to_fabrication',
                    title: 'Sent to Fabrication Lab',
                    desc: 'Order sent to central lab for thermoforming, grinding, or assembly.',
                    icon: 'precision_manufacturing',
                    badge: 'bg-blue-100 text-blue-800'
                  },
                  {
                    id: 'needs_authorization',
                    title: 'Needs Prior Authorization',
                    desc: 'L-codes require insurance payer approval prior to fabrication.',
                    icon: 'verified_user',
                    badge: 'bg-amber-100 text-amber-800'
                  },
                  {
                    id: 'follow_up_required',
                    title: 'Follow-Up Required',
                    desc: 'Patient needs additional diagnostic fitting or adjustment session.',
                    icon: 'event_repeat',
                    badge: 'bg-purple-100 text-purple-800'
                  }
                ].map(opt => {
                  const isSelected = outcome === (opt.id as any);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setOutcome(opt.id as any)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs'
                          : 'bg-surface-container-lowest border-surface-container-highest hover:border-primary/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-sm p-1 rounded-lg ${opt.badge}`}>{opt.icon}</span>
                          <h4 className="text-xs font-black text-on-surface">{opt.title}</h4>
                        </div>
                        {isSelected && <span className="material-symbols-outlined text-primary text-sm font-black">check_circle</span>}
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Next Task Assignment */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-3">
                <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">Assign Next Care Pipeline Task</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface uppercase">Task Title</label>
                    <input
                      type="text"
                      value={nextTaskTitle}
                      onChange={e => setNextTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface uppercase">Task Target Due Date</label>
                    <input
                      type="date"
                      value={nextTaskDueDate}
                      onChange={e => setNextTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: CHECKOUT & SIGNATURE */}
          {step === 7 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
                <h3 className="text-sm font-black text-on-surface">Finalize Visit &amp; Schedule Follow-Up</h3>
                <p className="text-xs text-on-surface-variant">Finalize clinician signature, record chart note, and schedule follow-up appointment.</p>
              </div>

              {/* Summary Card */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Patient: <strong className="text-primary">{currentPatient?.name}</strong></span>
                  <span>Visit Type: <strong className="text-secondary">{visitType}</strong></span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Device: <strong>{affectedSide} {deviceCategory}</strong></span>
                  <span>L-Codes: <strong>{selectedLCodes.join(', ') || 'None'}</strong></span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface border border-surface-container-highest text-[11px] italic">
                  "{assessment.slice(0, 140)}..."
                </div>
              </div>

              {/* Follow-Up Appointment Scheduling */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">Schedule Follow-Up Appointment</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleFollowUp}
                      onChange={e => setScheduleFollowUp(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span className="text-xs font-bold text-on-surface">Schedule Next Appointment</span>
                  </label>
                </div>

                {scheduleFollowUp && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface uppercase">Follow-Up Date</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={e => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface uppercase">Time</label>
                      <input
                        type="text"
                        value={followUpTime}
                        onChange={e => setFollowUpTime(e.target.value)}
                        className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-on-surface uppercase">Appointment Type</label>
                      <input
                        type="text"
                        value={followUpType}
                        onChange={e => setFollowUpType(e.target.value)}
                        className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-bold text-on-surface outline-none mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Final Signature */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container-highest space-y-3">
                <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">Clinician Signature &amp; Finalization</h4>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-bold text-on-surface uppercase">Signing Clinician Name</label>
                    <input
                      type="text"
                      value={signedBy}
                      onChange={e => setSignedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-surface rounded-xl border border-surface-container-highest text-xs font-extrabold text-on-surface outline-none mt-1"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={isFinalized}
                      onChange={e => setIsFinalized(e.target.checked)}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 block">Sign &amp; Lock Chart Note</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Mark as finalized &amp; append electronic signature</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-surface-container-highest bg-surface-container-low flex justify-between items-center shrink-0">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className={`px-4 py-2 rounded-full border border-surface-container-highest text-xs font-bold transition-all cursor-pointer ${
              step === 1 ? 'opacity-40 cursor-not-allowed text-on-surface-variant' : 'text-on-surface hover:bg-surface-container'
            }`}
          >
            ← Previous Step
          </button>

          <div className="flex items-center gap-3">
            {step < 7 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCompleteVisit}
                className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-full hover:bg-emerald-700 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">task_alt</span>
                {isSubmitting ? 'Saving Visit & Chart...' : 'Finalize Visit & Save Note'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
