import React from 'react';
import { WorkshopInfo } from '../types';
import { ShoppingCart, FileText, BarChart3, Tag, Users, Settings, Database, Boxes } from 'lucide-react';

export type ActiveTab = 'pos' | 'orders' | 'inventory' | 'analytics' | 'products' | 'customers';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  workshop: WorkshopInfo;
  onOpenSettings: () => void;
  onOpenDataManagement: () => void;
  ordersCount: number;
  lowStockCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  workshop,
  onOpenSettings,
  onOpenDataManagement,
  ordersCount,
  lowStockCount = 0
}) => {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg border-b border-slate-800 no-print">
      <div className="w-full px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                194
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-base tracking-tight text-white uppercase group-hover:text-amber-400 transition-colors">
                    {workshop.name}
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Chuyên Nghiệp
                  </span>
                </div>
                <p className="hidden md:block text-[11px] text-slate-400 font-medium">
                  Hệ thống quản lý bán hàng & in ảnh thông minh
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Tab 1: POS / Bán Hàng */}
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === 'pos'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Bán Hàng</span>
            </button>

            {/* Tab 2: Danh Sách Đơn */}
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Đơn Hàng</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'orders' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
              }`}>
                {ordersCount}
              </span>
            </button>

            {/* Tab 3: Kho & Nhập Liệu */}
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 relative ${
                activeTab === 'inventory'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Kho Vật Tư</span>
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </button>

            {/* Tab 4: Thống Kê Lời Lãi */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Thống Kê & Lời Lãi</span>
            </button>

            {/* Tab 5: Bảng Giá & Mã SP */}
            <button
              onClick={() => setActiveTab('products')}
              className={`hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Bảng Giá Mã SP</span>
            </button>

            {/* Tab 6: Khách Hàng & Sổ Nợ */}
            <button
              onClick={() => setActiveTab('customers')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Khách & Sổ Nợ</span>
            </button>
          </nav>

          {/* Right Tools: Data Management + Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Clear / Seed Data Management Button */}
            <button
              onClick={onOpenDataManagement}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-red-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Xóa toàn bộ dữ liệu phần mềm hoặc nạp dữ liệu mẫu"
            >
              <Database className="w-4 h-4 text-red-400" />
              <span className="hidden lg:inline text-[11px]">Xóa / Nạp Dữ Liệu</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Cài đặt tiệm in & Sao lưu dữ liệu"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
