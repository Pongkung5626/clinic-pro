
import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Search, Edit3, Trash2, AlertCircle, Camera, X, Save, Cloud, Pill, FileUp, Loader2, Printer, CheckCircle } from 'lucide-react';
import { Drug, Supply, ClinicInfo, PrescriptionItem, Visit, Requisition, RequisitionItem, User, StockLog } from '../types';
import { FileText, ShoppingCart, Download, ListChecks, History as HistoryIcon, User as UserIcon } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { extractItemNameFromPhoto, parseInventoryImage } from '../services/geminiService';
import { saveStockLog } from '../services/firebaseService';

interface InventoryProps {
  drugs: Drug[];
  setDrugs: React.Dispatch<React.SetStateAction<Drug[]>>;
  supplies: Supply[];
  setSupplies: React.Dispatch<React.SetStateAction<Supply[]>>;
  requisitions: Requisition[];
  setRequisitions: React.Dispatch<React.SetStateAction<Requisition[]>>;
  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  clinicInfo: ClinicInfo;
  currentUser: User | null;
  stockLogs?: StockLog[];
}

const Inventory: React.FC<InventoryProps> = ({ drugs, setDrugs, supplies, setSupplies, requisitions, setRequisitions, visits, setVisits, clinicInfo, currentUser, stockLogs = [] }) => {
  const [activeTab, setActiveTab] = useState<'drugs' | 'supplies' | 'po' | 'requisition' | 'stockLogs'>('drugs');
  const [activeRequisitionSubTab, setActiveRequisitionSubTab] = useState<'new' | 'history'>('new');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newItem, setNewItem] = useState<any>({ 
    name: '', tradeName: '', stock: 0, minStock: 10, price: 0, costPrice: 0, unit: 'เม็ด', 
    instruction: '', barcode: '', purpose: '', category: '',
    instructionAmount: '1', instructionUnit: 'เม็ด', instructionRoute: 'กิน', 
    instructionTimes: ['เช้า', 'เที่ยง', 'เย็น', 'ก่อนนอน'], instructionNote: '', precautions: '',
    mfgDate: '', expiryDate: ''
  });

  const [printingDrug, setPrintingDrug] = useState<PrescriptionItem | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [isReviewingImport, setIsReviewingImport] = useState(false);
  const [selectedPOItems, setSelectedPOItems] = useState<string[]>([]);
  const [poCustomAmounts, setPoCustomAmounts] = useState<{[key: string]: number}>({});
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [activeDoc, setActiveDoc] = useState<null | 'PO'>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Requisition State
  const [requisitionDraft, setRequisitionDraft] = useState<Partial<RequisitionItem>[]>([]);
  const [requisitionSearchTerm, setRequisitionSearchTerm] = useState('');
  const [requisitionNote, setRequisitionNote] = useState('');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Barcode Scanner Integration
  useEffect(() => {
    const handleBarcode = (e: any) => {
      const barcode = e.detail;
      if (isAdding) {
        setNewItem(prev => ({ ...prev, barcode }));
      } else {
        setSearchTerm(barcode);
      }
    };
    window.addEventListener('barcodeScanned', handleBarcode);
    return () => window.removeEventListener('barcodeScanned', handleBarcode);
  }, [isAdding]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  
  const handleSaveRequisition = () => {
    if (requisitionDraft.length === 0) return;

    // Validate stock
    for (const item of requisitionDraft) {
      const source = item.itemType === 'Drug' ? drugs : supplies;
      const original = source.find(i => i.id === item.itemId);
      if (!original || original.stock < (item.amount || 0)) {
        setToast({ message: `"${item.name}" มีสต็อกไม่พอสำหรับการเบิก (คงเหลือ ${original?.stock || 0})`, type: 'error' });
        return;
      }
    }

    const totalCost = requisitionDraft.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const requisition: Requisition = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      requesterId: currentUser?.id || 'unknown',
      requesterName: currentUser?.fullName || 'Internal User',
      items: requisitionDraft as RequisitionItem[],
      totalCost,
      status: 'Completed',
      note: requisitionNote
    };

    // Update Stocks
    const newDrugs = [...drugs];
    const newSupplies = [...supplies];

    requisitionDraft.forEach(item => {
      if (item.itemType === 'Drug') {
        const idx = newDrugs.findIndex(d => d.id === item.itemId);
        if (idx !== -1) {
          const original = newDrugs[idx];
          const newStock = original.stock - (item.amount || 0);
          saveStockLog(
            { id: original.id, name: original.name },
            -(item.amount || 0),
            'requisition',
            `เบิกจ่ายยาประจำวัน: ${requisitionNote || 'ไม่มีหมายเหตุ'}`,
            'Drug',
            original.stock,
            newStock,
            currentUser?.fullName || 'Internal User'
          );
          newDrugs[idx] = { ...original, stock: newStock };
        }
      } else {
        const idx = newSupplies.findIndex(s => s.id === item.itemId);
        if (idx !== -1) {
          const original = newSupplies[idx];
          const newStock = original.stock - (item.amount || 0);
          saveStockLog(
            { id: original.id, name: original.name },
            -(item.amount || 0),
            'requisition',
            `เบิกจ่ายพัสดุประจำวัน: ${requisitionNote || 'ไม่มีหมายเหตุ'}`,
            'Supply',
            original.stock,
            newStock,
            currentUser?.fullName || 'Internal User'
          );
          newSupplies[idx] = { ...original, stock: newStock };
        }
      }
    });

    setDrugs(newDrugs);
    setSupplies(newSupplies);
    setRequisitions(prev => [requisition, ...prev]);
    
    setRequisitionDraft([]);
    setRequisitionNote('');
    setToast({ message: 'บันทึกการเบิกพัสดุและตัดสต็อกเรียบร้อยแล้ว', type: 'success' });
  };

  const currentList = activeTab === 'drugs' ? drugs : supplies;
  const filteredItems = (activeTab === 'drugs' || activeTab === 'supplies') ? currentList
    .filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.barcode?.includes(searchTerm) ||
      (d as any).purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d as any).category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const isThai = (str: string) => /^[ก-ฮ]/.test(str);
      const aThai = isThai(a.name);
      const bThai = isThai(b.name);
      if (aThai && !bThai) return -1;
      if (!aThai && bThai) return 1;
      return a.name.localeCompare(b.name, 'th');
    }) : [];

  const lowStockItems = [
    ...drugs.filter(d => d.stock <= d.minStock).map(d => ({ ...d, type: 'ยา' })),
    ...supplies.filter(s => s.stock <= s.minStock).map(s => ({ ...s, type: 'พัสดุ' }))
  ];

  // Initialize selected PO items with low stock items
  useEffect(() => {
    if (activeTab === 'po') {
      setSelectedPOItems(lowStockItems.map(item => item.id));
    }
  }, [activeTab]);

  const today = new Date().toISOString().split('T')[0];
  const expiredItems = [
    ...drugs.filter(d => d.expiryDate && d.expiryDate <= today).map(d => ({ ...d, type: 'ยา' })),
    ...supplies.filter(s => s.expiryDate && s.expiryDate <= today).map(s => ({ ...s, type: 'พัสดุ' }))
  ];

  const handlePrintPO = () => {
    setActiveDoc('PO');
    setTimeout(() => {
        window.print();
        setTimeout(() => setActiveDoc(null), 100);
    }, 1000);
  };

  const handleExportPO = () => {
    const itemsToExport = [...drugs, ...supplies].filter(item => selectedPOItems.includes(item.id));
    
    // CSV Header
    const headers = ['ลำดับ', 'รายการ', 'จำนวนสั่ง', 'หน่วย', 'ราคาทุน', 'รวม'];
    
    // CSV Rows
    const rows = itemsToExport.map((item, idx) => {
      const amount = poCustomAmounts[item.id] || Math.max(item.minStock * 2 - item.stock, item.minStock);
      const total = amount * (item.costPrice || 0);
      return [
        idx + 1,
        item.name,
        amount,
        item.unit,
        item.costPrice || 0,
        total
      ];
    });

    // Total Row
    const totalBudget = itemsToExport.reduce((sum, item) => {
      const amount = poCustomAmounts[item.id] || Math.max(item.minStock * 2 - item.stock, item.minStock);
      return sum + (amount * (item.costPrice || 0));
    }, 0);
    rows.push(['', 'รวมงบประมาณสั่งซื้อทั้งสิ้น', '', '', '', totalBudget]);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link with BOM for Thai characters
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PO_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setActiveDoc(null);
    setToast({ message: 'ส่งออกไฟล์ CSV เรียบร้อยแล้ว (สามารถเปิดใน Google Sheets ได้)', type: 'success' });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewItem({ 
      name: '', tradeName: '', stock: 0, minStock: 10, price: 0, costPrice: 0, unit: activeTab === 'drugs' ? 'เม็ด' : 'ชิ้น', 
      instruction: '', barcode: '', purpose: '', category: '',
      instructionAmount: '1', instructionUnit: 'เม็ด', instructionRoute: 'กิน', 
      instructionTimes: ['เช้า', 'เที่ยง', 'เย็น', 'ก่อนนอน'], instructionNote: '', precautions: '',
      mfgDate: '', expiryDate: ''
    });
    setIsAdding(true);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setNewItem({
      ...item,
      name: item.name || '',
      tradeName: item.tradeName || '',
      stock: item.stock || 0,
      minStock: item.minStock || 0,
      price: item.price || 0,
      costPrice: item.costPrice || 0,
      unit: item.unit || '',
      instruction: item.instruction || '',
      barcode: item.barcode || '',
      purpose: item.purpose || '',
      category: item.category || '',
      instructionAmount: item.instructionAmount || '1',
      instructionUnit: item.instructionUnit || 'เม็ด',
      instructionRoute: item.instructionRoute || 'กิน',
      instructionTimes: item.instructionTimes || ['เช้า', 'เที่ยง', 'เย็น', 'ก่อนนอน'],
      instructionNote: item.instructionNote || '',
      precautions: item.precautions || '',
      mfgDate: item.mfgDate || '',
      expiryDate: item.expiryDate || ''
    });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    const item = currentList.find(i => i.id === id);
    if (!item) return;

    setConfirmConfig({
      isOpen: true,
      title: 'ยืนยันการลบ',
      message: `คุณต้องการลบ "${item.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      type: 'danger',
      onConfirm: () => {
        if (activeTab === 'drugs') {
          saveStockLog(
            { id: item.id, name: item.name },
            -item.stock,
            'delete_item',
            `ลบรายการยาออกจากระบบถาวร (สต๊อกสะสมก่อนลบ: ${item.stock})`,
            'Drug',
            item.stock,
            0,
            currentUser?.fullName || 'Staff'
          );
          setDrugs(prev => prev.filter(d => d.id !== id));
        } else {
          saveStockLog(
            { id: item.id, name: item.name },
            -item.stock,
            'delete_item',
            `ลบรายการพัสดุออกจากระบบถาวร (สต๊อกสะสมก่อนลบ: ${item.stock})`,
            'Supply',
            item.stock,
            0,
            currentUser?.fullName || 'Staff'
          );
          setSupplies(prev => prev.filter(s => s.id !== id));
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleMoveCategory = (item: any) => {
    const fromLabel = activeTab === 'drugs' ? 'คลังยา' : 'คลังพัสดุ';
    const toLabel = activeTab === 'drugs' ? 'คลังพัสดุ' : 'คลังยา';
    
    setConfirmConfig({
      isOpen: true,
      title: 'ยืนยันการย้ายคลัง',
      message: `ต้องการย้าย "${item.name}" จาก ${fromLabel} ไปยัง ${toLabel} ใช่หรือไม่?`,
      type: 'warning',
      onConfirm: () => {
        if (activeTab === 'drugs') {
          // Move from drugs to supplies
          setDrugs(prev => prev.filter(d => d.id !== item.id));
          setSupplies(prev => [...prev, { ...item, category: item.purpose || '' } as Supply]);
        } else {
          // Move from supplies to drugs
          setSupplies(prev => prev.filter(s => s.id !== item.id));
          setDrugs(prev => [...prev, { ...item, purpose: item.category || '', instruction: '' } as Drug]);
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handlePrintLabel = (item: any) => {
    setPrintingDrug({
      id: item.id,
      drugId: item.id,
      name: item.name,
      amount: 1,
      unit: item.unit,
      pricePerUnit: item.price,
      instruction: item.instruction || '',
      precautions: item.precautions || '',
      purpose: item.purpose || ''
    });
  };

  const handleSave = () => {
    if (!newItem.name) return;

    // Generate instruction string for backward compatibility
    let finalItem = { ...newItem };
    if (activeTab === 'drugs') {
      const timesStr = (newItem.instructionTimes || []).join(' ');
      let instruction = '';
      if (newItem.instructionRoute === 'ทา') {
        instruction = `${newItem.instructionRoute} ${timesStr} ${newItem.instructionNote}`.trim();
      } else {
        instruction = `${newItem.instructionRoute}ครั้งละ ${newItem.instructionAmount} ${newItem.instructionUnit} ${timesStr} ${newItem.instructionNote}`.trim();
      }
      finalItem = { ...newItem, instruction };
    }

    if (activeTab === 'drugs') {
      if (editingId) {
        const originalDoc = drugs.find(d => d.id === editingId);
        const prevStock = originalDoc?.stock || 0;
        const newStock = Number(finalItem.stock) || 0;
        const diff = newStock - prevStock;
        
        saveStockLog(
          { id: editingId, name: finalItem.name },
          diff,
          diff > 0 ? 'addition' : (diff < 0 ? 'reduction' : 'edit_item'),
          diff !== 0 ? `แก้ไขจำนวนสต๊อกในฐานข้อมูลโดยตรง` : `แก้ไขรายละเอียดข้อมูลยาในระบบ`,
          'Drug',
          prevStock,
          newStock,
          currentUser?.fullName || 'Staff'
        );

        setDrugs(prev => prev.map(d => d.id === editingId ? { ...finalItem, id: editingId } as Drug : d));
        
        // Update all visits that contain this drug to keep information consistent
        setVisits(prevVisits => prevVisits.map(visit => {
          const hasDrug = visit.prescriptions.some(p => p.drugId === editingId);
          if (!hasDrug) return visit;

          return {
            ...visit,
            prescriptions: visit.prescriptions.map(p => {
              if (p.drugId === editingId) {
                return {
                  ...p,
                  name: finalItem.name,
                  unit: finalItem.unit,
                  pricePerUnit: finalItem.price,
                  instruction: finalItem.instruction,
                  purpose: finalItem.purpose,
                  instructionAmount: finalItem.instructionAmount,
                  instructionUnit: finalItem.instructionUnit,
                  instructionRoute: finalItem.instructionRoute,
                  instructionTimes: finalItem.instructionTimes,
                  instructionNote: finalItem.instructionNote,
                  precautions: finalItem.precautions
                };
              }
              return p;
            })
          };
        }));
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        const drug: Drug = { ...finalItem as Drug, id: newId };
        
        saveStockLog(
          { id: newId, name: finalItem.name },
          Number(finalItem.stock) || 0,
          'addition',
          `ลงทะเบียนรายการยาเข้าใหม่ในคลัง`,
          'Drug',
          0,
          Number(finalItem.stock) || 0,
          currentUser?.fullName || 'Staff'
        );

        setDrugs(prev => [...prev, drug]);
      }
    } else {
      if (editingId) {
        const originalDoc = supplies.find(s => s.id === editingId);
        const prevStock = originalDoc?.stock || 0;
        const newStock = Number(finalItem.stock) || 0;
        const diff = newStock - prevStock;

        saveStockLog(
          { id: editingId, name: finalItem.name },
          diff,
          diff > 0 ? 'addition' : (diff < 0 ? 'reduction' : 'edit_item'),
          diff !== 0 ? `แก้ไขจำนวนสต๊อกพัสดุในระบบ` : `แก้ไขรายละเอียดพัสดุในระบบ`,
          'Supply',
          prevStock,
          newStock,
          currentUser?.fullName || 'Staff'
        );

        setSupplies(prev => prev.map(s => s.id === editingId ? { ...finalItem, id: editingId } as Supply : s));
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        const supply: Supply = { ...finalItem as Supply, id: newId };
        
        saveStockLog(
          { id: newId, name: finalItem.name },
          Number(finalItem.stock) || 0,
          'addition',
          `ลงทะเบียนรายการพัสดุเข้าใหม่ในคลัง`,
          'Supply',
          0,
          Number(finalItem.stock) || 0,
          currentUser?.fullName || 'Staff'
        );

        setSupplies(prev => [...prev, supply]);
      }
    }

    setIsAdding(false);
    setEditingId(null);
    setNewItem({ 
      name: '', tradeName: '', stock: 0, minStock: 10, price: 0, unit: 'เม็ด', 
      instruction: '', barcode: '', purpose: '', category: '',
      instructionAmount: '1', instructionUnit: 'เม็ด', instructionRoute: 'กิน', 
      instructionTimes: ['เช้า', 'เที่ยง', 'เย็น', 'ก่อนนอน'], instructionNote: '', precautions: '',
      mfgDate: '', expiryDate: ''
    });
  };

  // Barcode Scanner Logic
  useEffect(() => {
    if (isScannerOpen) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current.render((decodedText) => {
        setNewItem(prev => ({ ...prev, barcode: decodedText }));
        setIsScannerOpen(false);
        scannerRef.current?.clear();
      }, (error) => {
        // console.warn(error);
      });
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, [isScannerOpen]);

  // OCR Logic
  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const name = await extractItemNameFromPhoto(base64, file.type);
      if (name) {
        setNewItem(prev => ({ ...prev, name }));
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  // Document Parsing Logic
  const handleImportDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const items = await parseInventoryImage(base64, file.type);
      
      if (items.length > 0) {
        // Prepare items with default values and check for existing
        const preparedItems = items.map(item => {
          const existingDrug = drugs.find(d => 
            d.name.toLowerCase() === item.name.toLowerCase() || 
            (item.tradeName && d.tradeName?.toLowerCase() === item.tradeName.toLowerCase())
          );
          const existingSupply = supplies.find(s => 
            s.name.toLowerCase() === item.name.toLowerCase() || 
            (item.tradeName && s.tradeName?.toLowerCase() === item.tradeName.toLowerCase())
          );

          return {
            ...item,
            id: Math.random().toString(36).substr(2, 9),
            targetType: existingDrug ? 'drugs' : (existingSupply ? 'supplies' : activeTab),
            existingId: existingDrug?.id || existingSupply?.id || null,
            importMode: (existingDrug || existingSupply) ? 'update' : 'new',
            isSelected: true,
            price: item.price || 0,
            costPrice: item.costPrice || 0,
            stock: item.stock || 0,
            unit: item.unit || 'หน่วย'
          };
        });
        setExtractedItems(preparedItems);
        setIsReviewingImport(true);
      } else {
        setToast({ message: 'ไม่สามารถอ่านข้อมูลจากเอกสารได้', type: 'error' });
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const confirmImport = () => {
    const selectedItems = extractedItems.filter(item => item.isSelected);
    if (selectedItems.length === 0) return;

    const newDrugs = [...drugs];
    const newSupplies = [...supplies];

    selectedItems.forEach(item => {
      const itemData = {
        name: item.name,
        tradeName: item.tradeName || '',
        stock: item.stock,
        unit: item.unit,
        price: item.price,
        costPrice: item.costPrice,
        barcode: item.barcode || '',
        category: item.category || '',
        purpose: item.purpose || '',
        minStock: 10,
        instruction: ''
      };

      if (item.targetType === 'drugs') {
        if (item.importMode === 'update' && item.existingId) {
          const idx = newDrugs.findIndex(d => d.id === item.existingId);
          if (idx !== -1) {
            newDrugs[idx] = { ...newDrugs[idx], ...itemData, stock: newDrugs[idx].stock + item.stock };
          }
        } else {
          newDrugs.push({ ...itemData, id: Math.random().toString(36).substr(2, 9) } as Drug);
        }
      } else {
        if (item.importMode === 'update' && item.existingId) {
          const idx = newSupplies.findIndex(s => s.id === item.existingId);
          if (idx !== -1) {
            newSupplies[idx] = { ...newSupplies[idx], ...itemData, stock: newSupplies[idx].stock + item.stock };
          }
        } else {
          newSupplies.push({ ...itemData, id: Math.random().toString(36).substr(2, 9) } as Supply);
        }
      }
    });

    setDrugs(newDrugs);
    setSupplies(newSupplies);
    setIsReviewingImport(false);
    setExtractedItems([]);
    setToast({ message: 'นำเข้าข้อมูลสำเร็จ', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">คลังยาและเวชภัณฑ์</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-pulse">
              <Cloud className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Firebase Sync Active</span>
            </div>
          </div>
          <p className="text-slate-500">จัดการสต็อกยา พัสดุ และสรุปใบสั่งซื้อ</p>
        </div>
        { (activeTab === 'drugs' || activeTab === 'supplies') && (
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf" 
              onChange={handleImportDocument} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
              นำเข้าจากเอกสาร
            </button>
            <button 
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md shadow-emerald-100 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              {activeTab === 'drugs' ? 'เพิ่มรายการยา' : 'เพิ่มรายการพัสดุ'}
            </button>
          </div>
        )}
        {activeTab === 'requisition' && (
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveRequisitionSubTab('new')}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeRequisitionSubTab === 'new' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Plus className="w-4 h-4" /> เบิกพัสดุใหม่
            </button>
            <button 
              onClick={() => setActiveRequisitionSubTab('history')}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${activeRequisitionSubTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <HistoryIcon className="w-4 h-4" /> ประวัติการเบิก
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> พิมพ์แบบฟอร์มเปล่า
            </button>
          </div>
        )}
        {activeTab === 'po' && (
          <button 
            onClick={handlePrintPO}
            disabled={selectedPOItems.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md shadow-orange-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            พิมพ์ใบสั่งซื้อ (PDF)
          </button>
        )}
      </header>

      <div className="flex gap-2 border-b border-slate-200 print:hidden">
        <button 
          onClick={() => { setActiveTab('drugs'); setIsAdding(false); }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'drugs' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            คลังยา
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('supplies'); setIsAdding(false); }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'supplies' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            คลังพัสดุ
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('po'); setIsAdding(false); }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'po' ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            ใบสั่งซื้อยา/พัสดุ
            {lowStockItems.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                {lowStockItems.length}
              </span>
            )}
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('requisition'); setIsAdding(false); }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'requisition' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            เบิกจ่ายพัสดุ
          </div>
        </button>
        <button 
          onClick={() => { setActiveTab('stockLogs'); setIsAdding(false); }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'stockLogs' ? 'border-purple-500 text-purple-600 bg-purple-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-4 h-4" />
            ประวัติการเพิ่มลดสต๊อก
          </div>
        </button>
      </div>

      {expiredItems.length > 0 && !isAdding && activeTab !== 'po' && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-300 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-orange-800 text-sm">พบรายการสินค้าหมดอายุ!</p>
              <p className="text-xs text-orange-600">พบ {expiredItems.length} รายการที่หมดอายุแล้วในคลัง กรุณาตรวจสอบและดำเนินการ</p>
            </div>
          </div>
          <button 
            onClick={() => setSearchTerm('')} 
            className="text-xs font-bold text-orange-700 bg-white px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-100 transition-all shadow-sm"
          >
            แสดงทั้งหมด
          </button>
        </div>
      )}

      {isAdding ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 print:hidden">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              {editingId ? <Edit3 className="w-5 h-5 text-orange-500" /> : <Package className="w-5 h-5 text-emerald-600" />}
              {editingId ? (activeTab === 'drugs' ? 'แก้ไขข้อมูลยา' : 'แก้ไขข้อมูลพัสดุ') : (activeTab === 'drugs' ? 'เพิ่มรายการยาใหม่' : 'เพิ่มรายการพัสดุใหม่')}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isScannerOpen && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800">สแกนบาร์โค้ด</h4>
                  <button onClick={() => setIsScannerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div id="reader" className="w-full overflow-hidden rounded-xl"></div>
                <p className="mt-4 text-xs text-slate-500 text-center italic">วางบาร์โค้ดให้อยู่ในกรอบเพื่อสแกน</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-bold text-slate-700">ชื่อสามัญ (Generic Name)</label>
              <input 
                placeholder="เช่น Paracetamol"
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.name} 
                onChange={e => setNewItem({...newItem, name: e.target.value})} 
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-bold text-slate-700">ชื่อการค้า (Trade Name)</label>
              <input 
                placeholder="เช่น Sara, Tylenol"
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.tradeName} 
                onChange={e => setNewItem({...newItem, tradeName: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 flex justify-between items-center">
                <span>บาร์โค้ด</span>
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[10px] font-bold"
                >
                  <Camera className="w-3 h-3" /> สแกน
                </button>
              </label>
              <input 
                placeholder="Scan or Type" 
                className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.barcode} 
                onChange={e => setNewItem({...newItem, barcode: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">หน่วย</label>
              <input 
                placeholder={activeTab === 'drugs' ? "เม็ด / ขวด" : "ชิ้น / กล่อง"}
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.unit} 
                onChange={e => setNewItem({...newItem, unit: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">จำนวนคงคลัง</label>
              <input 
                type="number" 
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.stock} 
                onChange={e => setNewItem({...newItem, stock: +e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">จุดสั่งซื้อขั้นต่ำ (Min Stock)</label>
              <input 
                type="number" 
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.minStock} 
                onChange={e => setNewItem({...newItem, minStock: +e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">ราคาขาย (฿)</label>
              <input 
                type="number" 
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.price} 
                onChange={e => setNewItem({...newItem, price: +e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">ต้นทุน (฿)</label>
              <input 
                type="number" 
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.costPrice} 
                onChange={e => setNewItem({...newItem, costPrice: +e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">วันผลิต (MFG)</label>
              <input 
                type="date" 
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                value={newItem.mfgDate} 
                onChange={e => setNewItem({...newItem, mfgDate: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">วันหมดอายุ (EXP)</label>
              <input 
                type="date" 
                className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 border-red-100 focus:border-red-500 transition-all" 
                value={newItem.expiryDate} 
                onChange={e => setNewItem({...newItem, expiryDate: e.target.value})} 
              />
            </div>
            {activeTab === 'drugs' ? (
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-bold text-slate-700">สรรพคุณ / ข้อบ่งใช้</label>
                <input 
                  placeholder="เช่น ลดไข้ บรรเทาอาการปวด" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                  value={newItem.purpose} 
                  onChange={e => setNewItem({...newItem, purpose: e.target.value})} 
                />
              </div>
            ) : (
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-bold text-slate-700">หมวดหมู่</label>
                <input 
                  placeholder="เช่น อุปกรณ์ฉีดยา, วัสดุสิ้นเปลือง" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})} 
                />
              </div>
            )}
          </div>
          
          {activeTab === 'drugs' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                วิธีการรับประทานและคำแนะนำ
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">รูปแบบการใช้</label>
                  <select 
                    className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.instructionRoute}
                    onChange={e => setNewItem({...newItem, instructionRoute: e.target.value})}
                  >
                    <option value="กิน">กิน</option>
                    <option value="ทา">ทา</option>
                    <option value="ฉีด">ฉีด</option>
                    <option value="แปะ">แปะ</option>
                    <option value="อมใต้ลิ้น">อมใต้ลิ้น</option>
                    <option value="สอด">สอด</option>
                    <option value="หยอด">หยอด</option>
                    <option value="พ่น">พ่น</option>
                  </select>
                </div>
                {newItem.instructionRoute !== 'ทา' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">จำนวน</label>
                      <input 
                        type="text"
                        placeholder="เช่น 1, 1/2, 2"
                        className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={newItem.instructionAmount}
                        onChange={e => setNewItem({...newItem, instructionAmount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">หน่วย</label>
                      <select 
                        className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={newItem.instructionUnit}
                        onChange={e => setNewItem({...newItem, instructionUnit: e.target.value})}
                      >
                        <option value="เม็ด">เม็ด</option>
                        <option value="ช้อน">ช้อน</option>
                        <option value="ซีซี">ซีซี</option>
                        <option value="หยด">หยด</option>
                        <option value="ครั้ง">ครั้ง</option>
                        <option value="แผ่น">แผ่น</option>
                        <option value="หลอด">หลอด</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">เวลาที่รับประทาน</label>
                <div className="flex flex-wrap gap-3">
                  {['เช้า', 'เที่ยง', 'เย็น', 'ก่อนนอน'].map(time => (
                    <label key={time} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={newItem.instructionTimes?.includes(time)}
                        onChange={e => {
                          const times = newItem.instructionTimes || [];
                          if (e.target.checked) {
                            setNewItem({...newItem, instructionTimes: [...times, time]});
                          } else {
                            setNewItem({...newItem, instructionTimes: times.filter((t: string) => t !== time)});
                          }
                        }}
                      />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{time}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">คำแนะนำเพิ่มเติม (สั้นๆ)</label>
                  <input 
                    placeholder="เช่น หลังอาหารทันที, เคี้ยวก่อนกลืน"
                    className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={newItem.instructionNote}
                    onChange={e => setNewItem({...newItem, instructionNote: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-red-500">ข้อเฝ้าระวัง / คำเตือน</label>
                  <input 
                    placeholder="เช่น อาจทำให้ง่วงซึม, ห้ามดื่มแอลกอฮอล์"
                    className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-red-500/20 border-red-100"
                    value={newItem.precautions}
                    onChange={e => setNewItem({...newItem, precautions: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-2 border border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">ยกเลิก</button>
            <button onClick={handleSave} className="px-10 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95">
              <Save className="w-4 h-4" />
              {editingId ? 'อัปเดตข้อมูล' : 'บันทึกลงคลัง'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'drugs' || activeTab === 'supplies') ? (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 print:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={`ค้นหา${activeTab === 'drugs' ? 'รายการยา' : 'รายการพัสดุ'}...`}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">รายการ / บาร์โค้ด</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">คงคลัง</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">{activeTab === 'drugs' ? 'สรรพคุณ' : 'หมวดหมู่'}</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">วันผลิต/หมดอายุ</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">ราคาขาย</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center print:hidden">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.length > 0 ? filteredItems.map(item => {
                        const isExpired = item.expiryDate && item.expiryDate <= today;
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${isExpired ? 'bg-red-50/30' : ''}`}>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{item.name}</p>
                              {item.tradeName && <p className="text-xs text-slate-500 italic">({item.tradeName})</p>}
                              <p className="text-[10px] text-slate-400 font-mono">{item.barcode || 'NO-BARCODE'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${item.stock <= item.minStock ? 'text-red-600' : 'text-slate-700'}`}>
                                  {item.stock.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">{item.unit}</span>
                                {item.stock <= item.minStock && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                              </div>
                              {item.stock <= item.minStock && <p className="text-[9px] text-red-500 font-bold">ต่ำกว่าจุดสั่งซื้อ ({item.minStock})</p>}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-slate-600 italic line-clamp-1">{(item as any).purpose || (item as any).category || '-'}</p>
                              {activeTab === 'drugs' && (item as Drug).instruction && (
                                <p className="text-[10px] text-emerald-600 mt-1 line-clamp-1">วิธีใช้: {(item as Drug).instruction}</p>
                              )}
                              {activeTab === 'drugs' && (item as Drug).precautions && (
                                <p className="text-[10px] text-red-500 font-bold mt-0.5 line-clamp-1">⚠️ {(item as Drug).precautions}</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <p className="text-[10px] text-slate-500"><span className="font-bold">MFG:</span> {item.mfgDate || '-'}</p>
                                <p className={`text-[10px] font-bold ${isExpired ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
                                  <span className="font-bold">EXP:</span> {item.expiryDate || '-'}
                                </p>
                                {isExpired && <p className="text-[9px] text-red-600 font-bold uppercase">หมดอายุแล้ว!</p>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-emerald-700">฿{item.price.toLocaleString()}</td>
                            <td className="px-6 py-4 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              {activeTab === 'drugs' && (
                                <button 
                                  onClick={() => handlePrintLabel(item)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="พิมพ์สลากยา"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleEdit(item)}
                                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                title="แก้ไข"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleMoveCategory(item)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title={activeTab === 'drugs' ? "ย้ายไปคลังพัสดุ" : "ย้ายไปคลังยา"}
                              >
                                <FileUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">ไม่พบรายการที่ค้นหา</td>
                      </tr>
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'po' ? (
            <div className="space-y-6">
              {/* Purchase Order View */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 print:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาเพื่อเพิ่มรายการสั่งซื้อ (ยา/พัสดุ)..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    value={poSearchTerm}
                    onChange={e => setPoSearchTerm(e.target.value)}
                  />
                </div>
                {poSearchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {[...drugs, ...supplies]
                      .filter(item => item.name.toLowerCase().includes(poSearchTerm.toLowerCase()))
                      .slice(0, 10)
                      .map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (!selectedPOItems.includes(item.id)) {
                              setSelectedPOItems(prev => [...prev, item.id]);
                            }
                            setPoSearchTerm('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-sm text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-500">คงเหลือ: {item.stock} {item.unit}</p>
                          </div>
                          <Plus className="w-4 h-4 text-emerald-600" />
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8 print:border-none print:shadow-none">
                <div className="flex justify-between items-start border-b pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">ใบสรุปรายการสั่งซื้อยาและเวชภัณฑ์</h2>
                    <p className="text-slate-500 text-sm">รายการที่มียอดคงคลังต่ำกว่าจุดสั่งซื้อที่กำหนด</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-emerald-700">{clinicInfo.name}</h3>
                    <p className="text-xs text-slate-500 max-w-[200px] ml-auto">{clinicInfo.address}</p>
                    <p className="text-xs text-slate-500">โทร: {clinicInfo.phone}</p>
                    <p className="text-xs text-slate-500 mt-2 font-bold">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-800">
                        <th className="text-left py-3 font-bold print:hidden">
                          <input 
                            type="checkbox" 
                            checked={selectedPOItems.length === lowStockItems.length && lowStockItems.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPOItems(lowStockItems.map(i => i.id));
                              } else {
                                setSelectedPOItems([]);
                              }
                            }}
                          />
                        </th>
                        <th className="text-left py-3 font-bold">ลำดับ</th>
                        <th className="text-left py-3 font-bold">ประเภท</th>
                        <th className="text-left py-3 font-bold">รายการ</th>
                        <th className="text-right py-3 font-bold">คงเหลือ</th>
                        <th className="text-right py-3 font-bold">จุดสั่งซื้อ</th>
                        <th className="text-right py-3 font-bold">ราคาทุน</th>
                        <th className="text-right py-3 font-bold">จำนวนที่ควรสั่ง (ประมาณ)</th>
                        <th className="text-right py-3 font-bold">รวมประมาณการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[...drugs.map(d => ({...d, type: 'ยา'})), ...supplies.map(s => ({...s, type: 'พัสดุ'}))]
                        .filter(item => selectedPOItems.includes(item.id) || item.stock <= item.minStock)
                        .map((item, idx) => {
                        const isSelected = selectedPOItems.includes(item.id);
                        const defaultAmount = Math.max(item.minStock * 2 - item.stock, item.minStock);
                        const orderAmount = poCustomAmounts[item.id] || defaultAmount;
                        const estimatedCost = orderAmount * (item.costPrice || 0);
                        
                        return (
                          <tr key={item.id} className={!isSelected ? 'opacity-50 print:hidden' : ''}>
                            <td className="py-3 print:hidden">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPOItems(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedPOItems(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="py-3">{idx + 1}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'ยา' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="py-3 font-bold">{item.name}</td>
                            <td className="py-3 text-right text-red-600 font-bold">{item.stock} {item.unit}</td>
                            <td className="py-3 text-right">{item.minStock} {item.unit}</td>
                            <td className="py-3 text-right">฿{(item.costPrice || 0).toLocaleString()}</td>
                            <td className="py-3 text-right font-bold text-emerald-700">
                              <div className="flex items-center justify-end gap-2">
                                <input 
                                  type="number"
                                  className="w-16 border rounded p-1 text-right text-xs print:hidden"
                                  value={orderAmount}
                                  onChange={(e) => setPoCustomAmounts(prev => ({...prev, [item.id]: +e.target.value}))}
                                />
                                <span className="hidden print:inline">{orderAmount}</span>
                                <span>{item.unit}</span>
                              </div>
                            </td>
                            <td className="py-3 text-right font-bold text-slate-800">
                              ฿{estimatedCost.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {[...drugs, ...supplies].filter(item => item.stock <= item.minStock).length === 0 && selectedPOItems.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 italic">ไม่มีรายการที่ต้องสั่งซื้อในขณะนี้</td>
                        </tr>
                      )}
                    </tbody>
                    {selectedPOItems.length > 0 && (
                      <tfoot className="border-t-2 border-slate-800">
                        <tr className="font-bold">
                          <td colSpan={8} className="py-4 text-right">รวมงบประมาณสั่งซื้อประมาณการ</td>
                          <td className="py-4 text-right text-lg text-emerald-700">
                            ฿{[...drugs, ...supplies]
                              .filter(item => selectedPOItems.includes(item.id))
                              .reduce((sum, item) => {
                                const amount = poCustomAmounts[item.id] || Math.max(item.minStock * 2 - item.stock, item.minStock);
                                return sum + (amount * (item.costPrice || 0));
                              }, 0)
                              .toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                <div className="flex justify-between pt-12">
                  <div className="text-center w-48">
                    <div className="border-b border-slate-400 mb-2 h-8"></div>
                    <p className="text-xs text-slate-500">ผู้จัดทำรายการ</p>
                  </div>
                  <div className="text-center w-48">
                    <div className="border-b border-slate-400 mb-2 h-8"></div>
                    <p className="text-xs text-slate-500">ผู้อนุมัติสั่งซื้อ</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'requisition' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {activeRequisitionSubTab === 'new' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Requisition Form */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                      <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                          <Plus className="w-5 h-5 text-blue-600" />
                          ทำรายการเบิกพัสดุประจำวัน
                        </h3>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase">วันที่เบิก</p>
                          <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('th-TH')}</p>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="ค้นหายาหรือพัสดุด้วย ชื่อ หรือ บาร์โค้ด เพื่อเบิก..."
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                          value={requisitionSearchTerm}
                          onChange={e => setRequisitionSearchTerm(e.target.value)}
                        />
                        {requisitionSearchTerm && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] max-h-80 overflow-y-auto animate-in zoom-in-95 duration-200">
                            {[...drugs, ...supplies]
                              .filter(item => 
                                item.name.toLowerCase().includes(requisitionSearchTerm.toLowerCase()) || 
                                item.barcode?.includes(requisitionSearchTerm)
                              )
                              .slice(0, 15)
                              .map(item => {
                                const isDrug = drugs.some(d => d.id === item.id);
                                const isOutOfStock = item.stock <= 0;
                                return (
                                  <button
                                    key={item.id}
                                    disabled={isOutOfStock}
                                    onClick={() => {
                                      const existing = requisitionDraft.find(rd => rd.itemId === item.id);
                                      if (existing) {
                                        setRequisitionDraft(prev => prev.map(rd => 
                                          rd.itemId === item.id ? { ...rd, amount: (rd.amount || 0) + 1, totalCost: ((rd.amount || 0) + 1) * (rd.costPrice || 0) } : rd
                                        ));
                                      } else {
                                        setRequisitionDraft(prev => [...prev, {
                                          id: Math.random().toString(36).substr(2, 9),
                                          itemId: item.id,
                                          itemType: isDrug ? 'Drug' : 'Supply',
                                          name: item.name,
                                          amount: 1,
                                          unit: item.unit,
                                          costPrice: item.costPrice || 0,
                                          totalCost: item.costPrice || 0
                                        }]);
                                      }
                                      setRequisitionSearchTerm('');
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 flex justify-between items-center transition-colors ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${isDrug ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {isDrug ? <Pill className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                      </div>
                                      <div>
                                        <p className="font-bold text-sm text-slate-800">{item.name}</p>
                                        <div className="flex items-center gap-2">
                                          <p className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-500' : 'text-slate-500'}`}>
                                            คงเหลือ: {item.stock} {item.unit}
                                          </p>
                                          <p className="text-[10px] text-slate-400 inline-block px-1.5 py-0.5 rounded border border-slate-100 bg-slate-50">ต้นทุน: ฿{item.costPrice || 0}</p>
                                        </div>
                                      </div>
                                    </div>
                                    {isOutOfStock ? (
                                      <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">สินค้าหมด!</span>
                                    ) : (
                                      <Plus className="w-5 h-5 text-blue-600" />
                                    )}
                                  </button>
                                );
                              })
                            }
                            {[...drugs, ...supplies].filter(item => 
                              item.name.toLowerCase().includes(requisitionSearchTerm.toLowerCase()) || 
                              item.barcode?.includes(requisitionSearchTerm)
                            ).length === 0 && (
                              <div className="p-8 text-center text-slate-500 italic">ไม่พบคลังสินค้าที่ต้องการ</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-slate-50">
                            <tr>
                              <th className="text-left py-3 px-4 font-bold text-slate-500">รายการ</th>
                              <th className="text-center py-3 px-4 font-bold text-slate-500">จำนวนเบิก</th>
                              <th className="text-right py-3 px-4 font-bold text-slate-500">ต้นทุน/หน่วย</th>
                              <th className="text-right py-3 px-4 font-bold text-slate-500">รวมต้นทุน</th>
                              <th className="text-center py-3 px-4 font-bold text-slate-500 w-16">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {requisitionDraft.length > 0 ? requisitionDraft.map(item => (
                              <tr key={item.itemId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-4 font-bold text-slate-800">
                                  {item.name}
                                  <span className={`block text-[10px] font-medium ${item.itemType === 'Drug' ? 'text-emerald-500' : 'text-blue-500'}`}>{item.itemType}</span>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-center gap-3">
                                    <button 
                                      onClick={() => setRequisitionDraft(prev => prev.map(rd => 
                                        rd.itemId === item.itemId ? { ...rd, amount: Math.max(1, (rd.amount || 0) - 1), totalCost: Math.max(1, (rd.amount || 0) - 1) * (rd.costPrice || 0) } : rd
                                      ))}
                                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                    >
                                      -
                                    </button>
                                    <input 
                                      type="number"
                                      className="w-16 border rounded-lg p-1.5 text-center font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 border-slate-200"
                                      value={item.amount}
                                      onChange={(e) => {
                                        const val = +e.target.value;
                                        setRequisitionDraft(prev => prev.map(rd => 
                                          rd.itemId === item.itemId ? { ...rd, amount: val, totalCost: val * (rd.costPrice || 0) } : rd
                                        ));
                                      }}
                                    />
                                    <button 
                                      onClick={() => {
                                        const source = item.itemType === 'Drug' ? drugs : supplies;
                                        const original = source.find(i => i.id === item.itemId);
                                        const currentAmount = item.amount || 0;
                                        
                                        if (original && original.stock > currentAmount) {
                                          setRequisitionDraft(prev => prev.map(rd => 
                                            rd.itemId === item.itemId ? { ...rd, amount: currentAmount + 1, totalCost: (currentAmount + 1) * (rd.costPrice || 0) } : rd
                                          ));
                                        } else {
                                          setToast({ message: `"${item.name}" สินค้าคงคลังไม่เพียงพอ`, type: 'error' });
                                        }
                                      }}
                                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors font-bold"
                                    >
                                      +
                                    </button>
                                    <span className="text-xs font-bold text-slate-400 uppercase w-10 text-left">{item.unit}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-right font-medium text-slate-600">฿{(item.costPrice || 0).toLocaleString()}</td>
                                <td className="py-4 px-4 text-right font-bold text-slate-800">฿{(item.totalCost || 0).toLocaleString()}</td>
                                <td className="py-4 px-4 text-center">
                                  <button 
                                    onClick={() => setRequisitionDraft(prev => prev.filter(rd => rd.itemId !== item.itemId))}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={5} className="py-16 text-center text-slate-400 italic">
                                  <div className="flex flex-col items-center gap-3">
                                    <Package className="w-12 h-12 text-slate-200" />
                                    ยังไม่มีรายการเบิก... ค้นหาพัสดุจากด้านบนเพื่อเพิ่ม
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {requisitionDraft.length > 0 && (
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                              <tr className="font-bold text-slate-800">
                                <td colSpan={3} className="py-4 px-4 text-right text-base uppercase">รวมต้นทุนในการเบิกครั้งนี้</td>
                                <td className="py-4 px-4 text-right text-xl text-blue-700">
                                  ฿{requisitionDraft.reduce((sum, item) => sum + (item.totalCost || 0), 0).toLocaleString()}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Requisition Sidebar */}
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600" /> ข้อมูลการเบิก
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">ผู้ขอเบิก</label>
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {currentUser?.fullName.charAt(0)}
                            </div>
                            <p className="text-sm font-bold text-slate-700">{currentUser?.fullName}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">หมายเหตุการเบิก</label>
                          <textarea 
                            className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-h-[100px]"
                            placeholder="ระบุเหตุผลการเบิก เช่น ใช้ประจำวันวอร์ด A, เบิกเปลี่ยนอะไหล่"
                            value={requisitionNote}
                            onChange={e => setRequisitionNote(e.target.value)}
                          />
                        </div>
                        <button 
                          disabled={requisitionDraft.length === 0}
                          onClick={handleSaveRequisition}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                        >
                          <Save className="w-6 h-6" /> ยืนยันการเบิกและตัดสต็อก
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="w-5 h-5" />
                        <h4 className="font-bold text-sm">ข้อควรระวัง</h4>
                      </div>
                      <p className="text-xs text-amber-600 leading-relaxed italic">
                        การกด "ยืนยันการเบิก" จะทำกิจกรรม <span className="font-bold">ตัดสต็อกทันที</span> และบันทึกต้นทุนพัสดุในระบบเพื่อใช้สรุปยอดบัญชีรายวัน กรุณาตรวจสอบจำนวนพัสดุที่เบิกให้ถูกต้อง
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                  <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <HistoryIcon className="w-5 h-5 text-slate-500" /> ประวัติการเบิกพัสดุประจำวัน
                    </h3>
                    <div className="text-xs font-bold text-slate-400">พบทั้งหมด {requisitions.length} รายการ</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr className="text-slate-500 font-bold uppercase text-[10px]">
                          <th className="text-left px-6 py-4">วันที่ - เวลา</th>
                          <th className="text-left px-6 py-4">ผู้ขอเบิก</th>
                          <th className="text-left px-6 py-4">รายการที่เบิก</th>
                          <th className="text-right px-6 py-4">รวมต้นทุน (฿)</th>
                          <th className="text-left px-6 py-4">หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {requisitions.length > 0 ? requisitions.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{new Date(req.date).toLocaleDateString('th-TH')}</p>
                              <p className="text-[10px] text-slate-400">{new Date(req.date).toLocaleTimeString('th-TH')}</p>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 border">
                                <UserIcon className="w-3 h-3" />
                              </div>
                              {req.requesterName}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {req.items.slice(0, 3).map((item, i) => (
                                  <p key={i} className="text-[10px] text-slate-600 flex justify-between items-center bg-white px-2 py-0.5 rounded border border-slate-100">
                                    <span>• {item.name}</span>
                                    <span className="font-bold text-blue-600">x{item.amount} {item.unit}</span>
                                  </p>
                                ))}
                                {req.items.length > 3 && (
                                  <p className="text-[10px] text-slate-400 pl-2 font-bold italic">+ อีก {req.items.length - 3} รายการ</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                              ฿{(req.totalCost || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-slate-500 italic truncate max-w-[200px]" title={req.note}>{req.note || '-'}</p>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-slate-400 italic">ยังไม่มีประวัติการเบิกพัสดุในระบบ</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'stockLogs' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden pb-4">
                <div className="bg-slate-50 border-b p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <HistoryIcon className="w-5 h-5 text-purple-600" /> ประวัติความเคลื่อนไหวและธุรกรรมของคลังสินค้า (Stock History Logs)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">บันทึกพฤติกรรมการเพิ่ม ลด เบิกจ่าย และการจ่ายยาคนไข้ในฐานข้อมูลถาวร</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์รายงานประวัติ
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b-2 border-slate-100">
                      <tr className="text-slate-500 font-bold uppercase text-[10px]">
                        <th className="text-left px-6 py-4">วันที่ - เวลา</th>
                        <th className="text-left px-6 py-4">รายการสินค้า</th>
                        <th className="text-left px-6 py-4">ประเภทคลัง</th>
                        <th className="text-left px-6 py-4">ประเภทรายการ</th>
                        <th className="text-right px-6 py-4">ปรับเปลี่ยน</th>
                        <th className="text-right px-6 py-4">ก่อนปรับ</th>
                        <th className="text-right px-6 py-4">หลังปรับ</th>
                        <th className="text-left px-6 py-4">ผู้จัดทำ</th>
                        <th className="text-left px-6 py-4">หมายเหตุเชิงระบบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium font-sans">
                      {stockLogs.length > 0 ? (
                        [...stockLogs]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(log => {
                            const changeColor = log.changeAmount > 0 ? 'text-emerald-600 bg-emerald-50' : (log.changeAmount < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-50');
                            const typeBadgeColor = 
                              log.type === 'addition' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                              log.type === 'reduction' ? 'border-rose-200 text-rose-700 bg-rose-50' :
                              log.type === 'requisition' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                              log.type === 'pharmacy_dispense' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                              log.type === 'direct_sale' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' :
                              log.type === 'delete_item' ? 'border-red-200 text-red-700 bg-red-50' :
                              'border-slate-200 text-slate-700 bg-slate-100';

                            const typeLabel = 
                              log.type === 'addition' ? 'เพิ่มสต๊อก' :
                              log.type === 'reduction' ? 'ปรับลดสต๊อก' :
                              log.type === 'requisition' ? 'เบิกเวชภัณฑ์' :
                              log.type === 'pharmacy_dispense' ? 'จ่ายยาห้องตรวจ' :
                              log.type === 'direct_sale' ? 'ซื้อตรง (OTC)' :
                              log.type === 'delete_item' ? 'ลบสินค้าถาวร' :
                              'แก้ไขข้อมูล';

                            return (
                              <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className="font-bold text-slate-800">{new Date(log.date).toLocaleDateString('th-TH')}</p>
                                  <p className="text-[10px] text-slate-400">{new Date(log.date).toLocaleTimeString('th-TH')}</p>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">
                                  {log.itemName}
                                  <span className="block text-[9px] font-medium text-slate-400">ID: {log.itemId}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.itemType === 'Drug' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                                    {log.itemType === 'Drug' ? 'ยา' : 'พัสดุ'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadgeColor}`}>
                                    {typeLabel}
                                  </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold whitespace-nowrap`}>
                                  <span className={`px-2 py-0.5 rounded ${changeColor}`}>
                                    {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right text-slate-400 whitespace-nowrap">
                                  {log.previousStock}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800 whitespace-nowrap">
                                  {log.newStock}
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">
                                  {log.user}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-xs text-slate-500 line-clamp-2 max-w-[280px]" title={log.note}>{log.note || '-'}</p>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-24 text-center text-slate-400 italic">
                            ยังไม่มีรายการเคลื่อนไหวหรือธุรกรรมสต๊อกในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
      {activeDoc === 'PO' && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">ตัวอย่างก่อนพิมพ์ (Print Preview)</h3>
              <button onClick={() => setActiveDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-white" id="printable-po">
              <div className="max-w-[21cm] mx-auto border p-8 shadow-sm">
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                  <div className="flex items-start gap-4">
                    {clinicInfo.logo && (
                      <img 
                        src={clinicInfo.logo} 
                        alt="Clinic Logo" 
                        className="h-16 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">ใบสั่งซื้อยาและเวชภัณฑ์</h2>
                      <p className="text-slate-500 text-sm">Purchase Order Summary</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-emerald-700">{clinicInfo.name}</h3>
                    <p className="text-[10px] text-slate-500 max-w-[200px] ml-auto">{clinicInfo.address}</p>
                    <p className="text-[10px] text-slate-500">โทร: {clinicInfo.phone}</p>
                    <p className="text-xs text-slate-800 mt-2 font-bold">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                  </div>
                </div>

                <table className="w-full text-xs mb-8">
                  <thead>
                    <tr className="border-b-2 border-slate-800">
                      <th className="text-left py-2">ลำดับ</th>
                      <th className="text-left py-2">รายการ</th>
                      <th className="text-right py-2">จำนวนสั่ง</th>
                      <th className="text-right py-2">หน่วย</th>
                      <th className="text-right py-2">ราคาทุน</th>
                      <th className="text-right py-2">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...drugs, ...supplies]
                      .filter(item => selectedPOItems.includes(item.id))
                      .map((item, idx) => {
                        const amount = poCustomAmounts[item.id] || Math.max(item.minStock * 2 - item.stock, item.minStock);
                        const total = amount * (item.costPrice || 0);
                        return (
                          <tr key={item.id}>
                            <td className="py-2">{idx + 1}</td>
                            <td className="py-2 font-bold">{item.name}</td>
                            <td className="py-2 text-right">{amount}</td>
                            <td className="py-2 text-right">{item.unit}</td>
                            <td className="py-2 text-right">฿{(item.costPrice || 0).toLocaleString()}</td>
                            <td className="py-2 text-right font-bold">฿{total.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-800 font-bold">
                    <tr>
                      <td colSpan={5} className="py-4 text-right">รวมงบประมาณสั่งซื้อทั้งสิ้น</td>
                      <td className="py-4 text-right text-sm text-emerald-700">
                        ฿{[...drugs, ...supplies]
                          .filter(item => selectedPOItems.includes(item.id))
                          .reduce((sum, item) => {
                            const amount = poCustomAmounts[item.id] || Math.max(item.minStock * 2 - item.stock, item.minStock);
                            return sum + (amount * (item.costPrice || 0));
                          }, 0)
                          .toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex justify-between pt-12">
                  <div className="text-center w-40">
                    <div className="border-b border-slate-400 mb-2 h-8"></div>
                    <p className="text-[10px] text-slate-500">ผู้จัดทำรายการ</p>
                  </div>
                  <div className="text-center w-40">
                    <div className="border-b border-slate-400 mb-2 h-8"></div>
                    <p className="text-[10px] text-slate-500">ผู้อนุมัติสั่งซื้อ</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setActiveDoc(null)} className="px-6 py-2 border border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">ยกเลิก</button>
              <button onClick={handleExportPO} className="px-10 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95">
                <Download className="w-4 h-4" />
                ส่งออก Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}
      {isReviewingImport && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ตรวจสอบรายการนำเข้าจากเอกสาร</h3>
                <p className="text-sm text-slate-500">พบทั้งหมด {extractedItems.length} รายการ กรุณาตรวจสอบความถูกต้องก่อนบันทึก</p>
              </div>
              <button onClick={() => setIsReviewingImport(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <table className="w-full">
                <thead className="sticky top-0 bg-white border-b z-10">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">
                      <input 
                        type="checkbox" 
                        checked={extractedItems.every(i => i.isSelected)}
                        onChange={(e) => setExtractedItems(prev => prev.map(i => ({ ...i, isSelected: e.target.checked })))}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">รายการ (สามัญ/การค้า)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">จำนวน</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">หน่วย</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">ราคาทุน</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">ราคาขาย</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">โหมดนำเข้า</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">คลังที่บันทึก</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {extractedItems.map((item, idx) => (
                    <tr key={item.id} className={`hover:bg-slate-50 ${!item.isSelected ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input 
                          type="checkbox" 
                          checked={item.isSelected}
                          onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, isSelected: e.target.checked } : it))}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <input 
                            className="w-full text-sm border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                            value={item.name}
                            onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))}
                            placeholder="ชื่อสามัญ"
                          />
                          <input 
                            className="w-full text-xs italic text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                            value={item.tradeName}
                            onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, tradeName: e.target.value } : it))}
                            placeholder="ชื่อการค้า"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          type="number"
                          className="w-20 text-sm border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                          value={item.stock}
                          onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, stock: +e.target.value } : it))}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          className="w-16 text-sm border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                          value={item.unit}
                          onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, unit: e.target.value } : it))}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          type="number"
                          className="w-20 text-sm border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                          value={item.costPrice}
                          onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, costPrice: +e.target.value } : it))}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          type="number"
                          className="w-20 text-sm border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                          value={item.price}
                          onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, price: +e.target.value } : it))}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select 
                          className="text-xs border rounded p-1 outline-none focus:ring-1 focus:ring-emerald-500"
                          value={item.importMode}
                          onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, importMode: e.target.value } : it))}
                        >
                          <option value="new">เพิ่มเป็นรายการใหม่</option>
                          <option value="update" disabled={!item.existingId}>อัปเดตรายการเดิม</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <select 
                          className="text-xs border rounded p-1 outline-none focus:ring-1 focus:ring-emerald-500"
                          value={item.targetType}
                          onChange={(e) => setExtractedItems(prev => prev.map((it, i) => i === idx ? { ...it, targetType: e.target.value } : it))}
                        >
                          <option value="drugs">คลังยา</option>
                          <option value="supplies">คลังพัสดุ</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        {item.existingId ? (
                          <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">มีในระบบแล้ว (เพิ่มสต็อก)</span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">รายการใหม่</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsReviewingImport(false)} className="px-6 py-2 border border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">ยกเลิก</button>
              <button onClick={confirmImport} className="px-10 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95">
                <Save className="w-4 h-4" />
                ยืนยันการนำเข้า ({extractedItems.filter(i => i.isSelected).length} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Prescription Label Modal */}
      {printingDrug && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><Printer className="w-4 h-4" /> ตัวอย่างสลากยา</h4>
                <button onClick={() => setPrintingDrug(null)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             
             <div className="p-10 flex flex-col items-center bg-slate-50 gap-6">
                {/* Editable Instruction for Printing */}
                <div className="w-full max-w-[8cm] no-print space-y-2">
                  <label className="text-xs font-bold text-slate-500">แก้ไขวิธีใช้สำหรับพิมพ์:</label>
                  <textarea 
                    className="w-full border p-2 rounded text-xs"
                    rows={2}
                    value={printingDrug.instruction}
                    onChange={e => setPrintingDrug({...printingDrug, instruction: e.target.value})}
                  />
                </div>

                {/* Standard Drug Label Card */}
                <div id="drug-label" className="w-[8cm] min-h-[5cm] bg-white border border-slate-300 p-4 font-['Sarabun'] shadow-sm text-slate-900 leading-tight">
                   <header className="border-b border-slate-300 pb-2 mb-2 text-center">
                      <h5 className="text-sm font-bold truncate">{clinicInfo.name}</h5>
                      <p className="text-[8px] truncate">{clinicInfo.address}</p>
                      <p className="text-[8px] font-bold">โทร: {clinicInfo.phone}</p>
                   </header>
                   
                   <section className="space-y-1 mb-3">
                      <div className="flex justify-between text-[10px]">
                         <p><span className="font-bold">ผู้ป่วย:</span> ........................................................</p>
                      </div>
                      <p className="text-[10px]"><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
                   </section>

                   <section className="mb-3">
                      <p className="text-sm font-bold text-slate-800 uppercase border-b border-slate-100 pb-1">{printingDrug.name}</p>
                      <div className="bg-slate-100 p-2 mt-1 rounded text-center">
                         <p className="text-xs font-bold whitespace-pre-wrap">{printingDrug.instruction || '(ระบุวิธีใช้)'}</p>
                         {printingDrug.precautions && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ {printingDrug.precautions}</p>}
                      </div>
                   </section>

                   <footer className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-emerald-700">
                         <p>สรรพคุณ: {printingDrug.purpose || 'รักษาตามอาการ'}</p>
                         <p>จำนวน: ........... {printingDrug.unit}</p>
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
                  onClick={() => window.print()} 
                  className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                   <Printer className="w-5 h-5" /> พิมพ์สลากยา (Print)
                </button>
             </div>
          </div>
        </div>
      )}
      {/* Prescription Label Modal */}
      {printingDrug && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-4 bg-slate-100 border-b flex justify-between items-center no-print">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><Printer className="w-4 h-4" /> ตัวอย่างสลากยา</h4>
                <button onClick={() => setPrintingDrug(null)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             
             <div className="p-10 flex flex-col items-center bg-slate-50 gap-6">
                {/* Editable Instruction for Printing */}
                <div className="w-full max-w-[8cm] no-print space-y-2">
                  <label className="text-xs font-bold text-slate-500">แก้ไขวิธีใช้สำหรับพิมพ์:</label>
                  <textarea 
                    className="w-full border p-2 rounded text-xs"
                    rows={2}
                    value={printingDrug.instruction}
                    onChange={e => setPrintingDrug({...printingDrug, instruction: e.target.value})}
                  />
                </div>

                {/* Standard Drug Label Card */}
                <div id="drug-label" className="w-[8cm] min-h-[5cm] bg-white border border-slate-300 p-4 font-['Sarabun'] shadow-sm text-slate-900 leading-tight">
                   <header className="border-b border-slate-300 pb-2 mb-2 text-center">
                      <h5 className="text-sm font-bold truncate">{clinicInfo.name}</h5>
                      <p className="text-[8px] truncate">{clinicInfo.address}</p>
                      <p className="text-[8px] font-bold">โทร: {clinicInfo.phone}</p>
                   </header>
                   
                   <section className="space-y-1 mb-3">
                      <div className="flex justify-between text-[10px]">
                         <p><span className="font-bold">ผู้ป่วย:</span> ........................................................</p>
                      </div>
                      <p className="text-[10px]"><span className="font-bold">วันที่:</span> {new Date().toLocaleDateString('th-TH')}</p>
                   </section>

                   <section className="mb-3">
                      <p className="text-sm font-bold text-slate-800 uppercase border-b border-slate-100 pb-1">{printingDrug.name}</p>
                      <div className="bg-slate-100 p-2 mt-1 rounded text-center">
                         <p className="text-xs font-bold whitespace-pre-wrap">{printingDrug.instruction || '(ระบุวิธีใช้)'}</p>
                         {printingDrug.precautions && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ {printingDrug.precautions}</p>}
                      </div>
                   </section>

                   <footer className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-emerald-700">
                         <p>สรรพคุณ: {printingDrug.purpose || 'รักษาตามอาการ'}</p>
                         <p>จำนวน: ........... {printingDrug.unit}</p>
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
                  onClick={() => window.print()} 
                  className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                   <Printer className="w-5 h-5" /> พิมพ์สลากยา (Print)
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 ${
              confirmConfig.type === 'danger' ? 'bg-red-50' : 
              confirmConfig.type === 'warning' ? 'bg-orange-50' : 'bg-emerald-50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  confirmConfig.type === 'danger' ? 'bg-red-100 text-red-600' : 
                  confirmConfig.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {confirmConfig.type === 'danger' ? <Trash2 className="w-6 h-6" /> : 
                   confirmConfig.type === 'warning' ? <AlertCircle className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{confirmConfig.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{confirmConfig.message}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white flex justify-end gap-3 border-t">
              <button 
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmConfig.onConfirm}
                className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all active:scale-95 ${
                  confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 
                  confirmConfig.type === 'warning' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                }`}
              >
                {confirmConfig.type === 'danger' ? 'ลบข้อมูล' : 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-right-10 duration-300">
          <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-bold">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
