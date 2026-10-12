import React, { useState } from 'react';
import { S1aView } from './components/S1aView';
import { isPartnerMode } from './utils/partnerConfig';

export function App() {
  const [activeTab, setActiveTab] = useState<'sales' | 's1a'>('sales');
  const isPartner = isPartnerMode();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Thanh điều khiển Navigation */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center print:hidden">
        <h1 className="text-xl font-bold text-emerald-400">TIỆM IN 194</h1>
        
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Bán Hàng
          </button>

          {/* Tab S1a chỉ hiển thị khi ở link Partner View (link -20%) */}
          {isPartner && (
            <button
              onClick={() => setActiveTab('s1a')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                activeTab === 's1a'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Theo dõi doanh thu mẫu S1a
            </button>
          )}
        </nav>
      </header>

      {/* Hiển thị nội dung theo Tab */}
      <main>
        {activeTab === 'sales' ? (
          <div className="p-6 text-center text-slate-400">
            {/* Giao diện bán hàng chính của bạn ở đây */}
            <p>Màn hình quản lý bán hàng</p>
          </div>
        ) : (
          <S1aView />
        )}
      </main>
    </div>
  );
}

export default App;
