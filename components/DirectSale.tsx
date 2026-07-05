
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, History, Plus, Trash2, Save, Printer, User, Pill, ArrowRight, Loader2, CheckCircle2, X } from 'lucide-react';
import { Patient, Visit, Drug, PrescriptionItem, Transaction, ClinicInfo } from '../types';

interface DirectSaleProps {
  patients: Patient[];
  visits: Visit[];
  setVisits: (action: any) => void;
  drugs: Drug[];
  setDrugs: (action: any) => void;
  transactions: Transaction[];
  setTransactions: (action: any) => void;
  clinicInfo: ClinicInfo;
}

const DirectSale: React.FC<DirectSaleProps> = ({ 
  patients, visits, setVisits, drugs, setDrugs, transactions, setTransactions, clinicInfo 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [basket, setBasket] = useState<PrescriptionItem[]>([]);
  const [patientHistory, setPatientHistory] = useState<PrescriptionItem[]>([]);
  const [drugSearch, setDrugSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastFinishedVisit, setLastFinishedVisit] = useState<Visit | null>(null);

  const handlePrintReceipt = () => {
    window.print();
  };

  // Barcode Scanner Integration
  useEffect(() => {
    const handleBarcode = (e: any) => {
      const barcode = e.detail;
      // 1. Try to find patient by HN
      const patient = patients.find(p => p.hn === barcode);
      if (patient) {
        handleSelectPatient(patient);
        return;
      }
      // 2. Try to find drug by barcode
      const drug = drugs.find(d => d.barcode === barcode);
      if (drug) {
        addToBasket(drug);
      }
    };
    window.addEventListener('barcodeScanned', handleBarcode);
    return () => window.removeEventListener('barcodeScanned', handleBarcode);
  }, [patients, drugs]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearchTerm('');
    setLastFinishedVisit(null);
    
    // Extract unique previous medications
    const historyVisits = visits.filter(v => v.patientId === p.id && v.status === 'Completed');
    const allMeds: PrescriptionItem[] = [];
    const seenDrugIds = new Set();

    historyVisits.forEach(v => {
      v.prescriptions.forEach(pre => {
        if (!seenDrugIds.has(pre.drugId)) {
          allMeds.push(pre);
          seenDrugIds.add(pre.drugId);
        }
      });
    });
    setPatientHistory(allMeds);
  };

  const addToBasket = (drug: Drug | PrescriptionItem) => {
    const drugId = 'drugId' in drug ? drug.drugId : drug.id;
    const existing = basket.find(item => item.drugId === drugId);
    
    if (existing) {
      setBasket(prev => prev.map(item => 
        item.drugId === drugId ? { ...item, amount: item.amount + 1 } : item
      ));
    } else {
      const price = 'price' in drug ? drug.price : drug.pricePerUnit;
      const newItem: PrescriptionItem = {
        id: Math.random().toString(36).substr(2, 9),
        drugId: drugId,
        name: drug.name,
        amount: 1,
        unit: drug.unit,
        pricePerUnit: price,
        instruction: drug.instruction || '',
        purpose: (drug as any).purpose || ''
      };
      setBasket(prev => [...prev, newItem]);
    }
  };

  const removeFromBasket = (id: string) => {
    setBasket(prev => prev.filter(item => item.id !== id));
  };

  const updateAmount = (id: string, amount: number) => {
    if (amount <= 0) return;
    setBasket(prev => prev.map(item => item.id === id ? { ...item, amount } : item));
  };

  const calculateTotal = () => {
    return basket.reduce((sum, item) => sum + (item.amount * item.pricePerUnit), 0);
  };

  const [printingDrug, setPrintingDrug] = useState<PrescriptionItem | null>(null);

  const handleCheckout = async () => {
    if (!selectedPatient || basket.length === 0) return;
    
    setIsProcessing(true);
    const total = calculateTotal();
    const visitId = Math.random().toString(36).substr(2, 9);
    
    // 1. Create Pharmacy Visit (User wants it to go to Pharmacy page first)
    const newVisit: Visit = {
      id: visitId,
      patientId: selectedPatient.id,
      date: new Date().toISOString(),
      queueNumber: 0, 
      status: 'Pharmacy', // Send to Pharmacy instead of Completed
      chiefComplaint: 'ซื้อยาโดยตรง (OTC)',
      prescriptions: basket,
      procedures: [],
      labOrders: [],
      totalAmount: total,
      paymentStatus: 'Pending'
    };

    try {
      // Create the visit
      setVisits((prev: Visit[]) => [...prev, newVisit]);
      
      setLastFinishedVisit(newVisit);
      setShowSuccess(true);
      
      // Clear current sale state
      setBasket([]);
      setSelectedPatient(null);

      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      
      alert('ส่งข้อมูลไปห้องจ่ายยาเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Checkout error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPatients = searchTerm.length >= 2 
    ? patients.filter(p => 
        p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.hn.includes(searchTerm)
      ).slice(0, 5)
    : [];

  const filteredDrugs = drugSearch.length >= 2
    ? drugs.filter(d => d.name.toLowerCase().includes(drugSearch.toLowerCase()) || d.barcode?.includes(drugSearch)).slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
            ซื้อขายยาโดยตรง (Direct Sale)
          </h1>
          <p className="text-slate-500">จำหน่ายยาโดยไม่ต้องผ่านขั้นตอนการตรวจรักษา</p>
        </div>
      </header>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-bold">บันทึกการขายและตัดสต็อกเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Patient & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Search */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              เลือกผู้ป่วย
            </h3>
            {!selectedPatient ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อ หรือ HN (สแกนบาร์โค้ดได้)..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {filteredPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                    {filteredPatients.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="w-full text-left p-4 hover:bg-slate-50 border-b last:border-0 flex justify-between items-center group"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-slate-500">HN: {p.hn} | {p.phone}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xl">
                    {selectedPatient.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p className="text-sm text-slate-600">HN: {selectedPatient.hn} | แพ้ยา: <span className="text-red-600 font-bold">{selectedPatient.allergicDrugs.join(', ') || 'ไม่มี'}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedPatient(null); setBasket([]); setPatientHistory([]); }}
                  className="text-slate-400 hover:text-red-600 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Drug Search & History */}
          {selectedPatient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* History */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" />
                  ประวัติยาเดิม
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {patientHistory.length > 0 ? patientHistory.map(med => (
                    <div key={med.id} className="p-3 border border-slate-100 rounded-lg hover:border-emerald-200 transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm text-slate-800">{med.name}</p>
                        <button 
                          onClick={() => addToBasket(med)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{med.instruction}</p>
                    </div>
                  )) : (
                    <p className="text-center text-slate-400 py-8 text-sm italic">ไม่พบประวัติยาเดิม</p>
                  )}
                </div>
              </div>

              {/* Inventory Search */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  ค้นหายาในคลัง
                </h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ชื่อยา หรือ บาร์โค้ด..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={drugSearch}
                    onChange={e => setDrugSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-[330px] overflow-y-auto pr-2">
                  {filteredDrugs.map(drug => (
                    <button 
                      key={drug.id}
                      onClick={() => addToBasket(drug)}
                      disabled={drug.stock <= 0}
                      className="w-full text-left p-3 border border-slate-100 rounded-lg hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex justify-between items-center group disabled:opacity-50"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-800">{drug.name}</p>
                        <p className="text-[10px] text-slate-500">คงเหลือ: {drug.stock} {drug.unit} | ฿{drug.price}</p>
                      </div>
                      <Plus className="w-4 h-4 text-slate-300 group-hover:text-emerald-600" />
                    </button>
                  ))}
                  {drugSearch.length >= 2 && filteredDrugs.length === 0 && (
                    <p className="text-center text-slate-400 py-8 text-sm italic">ไม่พบรายการยา</p>
                  )}
                  {drugSearch.length < 2 && (
                    <p className="text-center text-slate-400 py-8 text-sm italic">พิมพ์เพื่อค้นหายา</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Basket & Checkout */}
        <div className="space-y-6">
          {lastFinishedVisit && (
            <div className="bg-white rounded-xl border border-emerald-200 shadow-xl overflow-hidden animate-in slide-in-from-right duration-500 no-print">
               <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-5 h-5" />
                     <span className="font-bold">ขายเสร็จสมบูรณ์</span>
                  </div>
                  <button onClick={() => {
                     setLastFinishedVisit(null);
                     setSelectedPatient(null);
                     setBasket([]);
                  }} className="hover:bg-emerald-500 p-1 rounded transition-colors">
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               <div className="p-6 text-center">
                  <p className="text-sm text-slate-600 mb-4 font-bold">บันทึกข้อมูลและตัดสต็อกเรียบร้อยแล้ว</p>
                  <button 
                    onClick={handlePrintReceipt}
                    className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-lg"
                  >
                     <Printer className="w-5 h-5" /> พิมพ์ใบเสร็จทันที
                  </button>
               </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] no-print">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">รายการที่เลือก ({basket.length})</h3>
              <button onClick={() => setBasket([])} className="text-xs text-red-600 font-bold hover:underline">ล้างทั้งหมด</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {basket.length > 0 ? basket.map(item => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-sm text-slate-800 leading-tight">{item.name}</p>
                    <button onClick={() => removeFromBasket(item.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateAmount(item.id, item.amount - 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold w-8 text-center">{item.amount}</span>
                      <button 
                        onClick={() => updateAmount(item.id, item.amount + 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-slate-500 font-bold">{item.unit}</span>
                      
                      <button 
                        onClick={() => setPrintingDrug(item)}
                        className="ml-2 p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="พิมพ์สลากยา"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-bold text-emerald-700 text-sm">฿{(item.amount * item.pricePerUnit).toLocaleString()}</p>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                  <ShoppingBag className="w-12 h-12 mb-2" />
                  <p className="text-sm">ยังไม่มีรายการยา</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold">ยอดรวมสุทธิ</span>
                <span className="text-2xl font-bold text-emerald-700">฿{calculateTotal().toLocaleString()}</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={!selectedPatient || basket.length === 0 || isProcessing}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                ยืนยันการขายและตัดสต็อก
              </button>
              <p className="text-[10px] text-slate-400 text-center italic">
                * การยืนยันจะทำการตัดสต็อกยาและบันทึกรายรับทันที
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Container for Direct Sale Receipt */}
      {lastFinishedVisit && (
        <div className="fixed inset-0 bg-white z-[-1] print:z-[9999] print:block hidden overflow-y-auto p-12 font-['Sarabun']">
            <div className="text-center mb-8">
                {clinicInfo.logo && (
                  <img src={clinicInfo.logo} alt="Logo" className="h-16 mx-auto mb-4 object-contain" referrerPolicy="no-referrer" />
                )}
                <h2 className="text-lg font-bold">{clinicInfo.name}</h2>
                <p className="text-xs text-slate-500">{clinicInfo.address}</p>
                <p className="text-xs text-slate-500">โทร: {clinicInfo.phone} | {clinicInfo.taxId}</p>
                <div className="h-px bg-slate-200 my-4" />
                <h3 className="font-bold uppercase">ใบเสร็จรับเงิน (Direct Sale)</h3>
            </div>

            <div className="flex justify-between text-xs mb-6 font-bold">
                <div>
                   <p>ลูกค้า/ผู้ป่วย: {selectedPatient?.firstName} {selectedPatient?.lastName}</p>
                   <p>HN: {selectedPatient?.hn}</p>
                </div>
                <div className="text-right">
                   <p>วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                   <p>เลขที่: OTC-{lastFinishedVisit.id.substr(0,5).toUpperCase()}</p>
                </div>
            </div>

            <table className="w-full text-xs mb-8">
                <thead className="border-b-2 border-slate-800">
                    <tr>
                        <th className="text-left py-2">รายการ</th>
                        <th className="text-right py-2">จำนวน</th>
                        <th className="text-right py-2">ราคา</th>
                        <th className="text-right py-2">รวม</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {lastFinishedVisit.prescriptions.map(item => (
                        <tr key={item.id}>
                            <td className="py-2">{item.name}</td>
                            <td className="py-2 text-right">{item.amount} {item.unit}</td>
                            <td className="py-2 text-right">฿{item.pricePerUnit.toLocaleString()}</td>
                            <td className="py-2 text-right font-bold transition-all">฿{(item.amount * item.pricePerUnit).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-800 font-bold">
                    <tr>
                        <td colSpan={3} className="py-4 text-right">ยอดรวมสุทธิ</td>
                        <td className="py-4 text-right text-lg text-emerald-700">฿{lastFinishedVisit.totalAmount.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="mt-12 flex justify-between items-end">
                <div className="text-center w-40">
                   <div className="border-b border-slate-400 mb-2 h-8"></div>
                   <p className="text-[10px]">ผู้รับเงิน</p>
                </div>
                <div className="text-center w-40">
                   <p className="text-[10px] mb-8">ขอบคุณที่ใช้บริการ</p>
                   <p className="text-[10px] font-bold">{clinicInfo.name}</p>
                </div>
            </div>
        </div>
      )}

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
                   
                   <section className="space-y-1 mb-3 text-slate-900">
                      <div className="flex justify-between text-[10px]">
                         <p><span className="font-bold">ผู้ป่วย:</span> {selectedPatient?.firstName} {selectedPatient?.lastName}</p>
                         <p><span className="font-bold">HN:</span> {selectedPatient?.hn || '-'}</p>
                      </div>
                      <p className="text-[10px]"><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
                   </section>
 
                   <section className="mb-3 text-slate-900">
                      <p className="text-sm font-bold text-slate-800 uppercase border-b border-slate-100 pb-1">{printingDrug.name}</p>
                      <div className="bg-slate-100 p-2 mt-1 rounded text-center">
                         <p className="text-xs font-bold whitespace-pre-wrap">{printingDrug.instruction}</p>
                      </div>
                   </section>
 
                   <footer className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-emerald-700">
                         <p>สรรพคุณ: {printingDrug.purpose || 'รักษาตามอาการ'}</p>
                         <p>จำนวน: {printingDrug.amount} {printingDrug.unit}</p>
                      </div>
                      <div className="bg-red-50 p-1 text-[8px] text-red-600 font-bold border-t border-red-100 mt-2">
                         <p>คำเตือน: ห้ามใช้เมื่อหมดอายุ เก็บให้พ้นมือเด็ก</p>
                      </div>
                   </footer>
                </div>
             </div>
 
             <div className="p-6 bg-white border-t flex justify-end gap-3 no-print">
                <button onClick={() => setPrintingDrug(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                <button 
                  onClick={() => window.print()} 
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

export default DirectSale;
