
import React, { useState, useEffect } from 'react';
/* Added AlertCircle to lucide-react imports */
import { Search, UserPlus, Save, Trash2, Calendar, CreditCard, Phone, User, Edit3, X, MapPin, Activity, AlertCircle, Hash, History, Clock, FileText, FlaskConical } from 'lucide-react';
import { Patient, Visit, ClinicInfo } from '../types';
import { ThaiIdAgent } from '../services/thaiIdAgent';

interface PatientRegistrationProps {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  deleteVisit: (id: string) => void;
  deletePatient: (id: string) => void;
  currentUser: any;
  clinicInfo: ClinicInfo;
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ patients, setPatients, visits, setVisits, deleteVisit, deletePatient, currentUser, clinicInfo }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formPatient, setFormPatient] = useState<Partial<Patient>>({
    firstName: '', lastName: '', idCard: '', birthDate: '', phone: '', gender: 'M', allergicDrugs: [], address: '', chronicDiseases: []
  });
  const [selectedHistoryPatient, setSelectedHistoryPatient] = useState<Patient | null>(null);
  const [viewingLab, setViewingLab] = useState<any | null>(null);
  const [backdateVisitPatient, setBackdateVisitPatient] = useState<string | null>(null);
  const [customVisitDate, setCustomVisitDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived History
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const patientHistory = selectedHistoryPatient ? visits.filter(v => 
    v.patientId === selectedHistoryPatient.id && 
    (v.status === 'Completed' || v.status === 'Pharmacy' || v.status === 'Billing') &&
    new Date(v.date) >= fiveYearsAgo
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  const openHistory = (p: Patient) => {
    setSelectedHistoryPatient(p);
  };

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.hn.includes(searchTerm) ||
    p.idCard.includes(searchTerm)
  ).sort((a, b) => a.hn.localeCompare(b.hn, undefined, { numeric: true }));

  const handleOpenAdd = () => {
    setEditingPatientId(null);
    setFormPatient({ firstName: '', lastName: '', idCard: '', birthDate: '', phone: '', gender: 'M', allergicDrugs: [], address: '', chronicDiseases: [] });
    setIsAdding(true);
  };

  const [isReadingUsb, setIsReadingUsb] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const handleReadIDCard = async () => {
    const reader = new ThaiIdAgent();
    setIsReadingUsb(true);
    setReadError(null);
    try {
      const data = await reader.readThaiId(clinicInfo.smartCardAgentUrl || '');
      setFormPatient(prev => ({ ...prev, ...data }));
      alert('อ่านข้อมูลจากบัตรประชาชนสำเร็จ');
    } catch (e: any) {
      console.error('ID Card Read Error:', e);
      
      // Check for Mixed Content or Connection issues
      if (e.code === 'MIXED_CONTENT' || (window.location.protocol === 'https:' && (clinicInfo.smartCardAgentUrl || '').startsWith('http:'))) {
        setReadError('mixed-content');
      } else if (e.message?.includes('Failed to fetch') || e.name === 'TypeError') {
        setReadError('connection-failed');
      } else {
        alert(e.message || 'ไม่สามารถอ่านข้อมูลจากบัตรได้');
      }
    } finally {
      setIsReadingUsb(false);
    }
  };

  const handleOpenEdit = (p: Patient) => {
    setEditingPatientId(p.id);
    setFormPatient({
      ...p,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      idCard: p.idCard || '',
      birthDate: p.birthDate || '',
      phone: p.phone || '',
      gender: p.gender || 'M',
      address: p.address || '',
      chronicDiseases: p.chronicDiseases || [],
      allergicDrugs: p.allergicDrugs || []
    });
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!formPatient.firstName || !formPatient.lastName) {
      alert('กรุณากรอกชื่อและนามสกุล');
      return;
    }

    if (editingPatientId) {
      setPatients(prev => prev.map(p => p.id === editingPatientId ? { ...p, ...formPatient } as Patient : p));
      alert('แก้ไขข้อมูลผู้ป่วยสำเร็จ');
    } else {
      setPatients(prev => {
        // Find the highest existing HN to prevent collisions
        const lastHnNumber = prev
          .map(p => {
            const match = p.hn.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          })
          .sort((a, b) => b - a)[0] || 0;
        
        const nextHn = `HN${(lastHnNumber + 1).toString().padStart(6, '0')}`;
        
        const patient: Patient = {
          ...formPatient as Patient,
          id: Math.random().toString(36).substr(2, 9),
          hn: nextHn,
          allergicDrugs: formPatient.allergicDrugs || [],
          chronicDiseases: formPatient.chronicDiseases || []
        };
        return [...prev, patient];
      });
      alert('ลงทะเบียนผู้ป่วยเรียบร้อยแล้ว');
    }

    setIsAdding(false);
    setEditingPatientId(null);
  };

  const startVisit = (patientId: string, customDate?: string) => {
    const targetDate = customDate ? new Date(customDate) : new Date();
    const todayStr = targetDate.toDateString();
    const todayVisit = visits.find(v => v.patientId === patientId && new Date(v.date).toDateString() === todayStr && v.status !== 'Completed');
    
    if (todayVisit) {
      alert('ผู้ป่วยรายนี้มี Visit ของวันที่ระบุที่ยังไม่เสร็จสิ้นอยู่แล้ว (คิวที่ #' + todayVisit.queueNumber + ')');
      return;
    }

    // Generate daily running number for that day
    const todayVisits = visits.filter(v => new Date(v.date).toDateString() === todayStr);
    const nextQueueNumber = todayVisits.length > 0 ? Math.max(...todayVisits.map(v => v.queueNumber)) + 1 : 1;

    const newVisit: Visit = {
      id: Math.random().toString(36).substr(2, 9),
      patientId,
      date: targetDate.toISOString(),
      queueNumber: nextQueueNumber,
      status: 'Waiting',
      chiefComplaint: '',
      prescriptions: [],
      procedures: [],
      labOrders: [],
      totalAmount: 0,
      paymentStatus: 'Pending'
    };
    setVisits(prev => [...prev, newVisit]);
    alert(`ลงทะเบียนผู้ป่วยสำหรับวันที่ ${targetDate.toLocaleDateString('th-TH')} เรียบร้อยแล้ว`);
    setBackdateVisitPatient(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ระบบทะเบียนผู้ป่วย</h1>
          <p className="text-slate-500">ค้นหา แก้ไข และลงทะเบียนผู้ป่วยใหม่</p>
        </div>
        {!isAdding && (
          <button 
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-md shadow-emerald-100"
          >
            <UserPlus className="w-5 h-5" />
            ลงทะเบียนใหม่
          </button>
        )}
      </header>

      {isAdding ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              {editingPatientId ? <Edit3 className="w-5 h-5 text-blue-500" /> : <UserPlus className="w-5 h-5 text-emerald-500" />}
              {editingPatientId ? 'แก้ไขข้อมูลผู้ป่วย' : 'ลงทะเบียนผู้ป่วยใหม่'}
            </h3>
            <div className="flex gap-2 items-center">
              {!editingPatientId && (
                <button 
                  onClick={handleReadIDCard}
                  disabled={isReadingUsb}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition-all ${
                    isReadingUsb 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                  }`}
                  title="อ่านบัตรประชาชนผ่านโปรแกรม Agent (เช่น FAST ID)"
                >
                  <CreditCard className={`w-4 h-4 ${isReadingUsb ? 'animate-spin' : ''}`} />
                  {isReadingUsb ? 'กำลังอ่าน...' : 'อ่านบัตรประชาชน'}
                </button>
              )}
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {readError && (
            <div className={`p-5 rounded-xl border-2 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg ${
              readError === 'mixed-content' ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'
            }`}>
              <div className={`p-3 rounded-full shrink-0 h-fit ${readError === 'mixed-content' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-start">
                  <p className={`text-base font-bold ${readError === 'mixed-content' ? 'text-amber-900' : 'text-red-900'}`}>
                    {readError === 'mixed-content' ? 'ตรวจพบปัญหาความปลอดภัยของเบราว์เซอร์ (Mixed Content)' : 'ไม่สามารถเชื่อมต่อกับโปรแกรมอ่านบัตรได้'}
                  </p>
                  <button onClick={() => setReadError(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {readError === 'mixed-content' ? (
                  <div className="text-sm text-amber-800 space-y-3 leading-relaxed">
                    <p>เนื่องจากเว็บไซต์นี้ใช้งานผ่าน <strong>HTTPS</strong> แต่โปรแกรม Agent ในเครื่องคุณเป็น <strong>HTTP</strong> เบราว์เซอร์จึงบล็อกการเชื่อมต่อเพื่อความปลอดภัย</p>
                    <div className="bg-white/50 p-3 rounded-lg border border-amber-200">
                      <p className="font-bold mb-2">วิธีแก้ไข (สำหรับ Chrome/Edge):</p>
                      <ol className="list-decimal ml-5 space-y-2">
                        <li>คลิกที่ไอคอน <strong>แม่กุญแจ</strong> (หรือ "ดูข้อมูลไซต์") ที่ด้านซ้ายของแถบที่อยู่ด้านบน</li>
                        <li>เลือกเมนู <strong>การตั้งค่าไซต์ (Site settings)</strong></li>
                        <li>มองหาหัวข้อ <strong>เนื้อหาที่ไม่ปลอดภัย (Insecure content)</strong></li>
                        <li>เปลี่ยนค่าจาก "บล็อก" เป็น <strong>"อนุญาต" (Allow)</strong></li>
                        <li><strong>รีเฟรชหน้าเว็บนี้</strong> แล้วลองกดอ่านบัตรใหม่อีกครั้ง</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-800 space-y-2">
                    <p>โปรดตรวจสอบดังนี้:</p>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>โปรแกรม Agent (เช่น FAST ID หรือ DOPA Agent) กำลังทำงานอยู่</li>
                      <li>เสียบเครื่องอ่านบัตรและบัตรประชาชนเข้ากับเครื่องแล้ว</li>
                      <li>URL ของ Agent ในหน้า <strong className="underline">ตั้งค่า</strong> ถูกต้อง (ปัจจุบันคือ: {clinicInfo.smartCardAgentUrl || 'ยังไม่ได้ตั้งค่า'})</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">ชื่อ</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.firstName}
                onChange={e => setFormPatient({...formPatient, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">นามสกุล</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.lastName}
                onChange={e => setFormPatient({...formPatient, lastName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">เลขบัตรประชาชน</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.idCard}
                onChange={e => setFormPatient({...formPatient, idCard: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">วันเกิด</label>
              <input 
                type="date" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.birthDate}
                onChange={e => setFormPatient({...formPatient, birthDate: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">เบอร์โทรศัพท์</label>
              <input 
                type="tel" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.phone}
                onChange={e => setFormPatient({...formPatient, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">เพศ</label>
              <select 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.gender}
                onChange={e => setFormPatient({...formPatient, gender: e.target.value as any})}
              >
                <option value="M">ชาย</option>
                <option value="F">หญิง</option>
                <option value="Other">อื่นๆ</option>
              </select>
            </div>

            <div className="space-y-1 lg:col-span-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" /> ที่อยู่ตามทะเบียนบ้าน/ปัจจุบัน
              </label>
              <textarea 
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.address}
                onChange={e => setFormPatient({...formPatient, address: e.target.value})}
              />
            </div>

            <div className="space-y-1 lg:col-span-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                <Activity className="w-4 h-4 text-red-400" /> โรคประจำตัว (คั่นด้วยคอมม่า)
              </label>
              <input 
                type="text" 
                placeholder="เช่น ความดันโลหิตสูง, เบาหวาน..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formPatient.chronicDiseases?.join(', ')}
                onChange={e => setFormPatient({...formPatient, chronicDiseases: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
              />
            </div>

            <div className="space-y-1 lg:col-span-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" /> ประวัติแพ้ยา (คั่นด้วยคอมม่า)
              </label>
              <input 
                type="text" 
                placeholder="เช่น พาราเซตามอล, เพนนิซิลลิน..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-red-50/30"
                value={formPatient.allergicDrugs?.join(', ')}
                onChange={e => setFormPatient({...formPatient, allergicDrugs: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setIsAdding(false)} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors">ยกเลิก</button>
            <button onClick={handleSave} className="px-10 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]">
              <Save className="w-4 h-4" />
              {editingPatientId ? 'อัปเดตข้อมูล' : 'ลงทะเบียนและบันทึก'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="ค้นหาด้วยชื่อ, นามสกุล, HN, หรือเลขบัตรประชาชน..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-bold text-slate-600">HN</th>
                  <th className="text-left px-6 py-3 text-sm font-bold text-slate-600">ชื่อ-นามสกุล</th>
                  <th className="text-left px-6 py-3 text-sm font-bold text-slate-600">โรคประจำตัว</th>
                  <th className="text-left px-6 py-3 text-sm font-bold text-slate-600">แพ้ยา</th>
                  <th className="text-center px-6 py-3 text-sm font-bold text-slate-600">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-emerald-700">{p.hn}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{p.idCard}</p>
                      {(() => {
                        const historyVitals = visits
                          .filter(v => v.patientId === p.id && v.vitalSigns && ((v.vitalSigns.weight || 0) > 0 || (v.vitalSigns.height || 0) > 0))
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        if (historyVitals.length > 0) {
                          return (
                            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ประวัติ นน./สส.:</span>
                              {historyVitals.slice(0, 3).map((v, idx) => (
                                <span key={v.id} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-medium whitespace-nowrap">
                                  {v.vitalSigns?.weight}kg / {v.vitalSigns?.height}cm
                                  <span className="text-[8px] text-slate-400 ml-1">({new Date(v.date).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})})</span>
                                </span>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600 truncate max-w-[150px]">
                        {(p.chronicDiseases || []).length > 0 ? p.chronicDiseases.join(', ') : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {(p.allergicDrugs || []).length > 0 ? (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                          {p.allergicDrugs.join(', ')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">ไม่มี</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <div className="flex justify-center gap-1">
                        <button 
                          onClick={() => openHistory(p)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors border border-slate-200"
                          title="ดูประวัติย้อนหลัง"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <div className="relative group/visit">
                          <button 
                            onClick={() => startVisit(p.id)}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            สร้าง Visit ใหม่
                          </button>
                          <button 
                            onClick={() => {
                              setBackdateVisitPatient(p.id);
                              setCustomVisitDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-1 py-1.5 rounded-lg text-[8px] font-bold border border-emerald-100 ml-1"
                            title="สร้าง Visit ย้อนหลัง"
                          >
                            <Calendar className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="แก้ไขข้อมูลผู้ป่วย"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {currentUser?.role === 'Admin' && (
                          <button 
                            onClick={() => deletePatient(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="ลบข้อมูลผู้ป่วย"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">ไม่พบข้อมูลผู้ป่วยในฐานข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Backdate Visit Modal */}
      {backdateVisitPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                สร้าง Visit ย้อนหลัง
              </h3>
              <button onClick={() => setBackdateVisitPatient(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                 <label className="text-xs font-bold text-slate-500 block mb-1">เลือกวันที่เข้ารับการรักษา</label>
                 <input 
                   type="date"
                   value={customVisitDate}
                   onChange={e => setCustomVisitDate(e.target.value)}
                   className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500/10 outline-none text-slate-900"
                 />
               </div>
               <p className="text-[10px] text-slate-400 italic">
                 * ระบบจะสร้างคิวใหม่สำหรับวันที่ระบุ และคุณสามารถบันทึกข้อมูลการรักษาและรับชำระเงินย้อนหลังได้
               </p>
            </div>
            <div className="p-6 border-t bg-slate-50 flex gap-3">
              <button onClick={() => setBackdateVisitPatient(null)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-white rounded-xl transition-all">ยกเลิก</button>
              <button 
                onClick={() => startVisit(backdateVisitPatient, customVisitDate)} 
                className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
              >
                สร้าง Visit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {selectedHistoryPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-6 h-6 text-emerald-600" />
                  ประวัติการรักษา: {selectedHistoryPatient.firstName} {selectedHistoryPatient.lastName}
                </h3>
                <p className="text-sm text-slate-500">HN: {selectedHistoryPatient.hn} | ข้อมูลย้อนหลัง 5 ปี</p>
              </div>
              <button onClick={() => setSelectedHistoryPatient(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {patientHistory.length > 0 ? patientHistory.map((h, i) => (
                <div key={h.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm relative hover:border-emerald-200 transition-colors">
                  <div className="absolute top-4 right-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Record #{patientHistory.length - i}</div>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-700">{new Date(h.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(h.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono ml-auto flex items-center gap-2">
                      Visit ID: {h.id}
                      {currentUser?.role === 'Admin' && (
                        <button 
                          onClick={() => {
                            deleteVisit(h.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="ลบ Visit นี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis (DX)</p>
                        <p className="text-sm font-bold text-slate-800">{h.diagnosis || 'ไม่ระบุ'}</p>
                        {h.diagnosisThai && <p className="text-xs text-slate-500 font-bold mt-1">วินิจฉัย: {h.diagnosisThai}</p>}
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vital Signs</p>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div className="bg-slate-50 p-2 rounded text-center">
                            <p className="text-[9px] text-slate-400">BP</p>
                            <p className="text-xs font-bold">{h.vitalSigns?.bpSystolic}/{h.vitalSigns?.bpDiastolic}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded text-center">
                            <p className="text-[9px] text-slate-400">Temp</p>
                            <p className="text-xs font-bold">{h.vitalSigns?.temperature}°C</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded text-center">
                            <p className="text-[9px] text-slate-400">Pulse</p>
                            <p className="text-xs font-bold">{h.vitalSigns?.pulse}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 px-1 border-t border-slate-50 pt-1.5">
                          <p className="text-[9px] text-slate-400">BW: <span className="font-bold text-slate-600">{h.vitalSigns?.weight || '-'}</span> kg</p>
                          <p className="text-[9px] text-slate-400">HT: <span className="font-bold text-slate-600">{h.vitalSigns?.height || '-'}</span> cm</p>
                          <p className="text-[9px] text-slate-400">SpO2: <span className="font-bold text-slate-600">{h.vitalSigns?.spo2 || '-'}</span> %</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chief Complaint (CC)</p>
                        <p className="text-[11px] text-slate-800 font-bold mb-2">{h.chiefComplaint || '-'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Present Illness (PI)</p>
                        <p className="text-[11px] text-slate-700 whitespace-pre-wrap mb-2">{h.presentIllness || '-'}</p>
                        <div className="border-t border-slate-100 pt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor's Notes & Opinion</p>
                          <p className="text-xs font-bold text-emerald-800 mb-1">{h.doctorOpinion || '-'}</p>
                          <p className="text-[11px] text-slate-600 whitespace-pre-wrap italic">{h.doctorNotes || '-'}</p>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medicine, Procedures & Labs</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(h.prescriptions || []).map(p => <span key={p.id} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 font-medium">{p.name} x{p.amount}</span>)}
                          {(h.procedures || []).map(p => <span key={p.id} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-100 font-medium">{p.name}</span>)}
                          {(h.labOrders || []).map(l => (
                            <div key={l.id} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 font-medium flex flex-col gap-0.5 group">
                              <span>{l.name}</span>
                              {l.result && (
                                <button 
                                  onClick={() => setViewingLab(l)}
                                  className="text-left text-[9px] text-slate-500 italic hover:text-emerald-700 flex items-center gap-1"
                                >
                                  ผล: {l.result} <FileText className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {!(h.prescriptions || []).length && !(h.procedures || []).length && !(h.labOrders || []).length && <span className="text-xs text-slate-400 italic">ไม่มีข้อมูลการรักษา</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <History className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold text-lg text-slate-500">ไม่พบประวัติการรักษาย้อนหลัง</p>
                  <p className="text-sm">ผู้ป่วยรายนี้ยังไม่มีประวัติการรักษาที่เสร็จสมบูรณ์ในระบบ</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedHistoryPatient(null)} className="px-8 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

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
                    {viewingLab.resultImages.map((img: string, idx: number) => (
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

export default PatientRegistration;
