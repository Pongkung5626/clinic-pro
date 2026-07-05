import React, { useState, useMemo } from 'react';
import { Plus, CheckSquare, Square, Filter, Search, Table, Calendar, User, TrendingUp, TrendingDown, FileText, Download, Activity, Pill, FlaskConical, CreditCard, Trash2, Edit2, Pencil, Lock, CheckCircle2, History, X, Printer, Calculator, DollarSign } from 'lucide-react';
import { Transaction, Visit, Drug, Supply, Patient, Procedure, LabTest, CheckupProgram, DailyClose, User as ClinicUser, FixedExpense, Staff, SalaryPayment, ClinicInfo, Attendance } from '../types';
import * as XLSX from 'xlsx';

interface AccountingProps {
  transactions: Transaction[];
  setTransactions: (action: any) => Promise<void>;
  dailyCloses: DailyClose[];
  setDailyCloses: (action: any) => Promise<void>;
  visits: Visit[];
  setVisits: (action: any) => Promise<void>;
  drugs: Drug[];
  supplies: Supply[];
  patients: Patient[];
  procedures: Procedure[];
  labTests: LabTest[];
  checkupPrograms: CheckupProgram[];
  deleteVisit: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteDailyClose: (id: string) => Promise<void>;
  deleteFixedExpense: (id: string) => Promise<void>;
  currentUser: ClinicUser | null;
  fixedExpenses: FixedExpense[];
  setFixedExpenses: (action: any) => Promise<void>;
  staff: Staff[];
  setStaff: (action: any) => Promise<void>;
  salaryPayments: SalaryPayment[];
  setSalaryPayments: (action: any) => Promise<void>;
  attendances: Attendance[];
  clinicInfo: ClinicInfo;
  users: ClinicUser[];
}

type ReportType = 'Clinic' | 'Patient';
type PeriodType = 'Daily' | 'Monthly' | 'Yearly';
type TabType = 'Reports' | 'Reconciliation' | 'Expenses' | 'Salaries' | 'Attendance';

