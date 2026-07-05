
import React, { useState } from 'react';
/* Added X to lucide-react imports */
import { Settings, Home, Shield, Trash2, Plus, Save, User as UserIcon, Lock, Camera, Edit3, X, FlaskConical, ClipboardList, CreditCard, AlertCircle } from 'lucide-react';
import { ClinicInfo, Procedure, User, LabTest, CheckupProgram } from '../types';

interface SettingsProps {
  clinicInfo: ClinicInfo;
  setClinicInfo: React.Dispatch<React.SetStateAction<ClinicInfo>>;
  procedures: Procedure[];
  setProcedures: React.Dispatch<React.SetStateAction<Procedure[]>>;
  labTests: LabTest[];
  setLabTests: React.Dispatch<React.SetStateAction<LabTest[]>>;
  checkupPrograms: CheckupProgram[];
  setCheckupPrograms: React.Dispatch<React.SetStateAction<CheckupProgram[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const AdminSettings: React.FC<SettingsProps> = ({ clinicInfo, setClinicInfo, procedures, setProcedures, labTests, setLabTests, checkupPrograms, setCheckupPrograms, users, setUsers }) => {
  const [info, setInfo] = useState(clinicInfo);
  const [newProc, setNewProc] = useState({ name: '', price: 0, costPrice: 0 });
  const [editingProcId, setEditingProcId] = useState<string | null>(null);
  
  const [newLab, setNewLab] = useState<Partial<LabTest>>({ name: '', price: 0, costPrice: 0, category: 'Chemistry', normalRange: '', unit: '' });
  const [editingLabId, setEditingLabId] = useState<string | null>(null);

  const [newCheckup, setNewCheckup] = useState<Partial<CheckupProgram>>({ name: '', description: '', minAge: 0, maxAge: 100, labTestIds: [], procedureIds: [], totalPrice: 0, totalCost: 0 });
  const [editingCheckupId, setEditingCheckupId] = useState<string | null>(null);
  const [isAddingCheckup, setIsAddingCheckup] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', fullName: '', role: 'Staff', password: '', licenseNumber: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInfo({ ...info, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOrUpdateProc = () => {
    if (!newProc.name) return;
    if (editingProcId) {
      setProcedures(procedures.map(p => p.id === editingProcId ? { ...p, ...newProc } : p));
      setEditingProcId(null);
    } else {
      setProcedures([...procedures, { ...newProc, id: Math.random().toString(36).substr(2,9) }]);
    }
    setNewProc({ name: '', price: 0, costPrice: 0 });
  };

  const startEditProc = (p: Procedure) => {
    setEditingProcId(p.id);
    setNewProc({ name: p.name, price: p.price, costPrice: p.costPrice || 0 });
  };

  const removeProc = (id: string) => setProcedures(procedures.filter(p => p.id !== id));

  const handleAddOrUpdateLab = () => {
    if (!newLab.name) return;
    if (editingLabId) {
      setLabTests(labTests.map(l => l.id === editingLabId ? { ...l, ...newLab as LabTest } : l));
      setEditingLabId(null);
    } else {
      setLabTests([...labTests, { ...newLab as LabTest, id: Math.random().toString(36).substr(2, 9) }]);
    }
    setNewLab({ name: '', price: 0, costPrice: 0, category: 'Chemistry', normalRange: '', unit: '' });
  };

  const startEditLab = (l: LabTest) => {
    setEditingLabId(l.id);
    setNewLab({
      ...l,
      name: l.name || '',
      price: l.price || 0,
      costPrice: l.costPrice || 0,
      category: l.category || 'Chemistry',
      normalRange: l.normalRange || '',
      unit: l.unit || ''
    });
  };

  const removeLab = (id: string) => setLabTests(labTests.filter(l => l.id !== id));

  const handleAddOrUpdateCheckup = () => {
    if (!newCheckup.name) return;
    if (editingCheckupId) {
      setCheckupPrograms(checkupPrograms.map(c => c.id === editingCheckupId ? { ...c, ...newCheckup as CheckupProgram } : c));
      setEditingCheckupId(null);
    } else {
      setCheckupPrograms([...checkupPrograms, { ...newCheckup as CheckupProgram, id: Math.random().toString(36).substr(2, 9) }]);
    }
    setNewCheckup({ name: '', description: '', minAge: 0, maxAge: 100, labTestIds: [], procedureIds: [], totalPrice: 0, totalCost: 0 });
    setIsAddingCheckup(false);
  };

  const startEditCheckup = (c: CheckupProgram) => {
    setEditingCheckupId(c.id);
    setNewCheckup({
      ...c,
      name: c.name || '',
      description: c.description || '',
      minAge: c.minAge || 0,
      maxAge: c.maxAge || 100,
      labTestIds: c.labTestIds || [],
      procedureIds: c.procedureIds || [],
      totalPrice: c.totalPrice || 0,
      totalCost: c.totalCost || 0
    });
    setIsAddingCheckup(true);
  };

  const removeCheckup = (id: string) => setCheckupPrograms(checkupPrograms.filter(c => c.id !== id));

  const handleAddUser = () => {
    if (!newUser.username || !newUser.fullName || !newUser.password) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน (Username, ชื่อ-นามสกุล, รหัสผ่าน)');
      return;
    }
    
    if (newUser.role === 'Doctor' && !newUser.licenseNumber) {
      alert('กรุณากรอกเลข ว. สำหรับแพทย์');
      return;
    }

    if (editingUserId) {
      setUsers(users.map(u => u.id === editingUserId ? { ...u, ...newUser as User } : u));
      setEditingUserId(null);
    } else {
      const user: User = {
        ...newUser as User,
        id: Math.random().toString(36).substr(2, 9)
      };
      setUsers([...users, user]);
    }
    
    setNewUser({ username: '', fullName: '', role: 'Staff', password: '', licenseNumber: '' });
    setIsAddingUser(false);
  };

  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setNewUser({
      ...u,
      username: u.username || '',
      fullName: u.fullName || '',
      role: u.role || 'Staff',
      password: u.password || '',
      licenseNumber: u.licenseNumber || ''
    });
    setIsAddingUser(true);
  };

  const removeUser = (id: string) => {
    if (window.confirm('ยืนยันการลบผู้ใช้งาน?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าสถานพยาบาลและระบบ</h1>
        <p className="text-slate-500">ปรับแต่งชื่อคลินิก ข้อมูลพื้นฐาน และบัญชีผู้ใช้งาน</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Clinic Profile */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
            <Home className="w-5 h-5 text-emerald-600" />
            ข้อมูลสถานพยาบาล (Clinic Profile)
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-6">
               <div className="relative group">
                 <div className="w-24 h-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                   {info.logo ? (
                     <img src={info.logo} className="w-full h-full object-cover" />
                   ) : (
                     <Camera className="w-8 h-8 text-slate-300" />
                   )}
                 </div>
                 <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                   <Plus className="w-6 h-6 text-white" />
                   <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                 </label>
               </div>
               <div className="flex-1">
                 <p className="text-sm font-bold text-slate-700">โลโก้คลินิก</p>
                 <p className="text-xs text-slate-400">ชื่อคลินิกและโลโก้จะเปลี่ยนในทุกส่วนของระบบ</p>
               </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">ชื่อคลินิก / ชื่อสถานพยาบาล</label>
              <input type="text" className="w-full border p-2 rounded-lg font-bold text-emerald-700" value={info.name} onChange={e => setInfo({...info, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">ที่อยู่ (ตามใบอนุญาต)</label>
              <textarea rows={3} className="w-full border p-2 rounded-lg" value={info.address} onChange={e => setInfo({...info, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">เบอร์โทรศัพท์</label>
                <input type="text" className="w-full border p-2 rounded-lg" value={info.phone} onChange={e => setInfo({...info, phone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">เลขประจำตัวผู้เสียภาษี</label>
                <input type="text" className="w-full border p-2 rounded-lg" value={info.taxId} onChange={e => setInfo({...info, taxId: e.target.value})} />
              </div>
            </div>
              <div className="space-y-1 border-t pt-4">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Smart Card Agent URL (FAST ID / DOPA)
              </label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="เช่น http://localhost:8182/thaiid/read" 
                    className="flex-1 border p-2 rounded-lg text-sm font-mono" 
                    value={info.smartCardAgentUrl || ''} 
                    onChange={e => setInfo({...info, smartCardAgentUrl: e.target.value})} 
                  />
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(info.smartCardAgentUrl || '', { 
                          method: 'GET',
                          signal: AbortSignal.timeout(5000)
                        });
                        if (res.ok) alert('เชื่อมต่อสำเร็จ! ตรวจพบเครื่องอ่านบัตร');
                        else alert('เชื่อมต่อล้มเหลว: ' + res.statusText + ' (Status: ' + res.status + ')');
                      } catch (e: any) {
                        let msg = (e as Error).message;
                        if (window.location.protocol === 'https:' && (info.smartCardAgentUrl || '').startsWith('http:')) {
                          msg += '\n\nตรวจพบปัญหา Mixed Content: เบราว์เซอร์บล็อกการเชื่อมต่อ HTTP จากหน้าเว็บ HTTPS\nกรุณาตั้งค่า "Allow Insecure Content" ใน Site Settings';
                        }
                        alert('ไม่สามารถเชื่อมต่อได้: ' + msg);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-100"
                  >
                    ทดสอบการเชื่อมต่อ
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-slate-400 self-center">ตัวอย่าง URL ยอดนิยม:</span>
                  {[
                    { label: 'FAST ID (8182)', url: 'http://localhost:8182/thaiid/read' },
                    { label: 'DOPA Agent (9898)', url: 'http://127.0.0.1:9898/' },
                    { label: 'Local Agent (11112)', url: 'http://localhost:11112/idcard' }
                  ].map(preset => (
                    <button 
                      key={preset.url}
                      onClick={() => setInfo({...info, smartCardAgentUrl: preset.url})}
                      className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                <p className="text-xs font-bold text-blue-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  คู่มือการแก้ไขปัญหาการเชื่อมต่อ (Troubleshooting)
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-blue-700">1. ปัญหา Mixed Content (HTTPS vs HTTP)</p>
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                      หากใช้ Chrome/Edge และเว็บเป็น HTTPS คุณต้องอนุญาตให้เบราว์เซอร์ดึงข้อมูลจาก HTTP Agent:
                    </p>
                    <ol className="text-[10px] text-blue-600 list-decimal ml-4 space-y-1">
                      <li>คลิกไอคอน <strong>แม่กุญแจ</strong> หน้า URL</li>
                      <li>เลือก <strong>Site settings</strong></li>
                      <li>เปลี่ยน <strong>Insecure content</strong> เป็น <strong>Allow</strong></li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-blue-700">2. ตรวจสอบโปรแกรม Agent</p>
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                      ตรวจสอบว่าโปรแกรมอ่านบัตร (เช่น FAST ID หรือโปรแกรมของกรมการปกครอง) กำลังทำงานอยู่ และไฟที่เครื่องอ่านบัตรติดสว่าง
                    </p>
                    <p className="text-[10px] text-blue-600">
                      ลองเปิด URL ของ Agent ในแท็บใหม่ หากเปิดได้แต่ในโปรแกรมใช้ไม่ได้ ให้ทำตามข้อ 1
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => {setClinicInfo(info); alert('บันทึกข้อมูลและเปลี่ยนชื่อคลินิกสำเร็จ');}} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-md shadow-emerald-100">บันทึกและอัปเดตข้อมูล</button>
          </div>
        </section>

        {/* Procedures Management */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
            <Shield className="w-5 h-5 text-orange-600" />
            รายการหัตถการและค่าบริการ
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input type="text" placeholder="ชื่อหัตถการ" className="md:col-span-2 border p-2 rounded-lg text-sm" value={newProc.name} onChange={e => setNewProc({...newProc, name: e.target.value})} />
              <input type="number" placeholder="ต้นทุน" className="border p-2 rounded-lg text-sm bg-slate-50" value={newProc.costPrice} onChange={e => setNewProc({...newProc, costPrice: +e.target.value})} />
              <div className="flex gap-2">
                <input type="number" placeholder="ราคาขาย" className="flex-1 border p-2 rounded-lg text-sm font-bold text-emerald-600" value={newProc.price} onChange={e => setNewProc({...newProc, price: +e.target.value})} />
                <button 
                  onClick={handleAddOrUpdateProc} 
                  className={`${editingProcId ? 'bg-orange-600' : 'bg-emerald-600'} text-white p-2 rounded-lg shadow-sm`}
                >
                  {editingProcId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
                {editingProcId && (
                  <button onClick={() => {setEditingProcId(null); setNewProc({name: '', price: 0, costPrice: 0});}} className="bg-slate-200 p-2 rounded-lg"><X className="w-5 h-5" /></button>
                )}
              </div>
            </div>
            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
              {[...procedures].sort((a, b) => a.name.localeCompare(b.name, 'th')).map(p => (
                <div key={p.id} className="p-3 flex justify-between items-center hover:bg-slate-50 group">
                  <div>
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <div className="flex gap-3 text-xs">
                      <p className="text-slate-400">ต้นทุน: ฿{(p.costPrice || 0).toLocaleString()}</p>
                      <p className="text-emerald-600 font-bold">ราคาขาย: ฿{p.price.toLocaleString()}</p>
                      <p className={`font-bold ${p.price - (p.costPrice || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        กำไร: ฿{(p.price - (p.costPrice || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditProc(p)} className="p-1.5 text-orange-400 hover:text-orange-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => removeProc(p.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lab Management */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
            <FlaskConical className="w-5 h-5 text-amber-600" />
            จัดการรายการตรวจทางห้องปฏิบัติการ (Lab)
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input type="text" placeholder="ชื่อรายการตรวจ" className="col-span-2 border p-2 rounded-lg text-sm" value={newLab.name} onChange={e => setNewLab({...newLab, name: e.target.value})} />
              <input type="number" placeholder="ต้นทุน" className="border p-2 rounded-lg text-sm bg-slate-50" value={newLab.costPrice} onChange={e => setNewLab({...newLab, costPrice: +e.target.value})} />
              <input type="number" placeholder="ราคาขาย" className="border p-2 rounded-lg text-sm font-bold text-emerald-600" value={newLab.price} onChange={e => setNewLab({...newLab, price: +e.target.value})} />
              <input type="text" placeholder="หน่วย" className="border p-2 rounded-lg text-sm" value={newLab.unit} onChange={e => setNewLab({...newLab, unit: e.target.value})} />
              <input type="text" placeholder="ค่าปกติ (Normal Range)" className="col-span-2 border p-2 rounded-lg text-sm" value={newLab.normalRange} onChange={e => setNewLab({...newLab, normalRange: e.target.value})} />
              <div className="col-span-2 md:col-span-1 flex gap-2">
                <button 
                  onClick={handleAddOrUpdateLab} 
                  className={`flex-1 ${editingLabId ? 'bg-orange-600' : 'bg-amber-600'} text-white p-2 rounded-lg font-bold flex items-center justify-center gap-2`}
                >
                  {editingLabId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingLabId ? 'บันทึก' : 'เพิ่มรายการ'}
                </button>
                {editingLabId && (
                  <button onClick={() => {setEditingLabId(null); setNewLab({name: '', price: 0, costPrice: 0, category: 'Chemistry', normalRange: '', unit: ''});}} className="bg-slate-200 p-2 rounded-lg"><X className="w-5 h-5" /></button>
                )}
              </div>
            </div>
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {[...labTests].sort((a, b) => a.name.localeCompare(b.name, 'th')).map(l => (
                <div key={l.id} className="p-3 flex justify-between items-center hover:bg-slate-50 group">
                  <div>
                    <p className="font-bold text-slate-800">{l.name}</p>
                    <p className="text-[10px] text-slate-500">ค่าปกติ: {l.normalRange} {l.unit}</p>
                    <div className="flex gap-3 mt-0.5">
                      <p className="text-[10px] text-slate-400">ต้นทุน: ฿{(l.costPrice || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-amber-600 font-bold">ราคาขาย: ฿{l.price.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditLab(l)} className="p-1.5 text-orange-400 hover:text-orange-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => removeLab(l.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checkup Programs Management */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" /> จัดการโปรแกรมตรวจสุขภาพ
            </h3>
            {!isAddingCheckup && (
              <button 
                onClick={() => setIsAddingCheckup(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" /> สร้างโปรแกรมใหม่
              </button>
            )}
          </div>

          {isAddingCheckup && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="font-bold text-sm text-slate-700">{editingCheckupId ? 'แก้ไขโปรแกรมตรวจสุขภาพ' : 'สร้างโปรแกรมตรวจสุขภาพใหม่'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500">ชื่อโปรแกรม</label>
                  <input className="w-full border p-2 rounded-lg text-sm" value={newCheckup.name} onChange={e => setNewCheckup({...newCheckup, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">ช่วงอายุ (Min - Max)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={newCheckup.minAge} onChange={e => setNewCheckup({...newCheckup, minAge: +e.target.value})} />
                    <span>-</span>
                    <input type="number" className="w-full border p-2 rounded-lg text-sm" value={newCheckup.maxAge} onChange={e => setNewCheckup({...newCheckup, maxAge: +e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">เพศที่แนะนำ</label>
                  <select className="w-full border p-2 rounded-lg text-sm" value={newCheckup.gender || ''} onChange={e => setNewCheckup({...newCheckup, gender: e.target.value as any || null})}>
                    <option value="">ทั้งหมด / ไม่ระบุ</option>
                    <option value="M">ชาย (Male)</option>
                    <option value="F">หญิง (Female)</option>
                  </select>
                </div>

                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500">ต้นทุนรวมรายการ (Calculated Cost)</p>
                    <div className="text-lg font-bold text-slate-600">฿{(newCheckup.totalCost || 0).toLocaleString()}</div>
                    <p className="text-[10px] text-slate-400">* คณนาจากต้นทุน Lab และหัตถการในโปรแกรม</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-700">ราคาขายตั้งไว้ (Selling Price)</label>
                    <input type="number" className="w-full border border-emerald-300 p-2 rounded-lg text-lg font-bold text-emerald-600 focus:ring-emerald-500" value={newCheckup.totalPrice} onChange={e => setNewCheckup({...newCheckup, totalPrice: +e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500">กำไรส่วนต่าง (Margin)</p>
                    <div className={`text-lg font-bold ${(newCheckup.totalPrice || 0) - (newCheckup.totalCost || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ฿{((newCheckup.totalPrice || 0) - (newCheckup.totalCost || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-slate-500">คำอธิบายโปรแกรม</label>
                  <textarea rows={2} className="w-full border p-2 rounded-lg text-sm" value={newCheckup.description} onChange={e => setNewCheckup({...newCheckup, description: e.target.value})} />
                </div>
                
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex justify-between">
                    <span>เลือกรายการแล็บ (Lab Tests)</span>
                    {newCheckup.labTestIds?.length ? <span className="text-amber-600">{newCheckup.labTestIds.length} รายการ</span> : null}
                  </label>
                  <div className="border rounded-lg p-2 h-48 overflow-y-auto bg-white space-y-1">
                    {/* Display existing labs */}
                    {[...labTests].sort((a, b) => a.name.localeCompare(b.name, 'th')).map(l => (
                      <label key={l.id} className="flex items-center gap-2 text-xs hover:bg-slate-50 p-1.5 rounded cursor-pointer border-b border-slate-50 last:border-0">
                        <input 
                          type="checkbox" 
                          checked={newCheckup.labTestIds?.includes(l.id)} 
                          onChange={e => {
                            const ids = newCheckup.labTestIds || [];
                            let newIds = [];
                            if (e.target.checked) {
                              newIds = [...ids, l.id];
                            } else {
                              newIds = ids.filter(id => id !== l.id);
                            }
                            
                            // Re-calculate cost
                            const labCost = labTests.filter(t => newIds.includes(t.id)).reduce((sum, t) => sum + (t.costPrice || 0), 0);
                            const procCost = procedures.filter(t => (newCheckup.procedureIds || []).includes(t.id)).reduce((sum, t) => sum + (t.costPrice || 0), 0);
                            
                            setNewCheckup({...newCheckup, labTestIds: newIds, totalCost: labCost + procCost});
                          }}
                        />
                        <span className="flex-1">{l.name}</span>
                        <span className="text-slate-400 font-mono text-[9px]">C: ฿{l.costPrice || 0}</span>
                      </label>
                    ))}
                    
                    {/* Display missing labs that are still in the ID list */}
                    {newCheckup.labTestIds?.filter(id => !labTests.find(l => l.id === id)).map(id => (
                      <div key={id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-red-50 border border-red-100 text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        <span className="flex-1 truncate">Unknown Lab (ID: {id})</span>
                        <button 
                          onClick={() => {
                            const newIds = (newCheckup.labTestIds || []).filter(lid => lid !== id);
                            setNewCheckup({...newCheckup, labTestIds: newIds});
                          }}
                          className="p-0.5 hover:bg-red-200 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex justify-between">
                    <span>เลือกรายการหัตถการ (Procedures)</span>
                    {newCheckup.procedureIds?.length ? <span className="text-orange-600">{newCheckup.procedureIds.length} รายการ</span> : null}
                  </label>
                  <div className="border rounded-lg p-2 h-48 overflow-y-auto bg-white space-y-1">
                    {/* Display existing procedures */}
                    {[...procedures].sort((a, b) => a.name.localeCompare(b.name, 'th')).map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-xs hover:bg-slate-50 p-1.5 rounded cursor-pointer border-b border-slate-50 last:border-0">
                        <input 
                          type="checkbox" 
                          checked={newCheckup.procedureIds?.includes(p.id)} 
                          onChange={e => {
                            const ids = newCheckup.procedureIds || [];
                            let newIds = [];
                            if (e.target.checked) {
                              newIds = [...ids, p.id];
                            } else {
                              newIds = ids.filter(id => id !== p.id);
                            }

                            // Re-calculate cost
                            const labCost = labTests.filter(t => (newCheckup.labTestIds || []).includes(t.id)).reduce((sum, t) => sum + (t.costPrice || 0), 0);
                            const procCost = procedures.filter(t => newIds.includes(t.id)).reduce((sum, t) => sum + (t.costPrice || 0), 0);
                            
                            setNewCheckup({...newCheckup, procedureIds: newIds, totalCost: labCost + procCost});
                          }}
                        />
                        <span className="flex-1">{p.name}</span>
                        <span className="text-slate-400 font-mono text-[9px]">C: ฿{p.costPrice || 0}</span>
                      </label>
                    ))}

                    {/* Display missing procedures */}
                    {newCheckup.procedureIds?.filter(id => !procedures.find(p => p.id === id)).map(id => (
                      <div key={id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-red-50 border border-red-100 text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        <span className="flex-1 truncate">Unknown Procedure (ID: {id})</span>
                        <button 
                          onClick={() => {
                            const newIds = (newCheckup.procedureIds || []).filter(pid => pid !== id);
                            setNewCheckup({...newCheckup, procedureIds: newIds});
                          }}
                          className="p-0.5 hover:bg-red-200 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-end gap-2 md:col-span-3 justify-end">
                  <button onClick={handleAddOrUpdateCheckup} className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold">บันทึกโปรแกรม</button>
                  <button onClick={() => { setIsAddingCheckup(false); setEditingCheckupId(null); setNewCheckup({ name: '', description: '', minAge: 0, maxAge: 100, labTestIds: [], procedureIds: [], totalPrice: 0 }); }} className="bg-slate-200 text-slate-600 px-8 py-2 rounded-lg font-bold">ยกเลิก</button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checkupPrograms.map(c => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:border-emerald-300 transition-all group relative">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <h5 className="font-bold text-slate-800 text-sm">{c.name}</h5>
                    {(c.labTestIds?.some(id => !labTests.find(l => l.id === id)) || c.procedureIds?.some(id => !procedures.find(p => p.id === id))) && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 w-fit">
                        <AlertCircle className="w-2.5 h-2.5" /> ตรวจพบ ERROR: มีรายการที่หายไป
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditCheckup(c)} className="p-1 text-orange-500 hover:bg-orange-50 rounded"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeCheckup(c.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{c.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold w-fit mb-1">อายุ {c.minAge}-{c.maxAge} ปี</span>
                    <span className="text-[9px] text-slate-400 font-bold">ต้นทุน: ฿{(c.totalCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 text-sm">฿{c.totalPrice.toLocaleString()}</p>
                    <p className={`text-[8px] font-bold ${(c.totalPrice - (c.totalCost || 0)) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>กำไร: ฿{(c.totalPrice - (c.totalCost || 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* User Management */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-slate-800" /> จัดการผู้ใช้งานระบบ
            </h3>
            {!isAddingUser && (
              <button 
                onClick={() => setIsAddingUser(true)}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-700"
              >
                <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งาน
              </button>
            )}
          </div>

          {(isAddingUser || editingUserId) && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="font-bold text-sm text-slate-700">{editingUserId ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500">Username</label>
                   <input className="w-full border p-2 rounded-lg text-sm" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500">รหัสผ่าน</label>
                   <input className="w-full border p-2 rounded-lg text-sm" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500">ชื่อ-นามสกุล</label>
                   <input className="w-full border p-2 rounded-lg text-sm" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500">สิทธิ์การใช้งาน</label>
                   <select className="w-full border p-2 rounded-lg text-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                      <option value="Admin">Admin</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Staff">Staff</option>
                   </select>
                 </div>
                 {newUser.role === 'Doctor' && (
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">เลข ว. (Medical License)</label>
                     <input className="w-full border p-2 rounded-lg text-sm" placeholder="ว.XXXXX" value={newUser.licenseNumber} onChange={e => setNewUser({...newUser, licenseNumber: e.target.value})} />
                   </div>
                 )}
                 <div className="flex items-end gap-2 lg:col-span-full justify-end">
                   <button onClick={handleAddUser} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">บันทึกข้อมูล</button>
                   <button onClick={() => { setIsAddingUser(false); setEditingUserId(null); setNewUser({ username: '', fullName: '', role: 'Staff', password: '', licenseNumber: '' }); }} className="bg-slate-200 text-slate-600 px-6 py-2 rounded-lg font-bold">ยกเลิก</button>
                 </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-6 font-bold text-slate-600">ชื่อ-นามสกุล</th>
                    <th className="text-left py-3 px-6 font-bold text-slate-600">Username</th>
                    <th className="text-left py-3 px-6 font-bold text-slate-600">เลข ว.</th>
                    <th className="text-left py-3 px-6 font-bold text-slate-600">สิทธิ์</th>
                    <th className="text-center py-3 px-6 font-bold text-slate-600">จัดการ</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-bold text-slate-800">{u.fullName}</td>
                    <td className="py-3 px-6 text-slate-500">{u.username}</td>
                    <td className="py-3 px-6 text-slate-500">{u.licenseNumber || '-'}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        u.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' :
                        u.role === 'Doctor' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="py-3 px-6 text-center space-x-2">
                       <button onClick={() => startEditUser(u)} className="text-slate-400 hover:text-orange-600 p-1"><Edit3 className="w-4 h-4" /></button>
                       <button onClick={() => removeUser(u.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminSettings;
