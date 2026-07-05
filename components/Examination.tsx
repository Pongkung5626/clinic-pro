
import React, { useState, useEffect, useRef } from 'react';
import { Stethoscope, Pill, Scissors, Save, Activity, Trash2, Plus, ArrowLeft, FileText, Printer, X, Download, User as UserIcon, Clock, History, FlaskConical, ClipboardList, Search, AlertCircle, Edit3, Calendar, Share2, DollarSign, FileBadge, BookOpen, Settings, HeartPulse, Scale, Image as ImageIcon, Sparkles, Loader2, Upload, PenTool } from 'lucide-react';
import { Visit, Patient, Drug, Procedure, PrescriptionItem, ProcedureItem, ClinicInfo, User, LabTest, LabOrderItem, CheckupProgram, PrintedDoc, Appointment } from '../types';
import { calculateAge } from '../utils';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SignaturePad: React.FC<{
  value: string;
  onChange: (base64: string) => void;
}> = ({ value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      if (e.cancelable) e.preventDefault();
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      if (e.cancelable) e.preventDefault();
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50 p-3 space-y-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
          <PenTool className="w-3.5 h-3.5 text-orange-500" /> วาดลายเซ็นแพทย์ลงในช่องว่างด้านล่าง
        </span>
        {value && (
          <button 
            type="button"
            onClick={clear}
            className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors"
          >
            ล้างลายเซ็น (Clear)
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden relative" style={{ height: '140px' }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={140}
          className="w-full h-full cursor-crosshair touch-none block bg-transparent"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs text-center select-none">
            เซ็นชื่อที่นี่ (Sign here)
          </div>
        )}
      </div>
    </div>
  );
};

interface ExaminationProps {
  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  patients: Patient[];
  drugs: Drug[];
  procedures: Procedure[];
  labTests: LabTest[];
  checkupPrograms: CheckupProgram[];
  appointments: Appointment[];
  setAppointments: (action: any) => void;
  clinicInfo: ClinicInfo;
  currentUser: User | null;
  deleteVisit: (id: string) => void;
  deleteAppointment: (id: string) => void;
}