const Accounting: React.FC<AccountingProps> = ({ 
  transactions, 
  setTransactions, 
  dailyCloses,
  setDailyCloses,
  visits, 
  setVisits, 
  drugs, 
  supplies, 
  patients, 
  procedures,
  labTests,
  checkupPrograms,
  deleteVisit,
  deleteTransaction,
  deleteDailyClose,
  deleteFixedExpense,
  currentUser,
  fixedExpenses,
  setFixedExpenses,
  staff,
  setStaff,
  salaryPayments,
  setSalaryPayments,
  attendances,
  clinicInfo,
  users
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('Reconciliation');
  
  // Fixed Expense State
  const [isAddingFixed, setIsAddingFixed] = useState(false);
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [fixedExpenseForm, setFixedExpenseForm] = useState({ name: '', amount: 0 });
  
  // Report Configuration State
  const [reportType, setReportType] = useState<ReportType>('Clinic');
  const [period, setPeriod] = useState<PeriodType>('Monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  
  // Expense State
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    category: 'วัสดุสำนักงาน',
    amount: 0,
    description: '',
    paymentMethod: 'Cash'
  });
  const expenseCategories = ['วัสดุสำนักงาน', 'ยาและเวชภัณฑ์', 'ค่าเช่า/ค่าน้ำ/ค่าไฟ', 'เงินเดือน/ค่าจ้าง', 'อุปกรณ์การแพทย์', 'อื่นๆ'];

  // Reconciliation State
  const [reconcileDate, setReconcileDate] = useState(new Date().toISOString().split('T')[0]);
  const [countCash, setCountCash] = useState<string>('');
  const [countTransfer, setCountTransfer] = useState<string>('');
  const [countCredit, setCountCredit] = useState<string>('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [editingDate, setEditingDate] = useState<string>('');

  const [selectedFields, setSelectedFields] = useState<string[]>([
    'date', 'patientName', 'medications', 'procedures', 'labTests', 'revenue'
  ]);

  // Staff and Salary State
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({
    fullName: '',
    idCard: '',
    address: '',
    position: '',
    baseSalary: 0
  });

  const [isAddingSalary, setIsAddingSalary] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState<Partial<SalaryPayment>>({
    staffId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 0,
    withholdingTax: 0,
    bonus: 0,
    deductions: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Transfer'
  });

  const [printingSalary, setPrintingSalary] = useState<SalaryPayment | null>(null);
  const [showDetailsType, setShowDetailsType] = useState<'Revenue' | 'ClinicalCOGS' | 'Expenses' | null>(null);

  const availableFields = [
    { id: 'date', label: 'วันที่', icon: Calendar },
    { id: 'patientName', label: 'ชื่อคนไข้', icon: User },
    { id: 'medications', label: 'รายการยา', icon: Pill },
    { id: 'procedures', label: 'หัตถการ', icon: Activity },
    { id: 'labTests', label: 'ผลตรวจแล็บ', icon: FlaskConical },
    { id: 'cost', label: 'ต้นทุนรวม', icon: TrendingDown },
    { id: 'revenue', label: 'รายได้/ค่ารักษา', icon: CreditCard },
    { id: 'profit', label: 'กำไรขั้นต้น', icon: TrendingUp },
  ];

  const toggleField = (id: string) => {
    setSelectedFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const handleEditVisit = async (visit: Visit) => {
    if (window.confirm('ส่งผู้ป่วยกลับไปหน้าชำระเงินเพื่อแก้ไขยอด? รายการบัญชีเดิมจะถูกลบ')) {
      await setVisits((prev: Visit[]) => prev.map(v => v.id === visit.id ? { ...v, status: 'Billing', paymentStatus: 'Pending', completedAt: undefined } : v));
      await setTransactions((prev: Transaction[]) => prev.filter(t => t.visitId !== visit.id));
      alert('ส่งข้อมูลกลับหน้าชำระเงินแล้ว');
    }
  };

  const filteredData = useMemo(() => {
    let baseVisits = visits.filter(v => v.status === 'Completed');
    
    // 1. Filter by Report Type
    if (reportType === 'Patient' && selectedPatientId) {
      baseVisits = baseVisits.filter(v => v.patientId === selectedPatientId);
    }

    // 2. Filter by Period
    const data = baseVisits.filter(v => {
      const vDate = new Date(v.date);
      if (period === 'Yearly') {
        return vDate.getFullYear() === selectedYear;
      } else if (period === 'Monthly') {
        return vDate.getFullYear() === selectedYear && (vDate.getMonth() + 1) === selectedMonth;
      } else {
        return vDate.toISOString().split('T')[0] === selectedDate;
      }
    });

    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visits, reportType, selectedPatientId, period, selectedYear, selectedMonth, selectedDate]);

  // Reconciliation Logic
  const todayTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(reconcileDate) && t.type === 'Income');
  }, [transactions, reconcileDate]);

  const todayExpenses = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(reconcileDate) && t.type === 'Expense');
  }, [transactions, reconcileDate]);

  const systemTotals = useMemo(() => {
    const cash = todayTransactions.filter(t => t.paymentMethod === 'Cash').reduce((sum, t) => sum + t.amount, 0);
    const transfer = todayTransactions.filter(t => t.paymentMethod === 'Transfer').reduce((sum, t) => sum + t.amount, 0);
    const credit = todayTransactions.filter(t => t.paymentMethod === 'CreditCard').reduce((sum, t) => sum + t.amount, 0);
    const expenses = todayExpenses.reduce((sum, t) => sum + t.amount, 0);
    return { cash, transfer, credit, expenses, total: cash + transfer + credit, net: cash + transfer + credit - expenses };
  }, [todayTransactions, todayExpenses]);

  const isAlreadyClosed = useMemo(() => {
    return dailyCloses.find(dc => dc.date === reconcileDate);
  }, [dailyCloses, reconcileDate]);

  const handleSaveReconciliation = () => {
    if (!currentUser) return;
    
    const actualCash = parseFloat(countCash) || 0;
    const actualTransfer = parseFloat(countTransfer) || 0;
    const actualCredit = parseFloat(countCredit) || 0;
    const actualTotal = actualCash + actualTransfer + actualCredit;
    const difference = actualTotal - systemTotals.total;

    if (window.confirm(`ยืนยันการเคลียร์ยอดวันที่ ${new Date(reconcileDate).toLocaleDateString('th-TH')}?\nยอดส่วนต่าง: ฿${difference.toLocaleString()}`)) {
      const newClose: DailyClose = {
        id: Math.random().toString(36).substr(2, 9),
        date: reconcileDate,
        systemCash: systemTotals.cash,
        systemTransfer: systemTotals.transfer,
        systemCreditCard: systemTotals.credit,
        actualCash,
        actualTransfer,
        actualCreditCard: actualCredit,
        difference,
        closedBy: currentUser.fullName,
        closedAt: new Date().toISOString(),
        note: reconcileNote,
        status: 'Closed'
      };
      setDailyCloses((prev: DailyClose[]) => [...prev, newClose]);
      alert('บันทึกการเคลียร์ยอดเรียบร้อยแล้ว');
      setCountCash('');
      setCountTransfer('');
      setCountCredit('');
      setReconcileNote('');
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTxId) return;
    const amount = parseFloat(editingAmount);
    if (isNaN(amount)) {
      alert('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return;
    }
    if (!editingDate) {
      alert('กรุณากรอกวันที่ที่ถูกต้อง');
      return;
    }

    await setTransactions((prev: Transaction[]) => 
      prev.map(t => t.id === editingTxId ? { ...t, amount, date: editingDate } : t)
    );
    setEditingTxId(null);
    setEditingDate('');
    alert('ปรับปรุงข้อมูลเรียบร้อย');
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount || !expenseForm.category || !expenseForm.date) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (editingExpenseId) {
      // Update existing
      await setTransactions((prev: Transaction[]) => 
        prev.map(t => t.id === editingExpenseId ? { 
          ...t, 
          date: expenseForm.date!,
          category: expenseForm.category!,
          amount: Number(expenseForm.amount),
          description: expenseForm.description || '',
          paymentMethod: expenseForm.paymentMethod as any
        } : t)
      );
      setReconcileDate(expenseForm.date!);
      alert('แก้ไขรายจ่ายเรียบร้อย');
    } else {
      // Create new
      const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'Expense',
        date: expenseForm.date!,
        category: expenseForm.category!,
        amount: Number(expenseForm.amount),
        description: expenseForm.description || '',
        paymentMethod: expenseForm.paymentMethod as any
      };
      await setTransactions((prev: Transaction[]) => [...prev, newTx]);
      setReconcileDate(expenseForm.date!);
      alert('บันทึกรายจ่ายเรียบร้อย');
    }

    setIsAddingExpense(false);
    setEditingExpenseId(null);
    setExpenseForm({
      date: new Date().toISOString().split('T')[0],
      category: 'วัสดุสำนักงาน',
      amount: 0,
      description: '',
      paymentMethod: 'Cash'
    });
  };

  const handleOpenEditExpense = (tx: Transaction) => {
    setEditingExpenseId(tx.id);
    setExpenseForm({
      date: tx.date,
      category: tx.category,
      amount: tx.amount,
      description: tx.description,
      paymentMethod: tx.paymentMethod
    });
    setIsAddingExpense(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
  };

  const handleAddFixedExpense = async () => {
    if (!fixedExpenseForm.name || fixedExpenseForm.amount <= 0) {
      alert('กรุณากรอกชื่อรายการและจำนวนเงินที่ถูกต้อง');
      return;
    }
    
    if (editingFixedId) {
      const updatedFE: FixedExpense = {
        id: editingFixedId,
        name: fixedExpenseForm.name,
        amount: fixedExpenseForm.amount
      };
      await setFixedExpenses((prev: FixedExpense[]) => prev.map(fe => fe.id === editingFixedId ? updatedFE : fe));
    } else {
      const newFE: FixedExpense = {
        id: Math.random().toString(36).substr(2, 9),
        name: fixedExpenseForm.name,
        amount: fixedExpenseForm.amount
      };
      await setFixedExpenses((prev: FixedExpense[]) => [...prev, newFE]);
    }
    
    setFixedExpenseForm({ name: '', amount: 0 });
    setIsAddingFixed(false);
    setEditingFixedId(null);
  };

  const handleEditFixedExpense = (fe: FixedExpense) => {
    setFixedExpenseForm({ name: fe.name, amount: fe.amount });
    setEditingFixedId(fe.id);
    setIsAddingFixed(true);
  };

  const handleDeleteFixedExpense = async (id: string) => {
    await deleteFixedExpense(id);
  };

  const handleSaveStaff = async () => {
    if (!staffForm.fullName || !staffForm.position) {
      alert('กรุณากรอกชื่อและตำแหน่งพนักงาน');
      return;
    }

    const sData: Staff = {
      id: editingStaffId || Math.random().toString(36).substr(2, 9),
      fullName: staffForm.fullName || '',
      idCard: staffForm.idCard || '',
      address: staffForm.address || '',
      position: staffForm.position || '',
      baseSalary: Number(staffForm.baseSalary) || 0,
      bankAccount: staffForm.bankAccount || '',
      taxId: staffForm.taxId || ''
    };

    if (editingStaffId) {
      await setStaff((prev: Staff[]) => prev.map(s => s.id === editingStaffId ? sData : s));
      alert('แก้ไขข้อมูลพนักงานเรียบร้อย');
    } else {
      await setStaff((prev: Staff[]) => [...prev, sData]);
      alert('เพิ่มพนักงานใหม่เรียบร้อย');
    }

    setStaffForm({ fullName: '', idCard: '', address: '', position: '', baseSalary: 0 });
    setIsAddingStaff(false);
    setEditingStaffId(null);
  };

  const handleSaveSalary = async () => {
    if (!salaryForm.staffId || !salaryForm.amount) {
      alert('กรุณาเลือกพนักงานและระบุจำนวนเงิน');
      return;
    }

    const staffMember = staff.find(s => s.id === salaryForm.staffId);
    if (!staffMember) return;

    // Attendance calculation for the selected month
    const staffAttendances = attendances.filter(a => 
      a.userId === staffMember.userId && 
      new Date(a.date).getMonth() === (salaryForm.month || 1) - 1 && 
      new Date(a.date).getFullYear() === (salaryForm.year || new Date().getFullYear())
    );

    const net = (Number(salaryForm.amount) + Number(salaryForm.bonus)) - (Number(salaryForm.withholdingTax) + Number(salaryForm.deductions));
    const docNum = editingSalaryId 
      ? salaryPayments.find(p => p.id === editingSalaryId)?.docNumber || ''
      : `SAL-${salaryForm.year}${(salaryForm.month || 0).toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Manage transaction linking
    let txId = editingSalaryId ? salaryPayments.find(p => p.id === editingSalaryId)?.transactionId : undefined;
    if (!txId) txId = Math.random().toString(36).substr(2, 9);

    const payment: SalaryPayment = {
      id: editingSalaryId || Math.random().toString(36).substr(2, 9),
      staffId: salaryForm.staffId,
      staffName: staffMember.fullName,
      month: salaryForm.month || 1,
      year: salaryForm.year || new Date().getFullYear(),
      amount: Number(salaryForm.amount),
      bonus: Number(salaryForm.bonus) || 0,
      withholdingTax: Number(salaryForm.withholdingTax) || 0,
      deductions: Number(salaryForm.deductions) || 0,
      totalNet: net,
      paymentDate: salaryForm.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: salaryForm.paymentMethod as any,
      status: 'Paid',
      docNumber: docNum,
      transactionId: txId
    };

    const salaryTx: Transaction = {
      id: txId,
      type: 'Expense',
      date: payment.paymentDate,
      category: 'เงินเดือน/ค่าจ้าง',
      amount: net,
      description: `จ่ายเงินเดือน ${payment.staffName} (${payment.month}/${payment.year})`,
      paymentMethod: payment.paymentMethod as any,
    };

    if (editingSalaryId) {
      await setSalaryPayments((prev: SalaryPayment[]) => prev.map(p => p.id === editingSalaryId ? payment : p));
      await setTransactions((prev: Transaction[]) => {
        const index = prev.findIndex(t => t.id === txId);
        if (index !== -1) {
          return prev.map(t => t.id === txId ? salaryTx : t);
        } else {
          return [...prev, salaryTx];
        }
      });
      alert('แก้ไขข้อมูลการจ่ายเงินเดือนเรียบร้อย');
    } else {
      await setSalaryPayments((prev: SalaryPayment[]) => [...prev, payment]);
      await setTransactions((prev: Transaction[]) => [...prev, salaryTx]);
      alert('บันทึกการจ่ายเงินเดือนเรียบร้อย');
    }

    setIsAddingSalary(false);
    setEditingSalaryId(null);
    setPrintingSalary(payment);
  };

  const handleDeleteStaff = async (id: string) => {
    if (window.confirm('ยืนยันการลบข้อมูลพนักงาน? (ข้อมูลการจ่ายเงินเดือนจะไม่ถูกลบ)')) {
      await setStaff((prev: Staff[]) => prev.filter(s => s.id !== id));
    }
  };

  const monthlySummary = useMemo(() => {
    if (period !== 'Monthly') return null;
    
    const monthlyRevenue = filteredData.reduce((sum, v) => sum + v.totalAmount, 0);
    const monthlyDynamicExpenses = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'Expense' && 
               tDate.getFullYear() === selectedYear && 
               (tDate.getMonth() + 1) === selectedMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate total clinical cost (Drugs + Procedures) and Lab cost separately
    let clinicalCogs = 0;
    let labCogs = 0;
    filteredData.forEach(v => {
      // Drug costs
      v.prescriptions.forEach(p => {
        const drug = drugs.find(d => d.id === p.drugId);
        if (drug) clinicalCogs += (drug.costPrice || 0) * p.amount;
      });
      // Procedure costs
      v.procedures.forEach(p => {
        const procDef = procedures.find(proc => proc.id === p.procedureId);
        if (procDef) clinicalCogs += (procDef.costPrice || 0);
      });
      // Lab costs
      v.labOrders?.forEach(l => {
        const labDef = labTests.find(lab => lab.id === l.labTestId);
        if (labDef) labCogs += (labDef.costPrice || 0);
      });
    });

    const totalFixed = fixedExpenses.reduce((sum, fe) => sum + fe.amount, 0);
    const monthlySalaries = salaryPayments
      .filter(sp => sp.month === selectedMonth && sp.year === selectedYear)
      .reduce((sum, sp) => sum + sp.totalNet, 0);
    
    // Dynamic expenses excluding salaries to avoid double counting
    const otherDetailedExpenses = monthlyDynamicExpenses - monthlySalaries;

    // Total Ops = Fixed + Salaries + Dynamic Expenses (excluding salary tx) + Lab costs
    const operationalExpenses = totalFixed + monthlySalaries + otherDetailedExpenses + labCogs;

    const totalExpenses = clinicalCogs + operationalExpenses;
    
    return {
      revenue: monthlyRevenue,
      clinicalCogs: clinicalCogs,
      operationalExpenses: operationalExpenses,
      monthlySalaries,
      totalFixed,
      otherDetailedExpenses: otherDetailedExpenses + labCogs,
      netProfit: monthlyRevenue - totalExpenses
    };
  }, [period, filteredData, transactions, selectedYear, selectedMonth, fixedExpenses, salaryPayments, drugs, procedures, labTests]);

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const generateReportData = () => {
    return filteredData.map(v => {
      const patient = patients.find(p => p.id === v.patientId);
      const row: any = {};
      
      if (selectedFields.includes('date')) {
        row['วันที่'] = new Date(v.date).toLocaleDateString('th-TH');
      }
      if (selectedFields.includes('patientName')) {
        row['ชื่อคนไข้'] = patient ? `${patient.firstName} ${patient.lastName}` : 'ไม่ระบุ';
      }
      if (selectedFields.includes('medications')) {
        row['รายการยา'] = v.prescriptions.map(p => `${p.name} (${p.amount} ${p.unit})`).join(', ');
      }
      if (selectedFields.includes('procedures')) {
        row['หัตถการ'] = v.procedures.map(p => p.discount ? `${p.name} (ลด ฿${p.discount})` : p.name).join(', ');
      }
      if (selectedFields.includes('labTests')) {
        row['ผลตรวจแล็บ'] = v.labOrders.map(l => `${l.name}: ${l.result || 'รอผล'}`).join(', ');
      }
      if (selectedFields.includes('cost')) {
        let cost = 0;
        v.prescriptions.forEach(p => {
          const drug = drugs.find(d => d.id === p.drugId);
          if (drug) cost += (drug.costPrice || 0) * p.amount;
        });
        v.procedures.forEach(p => {
          const procDef = procedures.find(proc => proc.id === p.procedureId);
          if (procDef) cost += (procDef.costPrice || 0);
        });
        v.labOrders?.forEach(l => {
          const labDef = labTests.find(lab => lab.id === l.labTestId);
          if (labDef) cost += (labDef.costPrice || 0);
        });
        row['ต้นทุนรวม'] = cost;
      }
      if (selectedFields.includes('revenue')) {
        row['รายได้/ค่ารักษา'] = v.totalAmount;
      }
      if (selectedFields.includes('profit')) {
        let cost = 0;
        v.prescriptions.forEach(p => {
          const drug = drugs.find(d => d.id === p.drugId);
          if (drug) cost += (drug.costPrice || 0) * p.amount;
        });
        v.procedures.forEach(p => {
          const procDef = procedures.find(proc => proc.id === p.procedureId);
          if (procDef) cost += (procDef.costPrice || 0);
        });
        v.labOrders?.forEach(l => {
          const labDef = labTests.find(lab => lab.id === l.labTestId);
          if (labDef) cost += (labDef.costPrice || 0);
        });
        row['กำไรขั้นต้น'] = v.totalAmount - cost;
      }
      return row;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-7 h-7 text-emerald-600" />
              การจัดการบัญชีและการเงิน
            </h2>
            <p className="text-slate-500 text-sm">ตรวจสอบรายได้ เคลียร์ยอดเงิน และออกรายงาน</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('Reconciliation')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Reconciliation' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              เคลียร์ยอดรายวัน
            </button>
            <button
              onClick={() => setActiveTab('Expenses')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Expenses' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <TrendingDown className="w-4 h-4" />
              บันทึกรายจ่าย
            </button>
            <button
              onClick={() => setActiveTab('Reports')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Reports' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-4 h-4" />
              รายงานสรุป
            </button>
            <button
              onClick={() => setActiveTab('Salaries')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Salaries' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <DollarSign className="w-4 h-4" />
               payroll & เงินเดือน
            </button>
            <button
              onClick={() => setActiveTab('Attendance')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'Attendance' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Activity className="w-4 h-4" />
               ประวัติการทำงาน
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'Reconciliation' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Reconciliation Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 text-slate-900">
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-800">สรุปยอดประจำวัน: {new Date(reconcileDate).toLocaleDateString('th-TH')}</h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                   <div className="flex flex-col items-end">
                      <span className="text-slate-400 uppercase text-[8px]">รายรับระบบ</span>
                      <span className="text-emerald-600">฿{systemTotals.total.toLocaleString()}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-slate-400 uppercase text-[8px]">รายจ่ายระบบ</span>
                      <span className="text-red-500">฿{systemTotals.expenses.toLocaleString()}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-slate-400 uppercase text-[8px]">คงเหลือสุทธิ</span>
                      <span className="text-slate-800 border-b-2 border-slate-800">฿{systemTotals.net.toLocaleString()}</span>
                   </div>
                </div>
              </div>

              <div className="p-6">
                {isAlreadyClosed ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-xl text-center space-y-3">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h4 className="text-xl font-bold text-emerald-800">ปิดยอดเรียบร้อยแล้ว</h4>
                    <p className="text-sm text-emerald-600">
                      จัดการโดย: {isAlreadyClosed.closedBy} เมื่อ {new Date(isAlreadyClosed.closedAt).toLocaleString('th-TH')}
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-[10px] uppercase font-bold text-slate-400">เงินสด</p>
                        <p className="text-lg font-bold text-slate-900">฿{isAlreadyClosed.actualCash.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-[10px] uppercase font-bold text-slate-400">โอน</p>
                        <p className="text-lg font-bold text-slate-900">฿{isAlreadyClosed.actualTransfer.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <p className="text-[10px] uppercase font-bold text-slate-400">ส่วนต่าง</p>
                        <p className={`text-lg font-bold ${isAlreadyClosed.difference === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ฿{isAlreadyClosed.difference.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <DollarSign className="w-3 h-3" /> เงินสด (นับจริง)
                        </label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={countCash}
                            onChange={(e) => setCountCash(e.target.value)}
                            placeholder={systemTotals.cash.toString()}
                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border rounded-xl font-bold text-lg focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-slate-900"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
                        </div>
                        <p className="text-[10px] text-slate-400">ยอดในระบบ: ฿{systemTotals.cash.toLocaleString()}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <CreditCard className="w-3 h-3" /> เงินโอน (เช็คยอด)
                        </label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={countTransfer}
                            onChange={(e) => setCountTransfer(e.target.value)}
                            placeholder={systemTotals.transfer.toString()}
                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border rounded-xl font-bold text-lg focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-slate-900"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
                        </div>
                        <p className="text-[10px] text-slate-400">ยอดในระบบ: ฿{systemTotals.transfer.toLocaleString()}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <CreditCard className="w-3 h-3" /> บัตรเครดิต
                        </label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={countCredit}
                            onChange={(e) => setCountCredit(e.target.value)}
                            placeholder={systemTotals.credit.toString()}
                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border rounded-xl font-bold text-lg focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none text-slate-900"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
                        </div>
                        <p className="text-[10px] text-slate-400">ยอดในระบบ: ฿{systemTotals.credit.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">หมายเหตุเพิ่มเติม</label>
                      <textarea 
                        value={reconcileNote}
                        onChange={(e) => setReconcileNote(e.target.value)}
                        placeholder="เช่น พบเงินสดเกิน 20 บาท หรือ ข้อมูลการโอนผิดพลาด..."
                        className="w-full p-4 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none h-24 resize-none text-slate-900"
                      />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between border border-dashed border-slate-300">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">สรุปยอดที่นับได้จริง</p>
                        <p className="text-2xl font-bold text-emerald-600">฿{( (parseFloat(countCash)||0) + (parseFloat(countTransfer)||0) + (parseFloat(countCredit)||0) ).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">ส่วนต่างจากระบบ</p>
                        {(() => {
                           const actual = (parseFloat(countCash)||0) + (parseFloat(countTransfer)||0) + (parseFloat(countCredit)||0);
                           const diff = actual - systemTotals.total;
                           return (
                             <p className={`text-xl font-bold ${diff === 0 ? 'text-slate-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                               {diff > 0 && '+'}฿{diff.toLocaleString()}
                             </p>
                           );
                        })()}
                      </div>
                    </div>

                    <button 
                      onClick={handleSaveReconciliation}
                      disabled={systemTotals.total === 0 && !countCash && !countTransfer}
                      className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
                    >
                      <Lock className="w-5 h-5" />
                      บันทึกการเคลียร์ยอดและปิดรอบ
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Daily Item List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
              <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center text-slate-900">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Table className="w-5 h-5 text-emerald-600" />
                  รายการรายได้ประจำวันที่ {new Date(reconcileDate).toLocaleDateString('th-TH')}
                </h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-slate-600">วันที่</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-600">ชื่อคนไข้ / รายการ</th>
                      <th className="px-6 py-4 text-left font-bold text-slate-600">ประเภทการจ่าย</th>
                      <th className="px-6 py-4 text-right font-bold text-slate-600">จำนวนเงิน</th>
                      <th className="px-6 py-4 text-right font-bold text-slate-600 no-print">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayTransactions.length > 0 ? todayTransactions.map(tx => {
                      const patientId = transactions.find(t => t.id === tx.id)?.visitId ? visits.find(v => v.id === tx.visitId)?.patientId : null;
                      const patient = patients.find(p => p.id === patientId);
                      const isEditing = editingTxId === tx.id;
                      
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input 
                                type="date" 
                                className="w-full border rounded p-1 text-xs"
                                value={editingDate}
                                onChange={(e) => setEditingDate(e.target.value)}
                              />
                            ) : (
                              <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('th-TH')}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">
                              {patient ? `${patient.firstName} ${patient.lastName}` : (tx.description.includes('sale to') ? tx.description.split('sale to ')[1] : tx.description)}
                            </p>
                            <p className="text-[10px] text-slate-400 italic capitalize">{tx.description}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                              tx.paymentMethod === 'Cash' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              {tx.paymentMethod === 'Cash' ? <DollarSign className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                              {tx.paymentMethod === 'Cash' ? 'เงินสด' : tx.paymentMethod === 'Transfer' ? 'โอนเงิน' : 'บัตรเครดิต'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-600">
                            {isEditing ? (
                              <input 
                                type="number" 
                                className="w-24 text-right border rounded p-1"
                                value={editingAmount}
                                onChange={(e) => setEditingAmount(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTransaction()}
                              />
                            ) : (
                              `฿${tx.amount.toLocaleString()}`
                            )}
                          </td>
                          <td className="px-6 py-4 text-right no-print">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <button onClick={handleUpdateTransaction} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded">
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingTxId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingTxId(tx.id);
                                    setEditingAmount(tx.amount.toString());
                                    setEditingDate(tx.date.split('T')[0]);
                                  }}
                                  className={`p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors ${isAlreadyClosed ? 'hidden' : ''}`}
                                  title="แก้ไขยอดเงิน"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className={`p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ${isAlreadyClosed ? 'hidden' : ''}`}
                                  title="ลบรายการนี้"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">ไม่มีรายการธุรกรรมในวันที่เลือก</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* History / Summary Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-slate-900">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                สรุปยอดระบบวันนี้
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-slate-900">
                  <span className="text-sm font-medium text-slate-500">รวมรายรับ</span>
                  <span className="font-bold text-emerald-600">฿{systemTotals.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-900">
                  <span className="text-sm font-medium text-slate-500">รวมรายจ่าย</span>
                  <span className="font-bold text-red-500">฿{systemTotals.expenses.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-sm font-bold text-slate-400">คงเหลือสุทธิ</span>
                  <span className="text-xl font-bold text-white">฿{systemTotals.net.toLocaleString()}</span>
                </div>
                <div className="pt-2">
                   <p className="text-[9px] text-slate-400 uppercase font-bold mb-2">แยกตามประเภทรับเงิน</p>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 border rounded-lg bg-slate-50">
                         <span className="text-[8px] block text-slate-500">เงินสด</span>
                         <span className="text-xs font-bold">฿{systemTotals.cash.toLocaleString()}</span>
                      </div>
                      <div className="p-2 border rounded-lg bg-slate-50">
                         <span className="text-[8px] block text-slate-500">โอน/บัตร</span>
                         <span className="text-xs font-bold">฿{(systemTotals.transfer + systemTotals.credit).toLocaleString()}</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
              <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  ประวัติการปิดยอดล่าสุด
                </h4>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {dailyCloses.length > 0 ? dailyCloses.sort((a, b) => b.date.localeCompare(a.date)).map(close => (
                  <div key={close.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800">{new Date(close.date).toLocaleDateString('th-TH')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${close.difference === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {close.difference === 0 ? 'ตรง' : 'ไม่ตรง'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">โดย: {close.closedBy}</span>
                        {currentUser?.role === 'Admin' && (
                          <button 
                            onClick={() => deleteDailyClose(close.id)}
                            className="text-[10px] text-red-400 hover:text-red-600 font-bold mt-1 inline-flex items-center gap-1 group"
                          >
                            <Trash2 className="w-3 h-3 transition-transform group-hover:scale-110" />
                            ลบรายการ
                          </button>
                        )}
                      </div>
                      <span className="text-sm font-bold text-emerald-600">฿{ (close.actualCash + close.actualTransfer + close.actualCreditCard).toLocaleString() }</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic">ยังไม่มีประวัติการปิดยอด</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'Expenses' ? (
        <div className="space-y-6">
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-3">
                 <TrendingDown className="w-6 h-6 text-red-500" />
                 <h3 className="font-bold text-slate-800 text-lg">จัดการรายจ่ายคงที่รายเดือน</h3>
               </div>
               <button 
                  onClick={() => setIsAddingFixed(true)}
                  className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 shadow-lg shadow-slate-100 transition-all active:scale-95"
               >
                 <Plus className="w-5 h-5" /> เพิ่มรายจ่ายคงที่
               </button>
             </div>
             
             <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {fixedExpenses.length > 0 ? fixedExpenses.map(fe => (
                    <div key={fe.id} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{fe.name}</p>
                        <p className="text-lg font-black text-slate-800">฿{fe.amount.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEditFixedExpense(fe)}
                          className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteFixedExpense(fe.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-3 py-10 text-center text-slate-400 italic bg-slate-50 border border-dashed rounded-xl">
                      ยังไม่มีรายการรายจ่ายคงที่ (เช่น ค่าน้ำ, ค่าไฟ, เงินเดือนพนักงาน)
                    </div>
                  )}
                </div>

                {isAddingFixed && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-col md:flex-row gap-4 items-end mb-6">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">ชื่อรายการ</label>
                      <input 
                         type="text" 
                         value={fixedExpenseForm.name}
                         onChange={e => setFixedExpenseForm({...fixedExpenseForm, name: e.target.value})}
                         placeholder="เช่น ค่าเช่าตึก, เงินเดือนพนักงาน"
                         className="w-full p-2 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">จำนวนเงิน (บาท)</label>
                      <input 
                         type="number" 
                         value={fixedExpenseForm.amount || ''}
                         onChange={e => setFixedExpenseForm({...fixedExpenseForm, amount: parseFloat(e.target.value) || 0})}
                         placeholder="0.00"
                         className="w-full p-2 bg-white border rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="flex gap-2">
                       <button onClick={handleAddFixedExpense} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm">
                         {editingFixedId ? 'บันทึก' : 'เพิ่ม'}
                       </button>
                       <button onClick={() => { setIsAddingFixed(false); setEditingFixedId(null); setFixedExpenseForm({ name: '', amount: 0 }); }} className="px-4 py-2 bg-white border text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-all text-sm">ยกเลิก</button>
                    </div>
                  </div>
                )}
             </div>
           </div>

           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-3">
                 <TrendingDown className="w-6 h-6 text-red-500" />
                 <h3 className="font-bold text-slate-800 text-lg">จัดการรายจ่ายตามธุรกรรม</h3>
               </div>
               <button 
                  onClick={() => setIsAddingExpense(true)}
                  className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 shadow-lg shadow-red-100 transition-all active:scale-95"
               >
                 <Plus className="w-5 h-5" /> เพิ่มรายการจ่าย
               </button>
             </div>
             
             <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                   <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <input 
                        type="date" 
                        value={reconcileDate}
                        onChange={e => setReconcileDate(e.target.value)}
                        className="bg-transparent text-sm font-bold outline-none"
                      />
                   </div>
                   <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100">
                      <p className="text-[10px] uppercase font-bold text-red-400">รวมรายจ่ายประจำวันที่เลือก</p>
                      <p className="text-2xl font-black text-red-600">฿{systemTotals.expenses.toLocaleString()}</p>
                   </div>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                   <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                         <tr className="text-[10px] text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4 text-left">หมวดหมู่</th>
                            <th className="px-4 py-4 text-left">รายละเอียด</th>
                            <th className="px-4 py-4 text-left">ชำระโดย</th>
                            <th className="px-4 py-4 text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {todayExpenses.length > 0 ? todayExpenses.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg uppercase">{tx.category}</span>
                               </td>
                               <td className="px-4 py-4 font-medium text-slate-700">{tx.description || '-'}</td>
                               <td className="px-4 py-4">
                                  <span className="text-[10px] font-bold text-slate-400">{tx.paymentMethod === 'Cash' ? 'เงินสด' : tx.paymentMethod === 'Transfer' ? 'เงินโอน' : 'บัตร'}</span>
                               </td>
                               <td className="px-4 py-4 text-right font-black text-red-600">฿{tx.amount.toLocaleString()}</td>
                               <td className="px-6 py-4 text-center">
                                  <div className="flex justify-center gap-1">
                                    <button 
                                      onClick={() => handleOpenEditExpense(tx)}
                                      className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                      title="แก้ไขรายจ่าย"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTransaction(tx.id)}
                                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      title="ลบรายจ่าย"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                               </td>
                            </tr>
                         )) : (
                            <tr>
                               <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">ไม่มีรายการรายจ่ายในวันที่เลือก</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
           </div>

           {/* Add Expense Modal */}
           {isAddingExpense && (
              <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-slate-900">
                   <div className="p-4 border-b bg-slate-50 flex justify-between items-center font-bold">
                      <h3 className="flex items-center gap-2 text-slate-800">
                        <TrendingDown className="w-5 h-5 text-red-500" /> 
                        {editingExpenseId ? 'แก้ไขรายจ่ายคลินิก' : 'เพิ่มรายจ่ายคลินิก'}
                      </h3>
                      <button onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }} className="text-slate-400 hover:text-red-500"><X className="w-6 h-6" /></button>
                   </div>
                   <div className="p-6 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">วันที่จ่าย</label>
                        <input 
                          type="date"
                          className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-red-500/10 outline-none"
                          value={expenseForm.date}
                          onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">หมวดหมู่</label>
                        <select 
                          className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-red-500/10 outline-none"
                          value={expenseForm.category}
                          onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                        >
                          {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">จำนวนเงิน (บาท)</label>
                        <input 
                          type="number"
                          placeholder="0.00"
                          className="w-full border border-slate-200 p-3 rounded-xl font-bold text-lg text-red-600 focus:ring-2 focus:ring-red-500/10 outline-none"
                          value={expenseForm.amount || ''}
                          onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">วิธีการชำระ</label>
                        <div className="flex gap-2">
                           {['Cash', 'Transfer', 'CreditCard'].map(method => (
                              <button
                                key={method}
                                onClick={() => setExpenseForm({...expenseForm, paymentMethod: method as any})}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                                  expenseForm.paymentMethod === method 
                                    ? 'bg-red-50 border-red-500 text-red-600 ring-2 ring-red-500/10' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                {method === 'Cash' ? 'เงินสด' : method === 'Transfer' ? 'เงินโอน' : 'บัตร'}
                              </button>
                           ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">รายละเอียดเพิ่มเติม</label>
                        <textarea 
                          rows={2}
                          placeholder="เช่น ซื้อกระดาษเช็ดมือ, ค่ายาเร่งด่วน..."
                          className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500/10 outline-none"
                          value={expenseForm.description}
                          onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                        />
                      </div>
                   </div>
                   <div className="p-6 border-t bg-slate-50 flex gap-3">
                      <button onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }} className="flex-1 py-3 text-slate-600 font-bold hover:bg-white rounded-xl transition-all">ยกเลิก</button>
                      <button onClick={handleAddExpense} className="flex-[2] bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98]">
                        {editingExpenseId ? 'บันทึกการแก้ไข' : 'บันทึกรายจ่าย'}
                      </button>
                   </div>
                </div>
              </div>
           )}
        </div>
      ) : activeTab === 'Attendance' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  ประวัติการเข้างาน (Attendance Records)
                </h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr className="text-[10px] text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4 text-left">วันที่</th>
                      <th className="px-4 py-4 text-left">พนักงาน</th>
                      <th className="px-4 py-4 text-center">เวลาเข้า</th>
                      <th className="px-4 py-4 text-center">เวลาออก</th>
                      <th className="px-4 py-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendances.length > 0 ? attendances.sort((a,b) => b.date.localeCompare(a.date)).map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-600">{new Date(a.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className="px-4 py-4 font-bold text-slate-800">{a.staffName}</td>
                        <td className="px-4 py-4 text-center font-mono">{a.clockIn || '--:--'}</td>
                        <td className="px-4 py-4 text-center font-mono">{a.clockOut || '--:--'}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            a.status === 'Punctual' ? 'bg-emerald-100 text-emerald-700' :
                            a.status === 'Late' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {a.status === 'Punctual' ? 'ตรงเวลา' : 
                             a.status === 'Late' ? 'สาย' : 
                             a.status === 'Early Leave' ? 'กลับก่อน' : 'ขาดงาน'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">ยังไม่มีบันทึกการเข้างาน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      ) : activeTab === 'Salaries' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-900">
            <div className="lg:col-span-1 space-y-6">
              {/* Staff List Management */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    รายชื่อพนักงาน
                  </h3>
                  <button 
                    onClick={() => {
                      setStaffForm({ fullName: '', idCard: '', address: '', position: '', baseSalary: 10000, userId: '' });
                      setEditingStaffId(null);
                      setIsAddingStaff(true);
                    }}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {staff.length > 0 ? staff.map(s => (
                    <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-800">{s.fullName}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{s.position}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingStaffId(s.id);
                              setStaffForm(s);
                              setIsAddingStaff(true);
                            }}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteStaff(s.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">เงินเดือนพื้นฐาน:</span>
                        <span className="font-bold text-slate-700">฿{(s.baseSalary || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-400 italic text-sm">ยังไม่มีข้อมูลพนักงาน</div>
                  )}
                </div>
              </div>

              {/* Staff Form */}
              {isAddingStaff && (
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-xl overflow-hidden animate-in slide-in-from-left-4 duration-300">
                  <div className="p-4 border-b bg-emerald-50 text-emerald-800 font-bold flex justify-between">
                    <span>{editingStaffId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</span>
                    <button onClick={() => setIsAddingStaff(false)} className="text-emerald-600 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">เชื่อมต่อกับ User ระบบ</label>
                      <select 
                        value={staffForm.userId || ''}
                        onChange={e => setStaffForm({...staffForm, userId: e.target.value})}
                        className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/10"
                      >
                        <option value="">-- ไม่เชื่อมต่อ --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">ชื่อ-นามสกุล</label>
                      <input 
                        type="text" 
                        value={staffForm.fullName}
                        onChange={e => setStaffForm({...staffForm, fullName: e.target.value})}
                        className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/10" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">เลขบัตรประชาชน</label>
                        <input 
                          type="text" 
                          value={staffForm.idCard}
                          onChange={e => setStaffForm({...staffForm, idCard: e.target.value})}
                          className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/10" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">ตำแหน่ง</label>
                        <input 
                          type="text" 
                          value={staffForm.position}
                          onChange={e => setStaffForm({...staffForm, position: e.target.value})}
                          className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/10" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">เงินเดือนพื้นฐาน</label>
                      <input 
                        type="number" 
                        value={staffForm.baseSalary || ''}
                        onChange={e => setStaffForm({...staffForm, baseSalary: parseFloat(e.target.value) || 10000})}
                        className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/10 font-bold" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">ที่อยู่</label>
                      <textarea 
                        rows={2}
                        value={staffForm.address}
                        onChange={e => setStaffForm({...staffForm, address: e.target.value})}
                        className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/10 resize-none" 
                      />
                    </div>
                    <button 
                      onClick={handleSaveStaff}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      บันทึกข้อมูลพนักงาน
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Salary Payment Records */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    บันทึกการจ่ายเงินเดือน (Payroll)
                  </h3>
                  <button 
                    onClick={() => setIsAddingSalary(true)}
                    className="bg-slate-800 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all active:scale-95 text-sm"
                  >
                    <Plus className="w-4 h-4" /> ทำรายการจ่าย
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-[10px] text-slate-500 uppercase tracking-widest">
                        <th className="px-6 py-4 text-left">เลขที่เอกสาร</th>
                        <th className="px-4 py-4 text-left">พนักงาน / งวด</th>
                        <th className="px-4 py-4 text-right">ยอดสุทธิ</th>
                        <th className="px-4 py-4 text-center">วันที่จ่าย</th>
                        <th className="px-6 py-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salaryPayments.length > 0 ? salaryPayments.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).map(sp => (
                        <tr key={sp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-400">{sp.docNumber}</td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-800">{sp.staffName}</p>
                            <p className="text-[10px] text-slate-400 italic">{months[sp.month-1]} {sp.year + 543}</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="font-bold text-slate-800">฿{(sp.totalNet || 0).toLocaleString()}</p>
                            <p className="text-[9px] text-emerald-600 font-bold italic">Paid</p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs text-slate-500">{new Date(sp.paymentDate).toLocaleDateString('th-TH')}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1">
                              <button 
                                onClick={() => {
                                  setEditingSalaryId(sp.id);
                                  setSalaryForm({
                                    staffId: sp.staffId,
                                    month: sp.month,
                                    year: sp.year,
                                    amount: sp.amount,
                                    bonus: sp.bonus,
                                    withholdingTax: sp.withholdingTax,
                                    deductions: sp.deductions,
                                    paymentDate: sp.paymentDate,
                                    paymentMethod: sp.paymentMethod
                                  });
                                  setIsAddingSalary(true);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => setPrintingSalary(sp)}
                                 className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                 title="พิมพ์ใบสำคัญรับเงิน"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (window.confirm('ยืนยันการลบรายการจ่ายเงินเดือน? รายการบัญชีที่เกี่ยวข้องจะถูกลบด้วย')) {
                                    await setSalaryPayments((prev: SalaryPayment[]) => prev.filter(p => p.id !== sp.id));
                                    if (sp.transactionId) {
                                      await deleteTransaction(sp.transactionId);
                                    }
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">ยังไม่มีประวัติการจ่ายเงินเดือน</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Modals for Salary Payment and Voucher */}
          {isAddingSalary && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center font-bold">
                    <h3 className="flex items-center gap-2 text-slate-800">
                      <DollarSign className="w-5 h-5 text-emerald-600" /> ทำรายการจ่ายเงินเดือน
                    </h3>
                    <button onClick={() => { setIsAddingSalary(false); setEditingSalaryId(null); }} className="text-slate-400 hover:text-red-500"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-900">
                   <div className="space-y-4">
                      <div>
                         <label className="text-xs font-bold text-slate-500 block mb-1">เลือกพนักงาน</label>
                         <select 
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none"
                            value={salaryForm.staffId}
                            onChange={e => {
                              const s = staff.find(st => st.id === e.target.value);
                              
                              // Calculate automatic totals based on attendance
                              let deductions = 0;
                              let bonus = 0;
                              if (s && s.userId) {
                                const selectedMonth = salaryForm.month || new Date().getMonth() + 1;
                                const selectedYear = salaryForm.year || new Date().getFullYear();
                                
                                // Days in month minus Wednesdays
                                const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                                let workDays = 0;
                                for (let d = 1; d <= daysInMonth; d++) {
                                  const date = new Date(selectedYear, selectedMonth - 1, d);
                                  if (date.getDay() !== 3) workDays++;
                                }

                                const sAttendances = attendances.filter(a => 
                                  a.userId === s.userId && 
                                  new Date(a.date).getMonth() === selectedMonth - 1 && 
                                  new Date(a.date).getFullYear() === selectedYear
                                );

                                // If late or early leave, tiny deduction for demo? Or just absent deduction
                                const presentDays = sAttendances.length;
                                const absentDays = workDays - presentDays;
                                if (absentDays > 0) {
                                  deductions = (s.baseSalary / workDays) * absentDays;
                                }
                              }

                              setSalaryForm({
                                ...salaryForm, 
                                staffId: e.target.value,
                                amount: s ? s.baseSalary : 0,
                                deductions: Math.round(deductions)
                              });
                            }}
                         >
                            <option value="">-- เลือกพนักงาน --</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.position})</option>)}
                         </select>
                         {salaryForm.staffId && staff.find(s => s.id === salaryForm.staffId)?.userId && (
                            <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                               <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                                 <Activity className="w-3 h-3" /> สรุปเวลาทำงานเดือนนี้
                               </p>
                               <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div className="flex justify-between">
                                     <span className="text-slate-500">วันทำงานจริง / ทั้งหมด:</span>
                                     <span className="font-bold text-slate-700">
                                       {attendances.filter(a => 
                                          a.userId === staff.find(s => s.id === salaryForm.staffId)?.userId && 
                                          new Date(a.date).getMonth() === (salaryForm.month || new Date().getMonth() + 1) - 1
                                       ).length} / {(() => {
                                          const m = salaryForm.month || new Date().getMonth() + 1;
                                          const y = salaryForm.year || new Date().getFullYear();
                                          const days = new Date(y, m, 0).getDate();
                                          let workDays = 0;
                                          for (let d = 1; d <= days; d++) {
                                            if (new Date(y, m-1, d).getDay() !== 3) workDays++;
                                          }
                                          return workDays;
                                       })()} วัน
                                     </span>
                                  </div>
                                  <div className="flex justify-between">
                                     <span className="text-slate-500">จำนวนที่สาย:</span>
                                     <span className="font-bold text-orange-600">
                                       {attendances.filter(a => 
                                          a.userId === staff.find(s => s.id === salaryForm.staffId)?.userId && 
                                          new Date(a.date).getMonth() === (salaryForm.month || new Date().getMonth() + 1) - 1 &&
                                          a.status === 'Late'
                                       ).length} ครั้ง
                                     </span>
                                  </div>
                               </div>
                            </div>
                         )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">เดือน</label>
                            <select 
                               className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none"
                               value={salaryForm.month}
                               onChange={e => setSalaryForm({...salaryForm, month: parseInt(e.target.value)})}
                            >
                               {months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">ปี</label>
                            <select 
                               className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none"
                               value={salaryForm.year}
                               onChange={e => setSalaryForm({...salaryForm, year: parseInt(e.target.value)})}
                            >
                               {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
                            </select>
                         </div>
                      </div>
                      <div>
                         <label className="text-xs font-bold text-slate-500 block mb-1">วันที่ต้องการจ่าย</label>
                         <input 
                            type="date"
                            className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none"
                            value={salaryForm.paymentDate}
                            onChange={e => setSalaryForm({...salaryForm, paymentDate: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-slate-500 block mb-1">ช่องทางการจ่าย</label>
                         <div className="flex gap-2">
                            {['Transfer', 'Cash'].map(method => (
                               <button
                                 key={method}
                                 onClick={() => setSalaryForm({...salaryForm, paymentMethod: method as any})}
                                 className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                                   salaryForm.paymentMethod === method 
                                     ? 'bg-emerald-50 border-emerald-500 text-emerald-600 ring-2 ring-emerald-500/10' 
                                     : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                 }`}
                               >
                                 {method === 'Transfer' ? 'โอนเงิน' : 'เงินสด'}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                   
                   <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">เงินเดือนพื้นฐาน</label>
                            <input 
                               type="number"
                               className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none"
                               value={salaryForm.amount || ''}
                               onChange={e => setSalaryForm({...salaryForm, amount: parseFloat(e.target.value) || 0})}
                            />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">ค่าอื่นๆ/โบนัส</label>
                            <input 
                               type="number"
                               className="w-full border border-slate-200 p-3 rounded-xl font-bold outline-none"
                               value={salaryForm.bonus || ''}
                               onChange={e => setSalaryForm({...salaryForm, bonus: parseFloat(e.target.value) || 0})}
                            />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-red-500 block mb-1">ภาษีหัก ณ ที่จ่าย</label>
                            <input 
                               type="number"
                               className="w-full border border-red-200 p-3 rounded-xl font-bold outline-none text-red-600"
                               value={salaryForm.withholdingTax || ''}
                               onChange={e => setSalaryForm({...salaryForm, withholdingTax: parseFloat(e.target.value) || 0})}
                            />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-red-500 block mb-1">หักอื่นๆ</label>
                            <input 
                               type="number"
                               className="w-full border border-red-200 p-3 rounded-xl font-bold outline-none text-red-600"
                               value={salaryForm.deductions || ''}
                               onChange={e => setSalaryForm({...salaryForm, deductions: parseFloat(e.target.value) || 0})}
                            />
                         </div>
                      </div>
                      <div className="h-px bg-slate-200 my-2" />
                      <div className="flex justify-between items-center text-slate-900 border border-slate-200 p-3 bg-white rounded-xl">
                         <p className="font-bold text-slate-600 uppercase text-xs">ยอดโอนสุทธิ</p>
                         <p className="text-2xl font-black text-emerald-600">
                           ฿{(
                             (salaryForm.amount || 0) + (salaryForm.bonus || 0) - (salaryForm.withholdingTax || 0) - (salaryForm.deductions || 0)
                           ).toLocaleString()}
                         </p>
                      </div>
                   </div>
                </div>
                <div className="p-6 border-t bg-slate-50 flex gap-3">
                   <button onClick={() => setIsAddingSalary(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-white rounded-xl transition-all">ยกเลิก</button>
                   <button 
                     onClick={handleSaveSalary}
                     className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                   >
                     บันทึกการจ่ายเงินเดือน
                   </button>
                </div>
              </div>
            </div>
          )}

          {printingSalary && (
            <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 text-slate-900">
                <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2"><Printer className="w-4 h-4" /> พิมพ์ใบสำคัญรับเงิน</h4>
                   <button onClick={() => setPrintingSalary(null)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 bg-slate-200 printable-area" id="printable-doc">
                   <div className="bg-white p-12 shadow-sm min-h-[10in] w-[7.5in] mx-auto font-['Sarabun'] text-slate-900 leading-relaxed border border-slate-300">
                      <header className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
                         <div>
                            {clinicInfo.logo && (
                              <img 
                                src={clinicInfo.logo} 
                                alt="Clinic Logo" 
                                className="h-16 mb-4 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <h1 className="text-2xl font-bold text-slate-900">{clinicInfo.name}</h1>
                            <p className="text-xs text-slate-600 mt-1">{clinicInfo.address}</p>
                            <p className="text-xs font-bold mt-1">เลขประจำตัวผู้เสียภาษี: {clinicInfo.taxId || '-'}</p>
                         </div>
                         <div className="text-right">
                            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-800">ใบสำคัญรับเงิน</h2>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest italic">VOUCHER</p>
                            <div className="mt-4 p-2 bg-slate-50 border rounded text-xs space-y-1 inline-block border-slate-900">
                               <p><span className="font-bold">เลขที่:</span> {printingSalary.docNumber}</p>
                               <p><span className="font-bold">วันที่:</span> {new Date(printingSalary.paymentDate).toLocaleDateString('th-TH')}</p>
                            </div>
                         </div>
                      </header>

                      <div className="grid grid-cols-2 gap-8 mb-8">
                         <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400">ผู้รับเงิน:</p>
                            <p className="font-bold border-b border-slate-200 pb-1">{printingSalary.staffName}</p>
                            <p className="text-xs"><span className="font-bold">ตำแหน่ง:</span> {staff.find(s => s.id === printingSalary.staffId)?.position}</p>
                         </div>
                         <div className="space-y-1 text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400">งวดงาน:</p>
                            <p className="font-bold border-b border-slate-200 pb-1">เดือน {months[printingSalary.month-1]} {printingSalary.year + 543}</p>
                         </div>
                      </div>

                      <table className="w-full border-collapse mb-12">
                         <thead>
                            <tr className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600 border-2 border-slate-900">
                               <th className="p-3 text-left border-r border-slate-900">รายการ</th>
                               <th className="p-3 text-right w-32">จำนวนเงิน</th>
                            </tr>
                         </thead>
                         <tbody className="border-x-2 border-slate-900 border-b-2">
                            <tr className="text-sm">
                               <td className="p-3 border-r border-slate-900 text-slate-900 font-medium">เงินเดือน (Salary)</td>
                               <td className="p-3 text-right">{(printingSalary.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                            {printingSalary.bonus > 0 && (
                              <tr className="text-sm">
                                 <td className="p-3 border-r border-slate-900 text-slate-900 font-medium">รายได้อื่นๆ/รางวัล (Extra)</td>
                                 <td className="p-3 text-right">{(printingSalary.bonus || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              </tr>
                            )}
                            <tr className="text-sm border-t border-slate-300">
                               <td className="p-3 border-r border-slate-900 text-red-600 font-medium">ภาษีหัก ณ ที่จ่าย (WHT)</td>
                               <td className="p-3 text-right text-red-600">({(printingSalary.withholdingTax || 0).toLocaleString(undefined, {minimumFractionDigits: 2})})</td>
                            </tr>
                            <tr className="text-sm">
                               <td className="p-3 border-r border-slate-900 text-red-600 font-medium">หักอื่นๆ (Deductions)</td>
                               <td className="p-3 text-right text-red-600">({(printingSalary.deductions || 0).toLocaleString(undefined, {minimumFractionDigits: 2})})</td>
                            </tr>
                            <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                               <td className="p-3 border-r border-white uppercase text-xs">ยอดสุทธิ (NET)</td>
                               <td className="p-3 text-right text-lg">฿{ (printingSalary.totalNet || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) }</td>
                            </tr>
                         </tbody>
                      </table>

                      <div className="grid grid-cols-2 gap-24 mt-32 text-slate-900">
                         <div className="text-center space-y-12">
                            <div className="h-20 flex items-end justify-center"><div className="w-48 border-b-2 border-slate-900" /></div>
                            <div>
                               <p className="font-bold text-sm">ผู้จ่ายเงิน</p>
                               <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Authorized Signature</p>
                            </div>
                         </div>
                         <div className="text-center space-y-12">
                            <div className="h-20 flex items-end justify-center"><div className="w-48 border-b-2 border-slate-900" /></div>
                            <div>
                               <p className="font-bold text-sm">ผู้รับเงิน</p>
                               <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Recipient Signature</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
                
                <div className="p-6 bg-white border-t flex justify-end gap-3 no-print">
                   <button onClick={() => setPrintingSalary(null)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all">ยกเลิก</button>
                   <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200 flex items-center gap-2 hover:bg-black active:scale-95 transition-all outline-none">
                      <Printer className="w-5 h-5 font-bold" /> พิมพ์เอกสาร
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Reports Content */}
          {period === 'Monthly' && monthlySummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
               <div 
                 onClick={() => setShowDetailsType('Revenue')}
                 className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-200 transition-all group"
               >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500">รายได้รวมเดือนนี</p>
                  <p className="text-2xl font-black text-emerald-600">฿{monthlySummary.revenue.toLocaleString()}</p>
               </div>
               <div 
                 onClick={() => setShowDetailsType('ClinicalCOGS')}
                 className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-orange-200 transition-all group"
               >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-orange-500">รายจ่าย (ยา & หัตถการ)</p>
                  <p className="text-2xl font-black text-orange-500">฿{monthlySummary.clinicalCogs.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 mt-1 italic">* ต้นทุนยาและเวชภัณฑ์ที่ใช้จริง</p>
               </div>
               <div 
                 onClick={() => setShowDetailsType('Expenses')}
                 className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-red-200 transition-all group"
               >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-red-500">รายจ่ายดำเนินงาน & อื่นๆ</p>
                  <p className="text-2xl font-black text-red-600">฿{monthlySummary.operationalExpenses.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 mt-1 italic">* รวมเงินเดือน ฿{monthlySummary.monthlySalaries.toLocaleString()} รายจ่ายคงที่ และอื่นๆ</p>
               </div>
               <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-100 ring-2 ring-emerald-600/20">
                  <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-1">กำไรสุทธิเดือนนี้</p>
                  <p className="text-2xl font-black text-white">฿{monthlySummary.netProfit.toLocaleString()}</p>
               </div>
            </div>
          )}

          {/* Details Modal */}
          {showDetailsType && (
             <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 text-slate-900">
                   <div className="p-4 border-b bg-slate-50 flex justify-between items-center font-bold">
                      <h3 className="flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                         {showDetailsType === 'Revenue' ? 'รายละเอียดรายได้' : showDetailsType === 'ClinicalCOGS' ? 'รายละเอียดต้นทุนทางคลินิก' : 'รายละเอียดรายจ่าย'} ({months[selectedMonth-1]} {selectedYear + 543})
                      </h3>
                      <button onClick={() => setShowDetailsType(null)} className="text-slate-400 hover:text-red-500"><X className="w-6 h-6" /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-6">
                      <table className="w-full text-sm">
                         <thead className="bg-slate-50 border-b">
                            <tr className="text-[10px] text-slate-500 uppercase font-bold">
                               <th className="px-4 py-3 text-left">วันที่</th>
                               <th className="px-4 py-3 text-left">รายการ</th>
                               <th className="px-4 py-3 text-right">จำนวนเงิน</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {showDetailsType === 'Revenue' ? (
                               filteredData.map(v => (
                                  <tr key={v.id}>
                                     <td className="px-4 py-3">{new Date(v.date).toLocaleDateString('th-TH')}</td>
                                     <td className="px-4 py-3">
                                       {patients.find(p => p.id === v.patientId) 
                                         ? `${patients.find(p => p.id === v.patientId)?.firstName} ${patients.find(p => p.id === v.patientId)?.lastName}` 
                                         : 'ไม่ระบุชื่อ'}
                                     </td>
                                     <td className="px-4 py-3 text-right font-bold text-emerald-600">฿{v.totalAmount.toLocaleString()}</td>
                                  </tr>
                               ))
                            ) : showDetailsType === 'ClinicalCOGS' ? (
                               filteredData.flatMap(v => {
                                  const items: any[] = [];
                                  v.prescriptions.forEach(p => {
                                     const drug = drugs.find(d => d.id === p.drugId);
                                     if (drug && (drug.costPrice || 0) > 0) items.push({ date: v.date, name: `ต้นทุนยา: ${p.name}`, amount: (drug.costPrice || 0) * p.amount });
                                  });
                                  v.procedures.forEach(p => {
                                     const proc = procedures.find(pr => pr.id === p.procedureId);
                                     if (proc && (proc.costPrice || 0) > 0) items.push({ date: v.date, name: `ต้นทุนหัตถการ: ${p.name}`, amount: proc.costPrice });
                                  });
                                  return items;
                               }).map((item, idx) => (
                                  <tr key={idx}>
                                     <td className="px-4 py-3">{new Date(item.date).toLocaleDateString('th-TH')}</td>
                                     <td className="px-4 py-3">{item.name}</td>
                                     <td className="px-4 py-3 text-right font-bold text-orange-500">฿{item.amount.toLocaleString()}</td>
                                  </tr>
                               ))
                            ) : (
                               <>
                                  {/* Salaries */}
                                  {salaryPayments.filter(sp => sp.month === selectedMonth && sp.year === selectedYear).map(sp => (
                                     <tr key={sp.id}>
                                        <td className="px-4 py-3">{new Date(sp.paymentDate).toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-3">เงินเดือน: {sp.staffName}</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">฿{sp.totalNet.toLocaleString()}</td>
                                     </tr>
                                  ))}
                                  {/* Fixed Expenses */}
                                  {fixedExpenses.map(fe => (
                                     <tr key={fe.id}>
                                        <td className="px-4 py-3">-</td>
                                        <td className="px-4 py-3">รายจ่ายคงที่: {fe.name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">฿{fe.amount.toLocaleString()}</td>
                                     </tr>
                                  ))}
                                  {/* Dynamic Expenses & Labs */}
                                  {transactions.filter(t => {
                                     const tDate = new Date(t.date);
                                     return t.type === 'Expense' && 
                                            tDate.getFullYear() === selectedYear && 
                                            (tDate.getMonth() + 1) === selectedMonth &&
                                            t.category !== 'เงินเดือน/ค่าจ้าง';
                                  }).map(t => (
                                     <tr key={t.id}>
                                        <td className="px-4 py-3">{new Date(t.date).toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-3">รายจ่ายทั่วไป: {t.category} ({t.description})</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">฿{t.amount.toLocaleString()}</td>
                                     </tr>
                                  ))}
                                  {/* Lab COGS */}
                                  {filteredData.flatMap(v => (v.labOrders || []).map(l => {
                                     const lb = labTests.find(lb => lb.id === l.labTestId);
                                     return lb && (lb.costPrice || 0) > 0 ? { date: v.date, name: `ต้นทุนแล็บ: ${l.name}`, amount: lb.costPrice } : null;
                                  })).filter(Boolean).map((l: any, idx) => (
                                     <tr key={`lab-${idx}`}>
                                        <td className="px-4 py-3">{new Date(l.date).toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-3">{l.name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">฿{l.amount.toLocaleString()}</td>
                                     </tr>
                                  ))}
                               </>
                            )}
                         </tbody>
                      </table>
                   </div>
                   <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">ยอดรวมทั้งสิ้น</span>
                      <span className="text-xl font-black text-slate-800">
                         ฿{(() => {
                            if (showDetailsType === 'Revenue') return monthlySummary.revenue;
                            if (showDetailsType === 'ClinicalCOGS') return monthlySummary.clinicalCogs;
                            return monthlySummary.operationalExpenses;
                         })().toLocaleString()}
                      </span>
                   </div>
                </div>
             </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-3 h-3" />
                  เลือกช่วงเวลา
                </h4>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['Daily', 'Monthly', 'Yearly'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p as PeriodType)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {p === 'Daily' ? 'รายวัน' : p === 'Monthly' ? 'รายเดือน' : 'รายปี'}
                    </button>
                  ))}
                </div>
                {period === 'Daily' && (
                  <div className="flex items-center gap-2 bg-slate-50 border p-2 rounded-lg">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm outline-none bg-transparent w-full" />
                  </div>
                )}
                {period === 'Monthly' && (
                  <div className="grid grid-cols-2 gap-2">
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="text-sm p-2 bg-slate-50 border rounded-lg">
                      {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="text-sm p-2 bg-slate-50 border rounded-lg">
                      {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
                    </select>
                  </div>
                )}
                {period === 'Yearly' && (
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full text-sm p-2 bg-slate-50 border rounded-lg">
                    {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
                  </select>
                )}
              </div>

               <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3 h-3" />
                  ตัวเลือกคนไข้
                </h4>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['Clinic', 'Patient'].map((t) => (
                    <button
                      key={t}
                      onClick={() => { setReportType(t as ReportType); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${reportType === t ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {t === 'Clinic' ? 'ทั้งหมด' : 'รายคนไข้'}
                    </button>
                  ))}
                </div>
                {reportType === 'Patient' ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อ/HN..." 
                      className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    {patientSearch && !selectedPatientId && (
                      <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto text-slate-900">
                        {patients.filter(p => `${p.firstName} ${p.lastName} ${p.hn}`.toLowerCase().includes(patientSearch.toLowerCase())).map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedPatientId(p.id); setPatientSearch(`${p.firstName} ${p.lastName}`); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                          >
                            {p.firstName} {p.lastName} (HN: {p.hn})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                    <p className="text-[10px] text-slate-400 font-medium italic">แสดงข้อมูลคนไข้ทุกคนตามช่วงเวลา</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-3 h-3" />
                  ข้อมูลที่แสดงในรายงาน
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableFields.map(field => (
                    <button
                      key={field.id}
                      onClick={() => toggleField(field.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${selectedFields.includes(field.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                    >
                      {selectedFields.includes(field.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <field.icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{field.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Table className="w-5 h-5 text-emerald-600" />
                ตารางรายงาน ({filteredData.length} รายการ)
              </h3>
              <button 
                onClick={() => {
                  const data = generateReportData();
                  exportToExcel(data, `Clinic_Report_${new Date().toISOString().split('T')[0]}`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {selectedFields.map(fid => (
                      <th key={fid} className="text-left px-6 py-4 font-bold text-slate-600 border-b">
                        {availableFields.find(f => f.id === fid)?.label}
                      </th>
                    ))}
                    <th className="px-6 py-4 font-bold text-slate-600 text-right border-b">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.length > 0 ? filteredData.map(v => {
                    const patient = patients.find(p => p.id === v.patientId);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                        {selectedFields.includes('date') && (
                          <td className="px-6 py-4 text-slate-500">{new Date(v.date).toLocaleDateString('th-TH')}</td>
                        )}
                        {selectedFields.includes('patientName') && (
                          <td className="px-6 py-4 font-medium text-slate-800">{patient ? `${patient.firstName} ${patient.lastName}` : 'ไม่ระบุ'}</td>
                        )}
                        {selectedFields.includes('medications') && (
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate text-slate-900">
                            {v.prescriptions.map(p => p.name).join(', ') || '-'}
                          </td>
                        )}
                        {selectedFields.includes('procedures') && (
                          <td className="px-6 py-4 text-slate-600 text-slate-900">
                            {v.procedures.map(p => (
                              <div key={p.id} className="flex flex-col">
                                <span>{p.name}</span>
                                {p.discount > 0 && <span className="text-[10px] text-orange-500 font-bold">ลด ฿{p.discount.toLocaleString()}</span>}
                              </div>
                            )) || '-'}
                          </td>
                        )}
                        {selectedFields.includes('labTests') && (
                          <td className="px-6 py-4 text-slate-600 text-slate-900">{v.labOrders.map(l => l.name).join(', ') || '-'}</td>
                        )}
                        {selectedFields.includes('cost') && (
                          <td className="px-6 py-4 text-slate-600 text-slate-900">
                            ฿{(
                              v.prescriptions.reduce((sum, p) => sum + (drugs.find(d => d.id === p.drugId)?.costPrice || 0) * p.amount, 0) +
                              (v.procedures || []).reduce((sum, p) => sum + (procedures.find(pr => pr.id === p.procedureId)?.costPrice || 0), 0) +
                              (v.labOrders || []).reduce((sum, l) => sum + (labTests.find(lb => lb.id === l.labTestId)?.costPrice || 0), 0)
                            ).toLocaleString()}
                          </td>
                        )}
                        {selectedFields.includes('revenue') && (
                          <td className="px-6 py-4 font-bold text-emerald-600">฿{v.totalAmount.toLocaleString()}</td>
                        )}
                        {selectedFields.includes('profit') && (
                          <td className="px-6 py-4 font-bold text-blue-600">
                            {(() => {
                              let cost = 0;
                              v.prescriptions.forEach(p => {
                                const drug = drugs.find(d => d.id === p.drugId);
                                if (drug) cost += (drug.costPrice || 0) * p.amount;
                              });
                              v.procedures.forEach(p => {
                                const procDef = procedures.find(proc => proc.id === p.procedureId);
                                if (procDef) cost += (procDef.costPrice || 0);
                              });
                              v.labOrders?.forEach(l => {
                                const labDef = labTests.find(lab => lab.id === l.labTestId);
                                if (labDef) cost += (labDef.costPrice || 0);
                              });
                              return `฿${(v.totalAmount - cost).toLocaleString()}`;
                            })()}
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleEditVisit(v)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={selectedFields.length + 1} className="px-6 py-12 text-center text-slate-400 italic">ไม่พบข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
