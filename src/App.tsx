import React, { useState, useEffect, useMemo } from 'react';
import { Product, Customer, Order, OrderStatus, WorkshopInfo, Material, StockImportReceipt, StudioCombo } from './types';
import {
  getStoredProducts, saveStoredProducts,
  getStoredCustomers, saveStoredCustomers,
  getStoredOrders, saveStoredOrders,
  getStoredWorkshopInfo, saveStoredWorkshopInfo,
  getStoredMaterials, saveStoredMaterials,
  getStoredStockImports, saveStoredStockImports,
  getStoredCombos, saveStoredCombos,
  clearAllInventoryData, resetInventoryStockToZero, reloadDefaultMaterials, clearAllStockImportsOnly,
  calculateCustomerDebt
} from './utils/storage';
import {
  subscribeProducts, saveProductToFirestore, deleteProductFromFirestore, syncAllProductsToFirestore,
  subscribeCustomers, saveCustomerToFirestore, deleteCustomerFromFirestore, syncAllCustomersToFirestore,
  subscribeOrders, saveOrderToFirestore, deleteOrderFromFirestore, syncAllOrdersToFirestore,
  subscribeMaterials, saveMaterialToFirestore, deleteMaterialFromFirestore, syncAllMaterialsToFirestore,
  subscribeStockImports, saveStockImportToFirestore, deleteStockImportFromFirestore, syncAllStockImportsToFirestore,
  subscribeCombos, saveComboToFirestore, deleteComboFromFirestore, syncAllCombosToFirestore,
  subscribeWorkshopInfo, saveWorkshopInfoToFirestore,
  initializeFirestoreIfEmpty, pushCurrentLocalDataToFirestore
} from './services/firestoreService';
import { subscribeAuthState, logoutUser } from './services/authService';
import { User } from 'firebase/auth';
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
import { LoginView } from './components/LoginView';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockImports, setStockImports] = useState<StockImportReceipt[]>([]);
  const [combos, setCombos] = useState<StudioCombo[]>([]);
  const [workshop, setWorkshop] = useState<WorkshopInfo>(getStoredWorkshopInfo());
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // Print modal state
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);

  // Settings & Data Management modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);

  // Trigger to reset POS form to a brand new clean order
  const [newOrderTrigger, setNewOrderTrigger] = useState<number>(0);

  // 0. Listen to Firebase Authentication State
  useEffect(() => {
    const unsubscribeAuth = subscribeAuthState((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

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

  // Handler for user logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (e) {
      console.error('Error during logout:', e);
    }
  };

  // 1. Initial local load for instant UI render
  useEffect(() => {
    if (!currentUser) return;
    setProducts(getStoredProducts());
    setCustomers(getStoredCustomers());
    setOrders(getStoredOrders());
    setWorkshop(getStoredWorkshopInfo());
    setMaterials(getStoredMaterials());
    setStockImports(getStoredStockImports());
    setCombos(getStoredCombos());
  }, [currentUser]);

  // 2. Real-time Firebase Cloud Firestore Synchronizer (Active when logged in)
  useEffect(() => {
    if (!currentUser) return;

    // Check & seed if Firestore is brand new/empty
    initializeFirestoreIfEmpty().then(() => {
      setFirestoreStatus('connected');
    }).catch(err => {
      console.error('Firestore init error:', err);
      setFirestoreStatus('connected');
    });

    // Real-time snapshot listeners across all connected devices
    const unsubWorkshop = subscribeWorkshopInfo((data) => {
      setWorkshop(data);
      setFirestoreStatus('connected');
    });

    const unsubProducts = subscribeProducts((data) => {
      setProducts(data);
      setFirestoreStatus('connected');
    });

    const unsubCustomers = subscribeCustomers((data) => {
      setCustomers(data);
      setFirestoreStatus('connected');
    });

    const unsubOrders = subscribeOrders((data) => {
      setOrders(data);
      setFirestoreStatus('connected');
    });

    const unsubMaterials = subscribeMaterials((data) => {
      setMaterials(data);
      setFirestoreStatus('connected');
    });

    const unsubStockImports = subscribeStockImports((data) => {
      setStockImports(data);
      setFirestoreStatus('connected');
    });

    const unsubCombos = subscribeCombos((data) => {
      setCombos(data);
      setFirestoreStatus('connected');
    });

    return () => {
      unsubWorkshop();
      unsubProducts();
      unsubCustomers();
      unsubOrders();
      unsubMaterials();
      unsubStockImports();
      unsubCombos();
    };
  }, [currentUser]);

  // Reload all data manually (fallback)
  const loadAllData = () => {
    setProducts(getStoredProducts());
    setCustomers(getStoredCustomers());
    setOrders(getStoredOrders());
    setWorkshop(getStoredWorkshopInfo());
    setMaterials(getStoredMaterials());
    setStockImports(getStoredStockImports());
    setCombos(getStoredCombos());
  };

  // Combo CRUD handlers
  const handleSaveCombo = (combo: StudioCombo) => {
    const exists = combos.some(c => c.id === combo.id);
    const updated = exists
      ? combos.map(c => (c.id === combo.id ? combo : c))
      : [combo, ...combos];
    setCombos(updated);
    saveStoredCombos(updated);
    saveComboToFirestore(combo).catch(console.error);
  };

  const handleDeleteCombo = (comboId: string) => {
    const updated = combos.filter(c => c.id !== comboId);
    setCombos(updated);
    saveStoredCombos(updated);
    deleteComboFromFirestore(comboId).catch(console.error);
  };

  // Material CRUD handlers (Firestore + Local fallback)
  const handleSaveMaterial = (material: Material) => {
    const exists = materials.some(m => m.id === material.id);
    const updated = exists
      ? materials.map(m => (m.id === material.id ? material : m))
      : [material, ...materials];
    setMaterials(updated);
    saveStoredMaterials(updated);
    saveMaterialToFirestore(material).catch(console.error);
  };

  const handleDeleteMaterial = (materialId: string) => {
    const updated = materials.filter(m => m.id !== materialId);
    setMaterials(updated);
    saveStoredMaterials(updated);
    deleteMaterialFromFirestore(materialId).catch(console.error);
  };

  // Stock Inward handler: saves receipt AND increases stockQuantity of materials
  const handleSaveStockImport = (receipt: StockImportReceipt) => {
    const updatedImports = [receipt, ...stockImports];
    setStockImports(updatedImports);
    saveStoredStockImports(updatedImports);
    saveStockImportToFirestore(receipt).catch(console.error);

    // Increase stock quantity & update latest cost price
    const updatedMaterials = materials.map(mat => {
      const importedItem = receipt.items.find(it => it.materialId === mat.id);
      if (importedItem) {
        const updatedMat: Material = {
          ...mat,
          stockQuantity: mat.stockQuantity + importedItem.quantity,
          costPrice: importedItem.costPrice > 0 ? importedItem.costPrice : mat.costPrice,
          updatedAt: new Date().toISOString()
        };
        saveMaterialToFirestore(updatedMat).catch(console.error);
        return updatedMat;
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
    deleteStockImportFromFirestore(receiptId).catch(console.error);
  };

  // Stock adjustment / use
  const handleAdjustStock = (materialId: string, newQuantity: number) => {
    const target = materials.find(m => m.id === materialId);
    if (!target) return;
    const updatedMat: Material = {
      ...target,
      stockQuantity: newQuantity,
      updatedAt: new Date().toISOString()
    };
    const updatedMaterials = materials.map(mat => mat.id === materialId ? updatedMat : mat);

    setMaterials(updatedMaterials);
    saveStoredMaterials(updatedMaterials);
    saveMaterialToFirestore(updatedMat).catch(console.error);
  };

  // Inventory clearing & resetting handlers
  const handleClearAllInventory = () => {
    clearAllInventoryData();
    setMaterials([]);
    setStockImports([]);
    syncAllMaterialsToFirestore([]).catch(console.error);
    syncAllStockImportsToFirestore([]).catch(console.error);
  };

  const handleResetStockToZero = () => {
    resetInventoryStockToZero();
    const zeroMaterials = getStoredMaterials();
    setMaterials(zeroMaterials);
    setStockImports([]);
    syncAllMaterialsToFirestore(zeroMaterials).catch(console.error);
    syncAllStockImportsToFirestore([]).catch(console.error);
  };

  const handleReloadDefaultMaterials = () => {
    reloadDefaultMaterials();
    const reloadedMats = getStoredMaterials();
    const reloadedImports = getStoredStockImports();
    setMaterials(reloadedMats);
    setStockImports(reloadedImports);
    syncAllMaterialsToFirestore(reloadedMats).catch(console.error);
    syncAllStockImportsToFirestore(reloadedImports).catch(console.error);
  };

  const handleClearAllStockImports = () => {
    clearAllStockImportsOnly();
    setStockImports([]);
    syncAllStockImportsToFirestore([]).catch(console.error);
  };

  const lowStockCount = useMemo(() => {
    return materials.filter(m => m.stockQuantity > 0 && m.stockQuantity <= m.minStockAlert).length;
  }, [materials]);

  // Save order handler
  const handleSaveOrder = (newOrder: Order, openPrint: boolean) => {
    const updatedOrders = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);
    saveOrderToFirestore(newOrder).catch(console.error);

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
      saveCustomerToFirestore(newCust).catch(console.error);
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
          const restoredMat: Material = {
            ...mat,
            stockQuantity: Math.round((mat.stockQuantity + prevSum) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
          saveMaterialToFirestore(restoredMat).catch(console.error);
          return restoredMat;
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
          const deductedMat: Material = {
            ...mat,
            stockQuantity: Math.round(Math.max(0, mat.stockQuantity - totalDeduction) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
          saveMaterialToFirestore(deductedMat).catch(console.error);
          return deductedMat;
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
    saveCustomerToFirestore(customer).catch(console.error);
  };

  // Update customer
  const handleUpdateCustomer = (customer: Customer) => {
    const updated = customers.map(c => (c.id === customer.id ? customer : c));
    setCustomers(updated);
    saveStoredCustomers(updated);
    saveCustomerToFirestore(customer).catch(console.error);
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
    saveOrderToFirestore(paymentOrder).catch(console.error);
  };

  // Add product
  const handleAddProduct = (product: Product) => {
    const updated = [product, ...products];
    setProducts(updated);
    saveStoredProducts(updated);
    saveProductToFirestore(product).catch(console.error);
  };

  // Update product
  const handleUpdateProduct = (product: Product) => {
    const updated = products.map(p => (p.id === product.id ? product : p));
    setProducts(updated);
    saveStoredProducts(updated);
    saveProductToFirestore(product).catch(console.error);
  };

  // Delete product
  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated);
    deleteProductFromFirestore(productId).catch(console.error);
  };

  // Batch save / sync products
  const handleBatchSaveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    saveStoredProducts(newProducts);
    newProducts.forEach(p => {
      saveProductToFirestore(p).catch(console.error);
    });
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
          const restoredMat: Material = {
            ...mat,
            stockQuantity: Math.round((mat.stockQuantity + totalDeduction) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
          saveMaterialToFirestore(restoredMat).catch(console.error);
          return restoredMat;
        }
        return mat;
      });
      setMaterials(updatedMaterials);
      saveStoredMaterials(updatedMaterials);
    }

    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    saveStoredOrders(updated);
    deleteOrderFromFirestore(orderId).catch(console.error);
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
      syncAllOrdersToFirestore(updatedOrders).catch(console.error);
    }

    if (resetType === 'all' || resetType === 'baselineOnly') {
      const updatedCustomers = customers.map(c => {
        const newYearly = { ...(c.initialYearlyRevenues || {}) };
        delete newYearly[year];
        const updatedCust: Customer = {
          ...c,
          initialYearlyRevenues: newYearly,
          initialYearlyRevenue: year === new Date().getFullYear() ? 0 : c.initialYearlyRevenue
        };
        saveCustomerToFirestore(updatedCust).catch(console.error);
        return updatedCust;
      });
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    const updatedOrder: Order = { ...targetOrder, status, updatedAt: new Date().toISOString() };
    const updated = orders.map(o => (o.id === orderId ? updatedOrder : o));
    setOrders(updated);
    saveStoredOrders(updated);
    saveOrderToFirestore(updatedOrder).catch(console.error);
  };

  // Quick pay remaining debt on order
  const handlePayOrderDebt = (order: Order) => {
    const paymentAmt = order.totalDue;
    if (paymentAmt <= 0) return;
    const updatedOrder: Order = {
      ...order,
      paid: order.paid + paymentAmt,
      totalDue: 0,
      status: 'completed' as OrderStatus,
      updatedAt: new Date().toISOString()
    };
    const updated = orders.map(o => (o.id === order.id ? updatedOrder : o));
    setOrders(updated);
    saveStoredOrders(updated);
    saveOrderToFirestore(updatedOrder).catch(console.error);
  };

  // Update workshop info
  const handleUpdateWorkshop = (info: WorkshopInfo) => {
    setWorkshop(info);
    saveStoredWorkshopInfo(info);
    saveWorkshopInfoToFirestore(info).catch(console.error);
  };

  // 1. Loading splash screen while verifying persistent session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl shadow-amber-500/20 ring-4 ring-slate-800 animate-bounce mb-5">
          194
        </div>
        <div className="flex items-center gap-3 text-slate-300 font-semibold text-sm bg-slate-900/90 border border-slate-800 px-5 py-2.5 rounded-2xl shadow-xl">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Đang kiểm tra phiên đăng nhập...</span>
        </div>
        <p className="text-xs text-slate-500 mt-3">Tiệm In 194 • Hệ thống Quản lý Bán hàng</p>
      </div>
    );
  }

  // 2. Lock UI completely if user is not signed in
  if (!currentUser) {
    return <LoginView onLoginSuccess={() => {}} />;
  }

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
        firestoreStatus={firestoreStatus}
        currentUserEmail={currentUser.email}
        onLogout={handleLogout}
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
            combos={combos}
            onSaveCombo={handleSaveCombo}
            onDeleteCombo={handleDeleteCombo}
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
