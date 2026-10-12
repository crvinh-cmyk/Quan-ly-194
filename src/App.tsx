import React, { useState, useEffect } from 'react';
import { S1aView } from './components/S1aView';
import { isPartnerMode, getRevenueMultiplier } from './utils/partnerConfig';
import { ShoppingCart, FileText, Plus, Trash2, DollarSign } from 'lucide-react';

interface Order {
  id: string;
  createdAt: string;
  itemsName: string;
  originalAmount: number;
  totalAmount: number;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'sales' | 's1a'>('sales');
  const isPartner = isPartnerMode();
  const multiplier = getRevenueMultiplier();

  // Quản lý danh sách đơn hàng (lưu tạm trên trình duyệt)
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('tiem_in_194_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: '1',
        createdAt: new Date().toISOString(),
        itemsName: 'In ảnh và đóng khung ảnh (20x30)',
        originalAmount: 150000,
        totalAmount: 150000 * (isPartner ? multiplier : 1)
      }
    ];
  });

  const [newItemName, setNewItemName] = useState('In ảnh và đóng khung ảnh');
  const [newAmount, setNewAmount] = useState<number>(150000);

  useEffect(() => {
    localStorage.setItem('tiem_in_194_orders', JSON.stringify(orders));
  }, [orders]);

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || newAmount <= 0) return;

    const calculatedAmount = newAmount * (isPartner ? multiplier : 1);
    const newOrder: Order = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      itemsName: newItemName,
      originalAmount: newAmount,
      totalAmount: calculatedAmount
    };

    setOrders([newOrder, ...orders]);
    setNewAmount(150000);
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Thanh điều hướng chính */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-wrap justify-between items-center print:hidden shadow-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-emerald-400 tracking-wide">
            TIỆM IN 194 {isPartner && <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded ml-2 border border-emerald-600">Partner View (-20%)</span>}
          </h1>
        </div>
        
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Bán Hàng & Đơn Hàng
          </button>

          {isPartner && (
            <button
              onClick={() => setActiveTab('s1a')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                activeTab === 's1a'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <FileText className="w-4 h-4" />
              Theo dõi doanh thu mẫu S1a
            </button>
          )}
        </nav>
      </header>

      {/* Nội dung chính */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'sales' ? (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold mb-4 text-emerald-300 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Thêm đơn hàng mới
              </h2>
              <form onSubmit={handleAddOrder} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nội dung / Dịch vụ</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Số tiền gốc (VNĐ) {isPartner && <span className="text-emerald-400">(Tự động giảm 20%)</span>}
                  </label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition shadow-md h-[38px]"
                >
                  Lưu đơn hàng
                </button>
              </form>
            </div>

            {/* Bảng danh sách đơn hàng */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold mb-4 text-emerald-300 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Danh sách đơn hàng trong kỳ
              </h2>
              {orders.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Chưa có đơn hàng nào.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Nội dung</th>
                        <th className="p-3 text-right">Tiền gốc</th>
                        <th className="p-3 text-right">Thực nhận {isPartner && '(-20%)'}</th>
                        <th className="p-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-750">
                          <td className="p-3 text-slate-400 font-mono text-xs">
                            {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 font-medium">{order.itemsName}</td>
                          <td className="p-3 text-right font-mono text-slate-300">
                            {order.originalAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                            {order.totalAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded transition"
                              title="Xóa đơn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <S1aView orders={orders} />
        )}
      </main>
    </div>
  );
}

export default App;
