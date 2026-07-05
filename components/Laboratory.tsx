
import React, { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, Search, Clock, Save, X, Plus, Trash2, 
  Upload, Sparkles, Loader2, Edit3, Image as ImageIcon, 
  CheckCircle2, AlertCircle, FileText, User as UserIcon,
  Calendar, RotateCcw, Printer, History
} from 'lucide-react';
import { Visit, Patient, LabOrderItem, User, LabSubTestResult, ClinicInfo } from '../types';
import { db } from '../firebase';
import { saveDocument } from '../services/firebaseService';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface LaboratoryProps {
  visits: Visit[];
  patients: Patient[];
  currentUser: User | null;
  clinicInfo: ClinicInfo;
}

const Laboratory: React.FC<LaboratoryProps> = ({ visits, patients, currentUser, clinicInfo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'Active' | 'History'>('Active');
  const [showDirectEntry, setShowDirectEntry] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [labResultForm, setLabResultForm] = useState<{
    id: string; // The labOrderItem ID currently being focused in the detail view
    labOrders: LabOrderItem[];
  }>({
    id: '',
    labOrders: []
  });
  const [activeLabIndex, setActiveLabIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter pending or recently completed labs (e.g. today or all history)
  const today = new Date().toDateString();
  
  const relevantVisits = visits.filter(v => 
    v.labOrders && v.labOrders.length > 0 && 
    (viewMode === 'History' || 
     v.labOrders.some(l => l.status === 'Pending') || 
     v.labOrders.some(l => l.status === 'Completed' && new Date(v.date).toDateString() === today))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredVisits = relevantVisits.filter(v => {
    const patient = patients.find(p => p.id === v.patientId);
    const searchString = `${patient?.firstName} ${patient?.lastName} ${patient?.hn} ${v.patientId}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const selectVisitForLabs = (visit: Visit) => {
    setEditingVisit(visit);
    setLabResultForm({
      id: visit.labOrders?.[0]?.id || '',
      labOrders: visit.labOrders || []
    });
    setActiveLabIndex(0);
  };

  const startDirectEntry = (patient: Patient) => {
    const newLab: LabOrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      labTestId: 'direct-entry',
      name: 'ผลแล็บทั่วไป / ภายนอก',
      price: 0,
      status: 'Pending',
      subTests: []
    };
    
    const dummyVisit: Visit = {
      id: 'NEW_DIRECT_ENTRY',
      patientId: patient.id,
      date: new Date().toISOString(),
      queueNumber: 0,
      status: 'Completed',
      chiefComplaint: 'บันทึกผลแล็บย้อนหลัง/ภายนอก',
      prescriptions: [],
      procedures: [],
      labOrders: [newLab],
      totalAmount: 0,
      paymentStatus: 'Paid'
    };

    setEditingVisit(dummyVisit);
    setSelectedPatient(patient);
    setLabResultForm({
      id: newLab.id,
      labOrders: [newLab]
    });
    setActiveLabIndex(0);
    setShowDirectEntry(false);
  };

  const saveVisitLabs = async () => {
    if (!editingVisit) return;
    
    const labsToSave = labResultForm.labOrders.map(l => ({
      ...l,
      status: 'Completed' as const,
      updatedAt: new Date().toISOString()
    }));

    if (editingVisit.id === 'NEW_DIRECT_ENTRY') {
      if (!selectedPatient) return;
      
      const newVisit: Visit = {
        ...editingVisit,
        id: `lab-${Date.now()}`,
        labOrders: labsToSave
      };
      
      try {
        await saveDocument('visits', newVisit);
        setEditingVisit(null);
        setSelectedPatient(null);
        alert("บันทึกผลแล็บเรียบร้อยแล้ว");
      } catch (error) {
        console.error("Error saving direct lab:", error);
        alert("ไม่สามารถบันทึกข้อมูลได้");
      }
      return;
    }

    const updatedVisit = {
      ...editingVisit,
      labOrders: labsToSave
    };

    try {
      await saveDocument('visits', updatedVisit);
      setEditingVisit(null);
    } catch (error) {
      console.error("Error saving lab results:", error);
      alert("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const updateCurrentLabField = (field: keyof LabOrderItem, value: any) => {
    setLabResultForm(prev => {
      const newLabs = [...prev.labOrders];
      newLabs[activeLabIndex] = { ...newLabs[activeLabIndex], [field]: value };
      return { ...prev, labOrders: newLabs };
    });
  };

  const addNewLabToVisit = () => {
    const newLab: LabOrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      labTestId: 'additional-entry',
      name: 'รายการเพิ่มเติม',
      price: 0,
      status: 'Pending',
      subTests: []
    };
    setLabResultForm(prev => ({
      ...prev,
      labOrders: [...prev.labOrders, newLab]
    }));
    setActiveLabIndex(labResultForm.labOrders.length);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const maxDim = 1200;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setLabResultForm(prev => {
            const newLabs = [...prev.labOrders];
            newLabs[activeLabIndex] = { 
              ...newLabs[activeLabIndex], 
              resultImages: [...(newLabs[activeLabIndex].resultImages || []), compressedBase64] 
            };
            return { ...prev, labOrders: newLabs };
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const addSubTest = () => {
    const newSub: LabSubTestResult = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      result: '',
      unit: '',
      normalRange: '',
      flag: '',
      method: ''
    };
    setLabResultForm(prev => {
      const newLabs = [...prev.labOrders];
      newLabs[activeLabIndex] = { 
        ...newLabs[activeLabIndex], 
        subTests: [...(newLabs[activeLabIndex].subTests || []), newSub] 
      };
      return { ...prev, labOrders: newLabs };
    });
  };

  const updateSubTest = (id: string, field: keyof LabSubTestResult, value: string) => {
    setLabResultForm(prev => {
      const newLabs = [...prev.labOrders];
      newLabs[activeLabIndex] = { 
        ...newLabs[activeLabIndex], 
        subTests: newLabs[activeLabIndex].subTests?.map(s => s.id === id ? { ...s, [field]: value } : s)
      };
      return { ...prev, labOrders: newLabs };
    });
  };

  const removeSubTest = (id: string) => {
    setLabResultForm(prev => {
      const newLabs = [...prev.labOrders];
      newLabs[activeLabIndex] = { 
        ...newLabs[activeLabIndex], 
        subTests: newLabs[activeLabIndex].subTests?.filter(s => s.id !== id)
      };
      return { ...prev, labOrders: newLabs };
    });
  };

  const analyzeLabImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    try {
      const base64Data = base64Image.split(',')[1];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              text: `Please read this lab result image and extract all test results into a structured format. 
              Extract every parameter, its value, unit, and reference range.
              Respond with an array of test categories found in the image.`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { 
                  type: Type.STRING,
                  description: "Name of the test category, e.g. 'CBC', 'Lipid Profile'"
                },
                result: { 
                  type: Type.STRING,
                  description: "Overall summary result for this category"
                },
                note: { type: Type.STRING },
                subTests: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      result: { type: Type.STRING },
                      flag: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      normalRange: { type: Type.STRING }
                    },
                    required: ["name", "result"]
                  }
                }
              },
              required: ["category"]
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        try {
          const extractedTests = JSON.parse(text);
          if (Array.isArray(extractedTests)) {
            setLabResultForm(prev => {
              const currentLabs = [...prev.labOrders];
              const activeLab = currentLabs[activeLabIndex];
              
              // Map extracted results
              const newLabsFromExtraction: LabOrderItem[] = extractedTests.map((t: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                labTestId: 'ai-extracted',
                name: t.category || 'ผลตรวจ AI',
                price: 0,
                result: t.result || '',
                resultNote: t.note || '',
                status: 'Completed' as const,
                subTests: t.subTests?.map((s: any) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  name: s.name || '',
                  result: s.result || '',
                  unit: s.unit || '',
                  normalRange: s.normalRange || '',
                  flag: s.flag || '',
                  method: s.method || ''
                })) || []
              }));

              // If current active lab is empty, replace it or merge
              if (activeLab.name === 'รายการเพิ่มเติม' || activeLab.name === 'ผลแล็บทั่วไป / ภายนอก') {
                // If it's a generic lab, maybe merge the first extracted one into it
                const merged = [...currentLabs];
                // For simplicity, let's just append all extracted tests and remove the generic one if it was empty
                const filtered = merged.filter((l, i) => i !== activeLabIndex || l.subTests!.length > 0);
                return { ...prev, labOrders: [...filtered, ...newLabsFromExtraction] };
              }

              return { ...prev, labOrders: [...currentLabs, ...newLabsFromExtraction] };
            });
            alert("ประมวลผลข้อมูลแล็บสำเร็จ");
          }
        } catch (e) {
          console.error("Parse error:", e);
        }
      }
    } catch (error) {
      console.error("AI Analysis Error:", error);
      alert("AI ไม่สามารถประมวลผลรูปภาพได้ในขณะนี้");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = (visitId: string, lab: LabOrderItem | null) => {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;
    const patient = patients.find(p => p.id === visit.patientId);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use specific lab or all completed labs in visit
    const labsToPrint = lab ? [lab] : (visit.labOrders || []).filter(l => l.status === 'Completed');

    const html = `
      <html>
        <head>
          <title>Lab Report - ${patient?.firstName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
            body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .clinic-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .clinic-info { font-size: 14px; color: #666; }
            .report-title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 20px; text-decoration: underline; }
            .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
            .lab-section { margin-bottom: 30px; }
            .lab-header { font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 14px; }
            th { background: #f5f5f5; font-weight: bold; }
            .flag-h { color: red; font-weight: bold; }
            .flag-l { color: blue; font-weight: bold; }
            .footer { margin-top: 50px; text-align: right; }
            .signature { margin-top: 60px; display: inline-block; border-top: 1px solid #333; width: 250px; text-align: center; padding-top: 5px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="clinic-name">${clinicInfo.name}</div>
            <div class="clinic-info">${clinicInfo.address}</div>
            <div class="clinic-info">โทร: ${clinicInfo.phone} | TAX ID: ${clinicInfo.taxId}</div>
          </div>
          
          <div class="report-title">รายงานผลการตรวจทางห้องปฏิบัติการ</div>

          <div class="patient-info">
            <div>
              <p><strong>ชื่อ-นามสกุล:</strong> ${patient?.firstName} ${patient?.lastName}</p>
              <p><strong>HN:</strong> ${patient?.hn}</p>
              <p><strong>เพศ:</strong> ${patient?.gender === 'M' ? 'ชาย' : 'หญิง'}</p>
            </div>
            <div>
              <p><strong>วันที่เก็บตัวอย่าง:</strong> ${new Date(visit.date).toLocaleDateString('th-TH')}</p>
              <p><strong>รวบรวมรายงานเมื่อ:</strong> ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}</p>
            </div>
          </div>

          ${labsToPrint.map(l => `
            <div class="lab-section">
              <div class="lab-header">${l.name}</div>
              ${l.subTests && l.subTests.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>การทดสอบ (Test)</th>
                      <th>ผลตรวจ (Result)</th>
                      <th>ค่าปกติ (Range)</th>
                      <th>หน่วย (Unit)</th>
                      <th>หมายเหตุ (Flag)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${l.subTests.map(s => `
                      <tr>
                        <td>${s.name}</td>
                        <td style="font-weight: bold;">${s.result}</td>
                        <td>${s.normalRange}</td>
                        <td>${s.unit}</td>
                        <td class="${s.flag === 'H' ? 'flag-h' : s.flag === 'L' ? 'flag-l' : ''}">${s.flag || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div style="padding: 10px; background: #fefefe; border: 1px solid #eee;">
                  <p><strong>สรุปผล:</strong> ${l.result || 'ไม่มีข้อมูลสังเขป'}</p>
                  ${l.resultNote ? `<p><strong>รายละเอียดเพิ่มเติม:</strong> ${l.resultNote}</p>` : ''}
                </div>
              `}
            </div>
          `).join('')}

          <div class="footer">
            <p>รายงานโดย: ${currentUser?.fullName || 'เจ้าหน้าที่ห้องแล็บ'}</p>
            <div class="signature">ลายเซ็นเจ้าหน้าที่</div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shadow-sm shadow-amber-100">
              <FlaskConical className="w-6 h-6" />
            </div>
            ห้องปฏิบัติการ (Laboratory System)
          </h2>
          <p className="text-slate-500 text-sm mt-1">บันทึกและจัดการผลการตรวจทางห้องปฏิบัติการ</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mr-2 text-xs font-bold">
            <button 
              onClick={() => setViewMode('Active')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'Active' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Clock className="w-4 h-4" /> ปัจจุบัน
            </button>
            <button 
              onClick={() => setViewMode('History')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'History' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <History className="w-4 h-4" /> ประวัติทั้งหมด
            </button>
          </div>
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อผู้ป่วย, HN..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all text-sm font-bold shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowDirectEntry(true)}
            className="whitespace-nowrap px-4 py-2 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> บันทึกแล็บใหม่ (Direct)
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[calc(100vh-280px)]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                {viewMode === 'Active' ? <Clock className="w-4 h-4 text-amber-500" /> : <History className="w-4 h-4 text-amber-500" />}
                {viewMode === 'Active' ? 'รายการตรวจแล็บวันนี้' : 'ประวัติการตรวจแล็บ'}
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{filteredVisits.length}</span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredVisits.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-slate-400 text-xs italic">ไม่พบรายการส่งแล็บที่รอดำเนินการ</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredVisits.map(v => {
                    const patient = patients.find(p => p.id === v.patientId);
                    const pendingCount = v.labOrders?.filter(l => l.status === 'Pending').length || 0;
                    const totalCount = v.labOrders?.length || 0;
                    
                    return (
                      <div 
                        key={v.id} 
                        onClick={() => selectVisitForLabs(v)}
                        className={`p-4 hover:bg-slate-50 transition-colors group cursor-pointer border-l-4 ${editingVisit?.id === v.id ? 'bg-amber-50 border-amber-500 shadow-inner' : 'border-transparent'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black shadow-sm">
                              {patient?.firstName[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{patient?.firstName} {patient?.lastName}</p>
                              <p className="text-[10px] text-slate-400 font-mono tracking-tighter">HN: {patient?.hn}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-bold text-slate-500">{new Date(v.date).toLocaleDateString('th-TH')}</p>
                             <p className="text-[10px] font-bold text-slate-400">{new Date(v.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                             <div className={`mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${pendingCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                               {pendingCount > 0 ? `เหลือ ${pendingCount}` : 'เสร็จสมบูรณ์'}
                             </div>
                             {!pendingCount && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handlePrint(v.id, null); }}
                                  className="mt-1 p-1 text-slate-400 hover:text-amber-500 transition-colors"
                                  title="พิมพ์รายงานทั้งหมด"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                             )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-3">
                          {v.labOrders?.map(l => (
                            <div
                              key={l.id}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                                l.status === 'Pending' 
                                  ? 'bg-white border-slate-200 text-slate-400' 
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              }`}
                            >
                               <FlaskConical className="w-2.5 h-2.5" />
                               {l.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Work Area */}
        <div className="lg:col-span-2">
          {editingVisit ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
               <div className="p-6 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                   <div className="bg-white p-3 rounded-2xl shadow-sm text-amber-600">
                     <FlaskConical className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">
                        บันทึกผลทางห้องแล็บ
                     </h3>
                     <p className="text-amber-700 text-xs font-bold opacity-75">
                        สำหรับ: {patients.find(p => p.id === editingVisit.patientId)?.firstName} {patients.find(p => p.id === editingVisit.patientId)?.lastName}
                        <span className="mx-2">|</span>
                        วันที่: {new Date(editingVisit.date).toLocaleDateString('th-TH')}
                     </p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handlePrint(editingVisit.id, null)}
                      className="p-2.5 bg-white border border-amber-200 text-amber-600 rounded-xl hover:bg-amber-50 transition-all shadow-sm"
                      title="พิมพ์ใบรายงานห้องแล็บ (ทั้งหมด)"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingVisit(null)} className="p-2 hover:bg-amber-100 rounded-full text-amber-400 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                 </div>
               </div>

               {/* Lab Items Tabs */}
               <div className="flex overflow-x-auto p-4 bg-slate-50 border-b border-slate-100 gap-2 scrollbar-none">
                  {labResultForm.labOrders.map((l, i) => (
                    <button
                      key={l.id}
                      onClick={() => setActiveLabIndex(i)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${
                        activeLabIndex === i 
                          ? 'bg-amber-500 border-amber-600 text-white translate-y-[-2px]' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                  <button 
                    onClick={addNewLabToVisit}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-900 border-b-4 hover:translate-y-[2px] hover:border-b-0 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3" /> เพิ่มรายการ
                  </button>
               </div>

               <div className="p-8 space-y-10 max-h-[calc(100vh-380px)] overflow-y-auto">
                 {/* Detail for Focused Lab */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <Edit3 className="w-5 h-5 text-amber-500" />
                        {activeLabIndex < labResultForm.labOrders.length && (
                          <input 
                            type="text"
                            value={labResultForm.labOrders[activeLabIndex].name}
                            onChange={e => updateCurrentLabField('name', e.target.value)}
                            className="bg-transparent border-none outline-none focus:ring-0 w-full"
                          />
                        )}
                      </h4>
                    </div>

                    {/* Structured Results Table */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <FlaskConical className="w-3 h-3" /> รายการความละเอียด (Sub Tests)
                        </label>
                        <button 
                          onClick={addSubTest}
                          className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-emerald-100 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-3 h-3" /> เพิ่มพารามิเตอร์
                        </button>
                      </div>
                      
                      <div className="overflow-x-auto border rounded-2xl border-slate-100 bg-slate-50/30">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 font-black uppercase tracking-tighter">
                              <th className="px-4 py-3 border-b border-slate-100">Test</th>
                              <th className="px-4 py-3 border-b border-slate-100">Result</th>
                              <th className="px-4 py-3 border-b border-slate-100">Flag</th>
                              <th className="px-4 py-3 border-b border-slate-100">Unit</th>
                              <th className="px-4 py-3 border-b border-slate-100">Range</th>
                              <th className="px-4 py-3 border-b border-slate-100"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {(!labResultForm.labOrders[activeLabIndex]?.subTests || labResultForm.labOrders[activeLabIndex].subTests?.length === 0) ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic">
                                  ยังไม่มีรายการพารามิเตอร์ ลองใช้ AI วิเคราะห์จากรูปภาพหรือเพิ่มเอง
                                </td>
                              </tr>
                            ) : (
                              labResultForm.labOrders[activeLabIndex].subTests?.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-2">
                                    <input 
                                      type="text" 
                                      className="w-full px-2 py-1.5 rounded border border-transparent focus:border-amber-400 outline-none font-bold text-slate-700 bg-transparent"
                                      placeholder="WBC"
                                      value={sub.name}
                                      onChange={e => updateSubTest(sub.id, 'name', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input 
                                      type="text" 
                                      className="w-full px-2 py-1.5 rounded border border-transparent focus:border-amber-400 outline-none font-black text-emerald-600 bg-transparent"
                                      placeholder="10.61"
                                      value={sub.result}
                                      onChange={e => updateSubTest(sub.id, 'result', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-2 w-16">
                                    <input 
                                      type="text" 
                                      className="w-full px-2 py-1.5 rounded border border-transparent focus:border-amber-400 outline-none font-black text-center bg-transparent"
                                      placeholder="H"
                                      value={sub.flag}
                                      style={{ color: sub.flag === 'H' ? 'red' : sub.flag === 'L' ? 'blue' : 'inherit' }}
                                      onChange={e => updateSubTest(sub.id, 'flag', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-2 w-20">
                                    <input 
                                      type="text" 
                                      className="w-full px-2 py-1.5 rounded border border-transparent focus:border-amber-400 outline-none text-slate-500 bg-transparent"
                                      placeholder="K/ul"
                                      value={sub.unit}
                                      onChange={e => updateSubTest(sub.id, 'unit', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input 
                                      type="text" 
                                      className="w-full px-2 py-1.5 rounded border border-transparent focus:border-amber-400 outline-none text-slate-500 bg-transparent"
                                      placeholder="4.00-12.00"
                                      value={sub.normalRange}
                                      onChange={e => updateSubTest(sub.id, 'normalRange', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <button onClick={() => removeSubTest(sub.id)} className="text-red-300 hover:text-red-500 p-1">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Edit3 className="w-3 h-3" /> ผลสรุปหลัก
                          </label>
                          <input 
                            type="text"
                            value={labResultForm.labOrders[activeLabIndex]?.result || ''}
                            onChange={e => updateCurrentLabField('result', e.target.value)}
                            className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-amber-400 transition-all font-black text-xl text-slate-800 bg-slate-50/50"
                            placeholder="เช่น 120 mg/dL..."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-3 h-3" /> บันทึกเพิ่มเติม
                          </label>
                          <textarea 
                            value={labResultForm.labOrders[activeLabIndex]?.resultNote || ''}
                            onChange={e => updateCurrentLabField('resultNote', e.target.value)}
                            className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-amber-400 transition-all text-sm text-slate-700 bg-slate-50/50 min-h-[120px]"
                            placeholder="ระบุข้อความสรุปผล..."
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ImageIcon className="w-3 h-3" /> รูปภาพ (Images)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {labResultForm.labOrders[activeLabIndex]?.resultImages?.map((img, idx) => (
                            <div key={idx} className="relative group aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                              <img src={img} alt="Lab Result" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 backdrop-blur-sm">
                                <button 
                                  onClick={() => analyzeLabImage(img)}
                                  disabled={isAnalyzing}
                                  className="p-3 bg-white text-emerald-600 rounded-full hover:scale-110 transition-transform shadow-xl disabled:opacity-50"
                                  title="วิเคราะห์ด้วย AI"
                                >
                                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                </button>
                                <button 
                                  onClick={() => updateCurrentLabField('resultImages', labResultForm.labOrders[activeLabIndex].resultImages?.filter((_, i) => i !== idx))}
                                  className="p-3 bg-white text-red-600 rounded-full hover:scale-110 transition-transform shadow-xl"
                                  title="ลบรูป"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-video border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50/50 transition-all flex flex-col items-center justify-center gap-2 group"
                          >
                            <Upload className="w-8 h-8 group-hover:-translate-y-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-wider">อัปโหลด</span>
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            multiple 
                            onChange={handleImageUpload} 
                          />
                        </div>
                      </div>
                    </div>
                 </div>
               </div>

               <div className="p-8 bg-slate-50 border-t flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 text-slate-400 text-[11px] flex items-center gap-2 italic font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    กำลังจัดการแล็บ {labResultForm.labOrders.length} รายการ สำหรับการตรวจครั้งนี้
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                       onClick={() => setEditingVisit(null)}
                       className="flex-1 md:w-40 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black hover:bg-white transition-colors uppercase tracking-widest text-xs"
                    >
                      ยกเลิก
                    </button>
                    <button 
                       onClick={saveVisitLabs}
                       className="flex-1 md:w-60 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                    >
                       <Save className="w-5 h-5" /> บันทึกผลทั้งหมด
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-280px)] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-10 space-y-4">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner text-slate-200 border border-slate-100">
                  <FlaskConical className="w-10 h-10" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-slate-400 font-black">เลือกผู้ป่วยจากรายการทางด้านซ้าย</h3>
                 <p className="text-slate-300 text-sm mt-1 max-w-xs mx-auto">ระบบจัดการแล็บแบบรวมศูนย์ 1 คนต่อ 1 ช่องตรวจของวัน เพื่อความรวดเร็วในการลงข้อมูล</p>
               </div>
               <div className="flex gap-2 mt-4">
                  <div className="px-3 py-1 bg-white rounded-full border border-slate-200 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> อัปเดตล่าสุด: {new Date().toLocaleTimeString()}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
      {/* Direct Entry Modal */}
      {showDirectEntry && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-amber-500" /> เลือกผู้ป่วยเพื่อบันทึกแล็บ
              </h3>
              <button onClick={() => setShowDirectEntry(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อหรือ HN..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 transition-all font-bold"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {patients.filter(p => `${p.firstName} ${p.lastName} ${p.hn}`.toLowerCase().includes(patientSearch.toLowerCase())).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => startDirectEntry(p)}
                    className="w-full flex items-center justify-between p-4 hover:bg-amber-50 rounded-2xl transition-all border border-transparent hover:border-amber-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-amber-600 border border-amber-100 group-hover:scale-110 transition-transform">
                        {p.firstName[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-800">{p.firstName} {p.lastName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">HN: {p.hn}</p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Laboratory;
