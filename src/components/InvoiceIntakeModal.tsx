import React, { useState } from 'react';
import { todayPhnomPenh, toPhnomPenhDate } from '../utils/datetime';
import { useFinance } from '../context/FinanceContext';
import { CurrencyCode, Invoice, InvoiceLineItem } from '../types/finance';
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle,
  Plus,
  Trash2,
  AlertCircle,
  Cpu,
} from 'lucide-react';

interface InvoiceIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}

export const InvoiceIntakeModal: React.FC<InvoiceIntakeModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { vendors, addInvoice, invoices, appMode } = useFinance();
  const isSimple = appMode === 'simple';

  const [isScanning, setIsScanning] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Mobile Phone');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [issueDate, setIssueDate] = useState('2026-09-25');
  const [dueDate, setDueDate] = useState('2026-10-25');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [department, setDepartment] = useState('Mobile Phone Operations');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [threeWayMatched, setThreeWayMatched] = useState(true);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: 'li_sample_1',
      description: 'Flagship 5G Smartphone Ultra (512GB / 12GB RAM, Titanium Black)',
      quantity: 500,
      unitPrice: 650.0,
      taxRate: 0.0,
      totalAmount: 325000.0,
    },
  ]);

  if (!isOpen) return null;

  // Preset sample receipts for instant automated intake demo
  const samplePresets = [
    {
      label: '📱 S4 LH (Phones, Tablets, Accessories) - S4-YYYYMMDD',
      vendor: 'S4 LH',
      category: 'Mobile Phones, Tablets and Accessories',
      invNum: `S4-${todayPhnomPenh().replace(/-/g, '')}`,
      poNum: 'PO-2026-S4-101',
      curr: 'USD' as CurrencyCode,
      dept: 'Mobile Phone & Tablet Division',
      terms: 'Net 15',
      items: [
        { id: '1', description: 'Samsung Galaxy A55 5G (8GB / 256GB Awesome Navy)', quantity: 30, unitPrice: 340.0, taxRate: 0.0, totalAmount: 10200 },
        { id: '2', description: 'Apple iPad 10th Gen 10.9" Wi-Fi 64GB (Silver)', quantity: 20, unitPrice: 380.0, taxRate: 0.0, totalAmount: 7600 },
        { id: '3', description: '20W PD USB-C Fast Wall Chargers & Braided Cables', quantity: 150, unitPrice: 12.0, taxRate: 0.0, totalAmount: 1800 },
      ],
    },
    {
      label: '📱 S3 PLP (Second-hand Mobile Phones) - PLP-xxxxx',
      vendor: 'S3 PLP',
      category: 'Mobile Phones (second-hand)',
      invNum: `PLP-${Math.floor(10000 + Math.random() * 90000)}`,
      poNum: 'PO-2026-PLP-105',
      curr: 'USD' as CurrencyCode,
      dept: 'Second-Hand Phone Operations',
      terms: 'Net 7',
      items: [
        { id: '1', description: 'iPhone 14 Pro Max 128GB (Deep Purple / Space Black, 99% Second-Hand)', quantity: 15, unitPrice: 650.0, taxRate: 0.0, totalAmount: 9750 },
        { id: '2', description: 'iPhone 13 Pro 128GB (Sierra Blue, 98% Second-Hand Tested)', quantity: 12, unitPrice: 480.0, taxRate: 0.0, totalAmount: 5760 },
        { id: '3', description: 'Samsung Galaxy S23 Ultra 256GB (Phantom Black, 99% Second-Hand)', quantity: 8, unitPrice: 820.0, taxRate: 0.0, totalAmount: 6560 },
      ],
    },
    {
      label: '📱 S3 PLP-NEW (Brand New Mobile Phone) - PLN-xxxxx',
      vendor: 'S3 PLP-NEW',
      category: 'Mobile Phone (New)',
      invNum: `PLN-${Math.floor(10000 + Math.random() * 90000)}`,
      poNum: 'PO-2026-PLN-201',
      curr: 'USD' as CurrencyCode,
      dept: 'New Mobile Phone Division',
      terms: 'Net 30',
      items: [
        { id: '1', description: 'iPhone 16 Pro Max 256GB (Desert Titanium, Official New Sealed Box)', quantity: 25, unitPrice: 1250.0, taxRate: 0.0, totalAmount: 31250 },
        { id: '2', description: 'Samsung Galaxy S24 Ultra 512GB (Titanium Gray, New Warranty)', quantity: 15, unitPrice: 800.0, taxRate: 0.0, totalAmount: 12000 },
      ],
    },
    {
      label: '🎧 S5 DN (Accessories) - DN-xxxxx (KHR ៛)',
      vendor: 'S5 DN',
      category: 'Accessories',
      invNum: `DN-${Math.floor(10000 + Math.random() * 90000)}`,
      poNum: 'PO-2026-DN-301',
      curr: 'KHR' as CurrencyCode,
      dept: 'Accessories & Peripherals',
      terms: 'Net 15',
      items: [
        { id: '1', description: '9H Full-Cover Tempered Glass Screen Protectors (Box of 1000)', quantity: 1000, unitPrice: 16260, taxRate: 0.0, totalAmount: 16260000 },
        { id: '2', description: 'MagSafe Shockproof Silicone Phone Cases', quantity: 500, unitPrice: 24390, taxRate: 0.0, totalAmount: 12195000 },
      ],
    },
    {
      label: '📱 S13 SV (New & Second-hand Phones) - SV-xxxxx',
      vendor: 'S13 SV',
      category: 'Mobile Phones (new and second-hand)',
      invNum: `SV-${Math.floor(10000 + Math.random() * 90000)}`,
      poNum: 'PO-2026-SV-401',
      curr: 'USD' as CurrencyCode,
      dept: 'Mobile Phone Operations',
      terms: 'Net 15',
      items: [
        { id: '1', description: 'Redmi Note 13 Pro+ 5G (12GB / 512GB Midnight Black, Brand New)', quantity: 30, unitPrice: 310.0, taxRate: 0.0, totalAmount: 9300 },
        { id: '2', description: 'iPhone 12 Pro 128GB (Pacific Blue, 98% Second-Hand Tested)', quantity: 20, unitPrice: 352.0, taxRate: 0.0, totalAmount: 7040 },
      ],
    },
    {
      label: '💻 S9 Falcon (Phones, Tablets, Laptops) - FAL-xxxxx',
      vendor: 'S9 Falcon',
      category: 'Mobile phones, tablets, laptops, accessories',
      invNum: `FAL-${Math.floor(10000 + Math.random() * 90000)}`,
      poNum: 'PO-2026-FAL-501',
      curr: 'USD' as CurrencyCode,
      dept: 'Multi-Category Tech Division',
      terms: 'Net 30',
      items: [
        { id: '1', description: 'ASUS Zenbook 14 OLED AI Laptop (Core Ultra 7, 16GB RAM, 512GB SSD)', quantity: 20, unitPrice: 850.0, taxRate: 0.0, totalAmount: 17000 },
        { id: '2', description: 'Apple iPad Air 11" M2 Chip (128GB Wi-Fi Space Gray, New Sealed)', quantity: 25, unitPrice: 550.0, taxRate: 0.0, totalAmount: 13750 },
      ],
    },
  ];

  const applyPreset = (preset: typeof samplePresets[0]) => {
    setIsScanning(true);
    setTimeout(() => {
      setVendorName(preset.vendor);
      setVendorCategory(preset.category);
      setInvoiceNumber(preset.invNum);
      setPoNumber(preset.poNum);
      setCurrency(preset.curr);
      setDepartment(preset.dept);
      setPaymentTerms(preset.terms);
      setLineItems(preset.items);
      setIsScanning(false);
    }, 600);
  };

  const handleSimulateOCRUpload = () => {
    setIsScanning(true);
    setTimeout(() => {
      applyPreset(samplePresets[0]);
      setIsScanning(false);
    }, 900);
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `li_${Date.now()}`,
        description: 'New service line item',
        quantity: 1,
        unitPrice: 500,
        taxRate: 0.05,
        totalAmount: 500,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((li) => li.id !== id));
    }
  };

  const updateLineItem = (
    id: string,
    field: keyof InvoiceLineItem,
    val: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        const updated = { ...li, [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalAmount = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      })
    );
  };

  const subtotal = lineItems.reduce((s, li) => s + li.totalAmount, 0);
  const taxAmount = lineItems.reduce((s, li) => s + li.totalAmount * li.taxRate, 0);
  const totalAmount = subtotal + taxAmount;

  // Check duplicate invoice number
  const isDuplicate = invoices.some(
    (i) => i.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase().trim()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !invoiceNumber.trim()) {
      alert('Please enter Vendor Name and Invoice Number.');
      return;
    }
    if (isDuplicate) {
      alert(`Invoice number ${invoiceNumber} already exists in the system. Duplicate rejected by audit protocol.`);
      return;
    }

    const matchedVendor = vendors.find(
      (v) => v.name.toLowerCase() === vendorName.toLowerCase()
    );

    const created = addInvoice({
      invoiceNumber: invoiceNumber.trim(),
      type: 'payable',
      poNumber: poNumber.trim() || undefined,
      vendorId: matchedVendor?.id || 'vnd_custom',
      vendorName: vendorName.trim(),
      vendorCategory,
      issueDate,
      dueDate,
      currency,
      subtotal,
      taxAmount,
      totalAmount,
      amountPaid: 0,
      remainingBalance: totalAmount,
      partialPayments: [],
      status: isSimple ? 'approved' : 'pending_approval',
      paymentTerms,
      department,
      assignedApproverRole: totalAmount > 50000 ? 'cfo' : 'dept_manager',
      threeWayMatched,
      lineItems,
      notes: isSimple ? 'Direct bill entry recorded in ledger.' : 'Automated OCR optical parsing verified. Routed to approval queue.',
    });

    onCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                {isSimple ? 'Record Supplier Bill / Purchase' : 'Automated Invoice Intake & OCR Processor'}
              </h3>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {isSimple
                ? 'Enter purchase receipt details to track what you owe and record payments in USD or KHR'
                : 'Optical character recognition extracts vendor, line items, and matches PO reference'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Preset Buttons for Quick Demo */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Test Scans (Click to auto-extract):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors font-medium text-slate-800 flex items-center justify-between"
                >
                  <span>{preset.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{preset.curr}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop OCR Upload Area */}
          <div
            onClick={handleSimulateOCRUpload}
            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
              isScanning
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            {isScanning ? (
              <div className="space-y-2 py-3">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                <div className="text-xs font-semibold text-blue-900">
                  Scanning invoice document with 99.4% confidence...
                </div>
                <div className="text-[11px] text-blue-600">
                  Parsing vendor EIN, line item table, and purchase order cross-match
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-800">
                  Click to drop invoice PDF or scanned image
                </div>
                <div className="text-[11px] text-slate-500">
                  Supports PDF, TIFF, PNG up to 25MB · Auto-matches existing Purchase Orders
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vendor */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Vendor / Beneficiary Name *
                </label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. S4 LH, S3 PLP, S3 PLP-NEW, S5 DN, S13 SV, S9 Falcon"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-500"
                />
                {/* Shop Vendors Quick Pick */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Shop Vendors:</span>
                  {[
                    { name: 'S4 LH', category: 'Mobile Phones, Tablets and Accessories', format: 'S4-YYYYMMDD', genInv: () => `S4-${todayPhnomPenh().replace(/-/g, '')}` },
                    { name: 'S3 PLP', category: 'Mobile Phones (second-hand)', format: 'PLP-xxxxx', genInv: () => `PLP-${Math.floor(10000 + Math.random() * 90000)}` },
                    { name: 'S3 PLP-NEW', category: 'Mobile Phone (New)', format: 'PLN-xxxxx', genInv: () => `PLN-${Math.floor(10000 + Math.random() * 90000)}` },
                    { name: 'S5 DN', category: 'Accessories', format: 'DN-xxxxx', genInv: () => `DN-${Math.floor(10000 + Math.random() * 90000)}` },
                    { name: 'S13 SV', category: 'Mobile Phones (new and second-hand)', format: 'SV-xxxxx', genInv: () => `SV-${Math.floor(10000 + Math.random() * 90000)}` },
                    { name: 'S9 Falcon', category: 'Mobile phones, tablets, laptops, accessories', format: 'FAL-xxxxx', genInv: () => `FAL-${Math.floor(10000 + Math.random() * 90000)}` },
                  ].map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => {
                        setVendorName(v.name);
                        setVendorCategory(v.category);
                        setInvoiceNumber(v.genInv());
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                        vendorName === v.name
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendor Category */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Spend Category
                </label>
                <select
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-slate-500"
                >
                  <option value="Mobile Phones, Tablets and Accessories">Mobile Phones, Tablets and Accessories (S4 LH)</option>
                  <option value="Mobile Phones (second-hand)">Mobile Phones (second-hand) (S3 PLP)</option>
                  <option value="Mobile Phone (New)">Mobile Phone (New) (S3 PLP-NEW)</option>
                  <option value="Accessories">Accessories (S5 DN)</option>
                  <option value="Mobile Phones (new and second-hand)">Mobile Phones (new and second-hand) (S13 SV)</option>
                  <option value="Mobile phones, tablets, laptops, accessories">Mobile phones, tablets, laptops, accessories (S9 Falcon)</option>
                  <option value="Mobile Phone">Mobile Phone</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. S4-YYYYMMDD, PLP-xxxxx, PLN-xxxxx, DN-xxxxx, SV-xxxxx, FAL-xxxxx"
                  className={`w-full px-3 py-1.5 text-xs bg-white border rounded-md font-mono focus:outline-none ${
                    isDuplicate ? 'border-rose-500' : 'border-slate-200 focus:border-slate-500'
                  }`}
                />
                {isDuplicate ? (
                  <span className="text-[10px] text-rose-600 mt-0.5 block">
                    Duplicate alert: Invoice number already exists.
                  </span>
                ) : vendorName.includes('S4') ? (
                  <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">
                    Format: <strong>S4-YYYYMMDD</strong> (e.g. S4-{todayPhnomPenh().replace(/-/g, '')})
                  </span>
                ) : vendorName.includes('PLP') ? (
                  <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">
                    Format: <strong>PLP-xxxxx</strong> (e.g. PLP-80214)
                  </span>
                ) : vendorName.includes('PLN') ? (
                  <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">
                    Format: <strong>PLN-xxxxx</strong> (e.g. PLN-40192)
                  </span>
                ) : vendorName.includes('DN') ? (
                  <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">
                    Format: <strong>DN-xxxxx</strong> (e.g. DN-10492)
                  </span>
                ) : vendorName.includes('SV') ? (
                  <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">
                    Format: <strong>SV-xxxxx</strong> (e.g. SV-60291)
                  </span>
                ) : vendorName.includes('Falcon') ? (
                  <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">
                    Format: <strong>FAL-xxxxx</strong> or <strong>S9-xxxxx</strong> (e.g. FAL-50219)
                  </span>
                ) : null}
              </div>

              {/* PO Number */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Purchase Order (PO) Reference
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-1044"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono focus:outline-none focus:border-slate-500"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Invoice Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-800 focus:outline-none focus:border-slate-500"
                >
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="KHR">KHR - Cambodian Riel (៛)</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cost Center / Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-slate-500"
                >
                  <option value="Hardware Engineering">Hardware Engineering</option>
                  <option value="Manufacturing & SMT">Manufacturing & SMT</option>
                  <option value="Accessories & Retail">Accessories & Retail</option>
                  <option value="Operations & Manufacturing">Operations & Manufacturing</option>
                  <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
                  <option value="Sales & Channel Distribution">Sales & Channel Distribution</option>
                  <option value="Finance & Treasury">Finance & Treasury</option>
                </select>
              </div>

              {/* Issue Date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Issue Date (Backdating allowed)
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const today = todayPhnomPenh();
                        setIssueDate(today);
                        setDueDate(toPhnomPenhDate(new Date(Date.now() + 30 * 86400000)));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        const s = toPhnomPenhDate(d);
                        setIssueDate(s);
                        setDueDate(toPhnomPenhDate(new Date(d.getTime() + 30 * 86400000)));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 7);
                        const s = toPhnomPenhDate(d);
                        setIssueDate(s);
                        setDueDate(toPhnomPenhDate(new Date(d.getTime() + 30 * 86400000)));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      -1w
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 1);
                        const s = toPhnomPenhDate(d);
                        setIssueDate(s);
                        setDueDate(toPhnomPenhDate(new Date(d.getTime() + 30 * 86400000)));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      -1m
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    const newIssue = e.target.value;
                    setIssueDate(newIssue);
                    if (newIssue) {
                      setDueDate(toPhnomPenhDate(new Date(new Date(newIssue).getTime() + 30 * 86400000)));
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-800 focus:outline-none focus:border-slate-500"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono text-slate-800 focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Line items section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Line Items Breakdown</span>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="space-y-2">
                {lineItems.map((li) => (
                  <div
                    key={li.id}
                    className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-slate-50 rounded-md border border-slate-200 text-xs"
                  >
                    <input
                      type="text"
                      value={li.description}
                      onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                      placeholder="Item description"
                      className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="w-16">
                        <input
                          type="number"
                          value={li.quantity}
                          min={1}
                          onChange={(e) => updateLineItem(li.id, 'quantity', Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-right"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={li.unitPrice}
                          min={0}
                          step="0.01"
                          onChange={(e) => updateLineItem(li.id, 'unitPrice', Number(e.target.value))}
                          placeholder="Price"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-right"
                        />
                      </div>
                      <div className="w-20 font-mono font-semibold text-slate-900 text-right">
                        {li.totalAmount.toFixed(2)}
                      </div>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(li.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total display */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{subtotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Calculated Tax</span>
                <span className="font-mono">{taxAmount.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Payout</span>
                <span className="font-mono">{totalAmount.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* 3-Way Match Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="threeWay"
                checked={threeWayMatched}
                onChange={(e) => setThreeWayMatched(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="threeWay" className="text-xs text-slate-700 cursor-pointer">
                Confirm 3-way match (Purchase Order, receiving slip, and contract rates verified)
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDuplicate}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors shadow-xs"
              >
                Log Into AP Workflow
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
