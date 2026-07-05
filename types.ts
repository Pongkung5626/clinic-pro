
export interface Patient {
  id: string;
  hn: string;
  firstName: string;
  lastName: string;
  idCard: string;
  birthDate: string;
  phone: string;
  gender: 'M' | 'F' | 'Other';
  allergicDrugs: string[];
  address: string;
  chronicDiseases: string[];
}

export interface VitalSigns {
  weight: number;
  height: number;
  temperature: number;
  bpSystolic: number;
  bpDiastolic: number;
  pulse: number;
  rr: number;
  spo2: number;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  queueNumber: number; // Daily running number
  status: 'Waiting' | 'Triage' | 'Examination' | 'Pharmacy' | 'Billing' | 'Completed' | 'Cancelled';
  chiefComplaint: string;
  presentIllness?: string;
  vitalSigns?: VitalSigns;
  diagnosis?: string;
  diagnosisThai?: string;
  doctorNotes?: string;
  doctorOpinion?: string;
  prescriptions: PrescriptionItem[];
  procedures: ProcedureItem[];
  labOrders: LabOrderItem[];
  totalAmount: number;
  paymentStatus: 'Pending' | 'Paid';
  paymentMethod?: 'Cash' | 'Transfer' | 'CreditCard';
  printedDocs?: PrintedDoc[];
  appliedCheckupId?: string;
  sickLeaveDays?: number;
  referralTarget?: string;
  referralReason?: string;
  doctorSignature?: string;
}

export interface PrintedDoc {
  id: string;
  type: 'MedicalCertificate' | 'OPDCard' | 'Referral' | 'Triage' | 'Appointment' | 'Receipt' | 'LabRequest';
  timestamp: string;
  printedBy: string;
}

export interface PrescriptionItem {
  id: string;
  drugId: string;
  name: string;
  amount: number;
  unit: string;
  pricePerUnit: number;
  instruction: string;
  purpose?: string;
  expiryDate?: string;
  instructionAmount?: string;
  instructionUnit?: string;
  instructionRoute?: string;
  instructionTimes?: string[];
  instructionNote?: string;
  precautions?: string;
}

export interface ProcedureItem {
  id: string;
  procedureId: string;
  name: string;
  price: number;
  discount?: number;
}

export interface LabTest {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  category: string;
  normalRange?: string;
  unit?: string;
}

export interface LabSubTestResult {
  id: string;
  name: string;
  result: string;
  unit: string;
  normalRange: string;
  flag: string;
  method: string;
}

export interface LabOrderItem {
  id: string;
  labTestId: string;
  name: string;
  price: number;
  result?: string;
  resultImages?: string[]; // URLs of uploaded lab result images
  resultNote?: string; // More detailed text/markdown result
  status: 'Pending' | 'Completed';
  subTests?: LabSubTestResult[];
}

export interface CheckupProgram {
  id: string;
  name: string;
  description: string;
  minAge: number;
  maxAge: number;
  gender?: 'M' | 'F' | 'Other';
  labTestIds: string[];
  procedureIds: string[];
  totalPrice: number;
  totalCost?: number;
}

export interface Drug {
  id: string;
  name: string;
  tradeName?: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice?: number;
  unit: string;
  instruction: string;
  barcode?: string;
  purpose?: string;
  instructionAmount?: string;
  instructionUnit?: string;
  instructionRoute?: string;
  instructionTimes?: string[];
  instructionNote?: string;
  precautions?: string;
  mfgDate?: string;
  expiryDate?: string;
}

export interface Supply {
  id: string;
  name: string;
  tradeName?: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice?: number;
  unit: string;
  barcode?: string;
  category?: string;
  mfgDate?: string;
  expiryDate?: string;
}

export interface Procedure {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  description: string;
  paymentMethod?: 'Cash' | 'Transfer' | 'CreditCard';
  visitId?: string;
}

export interface DailyClose {
  id: string;
  date: string; // YYYY-MM-DD
  systemCash: number;
  systemTransfer: number;
  systemCreditCard: number;
  actualCash: number;
  actualTransfer: number;
  actualCreditCard: number;
  difference: number;
  closedBy: string;
  closedAt: string; // ISO Timestamp
  note?: string;
  status: 'Closed';
}

export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  logo?: string;
  smartCardAgentUrl?: string;
}

export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Doctor' | 'Nurse' | 'Staff';
  fullName: string;
  password?: string;
  licenseNumber?: string;
}

export interface RequisitionItem {
  id: string;
  itemId: string;
  itemType: 'Drug' | 'Supply';
  name: string;
  amount: number;
  unit: string;
  costPrice: number;
  totalCost: number;
}

export interface Requisition {
  id: string;
  date: string;
  requesterId: string;
  requesterName: string;
  items: RequisitionItem[];
  totalCost: number;
  status: 'Completed' | 'Cancelled';
  note?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  purpose: string;
  createdAt: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
}

export interface Staff {
  id: string;
  userId?: string; // Link to clinic user
  fullName: string;
  idCard: string;
  address: string;
  position: string;
  baseSalary: number;
  bankAccount?: string;
  taxId?: string;
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  month: number;
  year: number;
  amount: number;
  withholdingTax: number;
  bonus: number;
  deductions: number;
  totalNet: number;
  paymentDate: string;
  paymentMethod: 'Transfer' | 'Cash';
  status: 'Paid';
  docNumber: string; // Document number for tax purposes
  transactionId?: string; // Linked accounting transaction
}

export interface Attendance {
  id: string;
  userId: string;
  staffName: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'Punctual' | 'Late' | 'Early Leave' | 'Absent';
  notes?: string;
}

export interface StockLog {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  itemType: 'Drug' | 'Supply';
  changeAmount: number;
  previousStock: number;
  newStock: number;
  type: 'addition' | 'reduction' | 'requisition' | 'pharmacy_dispense' | 'direct_sale' | 'delete_item' | 'edit_item';
  note: string;
  user: string;
}

