
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Trash2, Printer, X, Save, Clock, User, FileText, Download, Share2, CheckSquare } from 'lucide-react';
import { Appointment, Patient, ClinicInfo, Visit } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AppointmentSystemProps {
  appointments: Appointment[];
  setAppointments: (action: any) => void;
  deleteAppointment: (id: string) => void;
  patients: Patient[];
  visits: Visit[];
  setVisits: (action: any) => void;
  clinicInfo: ClinicInfo;
}

const AppointmentSystem: React.FC<AppointmentSystemProps> = ({ 
  appointments, setAppointments, deleteAppointment, patients, visits, setVisits, clinicInfo 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isPrintingSummary, setIsPrintingSummary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    time: '17:00',
    purpose: 'ตรวจติดตามอาการ รับยาต่อเนื่อง',
    status: 'Scheduled'
  });

  const filteredAppointments = appointments.filter(app => 
    app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());

  const handleSave = () => {
    if ((!newAppointment.patientId && !newAppointment.patientName) || !newAppointment.date || !newAppointment.time) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const appointment: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: newAppointment.patientId || '', // Empty for non-registered
      patientName: newAppointment.patientName || 'Unknown',
      date: newAppointment.date!,
      time: newAppointment.time!,
      purpose: newAppointment.purpose || '',
      createdAt: new Date().toISOString(),
      status: 'Scheduled'
    };

    setAppointments((prev: Appointment[]) => [...prev, appointment]);
    setIsAdding(false);
    setPatientSearch('');
    setNewAppointment({
      date: new Date().toISOString().split('T')[0],
      time: '17:00',
      purpose: 'ตรวจติดตามอาการ รับยาต่อเนื่อง',
      status: 'Scheduled'
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('ยืนยันการลบใบนัด?')) {
      deleteAppointment(id);
    }
  };

  const handleCheckIn = (app: Appointment) => {
    if (!app.patientId) {
      alert('คนไข้รายนี้ยังไม่ได้ลงทะเบียนในระบบ กรุณาลงทะเบียนคนไข้ก่อนดำเนินการ Check-in');
      return;
    }
    const todayStr = new Date().toDateString();
    const existingVisit = visits.find(v => v.patientId === app.patientId && new Date(v.date).toDateString() === todayStr && v.status !== 'Completed');
    
    if (existingVisit) {
      alert('ผู้ป่วยรายนี้มีการ Check-in หรือมี Visit ของวันนี้อยู่แล้ว');
      return;
    }

    if (window.confirm(`ยืนยันการ Check-in สำหรับคุณ ${app.patientName}? (ระบบจะสร้างคิวตรวจให้ทันที)`)) {
      const todayVisits = visits.filter(v => new Date(v.date).toDateString() === todayStr);
      const nextQueueNumber = todayVisits.length > 0 ? Math.max(...todayVisits.map(v => v.queueNumber)) + 1 : 1;

      const newVisit: Visit = {
        id: Math.random().toString(36).substr(2, 9),
        patientId: app.patientId,
        date: new Date().toISOString(),
        queueNumber: nextQueueNumber,
        status: 'Waiting',
        chiefComplaint: app.purpose,
        prescriptions: [],
        procedures: [],
        labOrders: [],
        totalAmount: 0,
        paymentStatus: 'Pending'
      };

      setVisits((prev: Visit[]) => [...prev, newVisit]);
      setAppointments((prev: Appointment[]) => prev.map(a => a.id === app.id ? { ...a, status: 'Completed' } : a));
      alert(`Check-in สำเร็จ! ได้คิวที่ #${nextQueueNumber}`);
    }
  };

  const handlePrint = (app: Appointment) => {
    setSelectedAppointment(app);
  };

  const handlePrintSummary = () => {
    setIsPrintingSummary(true);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add Thai Font support (using standard fonts for now, but usually needs a custom font for Thai)
    // For simplicity in this environment, we'll use English headers if Thai fails, 
    // but jspdf-autotable supports Unicode if configured.
    
    doc.text(`Appointment Summary - ${clinicInfo.name}`, 14, 15);
    doc.text(`Date: ${new Date().toLocaleDateString('th-TH')}`, 14, 22);

    const tableData = filteredAppointments.map(app => [
      app.patientName,
      `${app.date} ${app.time}`,
      app.purpose,
      app.status === 'Scheduled' ? 'Scheduled' : app.status === 'Completed' ? 'Completed' : 'Cancelled'
    ]);

    autoTable(doc, {
      head: [['Patient Name', 'Date/Time', 'Purpose', 'Status']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });

    doc.save(`appointments_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getGoogleCalendarUrl = (app: Appointment) => {
    const startDate = app.date.replace(/-/g, '') + 'T' + app.time.replace(/:/g, '') + '00';
    // Assume 30 mins duration
    const endDateTime = new Date(new Date(app.date + 'T' + app.time).getTime() + 30 * 60000);
    const endDate = endDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '').split('T')[0] + 'T' + endDateTime.toISOString().split('T')[1].replace(/:|\.\d\d\d/g, '');
    
    const title = encodeURIComponent(`นัดหมาย: ${clinicInfo.name}`);
    const details = encodeURIComponent(`คนไข้: ${app.patientName}\nวัตถุประสงค์: ${app.purpose}\nคลินิก: ${clinicInfo.name}\nโทร: ${clinicInfo.phone}`);
    const location = encodeURIComponent(clinicInfo.address);
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
  };

  const formatThaiDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ระบบนัดหมายคนไข้</h1>
          <p className="text-slate-500">จัดการและออกใบนัดหมายสำหรับการตรวจติดตาม</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrintSummary}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-slate-50 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            พิมพ์สรุป (Print Summary)
          </button>
          <button 
            onClick={handleExportPDF}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-slate-50 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            ส่งออก PDF
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            เพิ่มการนัดหมาย
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 print:hidden">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              สร้างใบนัดใหม่
            </h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-sm font-bold text-slate-700">เลือกหรือระบุชื่อคนไข้</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="ค้นหาชื่อ/HN หรือพิมพ์ชื่อเพื่อออกใบนัด"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900"
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    setNewAppointment({...newAppointment, patientName: e.target.value, patientId: ''});
                  }}
                />
              </div>
              {patientSearch.length >= 2 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto text-slate-900">
                  {patients.filter(p => `${p.firstName} ${p.lastName} ${p.hn}`.toLowerCase().includes(patientSearch.toLowerCase())).map(p => (
                    <button
                      key={p.id}
                      onClick={() => { 
                        setNewAppointment({...newAppointment, patientId: p.id, patientName: `${p.firstName} ${p.lastName}`}); 
                        setPatientSearch(`${p.firstName} ${p.lastName}`); 
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="font-bold">{p.firstName} {p.lastName}</p>
                        <p className="text-[10px] text-slate-500 italic">HN: {p.hn}</p>
                      </div>
                      <CheckSquare className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                  <div className="p-3 bg-slate-50 text-[10px] text-slate-400 italic font-medium">
                    * หากไม่พบรายชื่อในระบบ สามารถพิมพ์ชื่อที่ช่องค้นหาเพื่อออกใบนัดได้ทันที
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">วันที่นัด</label>
                <input 
                  type="date"
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={newAppointment.date}
                  onChange={e => setNewAppointment({...newAppointment, date: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">เวลานัด</label>
                <input 
                  type="time"
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={newAppointment.time}
                  onChange={e => setNewAppointment({...newAppointment, time: e.target.value})}
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-bold text-slate-700">วัตถุประสงค์การนัด</label>
              <input 
                placeholder="เช่น ตรวจติดตามอาการ รับยาต่อเนื่อง"
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={newAppointment.purpose}
                onChange={e => setNewAppointment({...newAppointment, purpose: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setIsAdding(false)} className="px-6 py-2 border border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">ยกเลิก</button>
            <button onClick={handleSave} className="px-10 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95">
              <Save className="w-4 h-4" />
              บันทึกใบนัด
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="ค้นหาชื่อคนไข้ หรือวัตถุประสงค์..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">คนไข้</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">วัน/เวลา</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">วัตถุประสงค์</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">สถานะ</th>
                <th className="text-center px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length > 0 ? filteredAppointments.map(app => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{app.patientName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">{formatThaiDate(app.date)}</span>
                      <Clock className="w-4 h-4 text-emerald-500 ml-2" />
                      <span className="text-sm">{app.time} น.</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{app.purpose}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      app.status === 'Scheduled' ? 'bg-blue-50 text-blue-600' :
                      app.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {app.status === 'Scheduled' ? 'รอนัด' : app.status === 'Completed' ? 'มาตามนัดแล้ว' : 'ยกเลิก'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleCheckIn(app)}
                        disabled={app.status !== 'Scheduled'}
                        className={`p-2 rounded-lg transition-all ${
                          app.status === 'Scheduled' 
                            ? 'text-emerald-600 hover:bg-emerald-50' 
                            : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title="Check-in (ลงทะเบียนเข้าตรวจ)"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePrint(app)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="พิมพ์ใบนัด"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <a 
                        href={getGoogleCalendarUrl(app)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="เพิ่มลง Google Calendar"
                      >
                        <Share2 className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => handleDelete(app.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">ไม่พบข้อมูลการนัดหมาย</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      {(selectedAppointment || isPrintingSummary) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print text-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                ตัวอย่างเอกสารก่อนพิมพ์ (Print Preview)
              </h4>
              <button 
                onClick={() => { setSelectedAppointment(null); setIsPrintingSummary(false); }} 
                className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 bg-slate-50 flex justify-center">
              {selectedAppointment ? (
                <div id="appointment-card" className="w-[210mm] h-[148mm] p-10 border-2 border-slate-800 bg-white flex flex-col font-['Sarabun'] text-slate-900 shadow-xl overflow-hidden">
                  <header className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-8">
                    <div className="flex-1">
                      <h1 style={{ fontSize: '20px' }} className="font-bold leading-tight">{clinicInfo.name}</h1>
                      <p style={{ fontSize: '14px' }} className="mt-2 text-slate-600 leading-tight">{clinicInfo.address}</p>
                      <p style={{ fontSize: '14px' }} className="font-bold mt-1 text-slate-800">โทร: {clinicInfo.phone} | เลขผู้เสียภาษี: {clinicInfo.taxId}</p>
                    </div>
                    <div className="text-right ml-6">
                      <h2 style={{ fontSize: '24px' }} className="font-black uppercase tracking-widest border-4 border-slate-900 px-6 py-2">ใบนัดหมาย</h2>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase tracking-tighter">APP-ID: {selectedAppointment.id}</p>
                    </div>
                  </header>

                  <main className="flex-1 space-y-10">
                    <div className="flex items-end gap-4 border-b border-dotted border-slate-400 pb-2">
                      <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">ชื่อ-นามสกุล (Patient):</span>
                      <span style={{ fontSize: '22px' }} className="font-bold flex-1 text-slate-900">{selectedAppointment.patientName}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-10">
                      <div className="flex items-end gap-4 border-b border-dotted border-slate-400 pb-2">
                        <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">วันที่นัด (Date):</span>
                        <span style={{ fontSize: '22px' }} className="font-bold flex-1 text-slate-900">{formatThaiDate(selectedAppointment.date)}</span>
                      </div>
                      <div className="flex items-end gap-4 border-b border-dotted border-slate-400 pb-2">
                        <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">เวลา (Time):</span>
                        <span style={{ fontSize: '22px' }} className="font-bold flex-1 text-slate-900">{selectedAppointment.time} น.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 border-b border-dotted border-slate-400 pb-2">
                      <span style={{ fontSize: '18px' }} className="font-bold whitespace-nowrap text-slate-500">วัตถุประสงค์ (Purpose):</span>
                      <span style={{ fontSize: '20px' }} className="font-bold flex-1 text-slate-900">{selectedAppointment.purpose}</span>
                    </div>

                    <div className="mt-12 p-6 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider underline">คำแนะนำเพิ่มเติม (Instructions):</h3>
                      <ul style={{ fontSize: '14px' }} className="text-slate-700 space-y-1 list-disc list-inside leading-tight">
                        <li>กรุณานำใบนัดนี้มาด้วยทุกครั้งที่เข้ารับบริการ</li>
                        <li>หากไม่สามารถมาตามนัดได้ กรุณาโทรแจ้งล่วงหน้าอย่างน้อย 1 วัน</li>
                        <li>กรุณามาก่อนเวลานัดประมาณ 10-15 นาที เพื่อเตรียมตัวก่อนพบแพทย์</li>
                      </ul>
                    </div>
                  </main>

                  <footer className="mt-8 flex justify-between items-end border-t border-slate-100 pt-6">
                    <div className="text-[10px] text-slate-400 italic">
                      ออกให้เมื่อวันที่: {new Date(selectedAppointment.createdAt).toLocaleDateString('th-TH')}
                    </div>
                    <div className="text-center space-y-2">
                      <div className="w-48 border-b-2 border-slate-900 mx-auto"></div>
                      <p className="text-sm font-bold text-slate-800">ลงชื่อเจ้าหน้าที่ / แพทย์</p>
                    </div>
                  </footer>
                </div>
              ) : (
                <div id="printable-doc" className="w-[210mm] min-h-[297mm] bg-white p-12 shadow-2xl font-['Sarabun'] text-slate-900">
                  <header className="border-b-4 border-slate-800 pb-4 mb-8 flex justify-between items-end">
                    <div>
                      <h1 style={{ fontSize: '24px' }} className="font-black text-slate-900">{clinicInfo.name}</h1>
                      <p style={{ fontSize: '14px' }} className="text-slate-600 mt-1 uppercase tracking-widest font-bold">สรุปรายการนัดหมายคนไข้ (Appointment Summary)</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
                    </div>
                  </header>

                  <table className="w-full border-collapse border-2 border-slate-800 text-sm">
                    <thead>
                      <tr className="bg-slate-100 divide-x divide-slate-800 border-b-2 border-slate-800">
                        <th className="px-4 py-3 text-left font-black">ชื่อคนไข้</th>
                        <th className="px-4 py-3 text-left font-black">วันที่นัด</th>
                        <th className="px-4 py-3 text-left font-black">เวลา</th>
                        <th className="px-4 py-3 text-left font-black">วัตถุประสงค์</th>
                        <th className="px-4 py-3 text-center font-black">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAppointments.map(app => (
                        <tr key={app.id} className="divide-x divide-slate-200">
                          <td className="px-4 py-3 font-bold">{app.patientName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatThaiDate(app.date)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{app.time} น.</td>
                          <td className="px-4 py-3">{app.purpose}</td>
                          <td className="px-4 py-3 text-center text-xs font-bold uppercase">
                            {app.status === 'Scheduled' ? 'รอนัด' : app.status === 'Completed' ? 'มาแล้ว' : 'ยกเลิก'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <footer className="mt-20 border-t border-slate-200 pt-6 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
                    <p>ระบบจัดการคลินิกอัจฉริยะ {clinicInfo.name}</p>
                    <p>หน้า 1 / 1</p>
                  </footer>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-white border-t flex justify-end gap-3 no-print font-bold">
               <button 
                 onClick={() => { setSelectedAppointment(null); setIsPrintingSummary(false); }} 
                 className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
               >
                 ยกเลิก (Cancel)
               </button>
               <button 
                 onClick={() => window.print()} 
                 className="bg-emerald-600 text-white px-10 py-3 rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
               >
                 <Printer className="w-5 h-5" /> พิมพ์เอกสาร (Print Now)
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentSystem;