const Examination: React.FC<ExaminationProps> = ({ visits, setVisits, patients, drugs, procedures, labTests, checkupPrograms, appointments, setAppointments, deleteAppointment, clinicInfo, currentUser, deleteVisit }) => {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [dx, setDx] = useState('');
  const [dxThai, setDxThai] = useState('');
  const [notes, setNotes] = useState('');
  const [docOpinion, setDocOpinion] = useState('');
  const [doctorSignature, setDoctorSignature] = useState('');
  const [orderDrugs, setOrderDrugs] = useState<PrescriptionItem[]>([]);
  const [orderProcs, setOrderProcs] = useState<ProcedureItem[]>([]);
  const [orderLabs, setOrderLabs] = useState<LabOrderItem[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  
  // Drug Search State
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [showDrugResults, setShowDrugResults] = useState(false);

  // Historical Records State
  const [showHistory, setShowHistory] = useState(false);
  
  // Derived Patient History
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  
  const patientHistory = selectedVisit ? visits.filter(h => 
    h.patientId === selectedVisit.patientId && 
    h.id !== selectedVisit.id && 
    (h.status === 'Completed' || h.status === 'Pharmacy' || h.status === 'Billing') &&
    new Date(h.date) >= fiveYearsAgo
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  // Document Modals State
  const [activeDoc, setActiveDoc] = useState<'SickLeave' | 'MedicalCert' | 'Referral' | 'OPD' | 'Triage' | 'Appointment' | 'Receipt' | 'TubeLabel' | 'LabRequest' | null>(null);
  const [isBlankForm, setIsBlankForm] = useState(false);
  const [sickLeaveDays, setSickLeaveDays] = useState(1);
  const [referralTarget, setReferralTarget] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [referralType, setReferralType] = useState<'none' | 'refer'>('none');
  const [sickLeaveType, setSickLeaveType] = useState<'none' | 'rest'>('rest');
  
  // Appointment State
  const [appointmentDate, setAppointmentDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('17:00');
  const [appointmentPurpose, setAppointmentPurpose] = useState('ตรวจติดตามอาการ รับยาต่อเนื่อง');

  // Edit Vitals/CC State
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [editCC, setEditCC] = useState('');
  const [editPI, setEditPI] = useState('');
  const [editVitals, setEditVitals] = useState({
    weight: '', height: '', temperature: '', bpSystolic: '', bpDiastolic: '', pulse: '', spo2: '', rr: ''
  });

  // Admin Search State
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState<Visit[]>([]);
  const [viewingLab, setViewingLab] = useState<LabOrderItem | null>(null);

  // Examination can see Examination, Pharmacy, Billing, Triage, and Completed (if today for editing)
  const today = new Date().toDateString();
  const examList = visits.filter(v => 
    ['Examination', 'Pharmacy', 'Billing', 'Triage'].includes(v.status) || 
    (v.status === 'Completed' && new Date(v.date).toDateString() === today)
  ).sort((a, b) => a.queueNumber - b.queueNumber);
  
  // Barcode Scanner Integration
  useEffect(() => {
    const handleBarcode = (e: any) => {
      const barcode = e.detail;
      // 1. Try to find drug by barcode
      const drug = drugs.find(d => d.barcode === barcode);
      if (drug && selectedVisit) {
        addDrug(drug);
        return;
      }
      
      // 2. Try to find patient by HN if no visit selected or if it's a clear patient scan
      const visit = examList.find(v => {
        const p = patients.find(pt => pt.id === v.patientId);
        return p?.hn === barcode;
      });
      if (visit) {
        handleSelect(visit);
      }
    };
    window.addEventListener('barcodeScanned', handleBarcode);
    return () => window.removeEventListener('barcodeScanned', handleBarcode);
  }, [drugs, selectedVisit, examList, patients]);

  const isAdmin = currentUser?.role === 'Admin';
  const isDoctor = currentUser?.role === 'Doctor';
  const canPrintBlank = isAdmin || isDoctor;

  const handleAdminSearch = () => {
    if (!adminSearchTerm) return;
    const results = visits.filter(v => {
      const p = patients.find(pt => pt.id === v.patientId);
      return p?.hn.includes(adminSearchTerm) || p?.firstName.includes(adminSearchTerm) || p?.lastName.includes(adminSearchTerm);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAdminSearchResults(results.slice(0, 20)); // Limit to top 20
  };

  const handleSelect = (v: Visit) => {
    setSelectedVisit(v);
    setDx(v.diagnosis || '');
    setDxThai(v.diagnosisThai || '');
    setNotes(v.doctorNotes || '');
    setDocOpinion(v.doctorOpinion || '');
    setOrderDrugs(v.prescriptions || []);
    setOrderProcs(v.procedures || []);
    setOrderLabs(v.labOrders || []);
    setSickLeaveDays(v.sickLeaveDays || 1);
    setReferralTarget(v.referralTarget || '');
    setReferralReason(v.referralReason || '');
    
    // Check for draft in localStorage
    const draftKey = `draft_visit_${v.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setDx(draft.dx || '');
        setDxThai(draft.dxThai || '');
        setNotes(draft.notes || '');
        setDocOpinion(draft.docOpinion || '');
        setOrderDrugs(draft.orderDrugs || []);
        setOrderProcs(draft.orderProcs || []);
        setOrderLabs(draft.orderLabs || []);
        setSelectedProgramId(draft.selectedProgramId || null);
        setDoctorSignature(draft.doctorSignature || '');
        if (draft.sickLeaveDays) setSickLeaveDays(draft.sickLeaveDays);
        if (draft.referralTarget) setReferralTarget(draft.referralTarget);
        if (draft.referralReason) setReferralReason(draft.referralReason);
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    } else {
      setDx(v.diagnosis || '');
      setNotes(v.doctorNotes || '');
      setOrderDrugs(v.prescriptions || []);
      setOrderProcs(v.procedures || []);
      setOrderLabs(v.labOrders || []);
      setSelectedProgramId(v.appliedCheckupId || null);
      setDoctorSignature(v.doctorSignature || '');
    }

    // Set edit states
    setEditCC(v.chiefComplaint || '');
    setEditPI(v.presentIllness || '');
    setEditVitals({
      weight: v.vitalSigns?.weight?.toString() || '',
      height: v.vitalSigns?.height?.toString() || '',
      temperature: v.vitalSigns?.temperature?.toString() || '',
      bpSystolic: v.vitalSigns?.bpSystolic?.toString() || '',
      bpDiastolic: v.vitalSigns?.bpDiastolic?.toString() || '',
      pulse: v.vitalSigns?.pulse?.toString() || '',
      spo2: v.vitalSigns?.spo2?.toString() || '',
      rr: v.vitalSigns?.rr?.toString() || ''
    });
  };

  // Sync Lab Results from External Updates (Laboratory System)
  useEffect(() => {
    if (selectedVisit) {
      const liveVisit = visits.find(v => v.id === selectedVisit.id);
      if (liveVisit && liveVisit.labOrders) {
        // Sync lab results and status if updated externally
        setOrderLabs(prev => prev.map(l => {
          const upLab = liveVisit.labOrders?.find(ul => ul.id === l.id);
          if (upLab && (upLab.status !== l.status || upLab.result !== l.result)) {
            return { 
              ...l, 
              status: upLab.status, 
              result: upLab.result, 
              resultNote: upLab.resultNote, 
              resultImages: upLab.resultImages 
            };
          }
          return l;
        }));
      }
    }
  }, [visits, selectedVisit?.id]);

  const addDrug = (drug: Drug) => {
    if (orderDrugs.find(d => d.drugId === drug.id)) return;
    const newItem: PrescriptionItem = {
      id: Math.random().toString(36).substr(2, 9),
      drugId: drug.id,
      name: drug.name,
      amount: 1,
      unit: drug.unit,
      pricePerUnit: drug.price,
      instruction: drug.instruction,
      purpose: drug.purpose,
      instructionAmount: drug.instructionAmount,
      instructionUnit: drug.instructionUnit,
      instructionRoute: drug.instructionRoute,
      instructionTimes: drug.instructionTimes,
      instructionNote: drug.instructionNote,
      precautions: drug.precautions
    };
    setOrderDrugs([...orderDrugs, newItem]);
  };

  const addProc = (proc: Procedure) => {
    const newItem: ProcedureItem = {
      id: Math.random().toString(36).substr(2, 9),
      procedureId: proc.id,
      name: proc.name,
      price: proc.price,
      discount: 0
    };
    setOrderProcs([...orderProcs, newItem]);
  };

  const addLab = (lab: LabTest) => {
    if (orderLabs.find(l => l.labTestId === lab.id)) return;
    const newItem: LabOrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      labTestId: lab.id,
      name: lab.name,
      price: lab.price,
      status: 'Pending'
    };
    setOrderLabs([...orderLabs, newItem]);
  };

  const applyCheckupProgram = (program: CheckupProgram) => {
    if (!selectedVisit) {
      alert('กรุณาเลือกผู้ป่วยก่อนเลือกโปรแกรมตรวจสุขภาพ');
      return;
    }
    // We add all items from the program, avoiding duplicates
    const addedLabs: string[] = [];
    const addedProcs: string[] = [];

    // Add procedures
    const newProcs: ProcedureItem[] = program.procedureIds
      .filter(pid => !orderProcs.find(p => p.procedureId === pid))
      .map(pid => {
        const p = procedures.find(proc => proc.id === pid);
        if (!p) return null;
        addedProcs.push(p.name);
        return {
          id: Math.random().toString(36).substr(2, 9),
          procedureId: pid,
          name: p.name,
          price: p.price
        };
      })
      .filter((p): p is ProcedureItem => p !== null);

    // Add labs
    const newLabs: LabOrderItem[] = program.labTestIds
      .filter(lid => !orderLabs.find(l => l.labTestId === lid))
      .map(lid => {
        const l = labTests.find(lab => lab.id === lid);
        if (!l) return null;
        addedLabs.push(l.name);
        return {
          id: Math.random().toString(36).substr(2, 9),
          labTestId: lid,
          name: l.name,
          price: l.price,
          status: 'Pending'
        };
      })
      .filter((l): l is LabOrderItem => l !== null);

    if (newProcs.length === 0 && newLabs.length === 0) {
      alert('รายการทั้งหมดในโปรแกรมนี้ถูกสั่งไปแล้ว');
      return;
    }

    setOrderProcs([...orderProcs, ...newProcs]);
    setOrderLabs([...orderLabs, ...newLabs]);
    setSelectedProgramId(program.id);
    setDx(prev => prev ? `${prev}, ${program.name}` : program.name);
    
    // Smooth scroll to the order section to show it worked
    const orderSection = document.getElementById('order-section');
    if (orderSection) {
      orderSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const removeDrug = (id: string) => setOrderDrugs(orderDrugs.filter(d => d.id !== id));
  const removeProc = (id: string) => setOrderProcs(orderProcs.filter(p => p.id !== id));
  const removeLab = (id: string) => setOrderLabs(orderLabs.filter(l => l.id !== id));

  const sendBackToTriage = () => {
    if (!selectedVisit) return;
    if (window.confirm('ส่งผู้ป่วยกลับห้องซักประวัติ?')) {
      setVisits(prev => prev.map(v => v.id === selectedVisit.id ? { ...v, status: 'Triage' } : v));
      setSelectedVisit(null);
    }
  };

  const handleComplete = () => {
    if (!selectedVisit) return;

    let total = 0;
    const program = checkupPrograms.find(p => p.id === selectedProgramId);

    if (program) {
      total += program.totalPrice;
      
      // Add extra labs not in program
      orderLabs.forEach(l => {
        if (!program.labTestIds.includes(l.labTestId)) {
          total += l.price;
        }
      });

      // Add extra procedures not in program
      orderProcs.forEach(p => {
        if (!program.procedureIds.includes(p.procedureId)) {
          total += (p.price - (p.discount || 0));
        }
      });
    } else {
      // Standard pricing
      total += orderProcs.reduce((sum, p) => sum + (p.price - (p.discount || 0)), 0);
      total += orderLabs.reduce((sum, l) => sum + l.price, 0);
    }

    // Always add drugs
    total += orderDrugs.reduce((sum, d) => sum + (d.amount * d.pricePerUnit), 0);
    
    // If it was already completed, we allow it to flow back to Pharmacy/Billing if items changed, 
    // or keep as Completed if nothing significant changed (but here we force sync status)
    const hasMeds = orderDrugs.length > 0;
    const isEditingCompleted = selectedVisit.status === 'Completed';

    // If editing a completed visit, we move it back to Billing (or Pharmacy if meds changed) 
    // to ensure the total is reviewed and transaction is updated.
    let newStatus: Visit['status'] = hasMeds ? 'Pharmacy' : 'Billing';
    
    // If user only wanted to fix something minor without re-billing, they can, 
    // but the request "if modified, update bill" implies re-entering the flow.
    // However, to be safe, if status is already Billing/Pharmacy, we keep it.

    setVisits(prev => prev.map(v => 
      v.id === selectedVisit.id 
        ? { 
            ...v, 
            diagnosis: dx, 
            diagnosisThai: dxThai, 
            doctorNotes: notes, 
            doctorOpinion: docOpinion, 
            prescriptions: orderDrugs, 
            procedures: orderProcs, 
            labOrders: orderLabs, 
            totalAmount: total, 
            status: newStatus, 
            appliedCheckupId: selectedProgramId || undefined, 
            paymentStatus: 'Pending', 
            chiefComplaint: editCC, 
            presentIllness: editPI, 
            vitalSigns: { 
              ...v.vitalSigns, 
              weight: parseFloat(editVitals.weight) || v.vitalSigns?.weight || 0, 
              height: parseFloat(editVitals.height) || v.vitalSigns?.height || 0, 
              temperature: parseFloat(editVitals.temperature) || v.vitalSigns?.temperature || 0, 
              bpSystolic: parseInt(editVitals.bpSystolic) || v.vitalSigns?.bpSystolic || 0, 
              bpDiastolic: parseInt(editVitals.bpDiastolic) || v.vitalSigns?.bpDiastolic || 0, 
              pulse: parseInt(editVitals.pulse) || v.vitalSigns?.pulse || 0, 
              spo2: parseInt(editVitals.spo2) || v.vitalSigns?.spo2 || 0, 
              rr: parseInt(editVitals.rr) || v.vitalSigns?.rr || 0 
            },
            sickLeaveDays,
            referralTarget,
            referralReason,
            doctorSignature
          }
        : v
    ));
    
    // Clear draft
    localStorage.removeItem(`draft_visit_${selectedVisit.id}`);
    
    setSelectedVisit(null);
    alert('ตรวจเรียบร้อยแล้ว');
  };

  const handleSaveVitals = () => {
    if (!selectedVisit) return;
    const updatedVisit = {
      ...selectedVisit,
      chiefComplaint: editCC,
      presentIllness: editPI,
      vitalSigns: {
        weight: parseFloat(editVitals.weight) || 0,
        height: parseFloat(editVitals.height) || 0,
        temperature: parseFloat(editVitals.temperature) || 0,
        bpSystolic: parseInt(editVitals.bpSystolic) || 0,
        bpDiastolic: parseInt(editVitals.bpDiastolic) || 0,
        pulse: parseInt(editVitals.pulse) || 0,
        spo2: parseInt(editVitals.spo2) || 0,
        rr: parseInt(editVitals.rr) || 0
      }
    };
    setVisits(prev => prev.map(v => v.id === selectedVisit.id ? updatedVisit : v));
    setSelectedVisit(updatedVisit);
    setIsEditingVitals(false);
  };

  // Print Management
  // Removed automatic print useEffect to prevent unmounting before print dialog opens

  const handlePrint = (type: PrintedDoc['type']) => {
    if (!selectedVisit) return;
    
    const newPrintRecord: PrintedDoc = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: new Date().toISOString(),
      printedBy: currentUser?.fullName || 'Unknown'
    };

    const updatedVisit = {
      ...selectedVisit,
      printedDocs: [...(selectedVisit.printedDocs || []), newPrintRecord]
    };

    setVisits(prev => prev.map(v => v.id === selectedVisit.id ? updatedVisit : v));
    setSelectedVisit(updatedVisit);
    
    // setActiveDoc(type) is already called by the button click that opens the modal
  };

  const patient = selectedVisit ? patients.find(p => p.id === selectedVisit.patientId) : null;

  // Persistence Logic: Save draft to localStorage
  useEffect(() => {
    if (selectedVisit) {
      const draft = { dx, dxThai, notes, docOpinion, orderDrugs, orderProcs, orderLabs, selectedProgramId, doctorSignature };
      localStorage.setItem(`draft_visit_${selectedVisit.id}`, JSON.stringify(draft));
    }
  }, [selectedVisit, dx, dxThai, notes, docOpinion, orderDrugs, orderProcs, orderLabs, selectedProgramId, doctorSignature]);

  const getGoogleCalendarUrl = () => {
    if (!patient) return '';
    const startDate = appointmentDate.replace(/-/g, '') + 'T' + appointmentTime.replace(/:/g, '') + '00';
    // Assume 30 mins duration
    const endDateTime = new Date(new Date(appointmentDate + 'T' + appointmentTime).getTime() + 30 * 60000);
    const endDate = endDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '').split('T')[0] + 'T' + endDateTime.toISOString().split('T')[1].replace(/:|\.\d\d\d/g, '');
    
    const title = encodeURIComponent(`นัดหมาย: ${clinicInfo.name}`);
    const details = encodeURIComponent(`คนไข้: ${patient.firstName} ${patient.lastName}\nวัตถุประสงค์: ${appointmentPurpose}\nคลินิก: ${clinicInfo.name}\nโทร: ${clinicInfo.phone}`);
    const location = encodeURIComponent(clinicInfo.address);
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
  };

  const DocumentModal = ({ type }: { type: typeof activeDoc }) => {
    if (!isBlankForm && (!selectedVisit || !patient)) return null;

    const renderHeader = () => (
      <div className="text-center mb-6 font-['Sarabun']">
        {clinicInfo.logo && (
          <img 
            src={clinicInfo.logo} 
            alt="Clinic Logo" 
            className="h-16 mx-auto mb-4 object-contain"
            referrerPolicy="no-referrer"
          />
        )}
        <h2 style={{ fontSize: '20px' }} className="font-bold text-slate-800">{clinicInfo.name}</h2>
        <p style={{ fontSize: '16px' }} className="text-slate-500">{clinicInfo.address}</p>
        <p style={{ fontSize: '16px' }} className="text-slate-500">โทร: {clinicInfo.phone} | {clinicInfo.taxId}</p>
        <div className="h-px bg-slate-200 my-4" />
      </div>
    );

    let content;
    switch (type) {
      case 'Triage':
        content = (
          <div id="triage-slip" className="font-['Sarabun'] text-slate-900 leading-tight">
            <h6 style={{ fontSize: '18px' }} className="mb-4 font-bold uppercase tracking-widest text-center">ใบซักประวัติและสัญญาณชีพ</h6>
            <section style={{ fontSize: '16px' }} className="space-y-2 mb-4">
              <div className="flex justify-between">
                <p><span className="font-bold">ผู้ป่วย:</span> {isBlankForm ? '................................................' : `${patient?.firstName} ${patient?.lastName}`}</p>
                <p><span className="font-bold">HN:</span> {isBlankForm ? '................' : patient?.hn}</p>
              </div>
              <div className="flex justify-between">
                <p><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
                <p><span className="font-bold">เวลา:</span> {new Date().toLocaleTimeString('th-TH')}</p>
              </div>
              <p className="text-red-600 font-bold">
                แพ้ยา: {isBlankForm ? '................................................' : ((patient?.allergicDrugs || []).join(', ') || 'ไม่มีประวัติแพ้ยา')}
              </p>
            </section>
            <section className="mb-6 space-y-3">
              <h6 style={{ fontSize: '18px' }} className="font-bold border-b border-slate-200 pb-1">สัญญาณชีพ (Vital Signs)</h6>
              <div style={{ fontSize: '16px' }} className="grid grid-cols-2 gap-y-2">
                <p><span className="font-bold">น้ำหนัก:</span> {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.weight || '-')} kg</p>
                <p><span className="font-bold">ส่วนสูง:</span> {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.height || '-')} cm</p>
                <p><span className="font-bold">อุณหภูมิ:</span> {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.temperature || '-')} °C</p>
                <p><span className="font-bold">ความดัน:</span> {isBlankForm ? '..../....' : `${selectedVisit?.vitalSigns?.bpSystolic || '-'}/${selectedVisit?.vitalSigns?.bpDiastolic || '-'}`} mmHg</p>
                <p><span className="font-bold">ชีพจร:</span> {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.pulse || '-')} bpm</p>
                <p><span className="font-bold">SpO2:</span> {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.spo2 || '-')} %</p>
              </div>
            </section>
            <section className="space-y-4">
               <div>
                  <h6 style={{ fontSize: '18px' }} className="font-bold border-b border-slate-200 pb-1">อาการสำคัญ (Chief Complaint)</h6>
                  <p style={{ fontSize: '16px' }} className="whitespace-pre-wrap min-h-[1.5cm] bg-slate-50 p-2 rounded">{isBlankForm ? '' : (selectedVisit?.chiefComplaint || '-')}</p>
               </div>
               <div>
                  <h6 style={{ fontSize: '18px' }} className="font-bold border-b border-slate-200 pb-1">อาการเจ็บป่วยปัจจุบัน (Present Illness)</h6>
                  <p style={{ fontSize: '16px' }} className="whitespace-pre-wrap min-h-[3cm] bg-slate-50 p-2 rounded">{isBlankForm ? '' : (selectedVisit?.presentIllness || '-')}</p>
               </div>
            </section>
          </div>
        );
        break;
      case 'SickLeave':
        content = (
          <div className="space-y-4 font-['Sarabun'] leading-tight">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 no-print space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">จำนวนวันหยุด (Days):</label>
                  <input type="number" className="w-full border p-2 rounded-lg text-sm" value={sickLeaveDays} onChange={e => setSickLeaveDays(+e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ส่งต่อ (Refer to):</label>
                  <input className="w-full border p-2 rounded-lg text-sm" value={referralTarget} onChange={e => setReferralTarget(e.target.value)} placeholder="ชื่อโรงพยาบาล" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500">เหตุผลการส่งต่อ/ความเห็นอื่นๆ:</label>
                  <input className="w-full border p-2 rounded-lg text-sm" value={referralReason} onChange={e => setReferralReason(e.target.value)} placeholder="ระบุเหตุผล" />
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '18px' }} className="text-center font-bold">ใบรับรองการเจ็บป่วย (Sick Leave Certificate)</h3>
            
            <div style={{ fontSize: '16px' }} className="mt-4 space-y-4">
              <p>แพทย์ผู้ตรวจชื่อ <span className="inline-block border-b border-dotted border-slate-400 min-w-[200px] text-center font-bold">{currentUser?.fullName || (isBlankForm ? '' : '...........................................')}</span></p>
              <p>เป็นผู้ประกอบวิชาชีพเวชกรรมใบอนุญาตเลขที่ <span className="inline-block border-b border-dotted border-slate-400 min-w-[200px] text-center font-bold">{currentUser?.licenseNumber || `ว.${currentUser?.username}` || (isBlankForm ? '' : '...........................................')}</span></p>
              <p>ได้ทำการตรวจรักษาผู้ป่วยชื่อ <span className="inline-block border-b border-dotted border-slate-400 min-w-[250px] text-center font-bold">{isBlankForm ? '' : `${patient?.firstName} ${patient?.lastName}`}</span></p>
              <p>เมื่อวันที่ <span className="inline-block border-b border-dotted border-slate-400 min-w-[150px] text-center font-bold">{isBlankForm ? '' : new Date(selectedVisit?.date || Date.now()).toLocaleDateString('th-TH')}</span> เวลา <span className="inline-block border-b border-dotted border-slate-400 min-w-[80px] text-center font-bold">{isBlankForm ? '' : new Date(selectedVisit?.date || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span> น.</p>
              <p>อาการเจ็บป่วยขณะเข้ารับการรักษา <span className="inline-block border-b border-dotted border-slate-400 min-w-[400px] font-bold px-2">{isBlankForm ? '' : (selectedVisit?.chiefComplaint || '-')}</span></p>
              <p>ปรากฏว่าเป็นโรค <span className="inline-block border-b border-dotted border-slate-400 min-w-[450px] font-bold px-2">{isBlankForm ? '' : (dxThai || selectedVisit?.diagnosisThai || dx || selectedVisit?.diagnosis || '-')}</span></p>

              <div className="h-4" />
              
              <div className="flex items-center gap-4">
                <span>ส่งคนไข้ไปตรวจรักษาต่อที่สถานพยาบาลอื่น</span>
                <label className="flex items-center gap-1"><input type="radio" checked={referralType === 'none'} onChange={() => setReferralType('none')} /> ไม่มี</label>
                <label className="flex items-center gap-1"><input type="radio" checked={referralType === 'refer'} onChange={() => setReferralType('refer')} /> มี ระบุเหตุผล</label>
                <span className="flex-1 border-b border-dotted border-slate-400 font-bold px-2">{referralReason}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>ถ้ามี ส่งไปยังโรงพยาบาล</span>
                <span className="flex-1 border-b border-dotted border-slate-400 font-bold px-2">{referralTarget}</span>
                <span>เมื่อวันที่</span>
                <span className="w-40 border-b border-dotted border-slate-400"></span>
              </div>

              <div className="h-4" />

              <div className="space-y-2">
                <p className="font-bold">มีความเห็น</p>
                <div className="pl-6 space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={sickLeaveType === 'none'} onChange={() => setSickLeaveType('none')} /> 
                    ไม่ควรหยุดพักงาน
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="radio" checked={sickLeaveType === 'rest'} onChange={() => setSickLeaveType('rest')} /> 
                    <span>ควรหยุดพักงาน</span>
                    <span className="w-16 border-b border-dotted border-slate-400 text-center font-bold">{isBlankForm ? '' : sickLeaveDays}</span>
                    <span>วัน ตั้งแต่วันที่</span>
                    <span className="w-32 border-b border-dotted border-slate-400 text-center font-bold">{isBlankForm ? '' : new Date().toLocaleDateString('th-TH')}</span>
                    <span>ถึงวันที่</span>
                    <span className="w-32 border-b border-dotted border-slate-400 text-center font-bold">{isBlankForm ? '' : new Date(Date.now() + (sickLeaveDays - 1) * 86400000).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <p>ความเห็นอื่นๆ <span className="inline-block border-b border-dotted border-slate-400 w-full min-h-[1.5cm] px-2 font-bold">{docOpinion || selectedVisit?.doctorOpinion || ''}</span></p>
              </div>

              <div className="flex justify-between mt-10 px-10">
                <div className="text-center flex flex-col items-center">
                  <p>ลงชื่อ..................................................ผู้รับตรวจ</p>
                  <p>( {isBlankForm ? '..................................................' : `${patient?.firstName} ${patient?.lastName}`} )</p>
                </div>
                <div className="text-center flex flex-col items-center">
                  {selectedVisit?.doctorSignature && !isBlankForm && (
                    <div className="relative w-full flex justify-center h-0">
                      <div className="absolute bottom-1 h-16 w-32 flex items-center justify-center pointer-events-none">
                        <img src={selectedVisit.doctorSignature} alt="Signature" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )}
                  <p>ลงชื่อ..................................................แพทย์ผู้ตรวจ</p>
                  <p>( {currentUser?.fullName || '..................................................'} )</p>
                  <p style={{ fontSize: '14px' }}>{currentUser?.licenseNumber || `ว.${currentUser?.username}`}</p>
                </div>
              </div>

              <div className="text-center pt-8 font-bold text-sm">
                <p>ไม่ใช้ในกรณีขอเลื่อนคดีต่อศาล</p>
                <p className="mt-4">หมายเหตุ ใบรับรองนี้หากมีรอย ขูด ลบ ถือว่าใช้ไม่ได้ หากมีรอยขีดฆ่าแก้ไขต้องมีชื่อแพทย์ผู้ตรวจลงชื่อกำกับ</p>
              </div>
            </div>
          </div>
        );
        break;
      case 'MedicalCert':
        content = (
          <div className="space-y-2 font-['Sarabun'] leading-tight">
            <div className="text-center">
              <h1 style={{ fontSize: '18px' }} className="font-bold underline">ใบรับรองแพทย์ (Medical Certificate)</h1>
            </div>

            <section style={{ fontSize: '14px' }} className="space-y-1">
              <div className="flex justify-between font-bold">
                <p>ส่วนที่ 1 ของผู้ขอรับใบรับรองสุขภาพ</p>
                <p>เลขที่ <span className="border-b border-dotted border-slate-400 min-w-[100px] inline-block">{isBlankForm ? '' : selectedVisit?.id.substring(0, 8).toUpperCase()}</span></p>
              </div>
              <div className="grid grid-cols-12 gap-y-1">
                <div className="col-span-8 flex items-baseline gap-2">
                   <span>ข้าพเจ้า</span>
                   <span className="flex-1 border-b border-dotted border-slate-400 font-bold px-2">{isBlankForm ? '' : `${patient?.firstName} ${patient?.lastName}`}</span>
                </div>
                <div className="col-span-4 flex items-baseline gap-2">
                   <span>วัน เดือน ปี เกิด</span>
                   <span className="flex-1 border-b border-dotted border-slate-400 text-center font-bold">{isBlankForm ? '' : new Date(patient?.birthDate || Date.now()).toLocaleDateString('th-TH')}</span>
                </div>
                <div className="col-span-3 flex items-baseline gap-2">
                   <span>เพศ</span>
                   <span className="flex-1 border-b border-dotted border-slate-400 text-center font-bold">{isBlankForm ? '' : (patient?.gender === 'M' ? 'ชาย' : 'หญิง')}</span>
                </div>
                <div className="col-span-7 flex items-baseline gap-2">
                   <span>สถานที่อยู่ (ที่สามารถติดต่อได้)</span>
                   <span className="flex-1 border-b border-dotted border-slate-400 truncate px-2 font-bold">{isBlankForm ? '' : patient?.address}</span>
                </div>
                <div className="col-span-2 flex items-baseline gap-2">
                   <span>อายุ</span>
                   <span className="flex-1 border-b border-dotted border-slate-400 text-center font-bold">{isBlankForm ? '' : (new Date().getFullYear() - new Date(patient?.birthDate || 0).getFullYear())}</span>
                   <span>ปี</span>
                </div>
                <div className="col-span-6 flex items-baseline gap-2">
                   <span>หมายเลขบัตรประชาชน</span>
                   <span className="flex-1 border-b border-dotted border-slate-400 text-center font-bold tracking-widest">{isBlankForm ? '' : patient?.idCard}</span>
                </div>
                <div className="col-span-6 flex items-baseline gap-2">
                   <p className="font-bold underline">ข้าพเจ้าขอใบรับรองสุขภาพโดยมีประวัติสุขภาพดังนี้</p>
                </div>
                <div className="col-span-12 space-y-0.5">
                   {[
                     { label: '๑.โรคประจำตัว', options: ['ไม่มี', 'มี (ระบุ)'] },
                     { label: '๒.อุบัติเหตุ และ ผ่าตัด', options: ['ไม่มี', 'มี (ระบุ)'] },
                     { label: '๓.เคยเข้ารับการรักษาในโรงพยาบาล', options: ['ไม่มี', 'มี (ระบุ)'] }
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-4">
                        <span className="w-48 text-xs">{item.label}</span>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!isBlankForm} readOnly /> {item.options[0]}</label>
                          <label className="flex items-center gap-1 text-xs"><input type="checkbox" disabled /> {item.options[1]} .........................................</label>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
              <div className="flex flex-col items-end mt-2">
                <div className="text-center w-64">
                  <p className="text-xs">ลงชื่อ ............................................................</p>
                  <p className="text-xs">( {isBlankForm ? '..........................................................' : `${patient?.firstName} ${patient?.lastName}`} )</p>
                  <p className="text-[10px] italic">วันที่ {new Date().toLocaleDateString('th-TH')}</p>
                </div>
              </div>
            </section>

            <section style={{ fontSize: '14px' }} className="space-y-1 border-t pt-2">
              <p className="font-bold underline">ส่วนที่ ๒ ของแพทย์</p>
              <div className="flex justify-between font-bold">
                <p>สถานที่ตรวจ {clinicInfo.name}</p>
                <p>วันที่ {new Date().toLocaleDateString('th-TH')}</p>
              </div>
              <p>ข้าพเจ้า นายแพทย์/แพทย์หญิง <span className="border-b border-dotted border-slate-400 px-4 font-bold">{currentUser?.fullName}</span> (๑)</p>
              <p>ใบอนุญาตประกอบวิชาชีพเวชกรรมเลขที่ <span className="border-b border-dotted border-slate-400 px-4 font-bold">{currentUser?.licenseNumber || `ว.${currentUser?.username}`}</span></p>
              <p>สถานที่ประกอบวิชาชีพเวชกรรม {clinicInfo.name}</p>
              <p>ได้ตรวจร่างกาย นาย/นาง/นางสาว <span className="border-b border-dotted border-slate-400 px-4 font-bold">{isBlankForm ? '' : `${patient?.firstName} ${patient?.lastName}`}</span></p>
              <div className="flex gap-4 items-baseline">
                <span>แล้วเมื่อวันที่ <span className="border-b border-dotted border-slate-400 font-bold px-2">{isBlankForm ? '' : new Date().toLocaleDateString('th-TH')}</span></span>
                <span className="font-bold flex-1">มีรายละเอียดดังนี้</span>
              </div>
              <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-50 font-bold border rounded text-xs">
                <p>น้ำหนัก: {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.weight || '-') } กก.</p>
                <p>สูง: {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.height || '-') } ซม.</p>
                <p>BP: {isBlankForm ? '....' : `${selectedVisit?.vitalSigns?.bpSystolic || '-'}/${selectedVisit?.vitalSigns?.bpDiastolic || '-'}`} mmHg</p>
                <p>Pulse: {isBlankForm ? '....' : (selectedVisit?.vitalSigns?.pulse || '-') } bpm</p>
              </div>
              <div className="flex gap-4 text-xs font-bold">
                <span>สภาพร่างกายทั่วไป</span>
                <label className="flex items-center gap-1"><input type="checkbox" checked={!isBlankForm} readOnly /> ปกติ</label>
                <label className="flex items-center gap-1"><input type="checkbox" disabled /> ผิดปกติ (ระบุ) .................................</label>
              </div>
              <div className="space-y-0.5 text-xs">
                <p>ขอรับรองว่าบุคคลดังกล่าว ไม่เป็นผู้มีร่างกายทุพพลภาพจนไม่สามารถปฏิบัติหน้าที่ได้ ไม่ปรากฏ อาการโรคจิต หรือจิตฟั่นเฟือน หรือปัญญาอ่อน ไม่ปรากฏ อาการของการติดยาเสพติดให้โทษ และอาการโรคพิษสุราเรื้อรัง และไม่ปรากฏอาการและอาการแสดงของโรคต่อไปนี้</p>
                <div className="grid grid-cols-2 gap-x-4 pl-4 font-bold leading-tight">
                   <p>๑.โรคเรื้อนระยะติดต่อ</p>
                   <p>๒.วัณโรคระยะอันตราย</p>
                   <p>๓.โรคเท้าช้างระยะปรากฏอาการ</p>
                   <p>๔.อื่นๆ .........................................................</p>
                </div>
              </div>
              <div>
                <p className="font-bold text-xs">ผลตรวจห้องปฏิบัติการ</p>
                <p className="min-h-[0.8cm] border-b border-dotted border-slate-400 text-xs">{isBlankForm ? '' : orderLabs.map(l => l.name).join(', ')}</p>
              </div>
              <div className="pt-1">
                <p className="font-bold flex items-baseline gap-2 text-xs">
                   สรุปความเห็นของแพทย์
                   <span className="flex-1 border-b border-dotted border-slate-400 font-bold px-2">{docOpinion || selectedVisit?.doctorOpinion || (isBlankForm ? '' : 'เป็นผู้มีร่างกายสมบูรณ์แข็งแรง ไม่ปรากฏอาการของโรคทั้ง 5')}</span>
                   <span className="font-bold">(๒)</span>
                </p>
              </div>
              <div className="flex flex-col items-end mt-4">
                 <div className="text-center w-72 space-y-1">
                    {selectedVisit?.doctorSignature && !isBlankForm && (
                      <div className="relative w-full flex justify-center h-0">
                        <div className="absolute bottom-1 h-16 w-32 flex items-center justify-center pointer-events-none">
                          <img src={selectedVisit.doctorSignature} alt="Signature" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    )}
                    <p className="text-xs">ลงชื่อ ............................................................ แพทย์ผู้ตรวจ</p>
                    <p className="font-bold text-xs">( {currentUser?.fullName} )</p>
                    <p className="text-[10px]">ใบอนุญาตเลขที่ {currentUser?.licenseNumber || `ว.${currentUser?.username}`}</p>
                 </div>
              </div>
              <div className="text-[8px] space-y-0.5 mt-2 text-slate-400 italic">
                <p>* ใบรับรองแพทย์ฉบับนี้ให้ใช้ได้ ๑ เดือนนับแต่วันที่ตรวจร่างกาย</p>
              </div>
            </section>
          </div>
        );
        break;
      case 'Referral':
        content = (
          <div className="space-y-6 font-['Sarabun'] text-slate-900 leading-tight">
            <div className="text-center">
              <h3 style={{ fontSize: '18px' }} className="font-bold underline uppercase tracking-widest">ใบส่งตัวผู้ป่วยเพื่อรับการตรวจรักษา (Referral Form)</h3>
            </div>
            
            <div style={{ fontSize: '16px' }} className="grid grid-cols-2 border border-slate-300 p-6 gap-6">
              <div className="col-span-2 flex justify-between">
                <p><span className="font-bold">เรียน:</span> ผู้อำนวยการโรงพยาบาล/สถานพยาบาล</p>
                <p><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3 mt-2 no-print space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ fontSize: '14px' }} className="font-bold text-slate-500 block mb-1">ส่งไปยังสถานพยาบาล:</label>
                    <input className="w-full border p-2 rounded font-bold text-sm bg-slate-50" value={referralTarget} onChange={e => setReferralTarget(e.target.value)} placeholder="ระบุชื่อโรงพยาบาลปลายทาง" />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px' }} className="font-bold text-slate-500 block mb-1">เหตุผลการส่งตัว:</label>
                    <input className="w-full border p-2 rounded font-bold text-sm bg-slate-50" value={referralReason} onChange={e => setReferralReason(e.target.value)} placeholder="ระบุเหตุผล เช่น เพื่อตรวจวินิจฉัย" />
                  </div>
                </div>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3">
                <p><span className="font-bold">ข้อมูลผู้ป่วย:</span> {isBlankForm ? '..................................................................' : `${patient?.firstName} ${patient?.lastName} (HN: ${patient?.hn}) อายุ: ${patient ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : '..'} ปี`}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3">
                <p><span className="font-bold">ประวัติการแพ้ยา:</span> {isBlankForm ? '..................................................................' : ((patient?.allergicDrugs || []).join(', ') || 'ไม่มี')}</p>
                <p><span className="font-bold">โรคประจำตัว:</span> {isBlankForm ? '..................................................................' : ((patient?.chronicDiseases || []).join(', ') || 'ไม่มี')}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3">
                <p className="font-bold">อาการสำคัญ (CC):</p>
                <p className="pl-4 whitespace-pre-wrap">{isBlankForm ? '..................................................................' : (editCC || selectedVisit?.chiefComplaint || '-')}</p>
                <p className="font-bold mt-2">อาการเจ็บป่วยปัจจุบัน (PI):</p>
                <p className="pl-4 whitespace-pre-wrap">{isBlankForm ? '..................................................................' : (editPI || selectedVisit?.presentIllness || '-')}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3">
                <p><span className="font-bold">การวินิจฉัย:</span> {isBlankForm ? '..................................................................' : (dxThai || selectedVisit?.diagnosisThai || dx || selectedVisit?.diagnosis || '-')}</p>
                <p className="mt-2"><span className="font-bold">ความเห็น/แผนการรักษา:</span> {isBlankForm ? '..................................................................' : (docOpinion || selectedVisit?.doctorOpinion || '-')}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3">
                <p><span className="font-bold">เหตุผลการส่งตัว:</span> {referralReason || (isBlankForm ? '..................................................................' : 'เพื่อขอรับการตรวจวินิจฉัยและรักษาต่อเนื่องโดยละเอียด')}</p>
              </div>
            </div>
          </div>
        );
        break;
      case 'OPD':
        content = (
          <div className="space-y-4 font-['Sarabun'] text-slate-900">
             <div className="flex justify-between items-center border-b border-slate-300 pb-2">
                <h3 style={{ fontSize: '18px' }} className="font-bold">OPD CARD (ทะเบียนผู้ป่วยนอก)</h3>
                <span style={{ fontSize: '16px' }} className="italic">รหัสมาตรฐาน สสจ.</span>
             </div>
             <div style={{ fontSize: '16px' }} className="grid grid-cols-4 border border-slate-300 p-3 gap-y-2">
                <div className="col-span-2 font-bold">HN: {isBlankForm ? '................' : patient?.hn}</div>
                <div className="col-span-2 text-right"><span className="font-bold">วันที่:</span> {isBlankForm ? '................' : new Date(selectedVisit?.date || Date.now()).toLocaleString('th-TH')}</div>
                <div className="col-span-3 font-bold">ชื่อ-นามสกุล: {isBlankForm ? '................................................' : `${patient?.firstName} ${patient?.lastName}`}</div>
                <div>อายุ: {isBlankForm ? '....' : (patient ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : '..')} ปี</div>
                <div className="col-span-2">เพศ: {isBlankForm ? '....' : (patient?.gender === 'M' ? 'ชาย' : 'หญิง')}</div>
                <div className="col-span-2 text-right">เลขบัตร: {isBlankForm ? '....................' : patient?.idCard}</div>
                <div className="col-span-4 border-t border-slate-200 pt-1 flex justify-between">
                   <div><span className="font-bold">สิทธิ์การรักษา:</span> เงินสด (Self Pay)</div>
                   <div className="text-red-600 font-bold">แพ้ยา: {isBlankForm ? '................' : ((patient?.allergicDrugs || []).join(', ') || 'ไม่มี')}</div>
                </div>
             </div>
             <div style={{ fontSize: '16px' }} className="border border-slate-300 p-3 min-h-[40px]">
                <p className="font-bold underline mb-1">อาการสำคัญ (CC):</p>
                <p className="whitespace-pre-wrap">{isBlankForm ? '..................................................................' : (editCC || selectedVisit?.chiefComplaint || '-')}</p>
             </div>
             <div style={{ fontSize: '16px' }} className="border border-slate-300 p-3 min-h-[60px]">
                <p className="font-bold underline mb-1">อาการเจ็บป่วยปัจจุบัน (PI):</p>
                <p className="whitespace-pre-wrap">{isBlankForm ? '..................................................................' : (editPI || selectedVisit?.presentIllness || '-')}</p>
             </div>
             <div style={{ fontSize: '16px' }} className="border border-slate-300 p-3">
                <p className="font-bold underline mb-1">สัญญาณชีพ (Vital Signs):</p>
                <p>T:{isBlankForm ? '....' : (editVitals.temperature || selectedVisit?.vitalSigns?.temperature || '-') }°C | BP:{isBlankForm ? '....' : `${editVitals.bpSystolic || selectedVisit?.vitalSigns?.bpSystolic || '-'}/${editVitals.bpDiastolic || selectedVisit?.vitalSigns?.bpDiastolic || '-'}`} mmHg | PR:{isBlankForm ? '....' : (editVitals.pulse || selectedVisit?.vitalSigns?.pulse || '-') } bpm | SpO2:{isBlankForm ? '....' : (editVitals.spo2 || selectedVisit?.vitalSigns?.spo2 || '-') }% | RR:{isBlankForm ? '....' : (editVitals.rr || selectedVisit?.vitalSigns?.rr || '-') }/min</p>
                <p className="mt-1">BW:{isBlankForm ? '....' : (editVitals.weight || selectedVisit?.vitalSigns?.weight || '-') }kg | HT:{isBlankForm ? '....' : (editVitals.height || selectedVisit?.vitalSigns?.height || '-') }cm</p>
             </div>
             <div style={{ fontSize: '16px' }} className="border border-slate-300 p-3 min-h-[80px]">
                <p className="font-bold underline mb-1">การวินิจฉัย (Diagnosis):</p>
                <p className="font-bold text-emerald-800">{isBlankForm ? '................................................' : (dxThai || selectedVisit?.diagnosisThai || '-')}</p>
                <p className="text-orange-800 font-mono" style={{ fontSize: '16px' }}>Ref: {isBlankForm ? '................' : (dx || selectedVisit?.diagnosis || '-')}</p>
                <p className="mt-2 font-bold underline">แผนการรักษา (Management):</p>
                <div className="grid grid-cols-2 mt-1">
                  <ul className="list-disc pl-5 space-y-1" style={{ fontSize: '16px' }}>
                     {!isBlankForm && orderDrugs.map(d => <li key={d.id}>{d.name} x {d.amount} {d.unit}</li>)}
                     {isBlankForm && Array(5).fill(0).map((_, i) => <li key={i} className="text-slate-300">................................................</li>)}
                  </ul>
                  <ul className="list-disc pl-5 space-y-1" style={{ fontSize: '16px' }}>
                     {!isBlankForm && orderProcs.map(p => <li key={p.id}>{p.name}</li>)}
                     {!isBlankForm && orderLabs.map(l => <li key={l.id}>{l.name} (Lab)</li>)}
                     {isBlankForm && Array(5).fill(0).map((_, i) => <li key={i} className="text-slate-300">................................................</li>)}
                  </ul>
                </div>
             </div>
             <div style={{ fontSize: '16px' }} className="border border-slate-300 p-3 min-h-[100px]">
                <p className="font-bold underline mb-1">ความเห็นแพทย์และบันทึกเพิ่มเติม:</p>
                <p className="whitespace-pre-wrap font-bold text-slate-800">{isBlankForm ? '' : (docOpinion || selectedVisit?.doctorOpinion || '-')}</p>
                <p className="mt-2 whitespace-pre-wrap text-[16px] italic text-slate-500 border-t border-slate-100 pt-2">{isBlankForm ? '..................................................................' : (notes || selectedVisit?.doctorNotes || '-')}</p>
             </div>
          </div>
        );
        break;
      case 'Appointment':
        content = (
          <div className="space-y-6 font-['Sarabun']">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 no-print space-y-4 mb-6">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                ตั้งค่าวันนัดหมาย
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">วันที่นัด (Date):</label>
                  <input type="date" className="w-full border p-2 rounded-lg text-sm" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">เวลานัด (Time):</label>
                  <input type="time" className="w-full border p-2 rounded-lg text-sm" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500">วัตถุประสงค์ (Purpose):</label>
                  <div className="flex gap-2">
                    <input className="w-full border p-2 rounded-lg text-sm font-bold" value={appointmentPurpose} onChange={e => setAppointmentPurpose(e.target.value)} />
                    <a 
                      href={getGoogleCalendarUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg flex items-center gap-2 font-bold hover:bg-blue-100 transition-all text-xs whitespace-nowrap"
                    >
                      <Share2 className="w-4 h-4" />
                      ลง Google Calendar
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div id="appointment-card" className="w-[210mm] h-[148mm] p-10 border-2 border-slate-800 mx-auto bg-white flex flex-col font-['Sarabun'] text-slate-900 shadow-xl">
              <header className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-8">
                <div className="flex-1">
                  <h1 style={{ fontSize: '18px' }} className="font-bold leading-tight">{clinicInfo.name}</h1>
                  <p style={{ fontSize: '16px' }} className="mt-2 text-slate-600">{clinicInfo.address}</p>
                  <p style={{ fontSize: '16px' }} className="font-bold mt-1 text-slate-800">โทร: {clinicInfo.phone} | เลขผู้เสียภาษี: {clinicInfo.taxId}</p>
                </div>
                <div className="text-right ml-6">
                  <h2 style={{ fontSize: '18px' }} className="font-black uppercase tracking-widest border-4 border-slate-900 px-6 py-2">ใบนัดหมาย</h2>
                </div>
              </header>

              <main className="flex-1 space-y-10">
                <div className="flex items-end gap-4 border-b border-dotted border-slate-400 pb-2">
                  <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">ชื่อ-นามสกุล (Patient):</span>
                  <span style={{ fontSize: '16px' }} className="font-bold flex-1 text-slate-900">{patient.firstName} {patient.lastName}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-10">
                  <div className="flex items-end gap-4 border-b border-dotted border-slate-400 pb-2">
                    <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">วันที่นัด (Date):</span>
                    <span style={{ fontSize: '16px' }} className="font-bold flex-1 text-slate-900">
                      {new Date(appointmentDate).toLocaleDateString('th-TH', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      }).replace(/(\d+)$/, (match) => (parseInt(match) + 543).toString())}
                    </span>
                  </div>
                  <div className="flex items-end gap-4 border-b border-dotted border-slate-400 pb-2">
                    <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">เวลา (Time):</span>
                    <span style={{ fontSize: '16px' }} className="font-bold flex-1 text-slate-900">{appointmentTime} น.</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 border-b border-dotted border-slate-400 pb-2">
                  <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">วัตถุประสงค์ (Purpose):</span>
                  <span style={{ fontSize: '16px' }} className="font-bold flex-1 text-slate-900">{appointmentPurpose}</span>
                </div>

                <div className="mt-12 p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 style={{ fontSize: '16px' }} className="font-bold mb-3 uppercase tracking-wider underline text-slate-700">คำแนะนำเพิ่มเติม (Instructions):</h3>
                  <ul style={{ fontSize: '16px' }} className="space-y-2 list-disc list-inside text-slate-600">
                    <li>กรุณานำใบนัดนี้มาด้วยทุกครั้งที่เข้ารับบริการ (Please bring this card)</li>
                    <li>หากไม่สามารถมาตามนัดได้ กรุณาโทรแจ้งล่วงหน้า (Please call if you can't attend)</li>
                    <li>กรุณามาก่อนเวลานัด 10-15 นาที (Arrive 10-15 mins early)</li>
                  </ul>
                </div>
              </main>

              <footer className="mt-12 flex justify-between items-end">
                <div style={{ fontSize: '16px' }} className="text-slate-400 italic">
                  ออกให้เมื่อ (Issued Date): {new Date().toLocaleDateString('th-TH')}
                </div>
                <div className="text-center space-y-2">
                  <div className="w-64 border-b border-slate-800 mx-auto"></div>
                  <p style={{ fontSize: '18px' }} className="font-bold text-slate-800">ลงชื่อเจ้าหน้าที่ / แพทย์ (Authorized Signature)</p>
                </div>
              </footer>
            </div>
          </div>
        );
        break;
      case 'TubeLabel':
        content = (
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center gap-3 text-amber-800 text-sm font-medium no-print">
              <AlertCircle className="w-5 h-5" />
              ใบสติ๊กเกอร์ติดชื่อคนไข้ (Patient Name Sticker)
            </div>
            <div id="tube-labels-container" className="flex flex-col gap-4 items-center bg-slate-100 p-8 rounded-xl min-h-[400px]">
              <div 
                className="bg-white border-2 border-slate-900 w-[50mm] h-[30mm] p-2 flex flex-col justify-center items-center font-['Sarabun'] text-slate-950 print:m-0 print:shadow-none shadow-md overflow-hidden relative"
              >
                <div className="text-center">
                  <p className="text-[14px] font-black leading-tight uppercase tracking-tight">{patient?.firstName}</p>
                  <p className="text-[14px] font-black leading-tight uppercase tracking-tight">{patient?.lastName}</p>
                  <p className="text-[10px] font-bold mt-2 border-t pt-1 border-slate-300">HN: {patient?.hn}</p>
                </div>
                <div className="absolute bottom-1 right-1">
                  <span className="text-[7px] font-bold text-slate-400">{new Date().toLocaleDateString('th-TH')}</span>
                </div>
              </div>
            </div>
          </div>
        );
        break;
      case 'LabRequest':
        content = (
          <div className="font-['Sarabun'] text-slate-900 leading-tight">
            <div className="text-center mb-6">
              <h2 style={{ fontSize: '20px' }} className="font-bold">ใบนำส่งการตรวจทางห้องปฏิบัติการ (Lab Requisition)</h2>
              <p style={{ fontSize: '14px' }} className="text-slate-500">{clinicInfo.name}</p>
            </div>

            <div style={{ fontSize: '16px' }} className="grid grid-cols-2 border-y border-slate-200 py-4 mb-6">
              <div className="space-y-1">
                <p><span className="font-bold">ชื่อผู้ป่วย:</span> {patient?.firstName} {patient?.lastName}</p>
                <p><span className="font-bold">HN:</span> {patient?.hn}</p>
                <p><span className="font-bold">เพศ:</span> {patient?.gender === 'M' ? 'ชาย' : 'หญิง'} | <span className="font-bold">อายุ:</span> {patient ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : '..'} ปี</p>
              </div>
              <div className="text-right space-y-1">
                <p><span className="font-bold">วันที่สั่ง:</span> {new Date().toLocaleDateString('th-TH')}</p>
                <p><span className="font-bold">เวลาสั่ง:</span> {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                <p><span className="font-bold">เลขที่ Visit:</span> {selectedVisit?.id.substr(0,8).toUpperCase()}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold underline mb-2" style={{ fontSize: '16px' }}>รายการที่ส่งตรวจ (Tests Requested):</h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300">
                    <th className="text-left py-2 px-1" style={{ fontSize: '14px' }}>ลำดับ</th>
                    <th className="text-left py-2 px-1" style={{ fontSize: '14px' }}>รายการตรวจ</th>
                    <th className="text-left py-2 px-1" style={{ fontSize: '14px' }}>ประเภท/หลอด</th>
                    <th className="text-center py-2 px-1" style={{ fontSize: '14px' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {orderLabs.map((l, i) => (
                    <tr key={l.id} className="border-b border-slate-100">
                      <td className="py-2 px-1 text-center" style={{ fontSize: '14px' }}>{i + 1}</td>
                      <td className="py-2 px-1 font-bold" style={{ fontSize: '14px' }}>{l.name}</td>
                      <td className="py-2 px-1 text-slate-500" style={{ fontSize: '14px' }}>-</td>
                      <td className="py-2 px-1 text-center font-mono" style={{ fontSize: '12px' }}>[ ] Pending</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-12">
              <div className="border p-4 rounded-lg bg-slate-50">
                 <h5 className="font-bold mb-2 text-xs uppercase underline">Notes / Clinical History:</h5>
                 <p className="text-sm min-h-[2cm]">{selectedVisit?.chiefComplaint || '-'}</p>
              </div>
              <div className="flex flex-col items-center justify-end space-y-2">
                 <div className="w-48 border-b border-slate-900 mb-1"></div>
                 <p className="font-bold" style={{ fontSize: '14px' }}>{currentUser?.fullName}</p>
                 <p style={{ fontSize: '12px' }} className="text-slate-500">{currentUser?.licenseNumber || `ว.${currentUser?.username}`}</p>
                 <p className="text-slate-500" style={{ fontSize: '12px' }}>แพทย์ผู้สั่งตรวจ (Requesting Physician)</p>
              </div>
            </div>

            <div className="mt-12 pt-4 border-t border-dotted border-slate-300">
               <p className="text-[10px] text-slate-400 italic">*** โปรดลงวันที่และเวลาที่เก็บตัวอย่าง (Sample Collection Time): ............................................ ***</p>
            </div>
          </div>
        );
        break;
      case 'Receipt':
        content = (
          <div className="font-['Sarabun'] text-slate-900 leading-tight">
            <div className="text-center mb-4">
               <h3 style={{ fontSize: '18px' }} className="font-bold uppercase tracking-widest text-slate-700 underline">ใบเสร็จรับเงิน / ใบสรุปค่าใช้จ่าย</h3>
            </div>

            <div style={{ fontSize: '16px' }} className="flex justify-between mb-8 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <p><span className="font-bold text-slate-500">ชื่อ (Name):</span> {patient.firstName} {patient.lastName}</p>
                <p><span className="font-bold text-slate-500">HN:</span> {patient.hn}</p>
              </div>
              <div className="text-right space-y-1">
                <p><span className="font-bold text-slate-500">วันที่ (Date):</span> {new Date(selectedVisit.date).toLocaleDateString('th-TH')}</p>
                <p><span className="font-bold text-slate-500">เลขที่ (No):</span> REC-{selectedVisit.id.substr(0,5).toUpperCase()}</p>
              </div>
            </div>

            <table style={{ fontSize: '16px' }} className="w-full mb-10">
              <thead className="border-b-2 border-slate-800 bg-slate-50">
                <tr>
                  <th className="text-left p-2">ลำดับ</th>
                  <th className="text-left p-2">รายการ (Description)</th>
                  <th className="text-right p-2">จำนวน</th>
                  <th className="text-right p-2">ราคา/หน่วย</th>
                  <th className="text-right p-2">รวม (Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedVisit.prescriptions || []).map((d, index) => (
                  <tr key={d.id}>
                    <td className="p-2 text-slate-500">{index + 1}</td>
                    <td className="p-2">{d.name}</td>
                    <td className="text-right p-2">{d.amount}</td>
                    <td className="text-right p-2">{d.pricePerUnit.toLocaleString()}</td>
                    <td className="text-right p-2">{(d.amount * d.pricePerUnit).toLocaleString()}</td>
                  </tr>
                ))}
                {(selectedVisit.procedures || []).map((p, index) => (
                  <tr key={p.id}>
                    <td className="p-2 text-slate-500">{(selectedVisit.prescriptions || []).length + index + 1}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="text-right p-2">1</td>
                    <td className="text-right p-2">{(p.price - (p.discount || 0)).toLocaleString()}</td>
                    <td className="text-right p-2">{(p.price - (p.discount || 0)).toLocaleString()}</td>
                  </tr>
                ))}
                {(selectedVisit.labOrders || []).map((l, index) => (
                  <tr key={l.id}>
                    <td className="p-2 text-slate-500">{(selectedVisit.prescriptions || []).length + (selectedVisit.procedures || []).length + index + 1}</td>
                    <td className="p-2">{l.name} (Lab)</td>
                    <td className="text-right p-2">1</td>
                    <td className="text-right p-2">{l.price.toLocaleString()}</td>
                    <td className="text-right p-2">{l.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-800 bg-slate-50">
                <tr style={{ fontSize: '18px' }} className="font-bold text-slate-900">
                  <td colSpan={4} className="p-4 text-right">ยอดรวมสุทธิ (GRAND TOTAL)</td>
                  <td className="p-4 text-right">฿{selectedVisit.totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <div style={{ fontSize: '16px' }} className="flex justify-between items-end mt-16 px-10">
               <div className="text-center w-64 space-y-8">
                  <p>(ลงชื่อ)........................................................ ผู้รับเงิน</p>
                  <p className="font-bold underline">{currentUser?.fullName}</p>
               </div>
               <div className="text-center w-64 space-y-8">
                  <p>(ลงชื่อ)........................................................ ผู้จ่ายเงิน</p>
                  <p className="italic text-slate-400">........................................................</p>
               </div>
            </div>

            <div style={{ fontSize: '16px' }} className="text-slate-400 text-center mt-20 italic">
              <p>*** เอกสารนี้จัดทำโดยระบบอิเล็กทรอนิกส์ ขอบคุณที่ใช้บริการ ***</p>
            </div>
          </div>
        );
        break;
    }

    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-auto print:backdrop-blur-none transition-all">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
           <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                ตัวอย่างหน้าพิมพ์เอกสาร
              </h4>
              <button onClick={() => { setActiveDoc(null); setIsBlankForm(false); }} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
           </div>
           
           <div className={`flex-1 overflow-y-auto p-12 bg-white print:p-0 print:overflow-visible ${type === 'Appointment' ? 'max-w-none' : ''}`} id="printable-doc">
              {type !== 'Appointment' && type !== 'LabRequest' && type !== 'TubeLabel' && renderHeader()}
              {content}
              {type !== 'Appointment' && type !== 'LabRequest' && type !== 'TubeLabel' && type !== 'SickLeave' && type !== 'MedicalCert' && type !== 'Receipt' && (
                <div className="mt-12 flex justify-between items-end font-['Sarabun']">
                   <div className="text-center">
                      <div className="w-40 border-b border-slate-400 mb-1"></div>
                      <p style={{ fontSize: '12px' }} className="text-slate-500">ลายมือชื่อผู้รับการตรวจ/ผู้ป่วย</p>
                      <p style={{ fontSize: '12px' }} className="text-slate-500">(Patient's Signature)</p>
                   </div>
                   <div className="text-center flex flex-col items-center justify-end relative">
                      {selectedVisit?.doctorSignature && !isBlankForm && (
                        <div className="absolute bottom-16 h-16 w-32 flex items-center justify-center pointer-events-none">
                          <img src={selectedVisit.doctorSignature} alt="Signature" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <p style={{ fontSize: '14px' }} className="mb-8 font-bold">(ลงชื่อ)........................................................</p>
                      <p style={{ fontSize: '16px' }} className="font-bold">{currentUser?.fullName}</p>
                      <p style={{ fontSize: '12px' }} className="text-slate-500">แพทย์ผู้ตรวจรักษา (Physician)</p>
                      <p style={{ fontSize: '12px' }} className="text-slate-500">{currentUser?.licenseNumber || `ว.${currentUser?.username}`}</p>
                   </div>
                </div>
              )}
           </div>
           
           <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 no-print">
              <div className="flex-1 flex items-center gap-2">
                {isBlankForm && (
                  <p className="text-xs font-bold text-orange-600 animate-pulse bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200 flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> โหมดพิมพ์แบบฟอร์มเปล่า (Blank Form Mode)
                  </p>
                )}
              </div>
              <button onClick={() => { setActiveDoc(null); setIsBlankForm(false); }} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">ยกเลิก</button>
              <button 
                onClick={() => {
                  if (type === 'Appointment' && !isBlankForm && patient) {
                    // Save appointment to state
                    const appointment: Appointment = {
                      id: Math.random().toString(36).substr(2, 9),
                      patientId: patient.id,
                      patientName: `${patient.firstName} ${patient.lastName}`,
                      date: appointmentDate,
                      time: appointmentTime,
                      purpose: appointmentPurpose,
                      createdAt: new Date().toISOString(),
                      status: 'Scheduled'
                    };
                    setAppointments(prev => [...prev, appointment]);
                  }

                  if (type === 'TubeLabel') return;

                  let docType: PrintedDoc['type'] = 'MedicalCertificate';
                  if (type === 'Appointment') docType = 'Appointment';
                  if (type === 'OPD') docType = 'OPDCard';
                  if (type === 'Referral') docType = 'Referral';
                  if (type === 'Triage') docType = 'Triage';
                  if (type === 'Receipt') docType = 'Receipt';
                  if (type === 'LabRequest') docType = 'LabRequest';
                  handlePrint(docType);
                  // Ensure data is rendered before printing
                  setTimeout(() => {
                    window.print();
                  }, 300);
                }} 
                className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
              >
                 <Printer className="w-5 h-5" /> พิมพ์เอกสาร (Print)
              </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Edit Vitals Modal */}
      {isEditingVitals && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-4 h-4" /> แก้ไขอาการสำคัญและสัญญาณชีพ</h4>
                <button onClick={() => setIsEditingVitals(false)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             
             <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">อาการสำคัญ (Chief Complaint):</label>
                  <textarea 
                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                    rows={3}
                    value={editCC}
                    onChange={e => setEditCC(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">อาการเจ็บป่วยปัจจุบัน (Present Illness):</label>
                  <textarea 
                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                    rows={3}
                    value={editPI}
                    onChange={e => setEditPI(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">น้ำหนัก (kg):</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={editVitals.weight} onChange={e => setEditVitals({...editVitals, weight: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">ส่วนสูง (cm):</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={editVitals.height} onChange={e => setEditVitals({...editVitals, height: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">อุณหภูมิ (°C):</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-lg text-sm" value={editVitals.temperature} onChange={e => setEditVitals({...editVitals, temperature: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">ชีพจร (bpm):</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={editVitals.pulse} onChange={e => setEditVitals({...editVitals, pulse: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">ความดัน (Systolic):</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={editVitals.bpSystolic} onChange={e => setEditVitals({...editVitals, bpSystolic: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">ความดัน (Diastolic):</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={editVitals.bpDiastolic} onChange={e => setEditVitals({...editVitals, bpDiastolic: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">SpO2 (%):</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={editVitals.spo2} onChange={e => setEditVitals({...editVitals, spo2: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">RR (/min):</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={editVitals.rr} onChange={e => setEditVitals({...editVitals, rr: e.target.value})} />
                  </div>
                </div>
             </div>

             <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                <button onClick={() => setIsEditingVitals(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                <button 
                  onClick={handleSaveVitals}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all"
                >
                   บันทึกการแก้ไข
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-orange-600" />
            รายการตรวจรักษา
          </div>
          {canPrintBlank && (
            <div className="group relative">
               <button 
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                title="Print Blank Forms"
              >
                <FileText className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                 <p className="p-3 text-[10px] font-bold text-slate-400 bg-slate-50 border-b uppercase">พิมพ์แบบฟอร์มเปล่า</p>
                  <button onClick={() => { setIsBlankForm(true); setActiveDoc('SickLeave'); }} className="w-full text-left p-2.5 text-xs hover:bg-orange-50 font-bold text-slate-700 flex items-center gap-2">
                     <ClipboardList className="w-3.5 h-3.5" /> ใบรับรองการเจ็บป่วย
                  </button>
                  <button onClick={() => { setIsBlankForm(true); setActiveDoc('MedicalCert'); }} className="w-full text-left p-2.5 text-xs hover:bg-orange-50 font-bold text-slate-700 flex items-center gap-2">
                     <FileBadge className="w-3.5 h-3.5" /> ใบรับรองแพทย์ (5 โรค)
                  </button>
                  <button onClick={() => { setIsBlankForm(true); setActiveDoc('Referral'); }} className="w-full text-left p-2.5 text-xs hover:bg-orange-50 font-bold text-slate-700 flex items-center gap-2">
                     <Share2 className="w-3.5 h-3.5" /> ใบส่งตัว (Referral)
                  </button>
                  <button onClick={() => { setIsBlankForm(true); setActiveDoc('OPD'); }} className="w-full text-left p-2.5 text-xs hover:bg-orange-50 font-bold text-slate-700 flex items-center gap-2 border-t">
                     <BookOpen className="w-3.5 h-3.5" /> OPD Card เปล่า
                  </button>
              </div>
            </div>
          )}
        </h2>
        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
          {isAdmin && (
            <div className="mb-6 p-3 bg-slate-100 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Admin: แก้ไขประวัติย้อนหลัง</p>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  placeholder="ค้นหา HN / ชื่อ..." 
                  className="flex-1 text-xs p-2 border rounded-lg outline-none focus:ring-1 focus:ring-orange-500"
                  value={adminSearchTerm}
                  onChange={e => setAdminSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminSearch()}
                />
                <button 
                  onClick={handleAdminSearch}
                  className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
              {adminSearchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {adminSearchResults.map(v => {
                    const p = patients.find(pt => pt.id === v.patientId);
                    return (
                      <div key={v.id} className="flex gap-1">
                        <button
                          onClick={() => handleSelect(v)}
                          className="flex-1 text-left p-2 text-[10px] bg-white border rounded hover:border-orange-500 transition-colors"
                        >
                          <span className="font-bold">{p?.hn}</span> - {p?.firstName} ({new Date(v.date).toLocaleDateString('th-TH')})
                        </button>
                        <button 
                          onClick={() => {
                            deleteVisit(v.id);
                            setAdminSearchResults(prev => prev.filter(res => res.id !== v.id));
                            if (selectedVisit?.id === v.id) setSelectedVisit(null);
                          }}
                          className="p-2 bg-red-50 text-red-500 border border-red-100 rounded hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {examList.length > 0 ? examList.map(v => {
            const p = patients.find(pt => pt.id === v.patientId);
            return (
              <div
                key={v.id}
                onClick={() => handleSelect(v)}
                className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                  selectedVisit?.id === v.id ? 'border-orange-500 bg-orange-50 shadow-md ring-2 ring-orange-500/20' : 'border-slate-200 bg-white hover:border-orange-300'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  v.status === 'Completed' ? 'bg-emerald-500' : 
                  v.status === 'Examination' ? 'bg-orange-500' : 'bg-slate-300'
                }`} />
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">HN: {p?.hn}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      v.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {v.status}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVisit(v.id);
                        if (selectedVisit?.id === v.id) setSelectedVisit(null);
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="ลบคิวนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-baseline">
                  <p className="font-bold text-slate-800 truncate pr-2">{p?.firstName} {p?.lastName}</p>
                  <span className="text-[10px] bg-slate-800 text-white px-1.5 rounded font-mono">#{v.queueNumber}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(v.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            );
          }) : (
            <div className="bg-white p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400">
              ไม่มีข้อมูลผู้ป่วยในรายการวันนี้
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {selectedVisit ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start gap-4 relative">
              <div className="absolute top-4 right-4 text-xs font-mono bg-slate-100 px-2 py-1 rounded border">
                Queue Number: #{selectedVisit.queueNumber}
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center font-bold text-2xl text-orange-600">
                    {patients.find(p => p.id === selectedVisit.patientId)?.firstName.charAt(0)}
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-lg">
                        {patients.find(p => p.id === selectedVisit.patientId)?.firstName} {patients.find(p => p.id === selectedVisit.patientId)?.lastName}
                      </h3>
                      <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold ${showHistory ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                      >
                        <History className="w-3.5 h-3.5" />
                        {showHistory ? 'ปิดประวัติ' : 'ดูประวัติรักษา'} ({patientHistory.length})
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <p className="text-sm text-slate-500 font-bold">HN: {patients.find(p => p.id === selectedVisit.patientId)?.hn}</p>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        อายุ: <span className="font-bold">{calculateAge(patients.find(p => p.id === selectedVisit.patientId)?.birthDate || '')}</span>
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-emerald-500" />
                        น้ำหนัก: <span className="font-bold">{selectedVisit.vitalSigns?.weight || '-'} kg</span>
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                        โรคประจำตัว: <span className="font-bold">{(patients.find(p => p.id === selectedVisit.patientId)?.chronicDiseases || []).join(', ') || 'ไม่มี'}</span>
                      </p>
                    </div>
                    {selectedVisit.printedDocs && selectedVisit.printedDocs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedVisit.printedDocs.map(doc => (
                          <span key={doc.id} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <Printer className="w-2 h-2" /> {doc.type}
                          </span>
                        ))}
                      </div>
                    )}
                 </div>
              </div>

              {/* Document Configuration moved to Sidebar */}
               <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 space-y-3 font-['Sarabun'] no-print">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                   <Settings className="w-3 h-3 text-orange-500" /> ตั้งค่าเอกสารเพิ่มเติม
                 </h4>
                 <div className="grid grid-cols-2 gap-2">
                   <div className="space-y-1">
                       <label className="text-[9px] font-bold text-slate-400">พักรักษา(วัน)</label>
                       <input type="number" className="w-full text-xs border p-1 rounded font-bold" value={sickLeaveDays} onChange={e => setSickLeaveDays(+e.target.value)} />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[9px] font-bold text-slate-400">ส่งต่อไปยัง</label>
                       <input className="w-full text-xs border p-1 rounded font-bold" value={referralTarget} onChange={e => setReferralTarget(e.target.value)} placeholder="ชื่อโรงพยาบาล" />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">เหตุผลส่งตัว</label>
                        <input className="w-full text-xs border p-1 rounded font-bold" value={referralReason} onChange={e => setReferralReason(e.target.value)} placeholder="เพื่อ..." />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">ความเห็นแพทย์</label>
                        <input className="w-full text-xs border p-1 rounded font-bold" value={docOpinion} onChange={e => setDocOpinion(e.target.value)} placeholder="มีความเห็นว่า..." />
                    </div>
                 </div>
               </div>

              <div className="flex flex-wrap gap-2">
                 <button 
                  onClick={() => setActiveDoc('OPD')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
                >
                    <FileText className="w-3.5 h-3.5 text-orange-500" /> ทะเบียนผู้ป่วย (OPD)
                 </button>
                 <button 
                  onClick={() => setActiveDoc('SickLeave')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
                >
                    <FileText className="w-3.5 h-3.5 text-orange-500" /> ใบรับรองการเจ็บป่วย
                 </button>
                 <button 
                  onClick={() => setActiveDoc('MedicalCert')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
                 >
                    <FileText className="w-3.5 h-3.5 text-emerald-500" /> ใบรับรอง 5 โรค (สธ.)
                 </button>
                 <button 
                  onClick={() => setActiveDoc('Referral')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
                 >
                    <FileText className="w-3.5 h-3.5 text-purple-500" /> ใบส่งตัว (Referral)
                 </button>
                 <button 
                  onClick={() => setActiveDoc('Triage')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
                 >
                    <Printer className="w-3.5 h-3.5 text-slate-500" /> ใบซักประวัติ
                 </button>
                 <button onClick={() => setActiveDoc('Appointment')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100">
                    <Calendar className="w-3.5 h-3.5" /> ออกใบนัดหมาย
                 </button>
                 <button 
                  onClick={() => setActiveDoc('Receipt')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
                 >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> พิมพ์ใบเสร็จ
                 </button>
              </div>
            </div>

            {showHistory && (
              <div className="bg-white rounded-xl border-2 border-emerald-200 shadow-lg p-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-4 border-b pb-2 border-emerald-100">
                   <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                      <History className="w-5 h-5" /> ประวัติการรักษาย้อนหลัง 5 ปี (History)
                   </h4>
                   <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {patientHistory.length > 0 ? patientHistory.map((h, i) => (
                    <div key={h.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 relative">
                       <div className="absolute top-2 right-4 text-[10px] font-bold text-slate-400">Record #{patientHistory.length - i}</div>
                       <div className="flex justify-between items-start mb-2">
                         <p className="text-sm font-bold text-emerald-700">{new Date(h.date).toLocaleDateString('th-TH')} - {new Date(h.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                         <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">Visit: {h.id.substr(0,8)}</span>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis (DX)</p>
                             <p className="text-sm font-bold text-slate-800">{h.diagnosis || 'No diagnosis recorded'}</p>
                              {h.diagnosisThai && <p className="text-xs text-slate-500 font-bold mt-1">วินิจฉัย: {h.diagnosisThai}</p>}
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vital Signs</p>
                             <p className="text-[11px] text-slate-600">BP: {h.vitalSigns?.bpSystolic}/{h.vitalSigns?.bpDiastolic} | T: {h.vitalSigns?.temperature}°C | PR: {h.vitalSigns?.pulse}</p>
                              <p className="text-[9px] text-slate-400 mt-1">BW: {h.vitalSigns?.weight}kg | HT: {h.vitalSigns?.height}cm | SpO2: {h.vitalSigns?.spo2}%</p>
                          </div>
                          <div className="md:col-span-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chief Complaint (CC)</p>
                              <p className="text-[11px] text-slate-800 font-bold mb-2">{h.chiefComplaint || '-'}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Present Illness (PI)</p>
                              <p className="text-[11px] text-slate-700 whitespace-pre-wrap mb-3">{h.presentIllness || '-'}</p>
                              <div className="border-t border-slate-100 pt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor's Notes & Opinion</p>
                             <p className="text-sm font-bold text-emerald-800 mb-1">{h.doctorOpinion || '-'}</p>
                              <p className="text-[11px] text-slate-700 whitespace-pre-wrap italic">{h.doctorNotes || '-'}</p>
                              </div>
                          </div>
                          <div className="md:col-span-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medicine, Procedures & Labs</p>
                             <div className="flex flex-wrap gap-2 mt-1">
                                {h.prescriptions.map(p => <span key={p.id} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">{p.name} #{p.amount}</span>)}
                                {h.procedures.map(p => <span key={p.id} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100">{p.name}</span>)}
                                {h.labOrders?.map(l => (
                                  <div key={l.id} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 flex flex-col gap-0.5 group">
                                    <span className="font-bold">{l.name}</span>
                                    {l.result && (
                                      <button 
                                        onClick={() => setViewingLab(l)}
                                        className="text-left hover:text-emerald-700 text-slate-600 italic flex items-center gap-1 transition-colors"
                                      >
                                        ผล: {l.result} <FileText className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                             </div>
                          </div>
                          {h.printedDocs && h.printedDocs.length > 0 && (
                            <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Printing History</p>
                               <div className="flex flex-wrap gap-2 mt-1">
                                  {h.printedDocs.map(doc => (
                                    <span key={doc.id} className="text-[9px] bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                      <Printer className="w-3 h-3" /> {doc.type} ({new Date(doc.timestamp).toLocaleDateString('th-TH')})
                                    </span>
                                  ))}
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )) : (
                    <div className="p-12 text-center text-slate-400">
                       <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                       <p className="font-bold">ไม่พบประวัติการรักษาก่อนหน้านี้</p>
                       <p className="text-xs">ข้อมูลจะเริ่มบันทึกเมื่อผู้ป่วยได้รับการตรวจเสร็จสมบูรณ์</p>
                    </div>
                  )}
                  {/* Sync Logic Mockup for Firebase */}
                  <div className="pt-4 mt-4 border-t border-dashed flex justify-center">
                     <button className="text-[10px] text-slate-400 hover:text-emerald-600 flex items-center gap-1 font-bold">
                        <Clock className="w-3 h-3" /> โหลดข้อมูลย้อนหลังจาก Cloud (Firebase) ...
                     </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 uppercase text-xs tracking-wider border-l-4 border-orange-500 pl-3">
                  <Activity className="w-4 h-4 text-orange-500" />
                  การวินิจฉัยและบันทึก
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-orange-500" /> อาการสำคัญ (Chief Complaint)
                      </label>
                      <button 
                        onClick={() => setIsEditingVitals(true)}
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded border border-orange-100"
                      >
                        <Edit3 className="w-3 h-3" /> แก้ไข CC/PI/Vitals
                      </button>
                    </div>
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-slate-700 min-h-[40px]">
                      {selectedVisit.chiefComplaint || 'ไม่ได้ระบุ'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-4 h-4 text-blue-500" /> อาการเจ็บป่วยปัจจุบัน (Present Illness)
                    </label>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-slate-700 min-h-[40px] whitespace-pre-wrap transition-all">
                      {selectedVisit.presentIllness || 'ไม่ได้ระบุ'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      <Activity className="w-4 h-4 text-emerald-500" /> สัญญาณชีพ (Vital Signs)
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                       <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">BP</p>
                          <p className="text-xs font-bold text-slate-700">{selectedVisit.vitalSigns?.bpSystolic}/{selectedVisit.vitalSigns?.bpDiastolic}</p>
                          <p className="text-[8px] text-slate-400 font-medium">mmHg</p>
                       </div>
                       <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Temp</p>
                          <p className="text-xs font-bold text-slate-700">{selectedVisit.vitalSigns?.temperature}°C</p>
                          <p className="text-[8px] text-slate-400 font-medium">องศา</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                           <p className="text-[9px] text-slate-400 font-bold uppercase">Pulse</p>
                           <p className="text-xs font-bold text-slate-700">{selectedVisit.vitalSigns?.pulse}</p>
                           <p className="text-[8px] text-slate-400 font-medium">bpm</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                           <p className="text-[9px] text-slate-400 font-bold uppercase">SpO2</p>
                           <p className="text-xs font-bold text-slate-700">{selectedVisit.vitalSigns?.spo2}%</p>
                           <p className="text-[8px] text-slate-400 font-medium">ออกซิเจน</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                           <p className="text-[9px] text-slate-400 font-bold uppercase">BW</p>
                           <p className="text-xs font-bold text-slate-700">{selectedVisit.vitalSigns?.weight || '-'}</p>
                           <p className="text-[8px] text-slate-400 font-medium">kg</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                           <p className="text-[9px] text-slate-400 font-bold uppercase">HT</p>
                           <p className="text-xs font-bold text-slate-700">{selectedVisit.vitalSigns?.height || '-'}</p>
                           <p className="text-[8px] text-slate-400 font-medium">cm</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                           <p className="text-[9px] text-slate-400 font-bold uppercase">RR</p>
                           <p className="text-xs font-bold text-slate-700">{selectedVisit.vitalSigns?.rr || '-'}</p>
                           <p className="text-[8px] text-slate-400 font-medium">/min</p>
                        </div>
                     </div>
                   </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Diagnosis (DX)</label>
                    <input 
                      type="text" 
                      className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-mono" 
                      value={dx} 
                      onChange={e => setDx(e.target.value)} 
                      placeholder="เช่น Acute Rhinopharyngitis (J00)..." 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">วินิจฉัยโรค (ภาษาไทย)</label>
                    <input 
                      type="text" 
                      className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 transition-all" 
                      value={dxThai} 
                      onChange={e => setDxThai(e.target.value)} 
                      placeholder="เช่น ไข้หวัด, อักเสบ..." 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">บันทึกอาการและการตรวจร่างกาย (Notes)</label>
                    <textarea 
                      rows={4} 
                      className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-sm" 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      placeholder="อุณหภูมิปกติ ปอดปกติ ไม่มีเสียงวี้ด..." 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">ความเห็นแพทย์ (Doctor's Opinion)</label>
                    <textarea 
                      rows={3} 
                      className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-sm bg-emerald-50/30" 
                      value={docOpinion} 
                      onChange={e => setDocOpinion(e.target.value)} 
                      placeholder="ความเห็นสำหรับการออกใบรับรอง..." 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-emerald-500" />
                      ลายเซ็นแพทย์ (Doctor Signature)
                    </label>
                    <SignaturePad 
                      value={doctorSignature}
                      onChange={setDoctorSignature}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 id="order-section" className="font-bold text-slate-800 flex items-center gap-2 uppercase text-xs tracking-wider border-l-4 border-emerald-500 pl-3">
                  <Pill className="w-4 h-4 text-emerald-500" />
                  สั่งยา หัตถการ และเจาะเลือด
                </h4>

                <div className="flex gap-2">
                   <button 
                    onClick={() => setActiveDoc('TubeLabel')}
                    disabled={!patient}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-xs transition-all shadow-sm ${
                      patient 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200' 
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                   >
                     <UserIcon className="w-4 h-4" />
                     สติ๊กเกอร์ชื่อคนไข้ (Patient Tag)
                   </button>
                   <button 
                    onClick={() => setActiveDoc('LabRequest')}
                    disabled={orderLabs.length === 0}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-xs transition-all shadow-sm ${
                      orderLabs.length > 0 
                        ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' 
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                   >
                     <FlaskConical className="w-4 h-4" />
                     ใบนำส่งแล็บ (Lab Request)
                   </button>
                </div>
                
                {/* Checkup Programs Section */}
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-2">
                  <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" /> โปรแกรมตรวจสุขภาพตามช่วงอายุ
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {checkupPrograms.map(program => {
                      const patientAge = patient ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 0;
                      const isRecommended = patientAge >= program.minAge && patientAge <= program.maxAge;
                      return (
                        <button 
                          key={program.id}
                          onClick={() => applyCheckupProgram(program)}
                          className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all border flex flex-col items-center gap-0.5 ${
                            isRecommended 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                              : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          <span>{program.name} {isRecommended && '⭐'}</span>
                          <span className={`${isRecommended ? 'text-emerald-100' : 'text-slate-400'} text-[8px]`}>฿{program.totalPrice.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <div className="flex items-center gap-2 border p-2 rounded-lg bg-slate-50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="ค้นหาชื่อยา (Search Medicine)..." 
                        className="w-full text-sm bg-transparent outline-none"
                        value={drugSearchTerm}
                        onChange={e => {
                          setDrugSearchTerm(e.target.value);
                          setShowDrugResults(true);
                        }}
                        onFocus={() => setShowDrugResults(true)}
                        onBlur={() => setTimeout(() => setShowDrugResults(false), 200)}
                      />
                      {drugSearchTerm && (
                        <button onClick={() => { setDrugSearchTerm(''); setShowDrugResults(false); }} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    {showDrugResults && drugSearchTerm && (
                      <div className="absolute z-20 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {drugs.filter(d => 
                          d.name.toLowerCase().includes(drugSearchTerm.toLowerCase()) || 
                          d.purpose.toLowerCase().includes(drugSearchTerm.toLowerCase())
                        ).length > 0 ? (
                          drugs.filter(d => 
                            d.name.toLowerCase().includes(drugSearchTerm.toLowerCase()) || 
                            d.purpose.toLowerCase().includes(drugSearchTerm.toLowerCase())
                          ).map(d => (
                            <button
                              key={d.id}
                              onClick={() => {
                                addDrug(d);
                                setDrugSearchTerm('');
                                setShowDrugResults(false);
                              }}
                              className="w-full text-left p-3 hover:bg-emerald-50 border-b last:border-0 flex justify-between items-center group transition-colors"
                            >
                              <div>
                                <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-700">{d.name}</p>
                                <p className="text-[10px] text-slate-500">{d.purpose} | {d.instruction}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-emerald-600">฿{d.price}</p>
                                {d.costPrice && <p className="text-[8px] text-slate-400">ต้นทุน: ฿{d.costPrice}</p>}
                                <p className={`text-[9px] ${d.stock < 10 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>คลัง: {d.stock} {d.unit}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-xs italic">
                            ไม่พบรายการยาที่ค้นหา
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <select className="w-full border p-2 rounded-lg text-sm bg-slate-50" onChange={e => {
                      const proc = procedures.find(p => p.id === e.target.value);
                      if (proc) addProc(proc);
                    }} value="">
                      <option value="">-- เลือกหัตถการ (Procedure) --</option>
                      {[...procedures].sort((a, b) => a.name.localeCompare(b.name, 'th')).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="w-full border p-2 rounded-lg text-sm bg-slate-50" onChange={e => {
                      const lab = labTests.find(l => l.id === e.target.value);
                      if (lab) addLab(lab);
                    }} value="">
                      <option value="">-- สั่งเจาะเลือด (Lab Test) --</option>
                      {[...labTests].sort((a, b) => a.name.localeCompare(b.name, 'th')).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border rounded-lg divide-y text-xs max-h-[350px] overflow-y-auto">
                  {selectedProgramId && checkupPrograms.find(p => p.id === selectedProgramId) && (
                    <div className="p-3 bg-emerald-600 text-white flex justify-between items-center shadow-inner">
                      <div>
                        <p className="font-bold flex items-center gap-2">
                          <FileBadge className="w-4 h-4" />
                          โปรแกรม: {checkupPrograms.find(p => p.id === selectedProgramId)?.name}
                        </p>
                        <p className="text-[10px] font-medium opacity-90">เหมาจ่ายตามโปรแกรมตรวจสุขภาพ</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-sm">฿{checkupPrograms.find(p => p.id === selectedProgramId)?.totalPrice.toLocaleString()}</span>
                        <button 
                          onClick={() => setSelectedProgramId(null)}
                          className="p-1.5 hover:bg-emerald-700 rounded-full transition-colors"
                          title="ยกเลิกการใช้ราคาโปรแกรม"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {orderDrugs.map(d => (
                    <div key={d.id} className="p-3 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{d.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="number" className="w-12 border px-1 py-0.5 rounded text-center" value={d.amount} onChange={e => setOrderDrugs(orderDrugs.map(od => od.id === d.id ? {...od, amount: +e.target.value} : od))} />
                          <div className="flex flex-col">
                            <span className="text-slate-500">{d.unit} | {d.instruction}</span>
                            {d.precautions && <span className="text-[10px] text-red-500 font-bold">⚠️ {d.precautions}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeDrug(d.id)} className="text-red-300 hover:text-red-600 p-2 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {orderProcs.map(p => {
                    const program = checkupPrograms.find(cp => cp.id === selectedProgramId);
                    const isInProgram = program?.procedureIds.includes(p.procedureId);
                    return (
                      <div key={p.id} className={`p-3 flex justify-between items-center transition-colors border-l-4 ${isInProgram ? 'bg-emerald-50/50 border-emerald-400' : 'bg-orange-50/30 hover:bg-orange-50 border-orange-400'}`}>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-orange-500" /> {p.name}
                            {isInProgram && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1 font-black">IN PROGRAM</span>}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <p className={`text-[10px] font-bold ${isInProgram ? 'text-emerald-600 line-through opacity-50' : 'text-orange-600'}`}>
                              {isInProgram ? `฿${p.price.toLocaleString()}` : `ค่าบริการ: ฿${p.price.toLocaleString()}`}
                            </p>
                            {!isInProgram && (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-400">ส่วนลด (฿):</span>
                                <input 
                                  type="number" 
                                  className="w-16 text-[10px] border px-1 py-0.5 rounded focus:ring-1 focus:ring-orange-500 outline-none" 
                                  value={p.discount || 0} 
                                  onChange={e => setOrderProcs(orderProcs.map(op => op.id === p.id ? {...op, discount: parseFloat(e.target.value) || 0} : op))} 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeProc(p.id)} className="text-red-300 hover:text-red-600 p-2 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {orderLabs.map(l => {
                    const program = checkupPrograms.find(cp => cp.id === selectedProgramId);
                    const isInProgram = program?.labTestIds.includes(l.labTestId);
                    return (
                      <div key={l.id} className={`p-3 flex flex-col gap-2 transition-colors border-l-4 ${isInProgram ? 'bg-emerald-50/50 border-emerald-400' : 'bg-amber-50/30 hover:bg-amber-50 border-amber-400'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-1">
                              <FlaskConical className="w-3 h-3 text-amber-600" /> {l.name}
                              {isInProgram && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1 font-black">IN PROGRAM</span>}
                            </p>
                            <p className={`text-[10px] font-bold ${isInProgram ? 'text-emerald-600 line-through opacity-50' : 'text-amber-600'}`}>
                              {isInProgram ? `฿${l.price.toLocaleString()}` : `ค่าแล็บ: ฿${l.price.toLocaleString()}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {l.status === 'Completed' && (
                              <button 
                                onClick={() => setViewingLab(l)} 
                                className="px-2 py-1 rounded text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                <FileText className="w-3 h-3" /> ดูผลแล็บ
                              </button>
                            )}
                            <button onClick={() => removeLab(l.id)} className="text-red-300 hover:text-red-600 p-2 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {l.result && (
                          <div className="bg-white/60 p-2 rounded border border-amber-100 text-[11px] text-slate-700">
                            <span className="font-bold text-amber-800">ผลการตรวจ:</span> {l.result}
                            {l.resultImages && l.resultImages.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {l.resultImages.map((img, idx) => (
                                  <div key={idx} className="w-8 h-8 bg-slate-200 rounded border border-slate-300 overflow-hidden">
                                     <img src={img} alt="Lab Result" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!orderDrugs.length && !orderProcs.length && !orderLabs.length && (
                    <div className="p-10 text-center text-slate-400 italic">
                      <Pill className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      ยังไม่มีรายการสั่งยา หัตถการ หรือเจาะเลือด
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm sticky bottom-0 z-10">
               <button onClick={sendBackToTriage} className="flex items-center gap-2 px-6 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-bold transition-colors">
                 <ArrowLeft className="w-4 h-4" /> ส่งกลับห้องคัดกรอง
               </button>
               <div className="flex gap-3">
                 {selectedVisit && (isAdmin || new Date(selectedVisit.date).toDateString() === today) && (
                   <button 
                     onClick={() => {
                       deleteVisit(selectedVisit.id);
                       setSelectedVisit(null);
                     }}
                     className="px-6 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-colors flex items-center gap-2"
                   >
                     <Trash2 className="w-4 h-4" /> ลบ Visit นี้
                   </button>
                 )}
                 <button onClick={() => setSelectedVisit(null)} className="px-6 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-bold transition-colors">ปิด</button>
                 <button 
                  onClick={handleComplete} 
                  className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                 >
                   <Save className="w-5 h-5" /> บันทึกการตรวจรักษา
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-xl border border-dashed border-slate-300 h-[600px] flex flex-col items-center justify-center text-slate-400">
            <Stethoscope className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">เลือกผู้ป่วยจากคิวเพื่อเริ่มบันทึกการตรวจรักษา</p>
            <p className="text-xs mt-2 opacity-60">* รายการตรวจที่เสร็จสิ้นแล้วในวันนี้สามารถเรียกแก้ไขได้ตลอดเวลา</p>
          </div>
        )}
      </div>

      {activeDoc && <DocumentModal type={activeDoc} />}

      {viewingLab && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                ผลการตรวจ: {viewingLab.name}
              </h4>
              <button 
                onClick={() => setViewingLab(null)} 
                className="p-1 hover:bg-emerald-100 rounded-full transition-colors text-emerald-400 hover:text-emerald-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ผลการตรวจ</p>
                <p className="text-2xl font-black text-emerald-600">{viewingLab.result || 'ไม่ระบุ'}</p>
              </div>

              {viewingLab.subTests && viewingLab.subTests.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">รายการพารามิเตอร์</p>
                  <div className="overflow-x-auto border rounded-xl border-slate-100">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="px-3 py-2">Test</th>
                          <th className="px-3 py-2 text-center">Result</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2">Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingLab.subTests.map((sub: any) => (
                          <tr key={sub.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium">{sub.name}</td>
                            <td className="px-3 py-2 text-center font-black">
                              <span className={sub.flag === 'H' ? 'text-red-600' : sub.flag === 'L' ? 'text-blue-600' : 'text-emerald-600'}>
                                {sub.result} {sub.flag && <span className="text-[9px] ml-0.5">({sub.flag})</span>}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{sub.unit}</td>
                            <td className="px-3 py-2 text-slate-400 font-mono italic">{sub.normalRange}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewingLab.resultNote && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">บันทึกเพิ่มเติม</p>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                    {viewingLab.resultNote}
                  </div>
                </div>
              )}

              {viewingLab.resultImages && viewingLab.resultImages.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">รูปภาพแนบ</p>
                  <div className="grid grid-cols-2 gap-3">
                    {viewingLab.resultImages.map((img, idx) => (
                      <div key={idx} className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                        <img 
                          src={img} 
                          alt="Lab Result" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(img, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setViewingLab(null)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Examination;
