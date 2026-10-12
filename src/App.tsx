import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import LoginView from './components/LoginView';
import DataManagementModal from './components/DataManagementModal';
import SettingsModal from './components/SettingsModal';
import PrintInvoiceModal from './components/PrintInvoiceModal';
import AnalyticsView from './components/AnalyticsView';
import ProductCostAnalyticsTable from './components/ProductCostAnalyticsTable';
import { isPartnerMode, transformOrderForPartner, applyPartnerDiscount, getDisplayPrice } from './utils/partnerConfig';

export type ActiveTab = 'pos' | 'orders' | 'inventory' | 'analytics' | 'products' | 'customers';

const STORAGE_TAB_KEY = 'xuongin194_active_tab';

const getInitialTab = (): ActiveTab => {
  if (isPartnerMode()) {
    return 'pos';
  }
  try {
    const validTabs: ActiveTab[] = ['pos', 'orders', 'inventory', 'analytics', 'products', 'customers'];
    const saved = localStorage.getItem(STORAGE_TAB_KEY);
    if (saved && validTabs.includes(saved as ActiveTab)) {
      return saved as ActiveTab;
    }
  } catch (e) {
    console.error('Lỗi đọc tab lưu trữ:', e);
  }
  return 'pos';
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any>(null);

  const handleSelectTab = (tab: ActiveTab) => {
    if (isPartnerMode() && (tab === 'orders' || tab === 'customers')) {
      setActiveTab('pos');
      return;
    }
    setActiveTab(tab);
    try {
      localStorage.setItem(STORAGE_TAB_KEY, tab);
    } catch (e) {
      console.error('Lỗi lưu tab:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Header 
        activeTab={activeTab} 
        setActiveTab={handleSelectTab} 
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'products' && <ProductCostAnalyticsTable />}
        {/* Các tab tính năng chính */}
      </main>

      {isDataModalOpen && <DataManagementModal onClose={() => setIsDataModalOpen(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {selectedOrderForPrint && (
        <PrintInvoiceModal 
          order={selectedOrderForPrint} 
          onClose={() => setSelectedOrderForPrint(null)} 
        />
      )}
    </div>
  );
}

export default App;
