
import React, { useState } from 'react';
import { Pill, CheckCircle, Clock, Trash2, ArrowLeft, AlertCircle, Printer, X } from 'lucide-react';
import { Visit, Patient, Drug, ClinicInfo, PrescriptionItem } from '../types';
import { saveStockLog } from '../services/firebaseService';

interface PharmacyProps {
  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  patients: Patient[];
  drugs: Drug[];
  setDrugs: React.Dispatch<React.SetStateAction<Drug[]>>;
  clinicInfo: ClinicInfo;
  deleteVisit: (id: string) => void;
}

const Pharmacy: React.FC<PharmacyProps> = ({ visits, setVisits, patients, drugs, setDrugs, clinicInfo, deleteVisit }) => {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [printingDrug, setPrintingDrug] = useState<PrescriptionItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const pharmacyList = visits.filter(v => ['Pharmacy'].includes(v.status))
    .sort((a, b) => a.queueNumber - b.queueNumber);
  
  // Print Management
  React.useEffect(() => {
    if (isPrinting || printingDrug) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isPrinting, printingDrug]);
  
  // Barcode Scanner Integration
  React.useEffect(() => {
    const handleBarcode = (e: any) => {
      const barcode = e.detail;
      // In Pharmacy, scanning a patient HN should select their visit
      const visit = pharmacyList.find(v => {
        const p = patients.find(pt => pt.id === v.patientId);
        return p?.hn === barcode;
      });
      if (visit) {
        setSelectedVisit(visit);
      }
    };
    window.addEventListener('barcodeScanned', handleBarcode);
    return () => window.removeEventListener('barcodeScanned', handleBarcode);
  }, [pharmacyList, patients]);
  
  const handleDispense = () => {
    if (!selectedVisit) return;
    const patientObj = patients.find(p => p.id === selectedVisit.patientId);
    setDrugs(prev => prev.map(d => {
      const order = selectedVisit.prescriptions.find(p => p.drugId === d.id);
      if (order) {
        const newStock = Math.max(0, d.stock - order.amount);
        saveStockLog(
          { id: d.id, name: d.name },
          -order.amount,
          'pharmacy_dispense',
          `จ่ายยาให้ผู้ป่วย: ${patientObj ? `${patientObj.firstName} ${patientObj.lastName}` : 'ไม่ระบุนาม'} (HN: ${patientObj?.hn || 'ไม่มี'} | คิวขอนัด: ${selectedVisit.queueNumber})`,
          'Drug',
          d.stock,
          newStock,
          'ห้องจ่ายยา'
        );
        return { ...d, stock: newStock };
      }
      return d;
    }));
    setVisits(prev => prev.map(v => 
      v.id === selectedVisit.id ? { ...v, status: 'Billing' } : v
    ));
    setSelectedVisit(null);
    alert('จ่ายยาเรียบร้อย ส่งชำระเงิน');
  };

  const sendBackToDoctor = () => {
    if (!selectedVisit) return;
    if (window.confirm('ส่งผู้ป่วยกลับห้องตรวจ?')) {
      setVisits(prev => prev.map(v => v.id === selectedVisit.id ? { ...v, status: 'Examination' } : v));
      setSelectedVisit(null);
    }
  };

  const handlePrintLabel = (item: PrescriptionItem) => {
    setPrintingDrug(item);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          คิวรอจ่ายยา
        </h2>
        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
          {pharmacyList.length > 0 ? pharmacyList.map(v => {
            const p = patients.find(pt => pt.id === v.patientId);
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVisit(v)}
                className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
                  selectedVisit?.id === v.id ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${v.status === 'Pharmacy' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{p?.hn}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold">{v.status}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVisit(v.id);
                        if (selectedVisit?.id === v.id) setSelectedVisit(null);
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="ลบคิวนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="font-bold text-slate-800">{p?.firstName} {p?.lastName}</p>
                <p className="text-[10px] text-slate-500 mt-1">{(v.prescriptions || []).length} รายการยา | {(v.procedures || []).length} หัตถการ</p>
              </div>
            );
          }) : (
            <div className="bg-white p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 font-medium">ไม่มีผู้ป่วยในรายการ</div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {selectedVisit ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">ยืนยันรายการจ่ายยาและหัตถการ</h3>
                <p className="text-sm text-slate-500">
                  {patients.find(p => p.id === selectedVisit.patientId)?.firstName} {patients.find(p => p.id === selectedVisit.patientId)?.lastName} (HN: {patients.find(p => p.id === selectedVisit.patientId)?.hn})
                </p>
              </div>
              <button onClick={sendBackToDoctor} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-bold border border-red-100 transition-colors">
                <ArrowLeft className="w-4 h-4" /> ส่งกลับห้องตรวจ
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 border-l-4 border-orange-500 pl-3 uppercase text-xs tracking-wider">รายการยา</h4>
                <div className="space-y-3">
                  {(selectedVisit.prescriptions || []).map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-start group">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1 font-medium">{item.instruction}</p>
                        {item.precautions && <p className="text-[10px] text-red-500 font-bold mt-1 italic">⚠️ {item.precautions}</p>}
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 italic">{item.purpose || 'รักษาตามอาการ'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className="text-sm font-bold text-slate-700 whitespace-nowrap">x {item.amount} {item.unit}</span>
                        <button 
                          onClick={() => handlePrintLabel(item)}
                          className="bg-white text-slate-600 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
                          title="พิมพ์สลากยา"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!(selectedVisit.prescriptions || []).length && <p className="text-sm text-slate-400 italic">ไม่มีรายการยา</p>}
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 border-l-4 border-emerald-500 pl-3 uppercase text-xs tracking-wider">หัตถการ / อื่นๆ</h4>
                <div className="space-y-2">
                  {(selectedVisit.procedures || []).map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                  ))}
                  {!(selectedVisit.procedures || []).length && <p className="text-sm text-slate-400 italic">ไม่มีรายการหัตถการ</p>}
                </div>
              </section>
            </div>

            <div className="p-6 border-t bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-xs font-medium">กรุณาตรวจสอบชื่อ-นามสกุล และความถูกต้องของยาทั้งหมดตามมาตรฐานความปลอดภัย</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setSelectedVisit(null)} className="px-6 py-2 text-slate-500 font-bold hover:bg-white rounded-lg">ปิด</button>
                <button onClick={handleDispense} className="flex-1 md:flex-none bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-[0.98]">
                  <Pill className="w-5 h-5" /> ยืนยันการจ่ายยาและส่งชำระเงิน
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-xl border border-dashed border-slate-300 h-[600px] flex flex-col items-center justify-center text-slate-400">
            <Pill className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">กรุณาเลือกผู้ป่วยจากคิวทางด้านซ้ายเพื่อดำเนินการจ่ายยา</p>
          </div>
        )}
      </div>

      {/* Prescription Label Modal (SSJ Ubon Standard) */}
      {printingDrug && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><Printer className="w-4 h-4" /> ตัวอย่างสลากยา</h4>
                <button onClick={() => setPrintingDrug(null)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             
             <div className="p-10 flex justify-center bg-slate-50">
                {/* Standard Drug Label Card */}
                <div id="drug-label" className="w-[8cm] min-h-[5cm] bg-white border border-slate-300 p-4 font-['Sarabun'] shadow-sm text-slate-900 leading-tight">
                   <header className="border-b border-slate-300 pb-2 mb-2 text-center">
                      <h5 className="text-sm font-bold truncate">{clinicInfo.name}</h5>
                      <p className="text-[8px] truncate">{clinicInfo.address}</p>
                      <p className="text-[8px] font-bold">โทร: {clinicInfo.phone}</p>
                   </header>
                   
                   <section className="space-y-1 mb-3">
                      <div className="flex justify-between text-[10px]">
                         <p><span className="font-bold">ผู้ป่วย:</span> {patients.find(p => p.id === selectedVisit?.patientId)?.firstName} {patients.find(p => p.id === selectedVisit?.patientId)?.lastName}</p>
                         <p><span className="font-bold">HN:</span> {patients.find(p => p.id === selectedVisit?.patientId)?.hn}</p>
                      </div>
                      <p className="text-[10px]"><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
                   </section>

                   <section className="mb-3">
                      <p className="text-sm font-bold text-slate-800 uppercase border-b border-slate-100 pb-1">{printingDrug.name}</p>
                      <div className="bg-slate-100 p-2 mt-1 rounded text-center">
                         <p className="text-xs font-bold whitespace-pre-wrap">{printingDrug.instruction}</p>
                         {printingDrug.precautions && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ {printingDrug.precautions}</p>}
                      </div>
                   </section>

                   <footer className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-emerald-700">
                         <p>สรรพคุณ: {printingDrug.purpose || 'รักษาตามอาการ'}</p>
                         <p>จำนวน: {printingDrug.amount} {printingDrug.unit}</p>
                      </div>
                      <div className="bg-red-50 p-1 text-[8px] text-red-600 font-bold border-t border-red-100 mt-2">
                         <p>คำเตือน: ยานี้อาจทำให้ง่วงซึม (กรณีเป็นยาแก้แพ้/แก้ปวดเกร็ง)</p>
                         <p>ห้ามใช้เมื่อหมดอายุ เก็บให้พ้นมือเด็ก</p>
                      </div>
                   </footer>
                </div>
             </div>

             <div className="p-6 bg-white border-t flex justify-end gap-3 no-print">
                <button onClick={() => setPrintingDrug(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                <button 
                  onClick={() => setIsPrinting(true)} 
                  className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                   <Printer className="w-5 h-5" /> พิมพ์สลากยา (Print)
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pharmacy;
