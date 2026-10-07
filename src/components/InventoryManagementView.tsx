import React, { useState, useMemo } from 'react';
import { Material, MaterialCategory, StockImportReceipt, StockImportItem, Order, Product } from '../types';
import { formatCurrency, formatNumber, formatDateVN } from '../utils/formatters';
import { getMaterialUsageSummary, calculateOrderBOM, createMaterialDeductionRecords } from '../utils/materialBOM';
import {
  Boxes, Plus, Search, AlertTriangle, CheckCircle2, TrendingDown,
  ArrowDownLeft, FileText, Calendar, DollarSign, PackagePlus,
  Edit, Trash2, SlidersHorizontal, RefreshCw, X, ArrowUpDown, Truck, ChevronRight,
  BookOpen, Sparkles, ShoppingBag, ArrowRight
} from 'lucide-react';
import { MoneyInput } from './MoneyInput';

interface InventoryManagementViewProps {
  materials: Material[];
  stockImports: StockImportReceipt[];
  orders?: Order[];
  products?: Product[];
  onSaveMaterial: (material: Material) => void;
  onDeleteMaterial: (materialId: string) => void;
  onSaveStockImport: (receipt: StockImportReceipt) => void;
  onDeleteStockImport?: (receiptId: string) => void;
  onAdjustStock: (materialId: string, newQuantity: number, reason: string) => void;
  onClearAllInventory?: () => void;
  onClearAllStockImports?: () => void;
  onResetStockToZero?: () => void;
  onReloadDefaultMaterials?: () => void;
}

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  materials,
  stockImports,
  orders = [],
  products = [],
  onSaveMaterial,
  onDeleteMaterial,
  onSaveStockImport,
  onDeleteStockImport,
  onAdjustStock,
  onClearAllInventory,
  onClearAllStockImports,
  onResetStockToZero,
  onReloadDefaultMaterials
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'history' | 'sales_deductions'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'instock' | 'out'>('all');

  // Modals
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isNewImportModalOpen, setIsNewImportModalOpen] = useState(false);
  const [quickImportMaterial, setQuickImportMaterial] = useState<Material | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Xuất dùng sản xuất in ảnh');
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<StockImportReceipt | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<StockImportReceipt | null>(null);
  const [isClearInventoryModalOpen, setIsClearInventoryModalOpen] = useState(false);
  const [isClearStockImportsModalOpen, setIsClearStockImportsModalOpen] = useState(false);
  const [isBOMGuideOpen, setIsBOMGuideOpen] = useState(false);

  // Material Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('Gỗ MDF');
  const [formUnit, setFormUnit] = useState('Tấm');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formStockQuantity, setFormStockQuantity] = useState<number>(0);
  const [formMinStockAlert, setFormMinStockAlert] = useState<number>(5);
  const [formSupplier, setFormSupplier] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Import Receipt Form state
  const [importDate, setImportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [importSupplier, setImportSupplier] = useState<string>('');
  const [importNotes, setImportNotes] = useState<string>('');
  const [importItems, setImportItems] = useState<Array<{
    materialId: string;
    quantity: number;
    costPrice: number;
  }>>([]);

  // Available categories
  const categories: MaterialCategory[] = [
    'Gỗ MDF',
    'Fomex siêu nhẹ',
    'Giấy In Ảnh',
    'Mica & Pha Lê',
    'Khung Ảnh',
    'Mực In',
    'Keo & Màng Lụa'
  ];

  // 1. KPI Calculations
  const totalMaterialCount = materials.length;
  
  const totalStockQuantity = useMemo(() => {
    return materials.reduce((sum, m) => sum + (m.stockQuantity || 0), 0);
  }, [materials]);

  const totalInventoryValue = useMemo(() => {
    return materials.reduce((sum, m) => sum + (m.stockQuantity || 0) * (m.costPrice || 0), 0);
  }, [materials]);

  const lowStockMaterials = useMemo(() => {
    return materials.filter(m => m.stockQuantity > 0 && m.stockQuantity <= m.minStockAlert);
  }, [materials]);

  // Material Usage Calculations (Đồng bộ số lượng đã sử dụng từ toàn bộ đơn bán hàng)
  const materialUsageMap = useMemo(() => {
    return getMaterialUsageSummary(orders, materials, products);
  }, [orders, materials, products]);

  const totalUsedUnits = useMemo(() => {
    return Object.values(materialUsageMap).reduce((sum, item) => sum + item.usedQuantity, 0);
  }, [materialUsageMap]);

  const totalUsedOrdersCount = useMemo(() => {
    return orders.filter(o => o.status !== 'cancelled').length;
  }, [orders]);

  const outOfStockMaterials = useMemo(() => {
    return materials.filter(m => m.stockQuantity <= 0);
  }, [materials]);

  const totalHistoricalImportCost = useMemo(() => {
    return stockImports.reduce((sum, imp) => sum + (imp.totalAmount || 0), 0);
  }, [stockImports]);

  // 2. Filter materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      // Search
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.supplier && m.supplier.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      // Category
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;

      // Status
      if (statusFilter === 'low') {
        return m.stockQuantity > 0 && m.stockQuantity <= m.minStockAlert;
      }
      if (statusFilter === 'out') {
        return m.stockQuantity <= 0;
      }
      if (statusFilter === 'instock') {
        return m.stockQuantity > m.minStockAlert;
      }

      return true;
    });
  }, [materials, searchQuery, selectedCategory, statusFilter]);

  // Handlers for Material CRUD
  const handleOpenAddModal = (mat?: Material) => {
    if (mat) {
      setEditingMaterial(mat);
      setFormCode(mat.code);
      setFormName(mat.name);
      setFormCategory(mat.category);
      setFormUnit(mat.unit);
      setFormCostPrice(mat.costPrice);
      setFormStockQuantity(mat.stockQuantity);
      setFormMinStockAlert(mat.minStockAlert);
      setFormSupplier(mat.supplier || '');
      setFormNotes(mat.notes || '');
    } else {
      setEditingMaterial(null);
      setFormCode(`VT-${Date.now().toString().slice(-4)}`);
      setFormName('');
      setFormCategory('Gỗ MDF');
      setFormUnit('Tấm');
      setFormCostPrice(35000);
      setFormStockQuantity(10);
      setFormMinStockAlert(5);
      setFormSupplier('');
      setFormNotes('');
    }
    setIsAddMaterialModalOpen(true);
  };

  const handleSaveMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập tên vật liệu!');
      return;
    }

    const newMat: Material = {
      id: editingMaterial ? editingMaterial.id : `mat-${Date.now()}`,
      code: formCode.trim() || `VT-${Date.now().toString().slice(-4)}`,
      name: formName.trim(),
      category: formCategory,
      unit: formUnit.trim() || 'Cái',
      costPrice: Number(formCostPrice) || 0,
      stockQuantity: Number(formStockQuantity) || 0,
      minStockAlert: Number(formMinStockAlert) || 5,
      supplier: formSupplier.trim() || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: editingMaterial ? editingMaterial.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveMaterial(newMat);
    setIsAddMaterialModalOpen(false);
  };

  // Handlers for Stock Import Receipt Modal
  const handleOpenNewImport = (presetMaterial?: Material) => {
    setImportDate(new Date().toISOString().slice(0, 10));
    setImportSupplier(presetMaterial?.supplier || 'Xưởng Cung Cấp Vật Tư Hà Nội');
    setImportNotes('');

    if (presetMaterial) {
      setImportItems([
        {
          materialId: presetMaterial.id,
          quantity: 10,
          costPrice: presetMaterial.costPrice
        }
      ]);
    } else if (materials.length > 0) {
      setImportItems([
        {
          materialId: materials[0].id,
          quantity: 10,
          costPrice: materials[0].costPrice
        }
      ]);
    } else {
      setImportItems([]);
    }

    setIsNewImportModalOpen(true);
  };

  const handleAddImportItemRow = () => {
    if (materials.length === 0) return;
    setImportItems(prev => [
      ...prev,
      {
        materialId: materials[0].id,
        quantity: 10,
        costPrice: materials[0].costPrice
      }
    ]);
  };

  const handleRemoveImportItemRow = (index: number) => {
    setImportItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportItemChange = (index: number, field: 'materialId' | 'quantity' | 'costPrice', value: any) => {
    setImportItems(prev => {
      const copy = [...prev];
      if (field === 'materialId') {
        const selMat = materials.find(m => m.id === value);
        copy[index] = {
          ...copy[index],
          materialId: value,
          costPrice: selMat ? selMat.costPrice : copy[index].costPrice
        };
      } else {
        copy[index] = {
          ...copy[index],
          [field]: value
        };
      }
      return copy;
    });
  };

  const calculatedImportTotal = useMemo(() => {
    return importItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  }, [importItems]);

  const handleSaveImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (importItems.length === 0) {
      alert('Vui lòng thêm ít nhất 1 vật liệu để nhập kho!');
      return;
    }

    const items: StockImportItem[] = importItems.map((it, idx) => {
      const mat = materials.find(m => m.id === it.materialId);
      return {
        id: `ii-${Date.now()}-${idx}`,
        materialId: it.materialId,
        materialCode: mat?.code || 'VT-UNKNOWN',
        materialName: mat?.name || 'Vật tư',
        unit: mat?.unit || 'Cái',
        quantity: Number(it.quantity) || 0,
        costPrice: Number(it.costPrice) || 0,
        totalCost: (Number(it.quantity) || 0) * (Number(it.costPrice) || 0)
      };
    });

    const newReceipt: StockImportReceipt = {
      id: `imp-${Date.now()}`,
      receiptNumber: `NK-194-${new Date().getFullYear()}-${(stockImports.length + 1).toString().padStart(3, '0')}`,
      date: importDate,
      supplier: importSupplier.trim() || 'Nhà Cung Cấp',
      items,
      totalAmount: calculatedImportTotal,
      paid: calculatedImportTotal,
      notes: importNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onSaveStockImport(newReceipt);
    setIsNewImportModalOpen(false);
  };

  // Adjust stock handler
  const handleOpenAdjustModal = (mat: Material) => {
    setAdjustingMaterial(mat);
    setAdjustQty(mat.stockQuantity);
    setAdjustReason('Kiểm kê kho thực tế');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;
    onAdjustStock(adjustingMaterial.id, Number(adjustQty), adjustReason);
    setIsAdjustModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500 rounded-xl text-slate-950 shadow-md">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                KHO NHẬP LIỆU & VẬT TƯ TIỆM IN 194
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Quản lý số lượng tồn kho, giá vốn nhập hàng, cảnh báo sắp hết và hạch toán lời lãi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenNewImport()}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ Tạo Phiếu Nhập Kho</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-600 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Thêm Vật Liệu</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearInventoryModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white font-bold text-xs sm:text-sm rounded-xl border border-rose-800/80 transition cursor-pointer"
            title="Xóa trắng dữ liệu kho hoặc đặt lại số lượng tồn kho"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Xóa Hết Dữ Liệu Kho</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Tổng loại vật tư */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng loại vật tư</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalMaterialCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Đang theo dõi trong kho</p>
        </div>

        {/* Card 2: Tổng số lượng trong kho */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng số lượng tồn</span>
            <ArrowUpDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
            {formatNumber(totalStockQuantity)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Tấm / Cuộn / Cái / Lọ</p>
        </div>

        {/* Card 3: ĐÃ XUẤT BÁN (SỬ DỤNG) */}
        <div
          onClick={() => setActiveSubTab('sales_deductions')}
          className="bg-purple-50/70 border border-purple-200 hover:bg-purple-100/70 rounded-xl p-4 shadow-sm transition cursor-pointer"
          title="Bấm để xem lịch sử xuất kho chi tiết theo từng đơn hàng"
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
              Đã Xuất Bán
            </span>
            <ShoppingBag className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-800 font-mono">
            {formatNumber(Math.round(totalUsedUnits * 10) / 10)}
          </div>
          <p className="text-[11px] text-purple-700 font-semibold mt-1">
            Dùng cho {totalUsedOrdersCount} đơn hàng
          </p>
        </div>

        {/* Card 4: Tổng giá trị vốn tồn kho */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng giá trị tồn kho</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono truncate" title={formatCurrency(totalInventoryValue)}>
            {formatCurrency(totalInventoryValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Vốn vật tư còn tại kho</p>
        </div>

        {/* Card 5: Sắp hết hàng */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
          className={`rounded-xl p-4 shadow-sm border transition cursor-pointer ${
            lowStockMaterials.length > 0
              ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/80 ring-2 ring-rose-400/30'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
              {lowStockMaterials.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />}
              Sắp hết hàng
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 font-mono">
            {lowStockMaterials.length} <span className="text-xs font-normal text-rose-600">loại</span>
          </div>
          <p className="text-[11px] text-rose-600 font-bold mt-1">
            {lowStockMaterials.length > 0 ? 'Bấm để lọc xem ngay' : 'Đầy đủ hàng an toàn'}
          </p>
        </div>

        {/* Card 6: Tổng giá nhập các đợt */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng tiền đã nhập</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-900 font-mono truncate" title={formatCurrency(totalHistoricalImportCost)}>
            {formatCurrency(totalHistoricalImportCost)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{stockImports.length} đợt nhập hàng</p>
        </div>
      </div>

      {/* Sub Tabs: Kho Tồn Hiện Tại vs Lịch Sử Phiếu Nhập */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition cursor-pointer ${
            activeSubTab === 'inventory'
              ? 'border-amber-500 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Danh Sách Vật Tư Tồn Kho ({materials.length})</span>
          {lowStockMaterials.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white animate-pulse">
              {lowStockMaterials.length} sắp hết
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition cursor-pointer ${
            activeSubTab === 'history'
              ? 'border-amber-500 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Lịch Sử Phiếu Nhập Kho ({stockImports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sales_deductions')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition cursor-pointer ${
            activeSubTab === 'sales_deductions'
              ? 'border-amber-500 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Vật Tư Trừ Theo Đơn Bán Hàng</span>
        </button>

        <div className="ml-auto hidden sm:block">
          <button
            type="button"
            onClick={() => setIsBOMGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>📘 Định Mức Cốt Ảnh: Ván MDF & Fomex (BOM)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: INVENTORY LIST */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm vật liệu theo tên, mã vật tư, nhà cung cấp..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
              >
                <option value="all">Tất cả nhóm vật liệu</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Status Filter Badges */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    statusFilter === 'all' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({materials.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('low')}
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                    statusFilter === 'low' ? 'bg-rose-500 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span>Sắp hết</span>
                  <span className="px-1 py-0.2 rounded-full text-[10px] bg-rose-900/40 text-white">
                    {lowStockMaterials.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('instock')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    statusFilter === 'instock' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Còn hàng
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('out')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    statusFilter === 'out' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hết hàng ({outOfStockMaterials.length})
                </button>
              </div>
            </div>
          </div>

          {/* Materials Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-3 w-28">Mã Vật Tư</th>
                    <th className="py-3 px-3">Tên Vật Liệu</th>
                    <th className="py-3 px-3 w-28">Nhóm</th>
                    <th className="py-3 px-2 w-16 text-center">ĐVT</th>
                    <th className="py-3 px-3 w-28 text-right">Giá Nhập</th>
                    <th className="py-3 px-3 w-32 text-center bg-purple-50 text-purple-950 font-black border-x border-purple-200">
                      Đã Sử Dụng
                    </th>
                    <th className="py-3 px-3 w-36 text-center">SL Tồn Kho</th>
                    <th className="py-3 px-3 w-32 text-right">Tổng Giá Trị Tồn</th>
                    <th className="py-3 px-3 w-32 text-center">Tình Trạng</th>
                    <th className="py-3 px-3 w-36 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">Không tìm thấy vật liệu nào phù hợp</p>
                        <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc bấm "+ Thêm Vật Liệu"</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((mat, idx) => {
                      const isLow = mat.stockQuantity > 0 && mat.stockQuantity <= mat.minStockAlert;
                      const isOut = mat.stockQuantity <= 0;
                      const totalItemValue = mat.stockQuantity * mat.costPrice;
                      const usage = materialUsageMap[mat.id];

                      return (
                        <tr
                          key={mat.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isLow ? 'bg-rose-50/40' : isOut ? 'bg-slate-100/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{mat.code}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-sm">{mat.name}</div>
                            {mat.supplier && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Truck className="w-3 h-3 text-slate-400" />
                                <span>NCC: {mat.supplier}</span>
                              </div>
                            )}
                            {mat.notes && (
                              <div className="text-[11px] text-amber-700 italic mt-0.5">
                                * {mat.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {mat.category}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-semibold text-slate-700">{mat.unit}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                            {formatCurrency(mat.costPrice)}
                          </td>
                          <td className="py-3 px-3 text-center bg-purple-50/30 border-x border-purple-100">
                            {usage && usage.usedQuantity > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="px-2 py-0.5 rounded-full text-xs font-black font-mono bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                                  {usage.usedQuantity} <span className="text-[10px] font-normal">{mat.unit}</span>
                                </span>
                                <span
                                  className="text-[10px] text-purple-700 font-semibold mt-0.5 cursor-pointer hover:underline"
                                  onClick={() => setActiveSubTab('sales_deductions')}
                                  title={`Đã xuất cho ${usage.orderCount} đơn hàng: ${usage.orderNumbers.join(', ')}`}
                                >
                                  {usage.orderCount} đơn hàng
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">0 {mat.unit}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-base font-black font-mono ${
                                isOut ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-emerald-700'
                              }`}>
                                {formatNumber(mat.stockQuantity)} <span className="text-xs font-normal text-slate-500">{mat.unit}</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Báo hết: &lt;= {mat.minStockAlert}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 text-xs sm:text-sm">
                            {formatCurrency(totalItemValue)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-200 text-slate-700 border border-slate-300">
                                Hết Hàng
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                                🔴 Sắp Hết ({mat.stockQuantity})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                🟢 Còn Hàng
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Quick Import Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenNewImport(mat)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                                title="Nhập thêm vật liệu này vào kho"
                              >
                                <PackagePlus className="w-3.5 h-3.5" />
                              </button>

                              {/* Adjust / Use stock button */}
                              <button
                                type="button"
                                onClick={() => handleOpenAdjustModal(mat)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                                title="Xuất dùng hoặc điều chỉnh tồn kho"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenAddModal(mat)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                                title="Chỉnh sửa thông tin vật tư"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setMaterialToDelete(mat)}
                                className="p-1.5 rounded-lg bg-slate-100 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                title="Xóa vật tư này khỏi kho"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: IMPORT HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Lịch Sử Các Đợt Nhập Hàng</h3>
                <p className="text-xs text-slate-500">Toàn bộ chi phí nhập kho được tự động đưa vào báo cáo lời lãi ({stockImports.length} phiếu)</p>
              </div>
              <div className="flex items-center gap-2">
                {stockImports.length > 0 && onClearAllStockImports && (
                  <button
                    type="button"
                    onClick={() => setIsClearStockImportsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    title="Xóa hết toàn bộ phiếu nhập kho"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Xóa Hết Lịch Sử Phiếu Nhập</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenNewImport()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nhập Kho Mới</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-3 w-32">Mã Phiếu Nhập</th>
                    <th className="py-3 px-3 w-28">Ngày Nhập</th>
                    <th className="py-3 px-3">Nhà Cung Cấp / Nguồn Hàng</th>
                    <th className="py-3 px-3">Chi Tiết Vật Tư Nhập</th>
                    <th className="py-3 px-3 w-32 text-right">Tổng Tiền Nhập</th>
                    <th className="py-3 px-3 w-28 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockImports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Chưa có phiếu nhập kho nào được ghi nhận
                      </td>
                    </tr>
                  ) : (
                    stockImports.map((imp, idx) => (
                      <tr key={imp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{imp.receiptNumber}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{formatDateVN(imp.date)}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{imp.supplier}</td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {imp.items.map((it, iIdx) => (
                              <div key={iIdx} className="text-[11px] text-slate-700 flex items-center justify-between gap-2 bg-slate-50 px-2 py-0.5 rounded-sm">
                                <span>• <strong>{it.materialName}</strong>:</span>
                                <span className="font-mono text-slate-900 font-semibold">
                                  {it.quantity} {it.unit} x {formatCurrency(it.costPrice)} = <strong>{formatCurrency(it.totalCost)}</strong>
                                </span>
                              </div>
                            ))}
                          </div>
                          {imp.notes && (
                            <p className="text-[10px] text-amber-700 italic mt-1">* Ghi chú: {imp.notes}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-rose-700 text-sm">
                          {formatCurrency(imp.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptDetail(imp)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Xem
                            </button>
                            {onDeleteStockImport && (
                              <button
                                type="button"
                                onClick={() => setReceiptToDelete(imp)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-rose-600 cursor-pointer transition"
                                title="Xóa phiếu nhập này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SALES ORDERS MATERIAL DEDUCTIONS */}
      {activeSubTab === 'sales_deductions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">
                  Lịch Sử Vật Tư Khấu Trừ Tự Động Theo Đơn Bán Hàng
                </h3>
                <p className="text-xs text-slate-500">
                  Mỗi khi lên đơn in ảnh cho khách, kho tự động khấu trừ gỗ MDF, mica, khung bo viền tương ứng
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBOMGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Xem Công Thức Cấu Thành (BOM)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-3 w-32">Mã Đơn Hàng</th>
                    <th className="py-3 px-3 w-28">Ngày Đơn</th>
                    <th className="py-3 px-3 w-44">Khách Hàng / Studio</th>
                    <th className="py-3 px-3">Sản Phẩm Đã Bán</th>
                    <th className="py-3 px-3">Nguyên Vật Tư Kho Đã Trừ</th>
                    <th className="py-3 px-3 w-28 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.filter(o => o.status !== 'cancelled').length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Chưa có đơn hàng nào phát sinh trừ vật tư
                      </td>
                    </tr>
                  ) : (
                    orders
                      .filter(o => o.status !== 'cancelled')
                      .map((ord, idx) => {
                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                            <td className="py-3 px-3 font-mono text-slate-600">{formatDateVN(ord.date)}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{ord.customerName}</td>
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                {ord.items.map((it, iIdx) => (
                                  <div key={iIdx} className="text-[11px] text-slate-700">
                                    • {it.quantity}x <strong>{it.productName}</strong> ({it.size})
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {(() => {
                                const deductions = (ord.materialsDeducted && ord.materialsDeducted.length > 0)
                                  ? ord.materialsDeducted
                                  : createMaterialDeductionRecords(calculateOrderBOM(ord.items, materials, products));

                                if (deductions.length === 0) {
                                  return <span className="text-[11px] text-slate-400 italic">Không phát sinh trừ vật tư</span>;
                                }

                                return (
                                  <div className="space-y-1">
                                    {deductions.map((d, dIdx) => (
                                      <div key={dIdx} className="text-[11px] flex items-center justify-between gap-2 bg-purple-50 text-purple-950 border border-purple-200 px-2 py-0.5 rounded">
                                        <span className="font-medium">• {d.materialName}:</span>
                                        <span className="font-mono font-bold text-purple-700">-{d.quantity} {d.unit}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {ord.status === 'completed' ? 'Đã in xong' : ord.status === 'delivered' ? 'Đã giao' : ord.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT MATERIAL */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" />
                <span>{editingMaterial ? 'Chỉnh Sửa Vật Tư' : 'Thêm Vật Liệu Mới Vào Kho'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterialSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã Vật Tư</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="VD: VT-GO-6090"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm Vật Liệu</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as MaterialCategory)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Vật Liệu / Quy Cách</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="VD: Gỗ MDF Chống Ẩm Lõi Xanh 60x90"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn Vị Tính</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="Tấm, Cuộn, Cái..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá Nhập Đơn Vị (VNĐ)</label>
                  <MoneyInput
                    value={formCostPrice}
                    onChange={setFormCostPrice}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số Lượng Tồn Ban Đầu</label>
                  <input
                    type="number"
                    min={0}
                    value={formStockQuantity}
                    onChange={e => setFormStockQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 font-mono font-bold text-emerald-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngưỡng Báo Sắp Hết</label>
                  <input
                    type="number"
                    min={1}
                    value={formMinStockAlert}
                    onChange={e => setFormMinStockAlert(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 font-mono text-rose-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nhà Cung Cấp / Nơi Mua Hàng</label>
                <input
                  type="text"
                  value={formSupplier}
                  onChange={e => setFormSupplier(e.target.value)}
                  placeholder="VD: Xưởng Gỗ Phú Mỹ, Cty Minh Khang..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi Chú Thêm</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ghi chú về chất lượng, vị trí để trong kho..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md transition cursor-pointer"
                >
                  Lưu Vật Liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE STOCK IMPORT RECEIPT (Nhập Kho Vật Tư) */}
      {isNewImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-emerald-600" />
                  <span>Tạo Phiếu Nhập Kho Vật Tư</span>
                </h3>
                <p className="text-xs text-slate-500">Số lượng nhập sẽ được tự động cộng dồn vào tồn kho</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveImportSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày Nhập Kho</label>
                  <input
                    type="date"
                    required
                    value={importDate}
                    onChange={e => setImportDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nhà Cung Cấp / Nơi Nhập</label>
                  <input
                    type="text"
                    required
                    value={importSupplier}
                    onChange={e => setImportSupplier(e.target.value)}
                    placeholder="VD: Cty Vật Tư Minh Khang, Xưởng Gỗ Phú Mỹ..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold outline-none"
                  />
                </div>
              </div>

              {/* Items in this import batch */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Danh Sách Vật Liệu Cần Nhập ({importItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddImportItemRow}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Dòng Vật Tư</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                  {importItems.map((item, idx) => {
                    const selMat = materials.find(m => m.id === item.materialId);
                    const lineTotal = item.quantity * item.costPrice;

                    return (
                      <div key={idx} className="p-3 bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="w-7 text-center font-mono font-bold text-slate-400 text-xs">
                          #{idx + 1}
                        </div>

                        {/* Material Selector */}
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Vật liệu</label>
                          <select
                            value={item.materialId}
                            onChange={e => handleImportItemChange(idx, 'materialId', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg outline-none"
                          >
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>
                                [{m.code}] {m.name} (Tồn hiện tại: {m.stockQuantity} {m.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-28">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Số lượng nhập ({selMat?.unit || 'cái'})
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={item.quantity}
                            onChange={e => handleImportItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1.5 text-xs font-black font-mono text-center bg-slate-50 border border-slate-300 rounded-lg text-emerald-700 outline-none"
                          />
                        </div>

                        {/* Unit Cost */}
                        <div className="w-36">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Đơn giá nhập (VNĐ)</label>
                          <MoneyInput
                            value={item.costPrice}
                            onChange={val => handleImportItemChange(idx, 'costPrice', val)}
                            className="w-full px-2 py-1.5 text-xs font-bold font-mono text-right bg-slate-50 border border-slate-300 rounded-lg outline-none"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="w-32 text-right">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Thành tiền</label>
                          <div className="text-xs font-black font-mono text-slate-900 py-1.5 truncate">
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImportItemRow(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400">TỔNG TIỀN PHIẾU NHẬP HÀNG:</span>
                  <p className="text-[11px] text-slate-400">Được tự động tính vào chi phí vốn tháng {new Date(importDate).getMonth() + 1}</p>
                </div>
                <div className="text-2xl font-black font-mono text-amber-400">
                  {formatCurrency(calculatedImportTotal)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi Chú Phiếu Nhập</label>
                <input
                  type="text"
                  value={importNotes}
                  onChange={e => setImportNotes(e.target.value)}
                  placeholder="Ghi chú số hóa đơn đỏ, người giao hàng, tình trạng vật tư..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  Xác Nhận Nhập Kho & Cập Nhật Tồn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST / USE STOCK (Xuất dùng / Kiểm kê) */}
      {isAdjustModalOpen && adjustingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span>Xuất Dùng / Điều Chỉnh Tồn Kho</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">Vật liệu đang điều chỉnh:</p>
                <p className="font-extrabold text-sm text-slate-900">{adjustingMaterial.name}</p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Mã: <strong>{adjustingMaterial.code}</strong> • Tồn kho hiện tại: <strong className="text-emerald-700">{adjustingMaterial.stockQuantity} {adjustingMaterial.unit}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số Lượng Tồn Thực Tế Mới ({adjustingMaterial.unit})
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-base font-black font-mono text-center bg-slate-50 border border-slate-300 rounded-xl text-blue-700 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  {adjustQty > adjustingMaterial.stockQuantity ? (
                    <span className="text-emerald-600 font-bold">+ Tăng {adjustQty - adjustingMaterial.stockQuantity} {adjustingMaterial.unit}</span>
                  ) : adjustQty < adjustingMaterial.stockQuantity ? (
                    <span className="text-rose-600 font-bold">- Giảm {adjustingMaterial.stockQuantity - adjustQty} {adjustingMaterial.unit}</span>
                  ) : (
                    <span>Không thay đổi số lượng</span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lý Do Điều Chỉnh</label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none"
                >
                  <option value="Xuất dùng gia công ảnh cổng / ép gỗ">Xuất dùng gia công ảnh cổng / ép gỗ</option>
                  <option value="Kiểm kê kho thực tế định kỳ">Kiểm kê kho thực tế định kỳ</option>
                  <option value="Hao hụt / bể vỡ / lỗi vật tư">Hao hụt / bể vỡ / lỗi vật tư</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition cursor-pointer"
                >
                  Cập Nhật Tồn Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAIL RECEIPT VIEW */}
      {selectedReceiptDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900">Chi Tiết Phiếu Nhập Kho</h3>
                <p className="text-xs text-slate-500">Mã: {selectedReceiptDetail.receiptNumber} • Ngày: {formatDateVN(selectedReceiptDetail.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <p><strong>Nhà cung cấp:</strong> {selectedReceiptDetail.supplier}</p>
                {selectedReceiptDetail.notes && <p><strong>Ghi chú:</strong> {selectedReceiptDetail.notes}</p>}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Vật Tư</th>
                      <th className="p-2 text-center">SL</th>
                      <th className="p-2 text-right">Đơn Giá</th>
                      <th className="p-2 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReceiptDetail.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.materialName}</td>
                        <td className="p-2 text-center font-bold font-mono">{it.quantity} {it.unit}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(it.costPrice)}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">{formatCurrency(it.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold">TỔNG TIỀN THANH TOÁN:</span>
                <span className="text-lg font-black font-mono text-amber-400">
                  {formatCurrency(selectedReceiptDetail.totalAmount)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setSelectedReceiptDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE MATERIAL */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Xác Nhận Xóa Vật Liệu</h3>
              </div>
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-slate-600">
              <p>Bạn có chắc chắn muốn xóa vật liệu này khỏi danh mục kho?</p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã vật tư:</span>
                  <span className="font-mono font-bold text-rose-700">{materialToDelete.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tên vật liệu:</span>
                  <span className="font-bold text-slate-900 text-right">{materialToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tồn kho hiện tại:</span>
                  <span className="font-mono font-bold text-slate-800">{materialToDelete.stockQuantity} {materialToDelete.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Giá nhập:</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(materialToDelete.costPrice)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMaterial(materialToDelete.id);
                  setMaterialToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md cursor-pointer transition"
              >
                Đồng Ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE RECEIPT */}
      {receiptToDelete && onDeleteStockImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Xóa Phiếu Nhập Kho</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptToDelete(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-slate-600">
              <p>Bạn có chắc chắn muốn xóa phiếu nhập kho này?</p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã phiếu:</span>
                  <span className="font-mono font-bold text-rose-700">{receiptToDelete.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày nhập:</span>
                  <span className="font-bold text-slate-900">{formatDateVN(receiptToDelete.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhà cung cấp:</span>
                  <span className="font-bold text-slate-900">{receiptToDelete.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng tiền nhập:</span>
                  <span className="font-mono font-bold text-rose-700">{formatCurrency(receiptToDelete.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStockImport(receiptToDelete.id);
                  setReceiptToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md cursor-pointer transition"
              >
                Đồng Ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLEAR ALL INVENTORY DATA */}
      {isClearInventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm">Quản Lý & Xóa Dữ Liệu Kho Nhập</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearInventoryModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Lựa chọn hành động xóa hoặc đặt lại dữ liệu kho vật tư để bắt đầu quản lý kho thực tế cho Tiệm In 194:
              </p>

              {/* Action 1: Xóa sạch toàn bộ kho (0 vật tư & 0 phiếu nhập) */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h4 className="font-bold text-sm text-slate-900">Xóa sạch toàn bộ kho (0 vật liệu)</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Xóa tất cả các loại vật tư và toàn bộ lịch sử phiếu nhập hàng. Kho sẽ hoàn toàn trống để bạn tự tạo danh mục từ đầu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onClearAllInventory) {
                      onClearAllInventory();
                    }
                    setIsClearInventoryModalOpen(false);
                  }}
                  className="shrink-0 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa sạch kho
                </button>
              </div>

              {/* Action 2: Đặt lại số lượng tồn kho về 0 (Giữ nguyên danh mục) */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-800">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-sm text-slate-900">Đặt lại số lượng tồn kho về 0</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Giữ nguyên tên và mã các loại vật tư (Gỗ, Giấy, Mica, Khung...), nhưng đưa tất cả số lượng tồn kho về 0 và xóa lịch sử nhập cũ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onResetStockToZero) {
                      onResetStockToZero();
                    }
                    setIsClearInventoryModalOpen(false);
                  }}
                  className="shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Đặt tồn về 0
                </button>
              </div>

              {/* Action 3: Xóa sạch lịch sử phiếu nhập kho */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-purple-800">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <h4 className="font-bold text-sm text-slate-900">Xóa toàn bộ lịch sử phiếu nhập kho</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Xóa sạch toàn bộ các đợt nhập hàng ({stockImports.length} phiếu) và đưa chi phí vốn nhập kho về 0, nhưng giữ nguyên danh mục vật tư bạn đã tạo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onClearAllStockImports) {
                      onClearAllStockImports();
                    }
                    setIsClearInventoryModalOpen(false);
                  }}
                  className="shrink-0 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa phiếu nhập
                </button>
              </div>

              {/* Action 4: Nạp lại danh mục kho mẫu ban đầu */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-blue-800">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-sm text-slate-900">Nạp lại dữ liệu kho mẫu ban đầu</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Khôi phục lại danh mục 11 vật tư và 5 phiếu nhập kho mẫu ban đầu của tiệm in 194.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onReloadDefaultMaterials) {
                      onReloadDefaultMaterials();
                    }
                    setIsClearInventoryModalOpen(false);
                  }}
                  className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nạp kho mẫu
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsClearInventoryModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLEAR ALL STOCK IMPORT RECEIPTS */}
      {isClearStockImportsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Xóa Hết Lịch Sử Phiếu Nhập Kho</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearStockImportsModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-slate-600">
              <p>Bạn có chắc chắn muốn xóa toàn bộ <strong>{stockImports.length}</strong> phiếu nhập kho hiện tại?</p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-slate-700">
                <p>• Chi phí vốn nhập hàng trong báo cáo Thống Kê sẽ trở về <strong>0đ</strong>.</p>
                <p>• Danh mục các loại vật tư (Gỗ, Giấy, Mica...) vẫn được giữ nguyên.</p>
                <p>• Thao tác này không thể hoàn tác.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsClearStockImportsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllStockImports) {
                    onClearAllStockImports();
                  }
                  setIsClearStockImportsModalOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md cursor-pointer transition"
              >
                Đồng Ý Xóa Hết Phiếu Nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BOM GUIDE - CÔNG THỨC BÓC TÁCH VẬT TƯ CẤU THÀNH TẤM ẢNH */}
      {isBOMGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
                  <Boxes className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Quy Chuẩn Định Mức Cốt Ảnh (BOM): Ván MDF & Fomex Siêu Nhẹ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hệ thống tinh giản chỉ thống kê 2 loại cốt để xuất kho và tính giá chính xác nhất
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBOMGuideOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Nguyên tắc phân bổ định mức */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-transparent border border-amber-300 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Nguyên Tắc Bóc Tách Cốt Ảnh Tiệm In 194</span>
                  </h4>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Đã tinh giản
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Để tránh rắc rối khi tính giá thành và kiểm kê kho, hệ thống đã <strong>bỏ qua các phụ liệu vụn vặt</strong> (mika, keo AB, màng lụa, mực in, giấy in...). Mỗi bức ảnh khi lên đơn sẽ <strong>chỉ bóc tách và khấu trừ duy nhất 1 tấm cốt nền tương ứng</strong>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-xl border-2 border-blue-400/80 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-blue-900 text-xs flex items-center gap-1">
                        <span>🪶</span> FOMEX SIÊU NHẸ (9LI)
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        Chỉ 2 Dòng Sản Phẩm
                      </span>
                    </div>
                    <p className="text-slate-800 font-semibold text-[11px]">
                      Dành riêng cho <strong>Ảnh 4K</strong> và <strong>Ảnh "HD Pro"</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Tấm Fomex trắng 9li siêu nhẹ, phẳng tuyệt đối, chống ẩm mốc, tăng độ thẩm mỹ và sắc nét vượt trội.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border-2 border-amber-400/80 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-950 text-xs flex items-center gap-1">
                        <span>🪵</span> VÁN GỖ MDF
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        Tất Cả Ảnh Khác
                      </span>
                    </div>
                    <p className="text-slate-800 font-semibold text-[11px]">
                      Dành cho <strong>Ảnh HD Gương Siêu Bóng, Ép Gỗ, Lụa Viền, Mika Bo Viền, Ảnh Cổng Cưới...</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Gỗ MDF lõi xanh chống ẩm 12li hoặc 9li đầm chắc, phẳng mịn, bền vững theo năm tháng.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bảng đối chiếu kích thước cụ thể */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>Bảng Bóc Tách Tự Động Theo Kích Thước</span>
                  <span className="text-[10px] text-slate-500 font-normal lowercase">(tự động nhận diện khi gõ mã/tên hàng)</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="p-3 bg-slate-50/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4 font-bold text-slate-900">
                      Khổ Ảnh 60x90 (Cổng cưới lớn)
                    </div>
                    <div className="sm:col-span-8 flex flex-col gap-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between bg-blue-50/60 p-1.5 rounded-lg border border-blue-200">
                        <span className="text-blue-900 font-bold font-sans">Ảnh 4K hoặc HD Pro 60x90:</span>
                        <span className="font-bold text-blue-700">Trừ 1 Tấm Fomex 9li 60x90 [VT-FX-6090]</span>
                      </div>
                      <div className="flex items-center justify-between bg-amber-50/60 p-1.5 rounded-lg border border-amber-200">
                        <span className="text-amber-950 font-bold font-sans">Ảnh HD Gương / Ép Gỗ / Lụa:</span>
                        <span className="font-bold text-amber-800">Trừ 1 Tấm Gỗ MDF 60x90 [VT-GO-6090]</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4 font-bold text-slate-900">
                      Khổ Ảnh 50x75 (Cổng cưới vừa)
                    </div>
                    <div className="sm:col-span-8 flex flex-col gap-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between bg-blue-50/60 p-1.5 rounded-lg border border-blue-200">
                        <span className="text-blue-900 font-bold font-sans">Ảnh 4K hoặc HD Pro 50x75:</span>
                        <span className="font-bold text-blue-700">Trừ 1 Tấm Fomex 9li 50x75 [VT-FX-5075]</span>
                      </div>
                      <div className="flex items-center justify-between bg-amber-50/60 p-1.5 rounded-lg border border-amber-200">
                        <span className="text-amber-950 font-bold font-sans">Ảnh HD Gương / Ép Gỗ / Lụa:</span>
                        <span className="font-bold text-amber-800">Trừ 1 Tấm Gỗ MDF 50x75 [VT-GO-5075]</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4 font-bold text-slate-900">
                      Khổ Ảnh 40x60 & 30x45 (Treo tường)
                    </div>
                    <div className="sm:col-span-8 flex flex-col gap-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between bg-blue-50/60 p-1.5 rounded-lg border border-blue-200">
                        <span className="text-blue-900 font-bold font-sans">Ảnh 4K hoặc HD Pro:</span>
                        <span className="font-bold text-blue-700">Trừ 1 Tấm Fomex 9li 40x60 / 30x45</span>
                      </div>
                      <div className="flex items-center justify-between bg-amber-50/60 p-1.5 rounded-lg border border-amber-200">
                        <span className="text-amber-950 font-bold font-sans">Ảnh HD Gương / Ép Gỗ / Lụa:</span>
                        <span className="font-bold text-amber-800">Trừ 1 Tấm Gỗ MDF 40x60 / 30x45</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4 font-bold text-slate-900">
                      Khổ Để Bàn (20x30, 15x21, 13x18)
                    </div>
                    <div className="sm:col-span-8 flex flex-col gap-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between bg-blue-50/60 p-1.5 rounded-lg border border-blue-200">
                        <span className="text-blue-900 font-bold font-sans">Ảnh 4K hoặc HD Pro:</span>
                        <span className="font-bold text-blue-700">Trừ 1 Tấm Fomex 9li Để Bàn</span>
                      </div>
                      <div className="flex items-center justify-between bg-amber-50/60 p-1.5 rounded-lg border border-amber-200">
                        <span className="text-amber-950 font-bold font-sans">Ảnh HD Gương / Ép Gỗ / Lụa:</span>
                        <span className="font-bold text-amber-800">Trừ 1 Tấm Gỗ MDF Để Bàn</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
                <p className="font-bold text-xs flex items-center gap-1 mb-1 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đồng bộ tức thì với Phiếu Xuất Ván & Kho Vật Tư:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Tại màn hình <strong>Bán Hàng</strong>, cửa sổ <strong>Phiếu xuất ván MDF & Fomex</strong> sẽ tự động nhận diện ảnh 4K/HD Pro (dùng Fomex 9li) hay ảnh HD Gương/Lụa viền/Mika (dùng Gỗ MDF) để bóc tách ván tương ứng. Bạn cũng có thể chọn thủ công loại ván khác bất kỳ lúc nào. Khi bấm <strong>Lưu Đơn Hàng</strong>, kho sẽ tự động trừ ngay mà không cần tính toán thủ công!
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBOMGuideOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition"
              >
                Đã Hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
