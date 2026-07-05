
import React, { useState } from 'react';
import { CreditCard, Printer, CheckCircle2, DollarSign, FileText, Trash2, X, Pill, ChevronRight, Search, ArrowLeft, AlertCircle, Edit2 } from 'lucide-react';
import { Visit, Patient, ClinicInfo, Transaction, PrescriptionItem, PrintedDoc, CheckupProgram } from '../types';

interface BillingProps {
  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  patients: Patient[];
  clinicInfo: ClinicInfo;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  deleteVisit: (id: string) => void;
  checkupPrograms: CheckupProgram[];
}

const Billing: React.FC<BillingProps> = ({ visits, setVisits, patients, clinicInfo, transactions, setTransactions, deleteVisit, checkupPrograms }) => {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [printingDrug, setPrintingDrug] = useState<PrescriptionItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer' | 'CreditCard'>('Cash');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState('');
  const billingList = visits.filter(v => v.status === 'Billing' || v.status === 'Pharmacy')
    .sort((a, b) => a.queueNumber - b.queueNumber);

  // Print Management
  React.useEffect(() => {
    if (isPrinting || printingDrug) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPrinting, printingDrug]);

  // Barcode Scanner Integration
  React.useEffect(() => {
    const handleBarcode = (e: any) => {
      const barcode = e.detail;
      // In Billing, scanning a patient HN should select their visit
      const visit = billingList.find(v => {
        const p = patients.find(pt => pt.id === v.patientId);
        return p?.hn === barcode;
      });
      if (visit) {
        setSelectedVisit(visit);
      }
    };
    window.addEventListener('barcodeScanned', handleBarcode);
    return () => window.removeEventListener('barcodeScanned', handleBarcode);
  }, [billingList, patients]);

  const calculateCalculatedSum = (visit: Visit) => {
    let total = 0;
    const program = checkupPrograms.find(p => p.id === visit.appliedCheckupId);
    if (program) {
      total += program.totalPrice;
      (visit.labOrders || []).forEach(l => {
        if (!program.labTestIds.includes(l.labTestId)) total += l.price;
      });
      (visit.procedures || []).forEach(p => {
        if (!program.procedureIds.includes(p.procedureId)) total += (p.price - (p.discount || 0));
      });
    } else {
      total += (visit.procedures || []).reduce((sum, p) => sum + (p.price - (p.discount || 0)), 0);
      total += (visit.labOrders || []).reduce((sum, l) => sum + l.price, 0);
    }
    total += (visit.prescriptions || []).reduce((sum, d) => sum + (d.amount * d.pricePerUnit), 0);
    return total;
  };

  const handleRecalculate = (visit: Visit) => {
    const newTotal = calculateCalculatedSum(visit);
    if (window.confirm(`ยอดเดิม ฿${visit.totalAmount.toLocaleString()} ยอดใหม่ตามรายการตรวจ ฿${newTotal.toLocaleString()}\nยืนยันปรับยอดให้ตรงตามรายการ?`)) {
      setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, totalAmount: newTotal } : v));
      if (selectedVisit?.id === visit.id) {
        setSelectedVisit({ ...selectedVisit, totalAmount: newTotal });
      }
    }
  };

  const removeProgramFromVisit = (visit: Visit) => {
    if (window.confirm('ยกเลิกการใช้ราคาแบบโปรแกรมเหมาจ่าย? (ระบบจะคิดราคาทุกรายการเป็นรายชิ้น)')) {
      const updatedVisit = { ...visit, appliedCheckupId: undefined };
      const newTotal = calculateCalculatedSum(updatedVisit);
      setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, appliedCheckupId: undefined, totalAmount: newTotal } : v));
      setSelectedVisit({ ...selectedVisit!, appliedCheckupId: undefined, totalAmount: newTotal });
    }
  };

  const handlePay = () => {
    if (!selectedVisit) return;

    const isOTC = selectedVisit.chiefComplaint === 'ซื้อยาโดยตรง (OTC)';

    // Record Transaction (Only if not already paid for this visit today)
    const existingTx = transactions.find(tx => tx.visitId === selectedVisit.id && tx.type === 'Income');
    
    if (existingTx) {
      // Re-payment for the same visit (e.g. after edit)
      setTransactions(prev => prev.map(tx => 
        tx.id === existingTx.id 
          ? { ...tx, amount: selectedVisit.totalAmount, date: new Date().toISOString(), paymentMethod } 
          : tx
      ));
    } else {
      const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        type: 'Income',
        category: isOTC ? 'Medicine Sale (OTC)' : 'Clinic Service',
        amount: selectedVisit.totalAmount,
        description: isOTC 
          ? `Direct sale to ${patients.find(p => p.id === selectedVisit.patientId)?.firstName} ${patients.find(p => p.id === selectedVisit.patientId)?.lastName}`
          : `Payment for visit ${selectedVisit.id}`,
        paymentMethod,
        visitId: selectedVisit.id
      };
      setTransactions(prev => [...prev, newTx]);
    }

    // Update Visit
    const newDoc: PrintedDoc = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Receipt',
      timestamp: new Date().toISOString(),
      printedBy: 'Staff'
    };

    setVisits(prev => prev.map(v => 
      v.id === selectedVisit.id ? { 
        ...v, 
        status: 'Completed', 
        paymentStatus: 'Paid', 
        paymentMethod,
        printedDocs: [...(v.printedDocs || []), newDoc]
      } : v
    ));

    alert('ชำระเงินเรียบร้อยแล้ว');
    // Auto print receipt after payment
    setIsPrinting(true);
  };

  const sendBackToDoctor = () => {
    if (!selectedVisit) return;
    if (window.confirm('ส่งผู้ป่วยกลับห้องตรวจ? (บิลเดิมจะถูกยกเลิกเพื่อคำนวณใหม่)')) {
      setTransactions(prev => prev.filter(t => t.visitId !== selectedVisit.id));
      setVisits(prev => prev.map(v => v.id === selectedVisit.id ? { ...v, status: 'Examination', paymentStatus: 'Pending' } : v));
      setSelectedVisit(null);
    }
  };

  const handlePrint = () => {
    if (selectedVisit) {
      const newDoc: PrintedDoc = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'Receipt',
        timestamp: new Date().toISOString(),
        printedBy: 'Staff'
      };
      setVisits(prev => prev.map(v => 
        v.id === selectedVisit.id 
          ? { ...v, printedDocs: [...(v.printedDocs || []), newDoc] } 
          : v
      ));
    }
    setIsPrinting(true);
  };

  const historyList = visits
    .filter(v => v.status === 'Completed')
    .filter(v => {
      if (!historySearch) return true;
      const p = patients.find(pt => pt.id === v.patientId);
      return p?.firstName.includes(historySearch) || p?.lastName.includes(historySearch) || p?.hn.includes(historySearch);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            {showHistory ? 'ประวัติการชำระเงิน' : 'รอชำระเงิน (Billing)'}
          </h2>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
          >
            {showHistory ? 'กลับไปหน้า Billing' : 'ดูประวัติย้อนหลัง'}
            <ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showHistory && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ/HN..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-3">
          {!showHistory ? (
            billingList.length > 0 ? billingList.map(v => {
              const p = patients.find(pt => pt.id === v.patientId);
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVisit(v)}
                  className={`w-full text-left p-4 rounded-xl border transition-all relative group cursor-pointer ${
                    selectedVisit?.id === v.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-emerald-700">{p?.hn}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        v.status === 'Pharmacy' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {v.status === 'Pharmacy' ? 'รอรับยา' : 'รอชำระเงิน'}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-800">฿{v.totalAmount.toLocaleString()}</span>
                        {(() => {
                          const calculatedSum = calculateCalculatedSum(v);
                          const diff = v.totalAmount - calculatedSum;
                          if (Math.abs(diff) > 0.01) {
                            return (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRecalculate(v); }}
                                className="flex items-center gap-1 text-[8px] bg-red-100 text-red-600 px-1 py-0.5 rounded border border-red-200 mt-1 hover:bg-red-200 animate-pulse" 
                                title={`ยอดไม่ตรงกัน: ต่างกัน ฿${diff.toLocaleString()}`}
                              >
                                <AlertCircle className="w-2.5 h-2.5" /> แก้ไขยอดไม่ตรง
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
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
                  <p className="font-semibold text-slate-800">{p?.firstName} {p?.lastName}</p>
                </div>
              );
            }) : (
              <div className="bg-white p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400">
                ไม่มีผู้ป่วยรอชำระเงิน
              </div>
            )
          ) : (
            historyList.length > 0 ? historyList.map(v => {
              const p = patients.find(pt => pt.id === v.patientId);
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVisit(v)}
                  className={`w-full text-left p-4 rounded-xl border transition-all relative group cursor-pointer ${
                    selectedVisit?.id === v.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-500">{p?.hn}</span>
                    <span className="text-xs text-slate-400">{new Date(v.date).toLocaleDateString('th-TH')}</span>
                  </div>
                  <p className="font-semibold text-slate-800">{p?.firstName} {p?.lastName}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-bold text-emerald-600">฿{v.totalAmount.toLocaleString()}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">ชำระแล้ว</span>
                  </div>
                </div>
              );
            }) : (
              <div className="bg-white p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400">
                ไม่พบประวัติการชำระเงิน
              </div>
            )
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {selectedVisit ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px]">
            {/* Invoice Preview */}
            <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100 bg-white" id="printable-doc">
               <div className="flex justify-between items-start mb-4 no-print">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">Pre-Invoice Preview</span>
                  <button 
                    onClick={sendBackToDoctor}
                    className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold border border-red-100 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> ส่งกลับห้องตรวจ
                  </button>
               </div>
               <div className="text-center mb-8">
                 {clinicInfo.logo && (
                   <img 
                     src={clinicInfo.logo} 
                     alt="Clinic Logo" 
                     className="h-16 mx-auto mb-4 object-contain"
                     referrerPolicy="no-referrer"
                   />
                 )}
                 <h2 className="text-lg font-bold text-slate-800">{clinicInfo.name}</h2>
                 <p className="text-[10px] text-slate-500">{clinicInfo.address}</p>
                 <p className="text-[10px] text-slate-500">โทร: {clinicInfo.phone} | เลขผู้เสียภาษี: {clinicInfo.taxId}</p>
                 <div className="h-px bg-slate-200 my-4" />
                 <h3 className="font-bold uppercase tracking-widest text-slate-700">ใบเสร็จรับเงิน / ใบสรุปค่าใช้จ่าย</h3>
               </div>

               <div className="flex justify-between text-xs mb-6">
                 <div>
                    <p><span className="font-bold">ชื่อ:</span> {patients.find(p => p.id === selectedVisit.patientId)?.firstName} {patients.find(p => p.id === selectedVisit.patientId)?.lastName}</p>
                    <p><span className="font-bold">HN:</span> {patients.find(p => p.id === selectedVisit.patientId)?.hn}</p>
                 </div>
                 <div className="text-right">
                    <p><span className="font-bold">วันที่:</span> {new Date(selectedVisit.date).toLocaleDateString('th-TH')}</p>
                    <p><span className="font-bold">เลขที่:</span> REC-{selectedVisit.id.substr(0,5).toUpperCase()}</p>
                 </div>
               </div>

               <table className="w-full text-xs mb-8">
                 <thead className="border-b-2 border-slate-800">
                    <tr>
                      <th className="text-left py-2">รายการ</th>
                      <th className="text-right py-2">จำนวน</th>
                      <th className="text-right py-2">ราคา/หน่วย</th>
                      <th className="text-right py-2">รวม</th>
                       <th className="text-right py-2 no-print">สลาก</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {/* Checkup Program (Bundled) */}
                    {selectedVisit.appliedCheckupId && (
                      <tr className="bg-emerald-50/30">
                        <td className="py-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-emerald-700">
                                {checkupPrograms.find(c => c.id === selectedVisit.appliedCheckupId)?.name || 'โปรแกรมตรวจสุขภาพ (ไม่พบข้อมูล)'}
                              </p>
                              <div className="text-[9px] text-slate-500 mt-0.5 space-y-0.5">
                                {(() => {
                                  const prog = checkupPrograms.find(c => c.id === selectedVisit.appliedCheckupId);
                                  if (!prog) return <p className="text-red-500">⚠ ข้อมูลโปรแกรมถูกลบจากระบบแล้ว</p>;
                                  
                                  const coveredLabs = selectedVisit.labOrders?.filter(l => prog.labTestIds.includes(l.labTestId)).map(l => l.name);
                                  const coveredProcs = selectedVisit.procedures.filter(p => prog.procedureIds.includes(p.procedureId)).map(p => p.name);
                                  
                                  return (
                                    <>
                                      {(coveredLabs?.length || 0) > 0 && <p>• ครอบคลุมแล็บ: {coveredLabs?.join(', ')}</p>}
                                      {(coveredProcs?.length || 0) > 0 && <p>• ครอบคลุมหัตถการ: {coveredProcs?.join(', ')}</p>}
                                      {prog.labTestIds.filter(id => !selectedVisit.labOrders?.find(l => l.labTestId === id)).length > 0 && (
                                        <p className="text-amber-600 font-bold">⚠ มีรายการในโปรแกรมที่ไม่ได้สั่งตรวจ</p>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            <button 
                              onClick={() => removeProgramFromVisit(selectedVisit)}
                              className="no-print text-[9px] bg-white border border-emerald-200 text-emerald-600 px-1.5 py-0.5 rounded hover:bg-emerald-100 font-bold"
                            >
                              ยกเลิกโปรแกรม
                            </button>
                          </div>
                        </td>
                        <td className="text-right py-2">1</td>
                        <td className="text-right py-2">
                          {checkupPrograms.find(c => c.id === selectedVisit.appliedCheckupId)?.totalPrice.toLocaleString() || '0'}
                        </td>
                        <td className="text-right py-2 font-bold text-emerald-700">
                          {checkupPrograms.find(c => c.id === selectedVisit.appliedCheckupId)?.totalPrice.toLocaleString() || '0'}
                        </td>
                        <td className="no-print"></td>
                      </tr>
                    )}

                    {/* Drugs */}
                    {(selectedVisit.prescriptions || []).map(d => (
                      <tr key={d.id}>
                        <td className="py-2">{d.name}</td>
                        <td className="text-right py-2">{d.amount}</td>
                        <td className="text-right py-2">{d.pricePerUnit}</td>
                        <td className="text-right py-2">{(d.amount * d.pricePerUnit).toLocaleString()}</td>
                         <td className="text-right py-2 no-print">
                            <button 
                              onClick={() => setPrintingDrug(d)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="พิมพ์สลากยา"
                            >
                              <Pill className="w-3 h-3" />
                            </button>
                         </td>
                      </tr>
                    ))}

                    {/* Procedures (Only those NOT in program) */}
                    {(selectedVisit.procedures || []).filter(p => {
                      if (!selectedVisit.appliedCheckupId) return true;
                      const program = checkupPrograms.find(c => c.id === selectedVisit.appliedCheckupId);
                      return !program?.procedureIds.includes(p.procedureId);
                    }).map(p => (
                      <tr key={p.id}>
                        <td className="py-2">
                          <div>
                            {p.name}
                            {p.discount > 0 && <span className="text-[10px] text-orange-600 block font-bold">ส่วนลด: -฿{p.discount.toLocaleString()}</span>}
                          </div>
                        </td>
                        <td className="text-right py-2">1</td>
                        <td className="text-right py-2">{(p.price).toLocaleString()}</td>
                        <td className="text-right py-2 font-bold focus:text-emerald-700">{(p.price - (p.discount || 0)).toLocaleString()}</td>
                         <td className="no-print"></td>
                      </tr>
                    ))}

                    {/* Labs (Only those NOT in program) */}
                    {(selectedVisit.labOrders || []).filter(l => {
                      if (!selectedVisit.appliedCheckupId) return true;
                      const program = checkupPrograms.find(c => c.id === selectedVisit.appliedCheckupId);
                      return !program?.labTestIds.includes(l.labTestId);
                    }).map(l => (
                      <tr key={l.id}>
                        <td className="py-2">{l.name} (Lab)</td>
                        <td className="text-right py-2">1</td>
                        <td className="text-right py-2">{l.price}</td>
                        <td className="text-right py-2">{l.price.toLocaleString()}</td>
                         <td className="no-print"></td>
                      </tr>
                    ))}
                  </tbody>
                 <tfoot className="border-t-2 border-slate-800">
                    <tr className="font-bold">
                      <td colSpan={3} className="py-4 text-right">ยอดรวมสุทธิ</td>
                      <td className="py-4 text-right">฿{selectedVisit.totalAmount.toLocaleString()}</td>
                       <td className="no-print"></td>
                    </tr>
                 </tfoot>
               </table>

               <div className="text-[10px] text-slate-400 text-center mt-12">
                 <p>*** ขอบคุณที่ใช้บริการ ***</p>
               </div>
            </div>

            {/* Payment Panel */}
            <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <h4 className="font-bold text-slate-800">ช่องทางการชำระเงิน</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 bg-white border rounded-lg flex flex-col items-center gap-1 transition-all ${paymentMethod === 'Cash' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'}`}
                  >
                    <DollarSign className={`w-6 h-6 ${paymentMethod === 'Cash' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${paymentMethod === 'Cash' ? 'text-emerald-700' : 'text-slate-500'}`}>เงินสด</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('Transfer')}
                    className={`p-3 bg-white border rounded-lg flex flex-col items-center gap-1 transition-all ${paymentMethod === 'Transfer' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'}`}
                  >
                    <CreditCard className={`w-6 h-6 ${paymentMethod === 'Transfer' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${paymentMethod === 'Transfer' ? 'text-emerald-700' : 'text-slate-500'}`}>โอน/บัตร</span>
                  </button>
                </div>

                <div className="bg-emerald-600 text-white p-4 rounded-xl text-center relative group">
                  <p className="text-xs opacity-80 uppercase font-bold mb-1">Total to Pay</p>
                  {isEditingTotal ? (
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-xl">฿</span>
                      <input 
                        type="number" 
                        className="bg-white/20 border-white/40 border text-white text-2xl font-bold w-32 px-2 py-1 rounded outline-none"
                        value={tempTotal}
                        onChange={(e) => setTempTotal(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if(e.key === 'Enter') {
                            const val = parseFloat(tempTotal);
                            if(!isNaN(val)) {
                              setVisits(prev => prev.map(v => v.id === selectedVisit.id ? { ...v, totalAmount: val } : v));
                              setSelectedVisit({ ...selectedVisit, totalAmount: val });
                            }
                            setIsEditingTotal(false);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <p className="text-3xl font-bold">฿{selectedVisit.totalAmount.toLocaleString()}</p>
                      <button 
                        onClick={() => {
                          setIsEditingTotal(true);
                          setTempTotal(selectedVisit.totalAmount.toString());
                        }}
                        className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="แก้ไขยอดเงินด้วยตนเอง"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handlePay}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                >
                  ยืนยันชำระเงิน
                </button>
                <button 
                  onClick={handlePrint}
                  className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  พิมพ์ใบสรุป / ใบเสร็จ
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-xl border border-dashed border-slate-300 h-96 flex flex-col items-center justify-center text-slate-400">
            <CreditCard className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">กรุณาเลือกผู้ป่วยจากคิวทางด้านซ้ายเพื่อสรุปบิล</p>
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
                  className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
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

export default Billing;
