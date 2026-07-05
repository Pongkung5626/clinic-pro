
import React, { useState } from 'react';
import { Activity, Save, User as UserIcon, Clock, AlertCircle, ArrowLeft, Trash2, Printer, X, FileText, HeartPulse, Scale, Calendar } from 'lucide-react';
import { Visit, Patient, VitalSigns, ClinicInfo, User, PrintedDoc } from '../types';
import { calculateAge } from '../utils';

interface TriageProps {
  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  patients: Patient[];
  clinicInfo: ClinicInfo;
  currentUser: User | null;
  deleteVisit: (id: string) => void;
}

const Triage: React.FC<TriageProps> = ({ visits, setVisits, patients, clinicInfo, currentUser, deleteVisit }) => {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [activeDoc, setActiveDoc] = useState<'Triage' | 'SickLeave' | 'MedicalCert' | 'Referral' | 'OPD' | null>(null);
  const [sickLeaveDays, setSickLeaveDays] = useState(1);
  const [referralTarget, setReferralTarget] = useState('');
  const [vitals, setVitals] = useState<VitalSigns>({
    weight: 0, height: 0, temperature: 36.5, bpSystolic: 120, bpDiastolic: 80, pulse: 80, rr: 20, spo2: 98
  });
  const [cc, setCc] = useState('');
  const [pi, setPi] = useState('');

  // Triage can see Waiting, Triage, and even Examination visits if they need to update vitals
  const queueList = visits.filter(v => ['Waiting', 'Triage', 'Examination'].includes(v.status))
    .sort((a, b) => a.queueNumber - b.queueNumber);

  const handleSelect = (v: Visit) => {
    setSelectedVisit(v);
    setCc(v.chiefComplaint || '');
    setPi(v.presentIllness || '');
    setSickLeaveDays(v.sickLeaveDays || 1);
    setReferralTarget(v.referralTarget || '');
    if (v.vitalSigns) {
      setVitals(v.vitalSigns);
    } else {
      // Find the most recent visit of this patient that has vital signs to pre-fill height and weight
      const lastVisitWithHeight = visits
        .filter(prevVisit => prevVisit.patientId === v.patientId && prevVisit.id !== v.id && prevVisit.vitalSigns && (prevVisit.vitalSigns.height || 0) > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const lastVisitWithWeight = visits
        .filter(prevVisit => prevVisit.patientId === v.patientId && prevVisit.id !== v.id && prevVisit.vitalSigns && (prevVisit.vitalSigns.weight || 0) > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const lastHeight = lastVisitWithHeight?.vitalSigns?.height || 0;
      const lastWeight = lastVisitWithWeight?.vitalSigns?.weight || 0;
      setVitals({ weight: lastWeight, height: lastHeight, temperature: 36.5, bpSystolic: 120, bpDiastolic: 80, pulse: 80, rr: 20, spo2: 98 });
    }
  };

  const handleSave = () => {
    if (!selectedVisit) return;
    setVisits(prev => prev.map(v => 
      v.id === selectedVisit.id 
        ? { ...v, vitalSigns: vitals, chiefComplaint: cc, presentIllness: pi, sickLeaveDays, referralTarget, status: 'Examination' }
        : v
    ));
    setSelectedVisit(null);
    alert('ซักประวัติเรียบร้อยแล้ว');
  };

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
  };

  // Print Management
  React.useEffect(() => {
    if (activeDoc) {
      const timer = setTimeout(() => {
        window.print();
        setActiveDoc(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeDoc]);

  const patient = selectedVisit 
    ? patients.find((p) => p.id === selectedVisit.patientId) 
    : null;

  const DocumentModal = ({ type }: { type: 'Triage' | 'SickLeave' | 'MedicalCert' | 'Referral' | 'OPD' | null }) => {
    if (!selectedVisit || !patient || !type) return null;

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
        <p style={{ fontSize: '16px' }} className="text-slate-500">โทร: {clinicInfo.phone}</p>
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
                <p><span className="font-bold">ผู้ป่วย:</span> {patient.firstName} {patient.lastName}</p>
                <p><span className="font-bold">HN:</span> {patient.hn}</p>
              </div>
              <div className="flex justify-between">
                <p><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
                <p><span className="font-bold">เวลา:</span> {new Date().toLocaleTimeString('th-TH')}</p>
              </div>
              <p className="text-red-600 font-bold">
                แพ้ยา: {(patient.allergicDrugs || []).join(', ') || 'ไม่มีประวัติแพ้ยา'}
              </p>
            </section>
            <section className="mb-6 space-y-3">
              <h6 style={{ fontSize: '18px' }} className="font-bold border-b border-slate-200 pb-1">สัญญาณชีพ (Vital Signs)</h6>
              <div style={{ fontSize: '16px' }} className="grid grid-cols-2 gap-y-2">
                <p><span className="font-bold">น้ำหนัก:</span> {vitals.weight} kg</p>
                <p><span className="font-bold">ส่วนสูง:</span> {vitals.height} cm</p>
                <p><span className="font-bold">อุณหภูมิ:</span> {vitals.temperature} °C</p>
                <p><span className="font-bold">ความดัน:</span> {vitals.bpSystolic}/{vitals.bpDiastolic} mmHg</p>
                <p><span className="font-bold">ชีพจร:</span> {vitals.pulse} bpm</p>
                <p><span className="font-bold">SpO2:</span> {vitals.spo2} %</p>
              </div>
            </section>
            <section className="mb-6 space-y-4">
              <div>
                <h6 style={{ fontSize: '18px' }} className="font-bold border-b border-slate-200 pb-1">อาการสำคัญ (Chief Complaint)</h6>
                <p style={{ fontSize: '16px' }} className="whitespace-pre-wrap min-h-[1.5cm] bg-slate-50 p-2 rounded">{cc || '-'}</p>
              </div>
              <div>
                <h6 style={{ fontSize: '18px' }} className="font-bold border-b border-slate-200 pb-1">อาการเจ็บป่วยปัจจุบัน (Present Illness)</h6>
                <p style={{ fontSize: '16px' }} className="whitespace-pre-wrap min-h-[3cm] bg-slate-50 p-2 rounded">{pi || '-'}</p>
              </div>
            </section>
          </div>
        );
        break;
      case 'SickLeave':
        content = (
          <div className="space-y-4 font-['Sarabun']">
            <h3 style={{ fontSize: '18px' }} className="text-center font-bold underline">ใบรับรองการเจ็บป่วย (Sick Leave Certificate)</h3>
            <div style={{ fontSize: '16px' }} className="space-y-4">
              <p>ข้าพเจ้า <b>{currentUser?.fullName}</b> แพทย์ผู้ตรวจรักษา ใบอนุญาตเลขที่ <b>{currentUser?.licenseNumber || `ว.${currentUser?.username}`}</b></p>
              <p>ได้ตรวจร่างกาย <b>{patient.firstName} {patient.lastName}</b> (HN: {patient.hn}) เมื่อวันที่ {new Date(selectedVisit.date).toLocaleDateString('th-TH')}</p>
              <p>วินิจฉัยโรค: {selectedVisit.diagnosisThai || selectedVisit.diagnosis || '-'}</p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 no-print">
                 <label style={{ fontSize: '16px' }} className="font-bold text-slate-500 block mb-2">ความเห็นแพทย์ (จำนวนวันที่ให้พักรักษา)</label>
                 <div className="flex items-center gap-2">
                   <input type="number" className="w-20 border p-1 rounded font-bold" value={sickLeaveDays} onChange={e => setSickLeaveDays(+e.target.value)} />
                   <span className="font-bold">วัน</span>
                 </div>
              </div>
              <p>เห็นควรให้พักรักษาตัวเป็นเวลา <b>{sickLeaveDays}</b> วัน</p>
              <p>ตั้งแต่วันที่ <b>{new Date().toLocaleDateString('th-TH')}</b> ถึงวันที่ <b>{new Date(Date.now() + (sickLeaveDays - 1) * 86400000).toLocaleDateString('th-TH')}</b></p>
              <p className="mt-4"><span className="font-bold">ความเห็นแพทย์เพิ่มเติม:</span> {selectedVisit.doctorOpinion || '-'}</p>
            </div>
          </div>
        );
        break;
      case 'MedicalCert':
        content = (
          <div className="space-y-6 font-['Sarabun'] leading-relaxed">
            <div className="flex justify-between items-start">
              <div className="text-left w-32 border border-slate-300 p-2 text-[10px] uppercase font-bold text-center">
                แบบฟอร์ม สธ.
                <br />
                MoPH Form
              </div>
              <div className="text-center flex-1">
                <h3 style={{ fontSize: '18px' }} className="font-bold underline">ใบรับรองแพทย์ (Medical Certificate)</h3>
                <p style={{ fontSize: '16px' }}>(สำหรับตรวจสุขภาพ 5 โรค ตามมาตรฐานกระทรวงสาธารณสุข)</p>
              </div>
              <div className="w-32"></div>
            </div>
            <section style={{ fontSize: '16px' }} className="space-y-2">
              <h4 className="font-bold underline">ส่วนที่ 1: ข้อมูลผู้เข้ารับการตรวจ (Patient's Information)</h4>
              <p>ข้าพเจ้า <b>{patient.firstName} {patient.lastName}</b> เลขประจำตัวประชาชน <b>{patient.idCard}</b></p>
              <p>ที่อยู่ <b>{patient.address || '-'}</b></p>
              <p>ได้เข้ารับการตรวจร่างกายเมื่อวันที่ <b>{new Date().toLocaleDateString('th-TH')}</b></p>
            </section>
            <section style={{ fontSize: '16px' }} className="space-y-2">
              <h4 className="font-bold underline">ส่วนที่ 2: ผลการตรวจทางแพทย์ (Medical Examination)</h4>
              <p>ข้าพเจ้า <b>{currentUser?.fullName}</b> ผู้ประกอบวิชาชีพเวชกรรม ใบอนุญาตเลขที่ <b>{currentUser?.licenseNumber || `ว.${currentUser?.username}`}</b> ได้ทำการตรวจร่างกายแล้วขอรับรองว่าบุคคลดังกล่าว ไม่เป็นผู้มีร่างกายทุพพลภาพจนไม่สามารถปฏิบัติหน้าที่ได้ ไม่ปรากฏอาการของโรคจิต หรือจิตฟั่นเฟือน หรือปัญญาอ่อน และไม่ปรากฏอาการหรืออาการแสดงของโรค ดังต่อไปนี้:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-4 font-bold">
                <p>1. โรคเรื้อนในระยะติดต่อ (Leprosy)</p>
                <p>2. วัณโรคในระยะอันตราย (Tuberculosis)</p>
                <p>3. โรคเท้าช้างในระยะที่ปรากฏอาการ (Elephantiasis)</p>
                <p>4. โรคยาเสพติดให้โทษ (Drug Addiction)</p>
                <p>5. โรคพิษสุราเรื้อรัง (Alcoholism)</p>
              </div>
              <p className="mt-4">สรุปความเห็นแพทย์ (Physician's Opinion): <b>{selectedVisit.doctorOpinion || 'เป็นผู้มีร่างกายสมบูรณ์แข็งแรง และไม่ปรากฏอาการหรืออาการแสดงของโรคทั้ง 5 ดังกล่าวข้างต้น'}</b></p>
            </section>
          </div>
        );
        break;
      case 'Referral':
        content = (
          <div className="space-y-6 font-['Sarabun']">
            <div className="text-center">
              <h3 style={{ fontSize: '18px' }} className="font-bold underline">ใบส่งตัวผู้ป่วยเพื่อรับการตรวจรักษา (Referral Form)</h3>
            </div>
            <div style={{ fontSize: '16px' }} className="grid grid-cols-2 border p-4 gap-4">
              <div className="col-span-2 flex justify-between">
                <p><span className="font-bold">เรียน:</span> ผู้อำนวยการโรงพยาบาล/สถานพยาบาล</p>
                <p><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
              </div>
              <div className="col-span-2 border-t pt-2 mt-2 no-print">
                <label style={{ fontSize: '16px' }} className="font-bold text-slate-500 block">ส่งไปยังสถานพยาบาล:</label>
                <input className="w-full border p-1 rounded font-bold" value={referralTarget} onChange={e => setReferralTarget(e.target.value)} placeholder="ระบุชื่อโรงพยาบาลปลายทาง" />
              </div>
              <div className="col-span-2 border-t pt-2">
                <p><span className="font-bold">ข้อมูลผู้ป่วย:</span> {patient.firstName} {patient.lastName} (HN: {patient.hn}) อายุ: {new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} ปี</p>
              </div>
              <div className="col-span-2 border-t pt-2">
                <p><span className="font-bold">ประวัติการแพ้ยา:</span> {(patient.allergicDrugs || []).join(', ') || 'ไม่มี'}</p>
                <p><span className="font-bold">โรคประจำตัว:</span> {(patient.chronicDiseases || []).join(', ') || 'ไม่มี'}</p>
              </div>
              <div className="col-span-2 border-t pt-2">
                <p className="font-bold">อาการสำคัญ (CC):</p>
                <p className="pl-4">{cc || selectedVisit.chiefComplaint}</p>
                <p className="font-bold mt-2">อาการเจ็บป่วยปัจจุบัน (PI):</p>
                <p className="pl-4">{pi || selectedVisit.presentIllness || '-'}</p>
              </div>
              <div className="col-span-2 border-t pt-2">
                <p><span className="font-bold">การวินิจฉัย:</span> {selectedVisit.diagnosisThai || selectedVisit.diagnosis || '-'}</p>
                <p className="mt-2" style={{ fontSize: '16px' }}><span className="font-bold">ความเห็นแพทย์:</span> {selectedVisit.doctorOpinion || '-'}</p>
              </div>
              <div className="col-span-2 border-t pt-2">
                <p><span className="font-bold">เหตุผลการส่งตัว:</span> เพื่อขอรับการตรวจวินิจฉัยและรักษาต่อเนื่องโดยละเอียด</p>
              </div>
            </div>
          </div>
        );
        break;
      case 'OPD':
        content = (
          <div className="space-y-4 font-['Sarabun']">
             <div className="flex justify-between items-center border-b pb-2">
                <h3 style={{ fontSize: '18px' }} className="font-bold">OPD CARD (ทะเบียนผู้ป่วยนอก)</h3>
                <span style={{ fontSize: '16px' }} className="italic">รหัสมาตรฐาน สสจ.</span>
             </div>
             <div style={{ fontSize: '16px' }} className="grid grid-cols-4 border p-2 gap-y-2">
                <div className="col-span-2"><span className="font-bold">HN:</span> {patient.hn}</div>
                <div className="col-span-2 text-right"><span className="font-bold">วันที่:</span> {new Date(selectedVisit.date).toLocaleString('th-TH')}</div>
                <div className="col-span-3 font-bold">ชื่อ-นามสกุล: {patient.firstName} {patient.lastName}</div>
                <div>อายุ: {new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} ปี</div>
                <div className="col-span-2">เพศ: {patient.gender === 'M' ? 'ชาย' : 'หญิง'}</div>
                <div className="col-span-2 text-right">เลขบัตร: {patient.idCard}</div>
                <div className="col-span-4 border-t pt-1"><span className="font-bold">สิทธิ์การรักษา:</span> เงินสด (Self Pay)</div>
             </div>
             <div style={{ fontSize: '16px' }} className="border p-2 min-h-[40px]">
                <p className="font-bold underline mb-1">อาการสำคัญ (CC):</p>
                <p>{cc || selectedVisit.chiefComplaint}</p>
             </div>
             <div style={{ fontSize: '16px' }} className="border p-2 min-h-[60px]">
                <p className="font-bold underline mb-1">อาการเจ็บป่วยปัจจุบัน (PI):</p>
                <p>{pi || selectedVisit.presentIllness || '-'}</p>
             </div>
             <div style={{ fontSize: '16px' }} className="border p-2">
                <p className="font-bold underline mb-1">สัญญาณชีพ (Vital Signs):</p>
                <p>T:{vitals.temperature}°C | BP:{vitals.bpSystolic}/{vitals.bpDiastolic} mmHg | PR:{vitals.pulse} bpm | SpO2:{vitals.spo2}% | RR:{vitals.rr}/min</p>
                <p className="mt-1">BW:{vitals.weight}kg | HT:{vitals.height}cm</p>
             </div>
             <div style={{ fontSize: '16px' }} className="border p-2 min-h-[80px]">
                <p className="font-bold underline mb-1">การวินิจฉัย (Diagnosis):</p>
                <p className="font-bold text-emerald-800">{selectedVisit.diagnosisThai || '-'}</p>
                <p className="text-orange-800 font-mono" style={{ fontSize: '16px' }}>Ref: {selectedVisit.diagnosis || '-'}</p>
                <p className="mt-2 font-bold underline">แผนการรักษา (Management):</p>
                <div className="grid grid-cols-2">
                  <ul className="list-disc pl-4" style={{ fontSize: '16px' }}>
                     {selectedVisit.prescriptions?.map(d => <li key={d.id}>{d.name} x {d.amount}</li>)}
                  </ul>
                  <ul className="list-disc pl-4" style={{ fontSize: '16px' }}>
                     {selectedVisit.procedures?.map(p => <li key={p.id}>{p.name}</li>)}
                     {selectedVisit.labOrders?.map(l => <li key={l.id}>{l.name}</li>)}
                  </ul>
                </div>
             </div>
             <div style={{ fontSize: '16px' }} className="border p-2 min-h-[100px]">
                <p className="font-bold underline mb-1">ความเห็นแพทย์และบันทึกเพิ่มเติม:</p>
                <p className="whitespace-pre-wrap font-bold text-slate-800">{selectedVisit.doctorOpinion || '-'}</p>
                <p className="mt-2 whitespace-pre-wrap italic text-slate-500">{selectedVisit.doctorNotes || '-'}</p>
             </div>
          </div>
        );
        break;
    }

    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-auto print:backdrop-blur-none">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
           <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print font-['Sarabun']">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                ตัวอย่างหน้าพิมพ์เอกสาร
              </h4>
              <button onClick={() => setActiveDoc(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-12 bg-white print:p-0 print:overflow-visible" id="printable-doc">
              {renderHeader()}
              {content}
              <div className="mt-12 flex justify-between items-end font-['Sarabun']">
                 <div className="text-center">
                    <div className="w-40 border-b border-slate-400 mb-1"></div>
                    <p style={{ fontSize: '16px' }} className="text-slate-500">ลายมือชื่อผู้รับการตรวจ/ผู้ป่วย</p>
                    <p style={{ fontSize: '16px' }} className="text-slate-500">(Patient's Signature)</p>
                 </div>
                 <div className="text-center">
                    <p style={{ fontSize: '18px' }} className="mb-8 font-bold">(ลงชื่อ)........................................................</p>
                    <p style={{ fontSize: '16px' }} className="font-bold">{currentUser?.fullName}</p>
                    <p style={{ fontSize: '16px' }} className="text-slate-500">แพทย์ผู้ตรวจรักษา (Physician)</p>
                    <p style={{ fontSize: '16px' }} className="text-slate-500">{currentUser?.licenseNumber || `ว.${currentUser?.username}`}</p>
                 </div>
              </div>
           </div>
           
           <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 no-print">
              <button onClick={() => setActiveDoc(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">ยกเลิก</button>
              <button 
                onClick={() => {
                  let docType: PrintedDoc['type'] = 'Triage';
                  if (type === 'OPD') docType = 'OPDCard';
                  if (type === 'Referral') docType = 'Referral';
                  if (type === 'SickLeave' || type === 'MedicalCert') docType = 'MedicalCertificate';
                  handlePrint(docType);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          คิวคัดกรอง / ซักประวัติ
        </h2>
        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
          {queueList.length > 0 ? queueList.map(v => {
            const p = patients.find(pt => pt.id === v.patientId);
            return (
              <div
                key={v.id}
                onClick={() => handleSelect(v)}
                className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${
                  selectedVisit?.id === v.id 
                    ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-500/20' 
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  v.status === 'Examination' ? 'bg-emerald-500' : 'bg-orange-500'
                }`} />
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {p?.hn}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(v.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="font-semibold text-slate-800">{p?.firstName} {p?.lastName}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[10px] text-slate-500 truncate">CC: {v.chiefComplaint || 'รอกรอกข้อมูล'}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold">{v.status}</span>
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
              </div>
            );
          }) : (
            <div className="bg-white p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400">
              ไม่มีผู้ป่วยในรายการ
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedVisit ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xl">
                  {patients.find(p => p.id === selectedVisit.patientId)?.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {patients.find(p => p.id === selectedVisit.patientId)?.firstName} {patients.find(p => p.id === selectedVisit.patientId)?.lastName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <p className="text-sm text-slate-500 font-bold">HN: {patients.find(p => p.id === selectedVisit.patientId)?.hn}</p>
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      อายุ: <span className="font-bold">{calculateAge(patients.find(p => p.id === selectedVisit.patientId)?.birthDate || '')}</span>
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-emerald-500" />
                      น้ำหนัก: <span className="font-bold">{vitals.weight || '-'} kg</span>
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
              <div className="text-right">
                <p className={`text-xs font-bold px-2 py-1 rounded inline-block ${
                  (patients.find(p => p.id === selectedVisit.patientId)?.allergicDrugs || []).length ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {(patients.find(p => p.id === selectedVisit.patientId)?.allergicDrugs || []).length 
                    ? `แพ้ยา: ${(patients.find(p => p.id === selectedVisit.patientId)?.allergicDrugs || []).join(', ')}`
                    : 'ไม่มีประวัติแพ้ยา'
                  }
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <section className="space-y-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 border-l-4 border-emerald-500 pl-3 uppercase text-xs tracking-wider">สัญญาณชีพ (Vital Signs)</h4>
                {(() => {
                  const historyVitals = visits
                    .filter(h => h.patientId === selectedVisit.patientId && h.id !== selectedVisit.id && h.vitalSigns && ((h.vitalSigns.weight || 0) > 0 || (h.vitalSigns.height || 0) > 0))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  if (historyVitals.length > 0) {
                    return (
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/50 space-y-1.5">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                          ประวัติสัญญาณชีพเดิม (ย้อนหลังสูงสุด 3 ครั้ง):
                        </p>
                        <div className="flex flex-col gap-1 max-h-[110px] overflow-y-auto pr-1">
                          {historyVitals.slice(0, 3).map((v, idx) => (
                            <div key={v.id} className="text-[11px] text-slate-600 flex justify-between bg-white border border-slate-100 p-2 rounded shadow-sm">
                              <span className="font-medium">
                                นน.: <span className="font-bold text-slate-800">{v.vitalSigns?.weight} kg</span> | 
                                สส.: <span className="font-bold text-slate-800">{v.vitalSigns?.height} cm</span> | 
                                Temp: <span className="font-bold text-slate-800">{v.vitalSigns?.temperature} °C</span> | 
                                BP: <span className="font-bold text-slate-800">{v.vitalSigns?.bpSystolic}/{v.vitalSigns?.bpDiastolic} mmHg</span> | 
                                ชีพจร: <span className="font-bold text-slate-800">{v.vitalSigns?.pulse}</span> | 
                                SpO2: <span className="font-bold text-slate-800">{v.vitalSigns?.spo2}%</span> | 
                                RR: <span className="font-bold text-slate-800">{v.vitalSigns?.rr || '-'}</span>
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 self-center">
                                {new Date(v.date).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'})}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">น้ำหนัก (kg)</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-lg" value={vitals.weight} onChange={e => setVitals({...vitals, weight: +e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">ส่วนสูง (cm)</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-lg" value={vitals.height} onChange={e => setVitals({...vitals, height: +e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">อุณหภูมิ (°C)</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-lg" value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: +e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">ความดัน (BP)</label>
                    <div className="flex items-center gap-1">
                      <input type="number" className="w-1/2 border p-2 rounded-lg text-center" value={vitals.bpSystolic} onChange={e => setVitals({...vitals, bpSystolic: +e.target.value})} />
                      <span>/</span>
                      <input type="number" className="w-1/2 border p-2 rounded-lg text-center" value={vitals.bpDiastolic} onChange={e => setVitals({...vitals, bpDiastolic: +e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">ชีพจร (PR)</label>
                    <input type="number" className="w-full border p-2 rounded-lg" value={vitals.pulse} onChange={e => setVitals({...vitals, pulse: +e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">SpO2 (%)</label>
                    <input type="number" className="w-full border p-2 rounded-lg" value={vitals.spo2} onChange={e => setVitals({...vitals, spo2: +e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">อัตราการหายใจ (RR /min)</label>
                    <input type="number" className="w-full border p-2 rounded-lg" value={vitals.rr || 0} onChange={e => setVitals({...vitals, rr: +e.target.value})} />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 border-l-4 border-emerald-500 pl-3 uppercase text-xs tracking-wider">อาการสำคัญ (Chief Complaint)</h4>
                <textarea 
                  rows={2}
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="ผู้ป่วยมีอาการอะไรมา..."
                  value={cc}
                  onChange={e => setCc(e.target.value)}
                />
              </section>

              <section className="space-y-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 border-l-4 border-emerald-500 pl-3 uppercase text-xs tracking-wider">อาการเจ็บป่วยปัจจุบัน (Present Illness)</h4>
                <textarea 
                  rows={4}
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="รายละเอียดอาการเจ็บป่วยปัจจุบัน..."
                  value={pi}
                  onChange={e => setPi(e.target.value)}
                />
              </section>

              {/* Document Configuration Inputs relocated to Sidebar */}
              <section className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-orange-500" />
                  ตั้งค่าเอกสารเพิ่มเติม
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">พักรักษา (วัน)</label>
                    <input 
                      type="number" 
                      className="w-full border p-2 rounded-lg text-sm font-bold bg-white" 
                      value={sickLeaveDays} 
                      onChange={e => setSickLeaveDays(+e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ส่งตัวไปยัง</label>
                    <input 
                      className="w-full border p-2 rounded-lg text-sm font-bold bg-white" 
                      value={referralTarget} 
                      onChange={e => setReferralTarget(e.target.value)} 
                      placeholder="ชื่อโรงพยาบาล"
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setSelectedVisit(null)}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                  >
                    ปิด
                  </button>
                  <button 
                    onClick={() => {
                      setActiveDoc('Triage');
                      handlePrint('Triage');
                    }}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl flex items-center gap-2 text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    ใบซักประวัติ
                  </button>
                  <button 
                    onClick={() => {
                      setActiveDoc('OPD');
                      handlePrint('OPDCard');
                    }}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl flex items-center gap-2 text-xs"
                  >
                    <Printer className="w-4 h-4 text-orange-500" />
                    OPD Card
                  </button>
                  <button 
                    onClick={() => {
                      setActiveDoc('SickLeave');
                      setTimeout(() => {
                        handlePrint('MedicalCertificate');
                        setActiveDoc(null);
                      }, 500);
                    }}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl flex items-center gap-2 text-xs"
                  >
                    <Printer className="w-4 h-4 text-emerald-500" />
                    ใบรับรองแพทย์
                  </button>
                  <button 
                    onClick={() => {
                      setActiveDoc('Referral');
                      setTimeout(() => {
                        handlePrint('Referral');
                        setActiveDoc(null);
                      }, 500);
                    }}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl flex items-center gap-2 text-xs"
                  >
                    <Printer className="w-4 h-4 text-purple-500" />
                    ใบส่งตัว
                  </button>
                </div>
                <button 
                  onClick={handleSave}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <Save className="w-5 h-5" />
                  บันทึกและส่งตรวจ
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-xl border border-dashed border-slate-300 h-[600px] flex flex-col items-center justify-center text-slate-400">
            <Activity className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">กรุณาเลือกผู้ป่วยจากคิวทางด้านซ้ายเพื่อเริ่มคัดกรอง</p>
          </div>
        )}
      </div>

      {activeDoc && <DocumentModal type={activeDoc} />}
    </div>
  );
};

export default Triage;
