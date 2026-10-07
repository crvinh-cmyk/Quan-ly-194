import React, { useState, useEffect, useMemo } from 'react';
import { Product, Customer, Order, OrderStatus, WorkshopInfo, Material, StockImportReceipt } from './types';
import {
  getStoredProducts, saveStoredProducts,
  getStoredCustomers, saveStoredCustomers,
  getStoredOrders, saveStoredOrders,
  getStoredWorkshopInfo, saveStoredWorkshopInfo,
  getStoredMaterials, saveStoredMaterials,
  getStoredStockImports, saveStoredStockImports,
  clearAllInventoryData, resetInventoryStockToZero, reloadDefaultMaterials, clearAllStockImportsOnly,
  calculateCustomerDebt
} from './utils/storage';
import { Header, ActiveTab } from './components/Header';
import { SalesInvoiceForm } from './components/SalesInvoiceForm';
import { OrderList } from './components/OrderList';
import { AnalyticsView } from './components/AnalyticsView';
import { ProductCatalogView } from './components/ProductCatalogView';
import { CustomerManagementView } from './components/CustomerManagementView';
import { InventoryManagementView } from './components/InventoryManagementView';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { SettingsModal } from './components/SettingsModal';
import { DataManagementModal } from './components/DataManagementModal';
import { DEFAULT_PRODUCTS } from './data/initialData';

const STORAGE_TAB_KEY = 'xuongin194_active_tab';

