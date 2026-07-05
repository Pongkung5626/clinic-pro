
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Users, Calendar, Activity, Stethoscope, Pill, FileText, 
  Settings, CreditCard, PieChart, Package, LogOut, Menu, 
  FlaskConical, Search, Save, Trash2, Edit3, Activity as ActivityIcon,
  AlertCircle, ShoppingBag
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import PatientRegistration from './components/PatientRegistration';
import Triage from './components/Triage';
import Examination from './components/Examination';
import Laboratory from './components/Laboratory';
import Pharmacy from './components/Pharmacy';
import Billing from './components/Billing';
import DirectSale from './components/DirectSale';
import Inventory from './components/Inventory';
import Accounting from './components/Accounting';
import AppointmentSystem from './components/AppointmentSystem';
import AdminSettings from './components/AdminSettings';
import LoginPage from './components/LoginPage';

import { Patient, Visit, Drug, Procedure, Transaction, ClinicInfo, User, LabTest, CheckupProgram, Supply, Appointment, Requisition, DailyClose, FixedExpense, Staff, SalaryPayment, Attendance, StockLog } from './types';
import { db } from './firebase';
import { syncCollection, saveDocument, deleteDocument, seedDatabase } from './services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  // Global State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [checkupPrograms, setCheckupPrograms] = useState<CheckupProgram[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyCloses, setDailyCloses] = useState<DailyClose[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [isScannerConnected, setIsScannerConnected] = useState(true); // Assume connected for HID scanners
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>({
    name: 'คลินิกนายแพทย์ณฐกร (หมอโป้ง)',
    address: '15/1 หมู่ 2 บ.บก ต.กลาง อ.เดชอุดม จ.อุบลราชธานี 34160',
    phone: '0842917890',
    taxId: '1341500201869'
  });

  // Initial Data for Seeding
  const initialData: {
    drugs: Drug[];
    supplies: Supply[];
    procedures: Procedure[];
    labTests: LabTest[];
    checkupPrograms: CheckupProgram[];
    users: User[];
    appointments: Appointment[];
    clinicInfo: ClinicInfo;
  } = {
    drugs: [
      { id: '1', name: 'Paracetamol 500mg', stock: 1000, minStock: 200, price: 1, unit: 'เม็ด', instruction: 'รับประทานครั้งละ 1 เม็ด ทุก 4-6 ชม.', purpose: 'ลดไข้ แก้ปวด' },
      { id: '2', name: 'Amoxicillin 500mg', stock: 500, minStock: 100, price: 5, unit: 'เม็ด', instruction: 'รับประทานครั้งละ 1 เม็ด หลังอาหาร เช้า-เย็น', purpose: 'ยาฆ่าเชื้อแบคทีเรีย' }
    ],
    supplies: [
      { id: '1', name: 'เข็มฉีดยา No.24', stock: 100, minStock: 20, price: 2, unit: 'ชิ้น', category: 'Needles' },
      { id: '2', name: 'ไซริงค์ 5ml', stock: 50, minStock: 10, price: 5, unit: 'ชิ้น', category: 'Syringes' }
    ],
    procedures: [
      { id: '1', name: 'ตรวจโรคทั่วไป', price: 300 },
      { id: '2', name: 'ฉีดยา', price: 100 },
      { id: '3', name: 'ทำแผลเล็ก', price: 200 }
    ],
    labTests: [
      { id: '1', name: 'CBC (ความสมบูรณ์ของเม็ดเลือด)', price: 150, category: 'Hematology', normalRange: 'WBC 4.0-10.0, Hb 12.0-16.0', unit: 'x10^3/uL' },
      { id: '2', name: 'FBS (น้ำตาลในเลือด)', price: 100, category: 'Chemistry', normalRange: '70-100', unit: 'mg/dL' },
      { id: '3', name: 'Lipid Profile (ไขมันในเลือด)', price: 450, category: 'Chemistry', normalRange: 'TC < 200, LDL < 130', unit: 'mg/dL' },
      { id: '4', name: 'Urine Analysis (ตรวจปัสสาวะ)', price: 100, category: 'Microscopy', normalRange: 'Normal', unit: '-' },
      { id: '5', name: 'BUN/Creatinine (การทำงานของไต)', price: 200, category: 'Chemistry', normalRange: 'Cr 0.6-1.2', unit: 'mg/dL' },
      { id: '6', name: 'SGOT/SGPT (การทำงานของตับ)', price: 200, category: 'Chemistry', normalRange: 'SGPT < 40', unit: 'U/L' }
    ],
    checkupPrograms: [
      { id: '1', name: 'โปรแกรมตรวจสุขภาพพื้นฐาน (อายุ < 35 ปี)', description: 'ตรวจร่างกายทั่วไป, CBC, FBS, UA', minAge: 0, maxAge: 34, labTestIds: ['1', '2', '4'], procedureIds: ['1'], totalPrice: 600 },
      { id: '2', name: 'โปรแกรมตรวจสุขภาพวัยทำงาน (อายุ 35-50 ปี)', description: 'ตรวจร่างกายทั่วไป, CBC, FBS, Lipid Profile, BUN/Cr, SGOT/SGPT, UA', minAge: 35, maxAge: 50, labTestIds: ['1', '2', '3', '4', '5', '6'], procedureIds: ['1'], totalPrice: 1500 },
      { id: '3', name: 'โปรแกรมตรวจสุขภาพผู้สูงอายุ (อายุ > 50 ปี)', description: 'ตรวจร่างกายทั่วไปแบบละเอียด, CBC, FBS, Lipid Profile, BUN/Cr, SGOT/SGPT, UA + ตรวจพิเศษ', minAge: 51, maxAge: 120, labTestIds: ['1', '2', '3', '4', '5', '6'], procedureIds: ['1'], totalPrice: 2500 }
    ],
    users: [
      { id: '1', username: 'admin', role: 'Admin', fullName: 'ผู้ดูแลระบบ ออมนิคลินิก', password: 'password' },
      { id: '2', username: 'doctor', role: 'Doctor', fullName: 'นพ. สมชาย รักสุขภาพ', password: 'password', licenseNumber: 'ว.12345' }
    ],
    appointments: [],
    clinicInfo: {
      name: 'คลินิกนายแพทย์ณฐกร (หมอโป้ง)',
      address: '15/1 หมู่ 2 บ.บก ต.กลาง อ.เดชอุดม จ.อุบลราชธานี 34160',
      phone: '0842917890',
      taxId: '1341500201869'
    }
  };

  useEffect(() => {
    // 1. Setup Auth Listener
    let unsubUsers: (() => void) | null = null;
    let unsubClinic: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(true);
      if (user) {
        console.log('User authenticated via Firebase:', user.email || 'Anonymous');
        
        // 2. Authenticated Listeners - Start after auth is confirmed
        if (!unsubUsers) {
          unsubUsers = syncCollection<User>('users', setUsers);
        }
        if (!unsubClinic) {
          unsubClinic = onSnapshot(doc(db, 'clinicInfo', 'main'), (snapshot) => {
            if (snapshot.exists()) {
              setClinicInfo(snapshot.data() as ClinicInfo);
            }
          });
        }

        seedDatabase(initialData);
      } else {
        console.log('Not authenticated with Firebase. Signing in anonymously...');
        signInAnonymously(auth).catch(err => console.error('Anonymous sign-in failed:', err));
        
        // Clear data if logged out
        setUsers([]);
        if (unsubUsers) {
          unsubUsers();
          unsubUsers = null;
        }
        if (unsubClinic) {
          unsubClinic();
          unsubClinic = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubUsers) unsubUsers();
      if (unsubClinic) unsubClinic();
    };
  }, []);

  useEffect(() => {
    // 3. Private Listeners - Only start when app-level login is successful
    if (!isLoggedIn) return;

    console.log('Starting private data listeners...');
    const unsubPatients = syncCollection<Patient>('patients', setPatients);
    const unsubVisits = syncCollection<Visit>('visits', setVisits);
    const unsubDrugs = syncCollection<Drug>('drugs', setDrugs);
    const unsubSupplies = syncCollection<Supply>('supplies', setSupplies);
    const unsubProcedures = syncCollection<Procedure>('procedures', setProcedures);
    const unsubLabTests = syncCollection<LabTest>('labTests', setLabTests);
    const unsubCheckupPrograms = syncCollection<CheckupProgram>('checkupPrograms', setCheckupPrograms);
    const unsubTransactions = syncCollection<Transaction>('transactions', setTransactions);
    const unsubDailyCloses = syncCollection<DailyClose>('dailyCloses', setDailyCloses);
    const unsubAppointments = syncCollection<Appointment>('appointments', setAppointments);
    const unsubRequisitions = syncCollection<Requisition>('requisitions', setRequisitions);
    const unsubFixedExpenses = syncCollection<FixedExpense>('fixedExpenses', setFixedExpenses);
    const unsubStaff = syncCollection<Staff>('staff', setStaff);
    const unsubSalaryPayments = syncCollection<SalaryPayment>('salaryPayments', setSalaryPayments);
    const unsubAttendances = syncCollection<Attendance>('attendances', setAttendances);
    const unsubStockLogs = syncCollection<StockLog>('stockLogs', setStockLogs);

    // 4. Automatic cleanup of old appointments (older than 7 days)
    const cleanupOldAppointments = async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      setAppointments(prev => {
        const oldAppointments = prev.filter(a => {
          const appDate = new Date(a.date);
          return appDate < sevenDaysAgo;
        });

        if (oldAppointments.length > 0) {
          console.log(`Cleaning up ${oldAppointments.length} old appointments...`);
          oldAppointments.forEach(a => {
            deleteDocument('appointments', a.id).catch(err => console.error('Auto-cleanup error:', err));
          });
          return prev.filter(a => !oldAppointments.find(oa => oa.id === a.id));
        }
        return prev;
      });
    };

    const cleanupTimer = setTimeout(cleanupOldAppointments, 5000); // Wait 5s for data to sync before cleanup

    return () => {
      clearTimeout(cleanupTimer);
      unsubPatients();
      unsubVisits();
      unsubDrugs();
      unsubSupplies();
      unsubProcedures();
      unsubLabTests();
      unsubCheckupPrograms();
      unsubTransactions();
      unsubDailyCloses();
      unsubAppointments();
      unsubRequisitions();
      unsubFixedExpenses();
      unsubStaff();
      unsubSalaryPayments();
      unsubAttendances();
      unsubStockLogs();
    };
  }, [isLoggedIn]);

  // Barcode Scanner Logic (HID Keyboard Emulation)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a textarea or a large input (optional, but scanners are fast)
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      
      // Barcode scanners usually type very fast (< 50ms between keys)
      // We use a slightly larger threshold (200ms) to be safe with wireless lag
      if (currentTime - lastKeyTime > 200) {
        buffer = ''; 
      }

      if (!e.key) return;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          // Dispatch custom event for components to handle
          window.dispatchEvent(new CustomEvent('barcodeScanned', { detail: buffer }));
          
          // Also try to find patient by HN globally if not handled
          const patient = patients.find(p => p.hn === buffer);
          if (patient) {
             // Optional: Navigate or show quick info
             console.log('Patient Barcode Detected:', patient.hn);
          }
        }
        buffer = '';
      } else if (e.key && e.key.length === 1) {
        buffer += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patients]);

  // Firebase-backed setters
  const fbSetPatients = async (action: any) => {
    setPatients(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      // Save new or modified items to Firestore
      next.forEach((p: Patient) => {
        const existing = prev.find(ep => ep.id === p.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
          saveDocument('patients', p).catch(err => console.error('Error saving patient:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetVisits = async (action: any) => {
    setVisits(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      // Save new or modified items to Firestore
      next.forEach((v: Visit) => {
        const existing = prev.find(ev => ev.id === v.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(v)) {
          saveDocument('visits', v).catch(err => console.error('Error saving visit:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetDrugs = async (action: any) => {
    setDrugs(prev => {
      const next = typeof action === 'function' ? action(prev) : action;

      // Handle deletions
      prev.forEach((d: Drug) => {
        const stillExists = next.some(nd => nd.id === d.id);
        if (!stillExists) {
          deleteDocument('drugs', d.id).catch(err => console.error('Error deleting drug:', err));
        }
      });

      // Handle updates/creations
      next.forEach((d: Drug) => {
        const existing = prev.find(ed => ed.id === d.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(d)) {
          saveDocument('drugs', d).catch(err => console.error('Error saving drug:', err));
        }
      });

      return next;
    });
  };

  const fbSetSupplies = async (action: any) => {
    setSupplies(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      // Handle deletions
      prev.forEach((s: Supply) => {
        const stillExists = next.some(ns => ns.id === s.id);
        if (!stillExists) {
          deleteDocument('supplies', s.id).catch(err => console.error('Error deleting supply:', err));
        }
      });

      // Handle updates/creations
      next.forEach((s: Supply) => {
        const existing = prev.find(es => es.id === s.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(s)) {
          saveDocument('supplies', s).catch(err => console.error('Error saving supply:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetProcedures = async (action: any) => {
    setProcedures(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      next.forEach((p: Procedure) => {
        const existing = prev.find(ep => ep.id === p.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
          saveDocument('procedures', p).catch(err => console.error('Error saving procedure:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetLabTests = async (action: any) => {
    setLabTests(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      next.forEach((l: LabTest) => {
        const existing = prev.find(el => el.id === l.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(l)) {
          saveDocument('labTests', l).catch(err => console.error('Error saving lab test:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetCheckupPrograms = async (action: any) => {
    setCheckupPrograms(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      next.forEach((c: CheckupProgram) => {
        const existing = prev.find(ec => ec.id === c.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(c)) {
          saveDocument('checkupPrograms', c).catch(err => console.error('Error saving checkup program:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetTransactions = async (action: any) => {
    setTransactions(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      // Sync changes to Firestore
      next.forEach((t: Transaction) => {
        const existing = prev.find(et => et.id === t.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(t)) {
          saveDocument('transactions', t).catch(err => console.error('Error saving transaction:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetDailyCloses = async (action: any) => {
    setDailyCloses(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      next.forEach((dc: DailyClose) => {
        const existing = prev.find(edc => edc.id === dc.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(dc)) {
          saveDocument('dailyCloses', dc).catch(err => console.error('Error saving daily closure:', err));
        }
      });
      
      return next;
    });
  };

  const deleteAppointment = async (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDocument('appointments', id);
      console.log('Appointment deleted:', id);
    } catch (err) {
      console.error('Error deleting appointment:', err);
    }
  };

  const fbSetAppointments = async (action: any) => {
    setAppointments(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      next.forEach((a: Appointment) => {
        const existing = prev.find(ea => ea.id === a.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(a)) {
          saveDocument('appointments', a).catch(err => console.error('Error saving appointment:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetRequisitions = async (action: any) => {
    setRequisitions(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      next.forEach((r: Requisition) => {
        const existing = prev.find(er => er.id === r.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(r)) {
          saveDocument('requisitions', r).catch(err => console.error('Error saving requisition:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetUsers = async (action: any) => {
    setUsers(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      next.forEach((u: User) => {
        const existing = prev.find(eu => eu.id === u.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(u)) {
          saveDocument('users', u).catch(err => console.error('Error saving user:', err));
        }
      });
      
      return next;
    });
  };

  const fbSetFixedExpenses = async (action: any) => {
    setFixedExpenses(prev => {
      const next = typeof action === 'function' ? action(prev) : action;

      next.forEach((e: FixedExpense) => {
        const existing = prev.find(ee => ee.id === e.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(e)) {
          saveDocument('fixedExpenses', e).catch(err => console.error('Error saving fixed expense:', err));
        }
      });

      return next;
    });
  };

  const fbSetStaff = async (action: any) => {
    setStaff(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      next.forEach((s: Staff) => {
        const existing = prev.find(es => es.id === s.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(s)) {
          saveDocument('staff', s).catch(err => console.error('Error saving staff:', err));
        }
      });
      return next;
    });
  };

  const fbSetSalaryPayments = async (action: any) => {
    setSalaryPayments(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      next.forEach((sp: SalaryPayment) => {
        const existing = prev.find(esp => esp.id === sp.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(sp)) {
          saveDocument('salaryPayments', sp).catch(err => console.error('Error saving salary payment:', err));
        }
      });
      return next;
    });
  };

  const fbSetClinicInfo = async (action: any) => {
    setClinicInfo(prev => {
      const newInfo = typeof action === 'function' ? action(prev) : action;
      saveDocument('clinicInfo', { ...newInfo, id: 'main' }).catch(err => console.error('Error saving clinic info:', err));
      return newInfo;
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  useEffect(() => {
    if (isLoggedIn && currentUser && staff.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const existing = attendances.find(a => a.userId === currentUser.id && a.date === today);
      
      if (!existing) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
        const dayOfWeek = now.getDay(); // 0 is Sunday, 3 is Wednesday
        
        if (dayOfWeek !== 3) { // Not Wednesday
          const hour = now.getHours();
          const minute = now.getMinutes();
          const timeValue = hour * 60 + minute;
          const limitValue = 8 * 60; // 08:00
          
          const newAttendance: Attendance = {
            id: Math.random().toString(36).substr(2, 9),
            userId: currentUser.id,
            staffName: currentUser.fullName,
            date: today,
            clockIn: timeStr,
            status: timeValue > limitValue ? 'Late' : 'Punctual'
          };
          
          saveDocument('attendances', newAttendance).catch(err => console.error('Error clock-in:', err));
        }
      }
    }
  }, [isLoggedIn, currentUser, staff, attendances]);

  const handleLogout = () => {
    // Record clock-out if exists for today
    if (currentUser) {
      const today = new Date().toISOString().split('T')[0];
      const existing = attendances.find(a => a.userId === currentUser.id && a.date === today);
      if (existing && !existing.clockOut) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        const hour = now.getHours();
        const minute = now.getMinutes();
        const timeValue = hour * 60 + minute;
        const earlyLimit = 19 * 60 + 45; // 19:45
        
        let status = existing.status;
        if (timeValue < earlyLimit) {
          status = 'Early Leave';
        }
        
        saveDocument('attendances', { ...existing, clockOut: timeStr, status })
          .catch(err => console.error('Error clock-out:', err));
      }
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const deleteVisit = async (id: string) => {
    const visit = visits.find(v => v.id === id);
    if (!visit) return;

    const visitDate = new Date(visit.date).toDateString();
    const today = new Date().toDateString();
    const isAdmin = currentUser?.role === 'Admin';

    if (visitDate !== today && !isAdmin) {
      setConfirmModal({
        isOpen: true,
        title: 'สิทธิ์ไม่เพียงพอ',
        message: 'ไม่สามารถลบ Visit ย้อนหลังได้ (เฉพาะ Admin เท่านั้นที่ทำได้)',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        type: 'warning'
      });
      return;
    }

    const confirmMsg = visitDate === today 
      ? 'ยืนยันการลบรายการ Visit ของวันนี้?' 
      : `ยืนยันการลบรายการ Visit ย้อนหลัง (วันที่ ${new Date(visit.date).toLocaleDateString('th-TH')})? การกระทำนี้ไม่สามารถย้อนกลับได้`;

    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบ',
      message: confirmMsg,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        // Immediate UI update
        setVisits(prev => prev.filter(v => v.id !== id));
        
        // Sync with Firestore
        try {
          await deleteDocument('visits', id);
          
          // Use functional update to get the latest transactions and delete them from Firestore
          setTransactions(prev => {
            const toDelete = prev.filter(t => t.visitId === id);
            toDelete.forEach(tx => {
              deleteDocument('transactions', tx.id).catch(err => console.error('Error deleting transaction:', err));
            });
            return prev.filter(t => t.visitId !== id);
          });
          
          console.log('Visit and associated transactions deleted:', id);
        } catch (err) {
          console.error('Error deleting visit:', err);
          alert('เกิดข้อผิดพลาดในการลบข้อมูลจากระบบ');
        }
      },
      type: 'danger'
    });
  };

  const deletePatient = async (id: string) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    if (currentUser?.role !== 'Admin') {
      setConfirmModal({
        isOpen: true,
        title: 'สิทธิ์ไม่เพียงพอ',
        message: 'เฉพาะ Admin เท่านั้นที่สามารถลบข้อมูลผู้ป่วยได้',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        type: 'warning'
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบผู้ป่วย',
      message: `ยืนยันการลบข้อมูลผู้ป่วย: ${patient.firstName} ${patient.lastName}? การกระทำนี้จะลบประวัติ Visit ทั้งหมดของผู้ป่วยรายนี้ด้วย และไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Immediate UI update
        setPatients(prev => prev.filter(p => p.id !== id));
        const patientVisitIds = visits.filter(v => v.patientId === id).map(v => v.id);
        const patientAppIds = appointments.filter(a => a.patientId === id).map(a => a.id);
        setVisits(prev => prev.filter(v => v.patientId !== id));
        setAppointments(prev => prev.filter(a => a.patientId !== id));

        // Sync with Firestore
        try {
          await deleteDocument('patients', id);
          // Delete all associated visits and their transactions
          const patientVisits = visits.filter(v => v.patientId === id);
          for (const v of patientVisits) {
            await deleteDocument('visits', v.id);
          }
          
          // Delete all associated appointments
          for (const appId of patientAppIds) {
            await deleteDocument('appointments', appId);
          }

          setTransactions(prev => {
            const toDelete = prev.filter(t => t.visitId && patientVisitIds.includes(t.visitId));
            toDelete.forEach(tx => {
              deleteDocument('transactions', tx.id).catch(err => console.error('Error deleting transaction:', err));
            });
            return prev.filter(t => !t.visitId || !patientVisitIds.includes(t.visitId));
          });

          console.log('Patient, associated visits and transactions deleted:', id);
        } catch (err) {
          console.error('Error deleting patient:', err);
          alert('เกิดข้อผิดพลาดในการลบข้อมูลผู้ป่วย');
        }
      },
      type: 'danger'
    });
  };

  const deleteTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบรายการ',
      message: `คุณต้องการลบรายการ ${tx.description || tx.category} จำนวน ฿${tx.amount.toLocaleString()} ใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteDocument('transactions', id);
          setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
          console.error('Error deleting transaction:', error);
          alert('เกิดข้อผิดพลาดในการลบรายการ');
        }
      },
      type: 'danger'
    });
  };

  const deleteDailyClose = async (id: string) => {
    if (currentUser?.role !== 'Admin') {
      setConfirmModal({
        isOpen: true,
        title: 'สิทธิ์ไม่เพียงพอ',
        message: 'เฉพาะ Admin เท่านั้นที่สามารถลบรายการปิดยอดได้',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        type: 'warning'
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบการปิดยอด',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการปิดยอดนี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setDailyCloses(prev => prev.filter(dc => dc.id !== id));
        try {
          await deleteDocument('dailyCloses', id);
          console.log('Daily close deleted:', id);
        } catch (err) {
          console.error('Error deleting daily close:', err);
          alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
      },
      type: 'danger'
    });
  };

  const deleteFixedExpense = async (id: string) => {
    if (currentUser?.role !== 'Admin') {
      setConfirmModal({
        isOpen: true,
        title: 'สิทธิ์ไม่เพียงพอ',
        message: 'เฉพาะ Admin เท่านั้นที่สามารถลบรายการรายจ่ายคงที่ได้',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        type: 'warning'
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบรายจ่ายคงที่',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการรายจ่ายคงที่นี้?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setFixedExpenses(prev => prev.filter(fe => fe.id !== id));
        try {
          await deleteDocument('fixedExpenses', id);
        } catch (err) {
          console.error('Error deleting fixed expense:', err);
          alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
      },
      type: 'danger'
    });
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} users={users} />;
  }

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
      <Link 
        to={to} 
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
          isActive 
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
        }`}
      >
        <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="font-bold whitespace-nowrap">{label}</span>
      </Link>
    );
  };

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col fixed h-full z-30`}>
          <div className="p-4 flex items-center justify-between">
            <div className={`flex items-center gap-2 overflow-hidden ${!isSidebarOpen && 'hidden'}`}>
              <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
                {clinicInfo.logo ? <img src={clinicInfo.logo} className="w-6 h-6 object-cover rounded" /> : <ActivityIcon className="w-6 h-6" />}
              </div>
              <span className="font-bold text-lg text-slate-800 whitespace-nowrap truncate">{clinicInfo.name}</span>
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-md">
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Scanner Status */}
          <div className={`px-4 py-2 mb-2 mx-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2 ${!isSidebarOpen && 'justify-center'}`}>
            <div className={`w-2 h-2 rounded-full ${isScannerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Scanner Status</p>
                <p className="text-[10px] font-bold text-slate-600 truncate">2D Wireless Scanner</p>
              </div>
            )}
          </div>

          <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
            <NavItem to="/" icon={PieChart} label="Dashboard" />
            <NavItem to="/patients" icon={Users} label="ลงทะเบียนผู้ป่วย" />
            <NavItem to="/triage" icon={Activity} label="ซักประวัติ/คัดกรอง" />
            <NavItem to="/examination" icon={Stethoscope} label="ตรวจรักษา" />
            <NavItem to="/laboratory" icon={FlaskConical} label="ห้องแล็บ" />
            <NavItem to="/pharmacy" icon={Pill} label="จ่ายยา/หัตถการ" />
            <NavItem to="/billing" icon={CreditCard} label="ชำระเงิน/บิล" />
            <NavItem to="/direct-sale" icon={ShoppingBag} label="ขายยาโดยตรง (OTC)" />
            <NavItem to="/inventory" icon={Package} label="คงคลังยา" />
            <NavItem to="/appointments" icon={Calendar} label="ระบบนัดหมาย" />
            <NavItem to="/accounting" icon={FileText} label="บัญชีและภาษี" />
            <NavItem to="/settings" icon={Settings} label="ตั้งค่าระบบ" />
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className={`flex items-center gap-3 mb-4 ${!isSidebarOpen && 'hidden'}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold uppercase overflow-hidden">
                {currentUser?.fullName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">{currentUser?.fullName}</p>
                <p className="text-xs text-slate-500">{currentUser?.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span className={!isSidebarOpen ? 'hidden' : ''}>ออกจากระบบ</span>
            </button>
          </div>
        </aside>

        <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'} p-6`}>
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard visits={visits} transactions={transactions} patients={patients} appointments={appointments} deleteVisit={deleteVisit} />} />
              <Route path="/patients" element={<PatientRegistration patients={patients} setPatients={fbSetPatients} visits={visits} setVisits={fbSetVisits} deleteVisit={deleteVisit} deletePatient={deletePatient} currentUser={currentUser} clinicInfo={clinicInfo} />} />
              <Route path="/triage" element={<Triage visits={visits} setVisits={fbSetVisits} patients={patients} clinicInfo={clinicInfo} currentUser={currentUser} deleteVisit={deleteVisit} />} />
              <Route path="/examination" element={<Examination visits={visits} setVisits={fbSetVisits} patients={patients} drugs={drugs} procedures={procedures} labTests={labTests} checkupPrograms={checkupPrograms} appointments={appointments} setAppointments={fbSetAppointments} deleteAppointment={deleteAppointment} clinicInfo={clinicInfo} currentUser={currentUser} deleteVisit={deleteVisit} />} />
              <Route path="/laboratory" element={<Laboratory visits={visits} patients={patients} currentUser={currentUser} clinicInfo={clinicInfo} />} />
              <Route path="/pharmacy" element={<Pharmacy visits={visits} setVisits={fbSetVisits} patients={patients} drugs={drugs} setDrugs={fbSetDrugs} clinicInfo={clinicInfo} deleteVisit={deleteVisit} />} />
              <Route path="/billing" element={<Billing visits={visits} setVisits={fbSetVisits} patients={patients} clinicInfo={clinicInfo} transactions={transactions} setTransactions={fbSetTransactions} deleteVisit={deleteVisit} checkupPrograms={checkupPrograms} />} />
              <Route path="/direct-sale" element={<DirectSale patients={patients} visits={visits} setVisits={fbSetVisits} drugs={drugs} setDrugs={fbSetDrugs} transactions={transactions} setTransactions={fbSetTransactions} clinicInfo={clinicInfo} />} />
              <Route path="/inventory" element={<Inventory drugs={drugs} setDrugs={fbSetDrugs} supplies={supplies} setSupplies={fbSetSupplies} requisitions={requisitions} setRequisitions={fbSetRequisitions} visits={visits} setVisits={fbSetVisits} clinicInfo={clinicInfo} currentUser={currentUser} stockLogs={stockLogs} />} />
              <Route path="/appointments" element={<AppointmentSystem appointments={appointments} setAppointments={fbSetAppointments} deleteAppointment={deleteAppointment} patients={patients} visits={visits} setVisits={fbSetVisits} clinicInfo={clinicInfo} />} />
              <Route path="/accounting" element={
                <Accounting 
                  transactions={transactions} 
                  setTransactions={fbSetTransactions} 
                  dailyCloses={dailyCloses}
                  setDailyCloses={fbSetDailyCloses}
                  visits={visits} 
                  setVisits={fbSetVisits} 
                  drugs={drugs} 
                  supplies={supplies} 
                  patients={patients} 
                  procedures={procedures}
                  labTests={labTests}
                  checkupPrograms={checkupPrograms}
                  deleteVisit={deleteVisit}
                  deleteTransaction={deleteTransaction}
                  deleteDailyClose={deleteDailyClose}
                  deleteFixedExpense={deleteFixedExpense}
                  currentUser={currentUser}
                  fixedExpenses={fixedExpenses}
                  setFixedExpenses={fbSetFixedExpenses}
                  staff={staff}
                  setStaff={fbSetStaff}
                  salaryPayments={salaryPayments}
                  setSalaryPayments={fbSetSalaryPayments}
                  attendances={attendances}
                  clinicInfo={clinicInfo}
                  users={users}
                />
              } />
              <Route path="/settings" element={<AdminSettings clinicInfo={clinicInfo} setClinicInfo={fbSetClinicInfo} procedures={procedures} setProcedures={fbSetProcedures} labTests={labTests} setLabTests={fbSetLabTests} checkupPrograms={checkupPrograms} setCheckupPrograms={fbSetCheckupPrograms} users={users} setUsers={fbSetUsers} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>

        {/* Custom Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className={`p-6 ${
                confirmModal.type === 'danger' ? 'bg-red-50' : 
                confirmModal.type === 'warning' ? 'bg-orange-50' : 'bg-blue-50'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 
                    confirmModal.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {confirmModal.type === 'danger' ? <Trash2 className="w-6 h-6" /> : 
                     confirmModal.type === 'warning' ? <AlertCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{confirmModal.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{confirmModal.message}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white flex justify-end gap-3 border-t">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all active:scale-95 ${
                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 
                    confirmModal.type === 'warning' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                  }`}
                >
                  {confirmModal.type === 'danger' ? 'ลบข้อมูล' : 'ตกลง'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;
