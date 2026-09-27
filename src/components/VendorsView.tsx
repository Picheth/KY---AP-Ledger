import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Vendor, PaymentMethod } from '../types/finance';
import { formatCurrency, convertFromUSD } from '../utils/currency';
import {
  Search,
  Filter,
  Plus,
  Building,
  Star,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  X,
  CreditCard,
  Split,
} from 'lucide-react';

interface VendorsViewProps {
  onSelectInvoice: (id: string) => void;
  onOpenIntakeWithVendor?: (vendorName: string) => void;
  onOpenSplitAllocatorForVendor?: (vendorId: string) => void;
}

export const VendorsView: React.FC<VendorsViewProps> = ({
  onSelectInvoice,
  onOpenIntakeWithVendor,
  onOpenSplitAllocatorForVendor,
}) => {
  const { vendors, invoices, currentCurrency, addVendor } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);

  // New Vendor Form State
  const [newVendorName, setNewVendorName] = useState('');
  const [newCategory, setNewCategory] = useState('Mobile Phone');
  const [newTaxId, setNewTaxId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newRouting, setNewRouting] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newTerms, setNewTerms] = useState('Net 30');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('ach');
  const [newContactPerson, setNewContactPerson] = useState('');

  // Filter vendors
  const categories = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => { if (v.category) set.add(v.category); });
    return Array.from(set);
  }, [vendors]);

  const getVendorInvoiceFormat = (name: string) => {
    if (name.includes('S4')) return 'S4-YYYYMMDD';
    if (name.includes('PLP')) return 'PLP-xxxxx';
    if (name.includes('PLN')) return 'PLN-xxxxx';
    if (name.includes('DN')) return 'DN-xxxxx';
    if (name.includes('SV')) return 'SV-xxxxx';
    if (name.includes('Falcon')) return 'FAL-xxxxx / S9-xxxxx';
    return null;
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matches =
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.taxId.toLowerCase().includes(q) ||
          v.contactPerson.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (statusFilter !== 'all' && v.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && v.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [vendors, searchQuery, statusFilter, categoryFilter]);

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) {
      alert('Please enter a vendor name.');
      return;
    }

    addVendor({
      name: newVendorName.trim(),
      category: newCategory,
      taxId: newTaxId.trim() || `US-${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: newEmail.trim() || 'billing@vendor.com',
      phone: newPhone.trim() || '+1 (555) 010-0000',
      address: newAddress.trim() || '100 Enterprise Way, Suite 400',
      bankName: newBankName.trim() || 'Citibank Corporate',
      bankRoutingNumber: newRouting.trim() || '021000089',
      bankAccountNumber: newAccount.trim() ? `•••• ${newAccount.slice(-4)}` : '•••• 4921',
      defaultPaymentMethod: newPaymentMethod,
      defaultPaymentTerms: newTerms,
      rating: 5,
      status: 'active',
      contactPerson: newContactPerson.trim() || 'Accounts Receivable Lead',
    });

    // Reset & close
    setNewVendorName('');
    setShowAddVendorModal(false);
  };

  // Invoices for selected vendor
  const vendorInvoices = useMemo(() => {
    if (!selectedVendor) return [];
    return invoices.filter((i) => i.vendorId === selectedVendor.id || i.vendorName === selectedVendor.name);
  }, [selectedVendor, invoices]);

  return (
    <div className="space-y-4">
      
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor name, category, tax ID or contact..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none"
          >
            <option value="all">All Product Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none"
          >
            <option value="all">All Vendor Statuses</option>
            <option value="preferred">Preferred Suppliers</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="under_review">Under Review</option>
          </select>

          {/* Add Vendor Button */}
          <button
            onClick={() => setShowAddVendorModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => {
          const spendDisplay = convertFromUSD(vendor.totalSpendUSD, currentCurrency);
          const isPreferred = vendor.status === 'preferred';

          return (
            <div
              key={vendor.id}
              onClick={() => setSelectedVendor(vendor)}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-5 cursor-pointer transition-all hover:shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 hover:text-slate-700">
                      {vendor.name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {vendor.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-mono">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{vendor.rating}.0</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400 text-[11px]">Lifetime Spend</div>
                    <div className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(spendDisplay, currentCurrency)}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 text-[11px]">Payment Terms</div>
                    <div className="font-mono text-slate-800">
                      {vendor.defaultPaymentTerms}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 text-[11px]">Bank Route</div>
                    <div className="text-slate-700 truncate" title={vendor.bankName}>
                      {vendor.bankName.split(' ')[0]} {vendor.bankAccountNumber}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 text-[11px]">Open Invoices</div>
                    <div className="font-mono text-slate-800">
                      {invoices.filter((i) => (i.vendorId === vendor.id || i.vendorName === vendor.name) && i.status !== 'paid').length} open
                    </div>
                  </div>
                </div>
              </div>

              {getVendorInvoiceFormat(vendor.name) && (
                <div className="mt-2.5 text-[10px] font-mono bg-indigo-50/60 text-indigo-700 px-2 py-1 rounded border border-indigo-100 flex items-center justify-between">
                  <span className="text-slate-500">Invoice format:</span>
                  <span className="font-bold">{getVendorInvoiceFormat(vendor.name)}</span>
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">Tax ID: {vendor.taxId}</span>
                <span className={`font-medium ${isPreferred ? 'text-blue-700' : 'text-slate-600'}`}>
                  {vendor.status.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vendor Detail Drawer */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            
            {/* Drawer Header */}
            <div>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedVendor.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">{selectedVendor.category}</div>
                </div>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 space-y-5 text-xs">
                
                {/* Contact & Banking Details */}
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{selectedVendor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{selectedVendor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{selectedVendor.address}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
                    <div>Primary Contact: {selectedVendor.contactPerson}</div>
                    <div>Tax ID / VATTIN: {selectedVendor.taxId}</div>
                    {getVendorInvoiceFormat(selectedVendor.name) && (
                      <div className="text-indigo-700 font-semibold">
                        Invoice Format: <span className="underline">{getVendorInvoiceFormat(selectedVendor.name)}</span>
                      </div>
                    )}
                    <div>Bank: {selectedVendor.bankName} (Routing: {selectedVendor.bankRoutingNumber})</div>
                    <div>Account: {selectedVendor.bankAccountNumber} · Preferred Rail: {selectedVendor.defaultPaymentMethod.toUpperCase()}</div>
                  </div>
                </div>

                {/* Open Invoices for this Vendor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Invoice History ({vendorInvoices.length})
                    </h4>
                  </div>

                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {vendorInvoices.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        No invoices recorded for this vendor.
                      </div>
                    ) : (
                      vendorInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => onSelectInvoice(inv.id)}
                          className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono font-medium text-slate-900">{inv.invoiceNumber}</div>
                            <div className="text-[11px] text-slate-400">Due {inv.dueDate} · {inv.status}</div>
                          </div>
                          <div className="text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatCurrency(inv.totalAmount, inv.currency)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div>
                {vendorInvoices.some((i) => i.status !== 'paid') && (
                  <button
                    onClick={() => {
                      if (onOpenSplitAllocatorForVendor && selectedVendor) {
                        onOpenSplitAllocatorForVendor(selectedVendor.id);
                        setSelectedVendor(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-600 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Settle & Split Invoices</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Register New Supplier / Vendor</h3>
              <button
                onClick={() => setShowAddVendorModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Vendor Legal Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="e.g. Cisco Systems Enterprise Inc."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
                  >
                    <option value="Mobile Phone">Mobile Phone</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Logistics & Freight">Logistics & Freight</option>
                    <option value="Hardware Engineering">Hardware Engineering</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tax ID / EIN / VAT</label>
                  <input
                    type="text"
                    value={newTaxId}
                    onChange={(e) => setNewTaxId(e.target.value)}
                    placeholder="US-123456789"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Accounts Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ar@vendor.com"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 (800) 555-0100"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Terms</label>
                  <select
                    value={newTerms}
                    onChange={(e) => setNewTerms(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Default Payment Rail</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono uppercase"
                  >
                    <option value="ach">ACH</option>
                    <option value="wire">Wire</option>
                    <option value="sepa">SEPA</option>
                    <option value="virtual_card">Virtual Card (1.5% Rebate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="JPMorgan Chase / Bank of America"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Account Number</label>
                  <input
                    type="text"
                    value={newAccount}
                    onChange={(e) => setNewAccount(e.target.value)}
                    placeholder="Last 4 digits or full number"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