const getInitialTab = (): ActiveTab => {
  try {
    const validTabs: ActiveTab[] = ['pos', 'orders', 'inventory', 'analytics', 'products', 'customers'];
    
    // 1. Check sessionStorage first (current active session)
    const fromSession = sessionStorage.getItem(STORAGE_TAB_KEY);
    if (fromSession && validTabs.includes(fromSession as ActiveTab)) {
      return fromSession as ActiveTab;
    }

    // 2. Check localStorage (persistent across browser restarts)
    const fromLocal = localStorage.getItem(STORAGE_TAB_KEY);
    if (fromLocal && validTabs.includes(fromLocal as ActiveTab)) {
      return fromLocal as ActiveTab;
    }
  } catch (e) {
    console.error('Error reading active tab from storage', e);
  }
  return 'pos';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockImports, setStockImports] = useState<StockImportReceipt[]>([]);
  const [workshop, setWorkshop] = useState<WorkshopInfo>(getStoredWorkshopInfo());

  // Print modal state
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);

  // Settings & Data Management modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);

  // Trigger to reset POS form to a brand new clean order
  const [newOrderTrigger, setNewOrderTrigger] = useState<number>(0);

  // Function to switch tab and immediately persist to storage
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(STORAGE_TAB_KEY, tab);
      sessionStorage.setItem(STORAGE_TAB_KEY, tab);
    } catch (e) {
      console.error('Error saving active tab to storage', e);
    }
  };

  // Sync activeTab to storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TAB_KEY, activeTab);
      sessionStorage.setItem(STORAGE_TAB_KEY, activeTab);
    } catch (e) {
      console.error('Error saving active tab to storage', e);
    }
  }, [activeTab]);

  // Handler to create new order immediately
  const handleTriggerNewOrder = () => {
    handleSelectTab('pos');
    setNewOrderTrigger(Date.now());
  };

  // Load initial data from localStorage
  const loadAllData = () => {
    setProducts(getStoredProducts());
    setCustomers(getStoredCustomers());
    setOrders(getStoredOrders());
    setWorkshop(getStoredWorkshopInfo());
    setMaterials(getStoredMaterials());
    setStockImports(getStoredStockImports());
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Material CRUD handlers
  const handleSaveMaterial = (material: Material) => {
    const exists = materials.some(m => m.id === material.id);
    const updated = exists
      ? materials.map(m => (m.id === material.id ? material : m))
      : [material, ...materials];
    setMaterials(updated);
    saveStoredMaterials(updated);
  };

  const handleDeleteMaterial = (materialId: string) => {
    const updated = materials.filter(m => m.id !== materialId);
    setMaterials(updated);
    saveStoredMaterials(updated);
  };

  // Stock Inward handler: saves receipt AND increases stockQuantity of materials
  const handleSaveStockImport = (receipt: StockImportReceipt) => {
    const updatedImports = [receipt, ...stockImports];
    setStockImports(updatedImports);
    saveStoredStockImports(updatedImports);

    // Increase stock quantity & update latest cost price
    const updatedMaterials = materials.map(mat => {
      const importedItem = receipt.items.find(it => it.materialId === mat.id);
      if (importedItem) {
        return {
          ...mat,
          stockQuantity: mat.stockQuantity + importedItem.quantity,
          costPrice: importedItem.costPrice > 0 ? importedItem.costPrice : mat.costPrice,
          updatedAt: new Date().toISOString()
        };
      }
      return mat;
    });

    setMaterials(updatedMaterials);
    saveStoredMaterials(updatedMaterials);
  };

  const handleDeleteStockImport = (receiptId: string) => {
    const updated = stockImports.filter(imp => imp.id !== receiptId);
    setStockImports(updated);
    saveStoredStockImports(updated);
  };

  // Stock adjustment / use
  const handleAdjustStock = (materialId: string, newQuantity: number) => {
    const updatedMaterials = materials.map(mat => {
      if (mat.id === materialId) {
        return {
          ...mat,
          stockQuantity: newQuantity,
          updatedAt: new Date().toISOString()
        };
      }
      return mat;
    });

    setMaterials(updatedMaterials);
    saveStoredMaterials(updatedMaterials);
  };

  // Inventory clearing & resetting handlers
  const handleClearAllInventory = () => {
    clearAllInventoryData();
    setMaterials([]);
    setStockImports([]);
  };

  const handleResetStockToZero = () => {
    resetInventoryStockToZero();
    setMaterials(getStoredMaterials());
    setStockImports([]);
  };

  const handleReloadDefaultMaterials = () => {
    reloadDefaultMaterials();
    setMaterials(getStoredMaterials());
    setStockImports(getStoredStockImports());
  };

  const handleClearAllStockImports = () => {
    clearAllStockImportsOnly();
    setStockImports([]);
  };

  const lowStockCount = useMemo(() => {
    return materials.filter(m => m.stockQuantity > 0 && m.stockQuantity <= m.minStockAlert).length;
  }, [materials]);

  // Save order handler
  const handleSaveOrder = (newOrder: Order, openPrint: boolean) => {
    const updatedOrders = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);

    // If customer doesn't exist, create customer
    const existingCust = customers.find(c => c.id === newOrder.customerId);
    if (!existingCust && newOrder.customerName) {
      const newCust: Customer = {
        id: newOrder.customerId,
        name: newOrder.customerName,
        phone: newOrder.customerPhone,
        address: newOrder.customerAddress,
        initialDebt: 0,
        createdAt: new Date().toISOString()
      };
      const updatedCustomers = [...customers, newCust];
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
    }

    // Auto-deduct materials from warehouse inventory if specified on order
    let currentMaterials = [...materials];

    // If updating an existing order, restore any previous deductions first to prevent double counting
    const existingOrder = orders.find(o => o.id === newOrder.id);
    if (existingOrder && existingOrder.materialsDeducted && existingOrder.materialsDeducted.length > 0) {
      currentMaterials = currentMaterials.map(mat => {
        const prevSum = existingOrder.materialsDeducted
          ?.filter(d => d.materialId === mat.id)
          .reduce((sum, d) => sum + d.quantity, 0) || 0;
        if (prevSum > 0) {
          return {
            ...mat,
            stockQuantity: Math.round((mat.stockQuantity + prevSum) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
        }
        return mat;
      });
    }

    if (newOrder.materialsDeducted && newOrder.materialsDeducted.length > 0) {
      currentMaterials = currentMaterials.map(mat => {
        const totalDeduction = newOrder.materialsDeducted
          ?.filter(d => d.materialId === mat.id)
          .reduce((sum, d) => sum + d.quantity, 0) || 0;
        if (totalDeduction > 0) {
          return {
            ...mat,
            stockQuantity: Math.round(Math.max(0, mat.stockQuantity - totalDeduction) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
        }
        return mat;
      });
      setMaterials(currentMaterials);
      saveStoredMaterials(currentMaterials);
    }

    if (openPrint) {
      setActivePrintOrder(newOrder);
    }
  };

  // Add customer
  const handleAddCustomer = (customer: Customer) => {
    const updated = [customer, ...customers];
    setCustomers(updated);
    saveStoredCustomers(updated);
  };

  // Update customer
  const handleUpdateCustomer = (customer: Customer) => {
    const updated = customers.map(c => (c.id === customer.id ? customer : c));
    setCustomers(updated);
    saveStoredCustomers(updated);
  };

  // Record debt payment from customer
  const handleRecordDebtPayment = (customerId: string, amount: number, note: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Create a payment order/receipt adjustment
    const curDebt = calculateCustomerDebt(customerId, orders, customers);
    const paymentOrder: Order = {
      id: `pay-${Date.now()}`,
      orderNumber: `PT-194-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      items: [
        {
          id: `item-pay-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          productCode: 'THU-NO',
          productName: 'Phiếu Thu Tiền Nợ In Ảnh',
          size: '-',
          price: 0,
          quantity: 1,
          amount: 0,
          note
        }
      ],
      subtotal: 0,
      discount: 0,
      previousDebt: curDebt,
      paid: amount,
      totalDue: Math.max(0, curDebt - amount),
      status: 'completed',
      notes: note || 'Khách thanh toán nợ cũ',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [paymentOrder, ...orders];
    setOrders(updated);
    saveStoredOrders(updated);
  };

  // Add product
  const handleAddProduct = (product: Product) => {
    const updated = [product, ...products];
    setProducts(updated);
    saveStoredProducts(updated);
  };

  // Update product
  const handleUpdateProduct = (product: Product) => {
    const updated = products.map(p => (p.id === product.id ? product : p));
    setProducts(updated);
    saveStoredProducts(updated);
  };

  // Delete product
  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated);
  };

  // Batch save / sync products
  const handleBatchSaveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    saveStoredProducts(newProducts);
  };

  // Delete order (and automatically restore any deducted inventory materials back to stock!)
  const handleDeleteOrder = (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    if (orderToDelete && orderToDelete.materialsDeducted && orderToDelete.materialsDeducted.length > 0) {
      const updatedMaterials = materials.map(mat => {
        const totalDeduction = orderToDelete.materialsDeducted
          ?.filter(d => d.materialId === mat.id)
          .reduce((sum, d) => sum + d.quantity, 0) || 0;
        if (totalDeduction > 0) {
          return {
            ...mat,
            stockQuantity: Math.round((mat.stockQuantity + totalDeduction) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
        }
        return mat;
      });
      setMaterials(updatedMaterials);
      saveStoredMaterials(updatedMaterials);
    }

    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    saveStoredOrders(updated);
  };

  // Reset all sales orders and customer baseline data for a specific year (đặt lại dữ liệu năm mới)
  const handleResetYearData = (year: number, resetType: 'all' | 'ordersOnly' | 'baselineOnly' = 'all') => {
    if (resetType === 'all' || resetType === 'ordersOnly') {
      const updatedOrders = orders.filter(o => {
        const oYear = new Date(o.date).getFullYear();
        return oYear !== year;
      });
      setOrders(updatedOrders);
      saveStoredOrders(updatedOrders);
    }

    if (resetType === 'all' || resetType === 'baselineOnly') {
      const updatedCustomers = customers.map(c => {
        const newYearly = { ...(c.initialYearlyRevenues || {}) };
        delete newYearly[year];
        return {
          ...c,
          initialYearlyRevenues: newYearly,
          initialYearlyRevenue: year === new Date().getFullYear() ? 0 : c.initialYearlyRevenue
        };
      });
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    const updated = orders.map(o => (o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o));
    setOrders(updated);
    saveStoredOrders(updated);
  };

  // Quick pay remaining debt on order
  const handlePayOrderDebt = (order: Order) => {
    const paymentAmt = order.totalDue;
    if (paymentAmt <= 0) return;
    const updated = orders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          paid: o.paid + paymentAmt,
          totalDue: 0,
          status: 'completed' as OrderStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    });
    setOrders(updated);
    saveStoredOrders(updated);
  };

  // Update workshop info
  const handleUpdateWorkshop = (info: WorkshopInfo) => {
    setWorkshop(info);
    saveStoredWorkshopInfo(info);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Navigation & Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        workshop={workshop}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDataManagement={() => setIsDataManagementOpen(true)}
        ordersCount={orders.length}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto p-3 sm:p-4 md:p-5 lg:p-6">
        {/* Quick mobile tab sub-navigation for small screens */}
        <div className="flex sm:hidden overflow-x-auto gap-1 mb-4 pb-1">
          <button
            onClick={() => handleSelectTab('pos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
              activeTab === 'pos' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-white text-slate-700'
            }`}
          >
            Bán Hàng
          </button>
          <button
            onClick={() => handleSelectTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
              activeTab === 'orders' ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-700'
            }`}
          >
            Đơn ({orders.length})
          </button>
          <button
            onClick={() => handleSelectTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 ${
              activeTab === 'inventory' ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-700'
            }`}
          >
            <span>Kho</span>
            {lowStockCount > 0 && (
              <span className="px-1 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleSelectTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
              activeTab === 'analytics' ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-700'
            }`}
          >
            Thống Kê
          </button>
          <button
            onClick={() => handleSelectTab('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
              activeTab === 'products' ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-700'
            }`}
          >
            Bảng Giá SP
          </button>
          <button
            onClick={() => handleSelectTab('customers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
              activeTab === 'customers' ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-700'
            }`}
          >
            Khách & Nợ
          </button>
          <button
            onClick={() => setIsDataManagementOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-200 shrink-0"
          >
            Xóa / Nạp
          </button>
        </div>

        {/* Tab 1: Point of Sale / Main Order Creation */}
        {activeTab === 'pos' && (
          <SalesInvoiceForm
            products={products}
            customers={customers}
            allOrders={orders}
            materials={materials}
            onSaveOrder={handleSaveOrder}
            onAddNewCustomer={handleAddCustomer}
            onAddNewProduct={handleAddProduct}
            newOrderTrigger={newOrderTrigger}
          />
        )}

        {/* Tab 2: Orders List */}
        {activeTab === 'orders' && (
          <OrderList
            orders={orders}
            onViewOrder={(order) => setActivePrintOrder(order)}
            onPrintOrder={(order) => setActivePrintOrder(order)}
            onEditOrder={(order) => {
              handleSelectTab('pos');
            }}
            onDeleteOrder={handleDeleteOrder}
            onUpdateStatus={handleUpdateOrderStatus}
            onPayDebt={handlePayOrderDebt}
          />
        )}

        {/* Tab 3: Inventory & Material Management (Kho Nhập Liệu) */}
        {activeTab === 'inventory' && (
          <InventoryManagementView
            materials={materials}
            stockImports={stockImports}
            orders={orders}
            products={products}
            onSaveMaterial={handleSaveMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onSaveStockImport={handleSaveStockImport}
            onDeleteStockImport={handleDeleteStockImport}
            onAdjustStock={handleAdjustStock}
            onClearAllInventory={handleClearAllInventory}
            onClearAllStockImports={handleClearAllStockImports}
            onResetStockToZero={handleResetStockToZero}
            onReloadDefaultMaterials={handleReloadDefaultMaterials}
          />
        )}

        {/* Tab 4: Monthly & Yearly Analytics with Profit & Loss */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            orders={orders}
            products={products}
            stockImports={stockImports}
            customers={customers}
            onResetYearData={handleResetYearData}
          />
        )}

        {/* Tab 4: Product Catalog & Auto-Fill Price List */}
        {activeTab === 'products' && (
          <ProductCatalogView
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onBatchSaveProducts={handleBatchSaveProducts}
          />
        )}

        {/* Tab 5: Customers & Debt Management */}
        {activeTab === 'customers' && (
          <CustomerManagementView
            customers={customers}
            orders={orders}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onRecordDebtPayment={handleRecordDebtPayment}
            onViewCustomerOrders={(cId) => {
              handleSelectTab('orders');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 sm:px-6 text-center text-xs text-slate-500 no-print mt-auto">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-700">
            © 2026 {workshop.name} • {workshop.subtitle}
          </p>
          <p className="text-[11px] text-slate-400">
            Hotline: <strong className="text-slate-800">{workshop.phone}</strong> • Đ/C: {workshop.address}
          </p>
        </div>
      </footer>

      {/* Printable Invoice Modal */}
      {activePrintOrder && (
        <PrintInvoiceModal
          order={activePrintOrder}
          workshop={workshop}
          onClose={() => setActivePrintOrder(null)}
        />
      )}

      {/* Workshop Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          workshop={workshop}
          onUpdateWorkshop={handleUpdateWorkshop}
          onReloadAllData={loadAllData}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Data Management & Wipe Modal */}
      {isDataManagementOpen && (
        <DataManagementModal
          ordersCount={orders.length}
          customersCount={customers.length}
          productsCount={products.length}
          materialsCount={materials.length}
          onDataChanged={loadAllData}
          onClose={() => setIsDataManagementOpen(false)}
        />
      )}
    </div>
  );
}
