import React, { useState, useMemo } from 'react';
import { Order, Product, StockImportReceipt, Customer } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  TrendingUp, Calendar, DollarSign, CreditCard, ShoppingBag,
  Award, PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Layers, Target,
  ChevronRight, Boxes, Truck, Coins, ShieldCheck, AlertCircle
} from 'lucide-react';

interface AnalyticsViewProps {
  orders: Order[];
  products: Product[];
  stockImports?: StockImportReceipt[];
  customers?: Customer[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  orders,
  products,
  stockImports = [],
  customers = []
}) => {
  // Current year defaults to 2026 (or new Date().getFullYear())
  const currentRealYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // 1-12 or 'all'

  // Extract all existing years from orders & stock imports & customer initial records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (let y = currentRealYear; y <= currentRealYear + 5; y++) {
      yearsSet.add(y);
    }
    orders.forEach(o => {
      const y = new Date(o.date).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });
    stockImports.forEach(imp => {
      const y = new Date(imp.date).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });
    customers.forEach(c => {
      if (c.initialYearlyRevenues) {
        Object.keys(c.initialYearlyRevenues).forEach(yrStr => {
          const yr = Number(yrStr);
          if (!isNaN(yr)) yearsSet.add(yr);
        });
      }
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [orders, stockImports, customers, currentRealYear]);

  // Filter orders by year and month
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'cancelled') return false;
      const orderDate = new Date(o.date);
      const y = orderDate.getFullYear();
      const m = orderDate.getMonth() + 1;

      if (y !== selectedYear) return false;
      if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      return true;
    });
  }, [orders, selectedYear, selectedMonth]);

  // Filter stock imports by year and month
  const filteredImports = useMemo(() => {
    return stockImports.filter(imp => {
      const d = new Date(imp.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      if (y !== selectedYear) return false;
      if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      return true;
    });
  }, [stockImports, selectedYear, selectedMonth]);

  // Tổng doanh thu đầu kỳ của tất cả khách hàng (từ Quản Lý Khách Hàng, Studio & Sổ Nợ Tiệm In 194)
  const totalCustomersInitialRevenue = useMemo(() => {
    return customers.reduce((sum, c) => {
      const manual = (c.initialYearlyRevenues && c.initialYearlyRevenues[selectedYear] !== undefined)
        ? (c.initialYearlyRevenues[selectedYear] || 0)
        : (c.initialYearlyRevenue || 0);
      return sum + manual;
    }, 0);
  }, [customers, selectedYear]);

  // Doanh thu từ hóa đơn phát sinh trên app trong kỳ
  const ordersRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.subtotal - (o.discount || 0)), 0);
  }, [filteredOrders]);

  // Top level KPI calculations:
  // "1. Doanh Thu Bán Ảnh (Cả Năm 2026)" liên kết lấy cả số liệu "Tổng doanh thu năm" bên Quản Lý Khách Hàng
  const totalRevenue = useMemo(() => {
    if (selectedMonth === 'all') {
      return ordersRevenue + totalCustomersInitialRevenue;
    }
    return ordersRevenue;
  }, [selectedMonth, ordersRevenue, totalCustomersInitialRevenue]);

  const totalCollected = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.paid || 0), 0);
  }, [filteredOrders]);

  const totalOutstandingDebt = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalDue || 0), 0);
  }, [filteredOrders]);

  const totalOrdersCount = filteredOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Total material purchase cost (Tổng giá vốn nhập vật tư trong kỳ)
  const totalImportCost = useMemo(() => {
    return filteredImports.reduce((sum, imp) => sum + (imp.totalAmount || 0), 0);
  }, [filteredImports]);

  // Lời / Lãi thực tế = Doanh thu bán hàng - Chi phí nhập vật tư
  const grossProfit = useMemo(() => {
    return totalRevenue - totalImportCost;
  }, [totalRevenue, totalImportCost]);

  const profitMarginPercent = useMemo(() => {
    if (totalRevenue <= 0) return 0;
    return Math.round((grossProfit / totalRevenue) * 100);
  }, [totalRevenue, grossProfit]);

  // Monthly 1-12 data for the selected year
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: `Th ${i + 1}`,
      revenue: 0,
      collected: 0,
      importCost: 0,
      profit: 0,
      profitMargin: 0,
      ordersCount: 0,
      importsCount: 0
    }));

    // Aggregate sales orders
    orders.forEach(o => {
      if (o.status === 'cancelled') return;
      const d = new Date(o.date);
      if (d.getFullYear() === selectedYear) {
        const mIdx = d.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          const rev = o.subtotal - (o.discount || 0);
          months[mIdx].revenue += rev;
          months[mIdx].collected += (o.paid || 0);
          months[mIdx].ordersCount += 1;
        }
      }
    });

    // Aggregate material purchases
    stockImports.forEach(imp => {
      const d = new Date(imp.date);
      if (d.getFullYear() === selectedYear) {
        const mIdx = d.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          months[mIdx].importCost += (imp.totalAmount || 0);
          months[mIdx].importsCount += 1;
        }
      }
    });

    // Calculate profit per month
    months.forEach(m => {
      m.profit = m.revenue - m.importCost;
      m.profitMargin = m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : 0;
    });

    return months;
  }, [orders, stockImports, selectedYear]);

  const maxChartValue = useMemo(() => {
    let max = 1000000;
    monthlyData.forEach(m => {
      if (m.revenue > max) max = m.revenue;
      if (m.importCost > max) max = m.importCost;
      if (m.profit > max) max = m.profit;
    });
    return max;
  }, [monthlyData]);

  // Product Category distribution
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();

    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        const prod = products.find(p => p.code === item.productCode);
        const cat = prod?.category || (item.productCode.startsWith('FL-') ? 'Freelance' : item.productCode.startsWith('KL-') ? 'Khách Lẻ' : 'GIÁ STUDIO');
        const cur = map.get(cat) || { count: 0, revenue: 0 };
        cur.count += item.quantity;
        cur.revenue += item.amount;
        map.set(cat, cur);
      });
    });

    const arr = Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      percent: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
    }));

    return arr.sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products, totalRevenue]);

  // Top photo sizes sold
  const sizeStats = useMemo(() => {
    const map = new Map<string, { quantity: number; revenue: number }>();

    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        const sizeKey = item.size ? item.size.trim() : 'Khác';
        const cur = map.get(sizeKey) || { quantity: 0, revenue: 0 };
        cur.quantity += item.quantity;
        cur.revenue += item.amount;
        map.set(sizeKey, cur);
      });
    });

    return Array.from(map.entries())
      .map(([size, data]) => ({ size, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Header & Year/Month Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 uppercase">
              BÁO CÁO DOANH THU, CHI PHÍ VỐN & LỜI LÃI
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp kết quả kinh doanh bán ảnh, chi phí nhập vật tư kho và lợi nhuận ròng thực tế
          </p>
        </div>

        {/* Year & Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Năm:
            </span>
            <div className="flex gap-1">
              {availableYears.slice(0, 5).map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedYear === year
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {year} {year === currentRealYear ? '(Nay)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="all">📅 Cả năm {selectedYear}</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {i + 1} / {selectedYear}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP PROFIT & LOSS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Doanh Thu Bán Hàng */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Doanh Thu Bán Ảnh ({selectedMonth !== 'all' ? `Tháng ${selectedMonth}` : `Cả Năm ${selectedYear}`})
            </span>
            <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="font-mono text-3xl font-black text-amber-400">
            {formatCurrency(totalRevenue)}
          </div>
          {totalCustomersInitialRevenue > 0 && selectedMonth === 'all' ? (
            <div className="text-[11px] text-slate-300 mt-2.5 pt-2 border-t border-slate-700/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 flex items-center gap-1 font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Đầu kỳ (sổ khách hàng):
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {formatCurrency(totalCustomersInitialRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Hóa đơn mới trên app:</span>
                <span className="font-mono font-semibold text-white">
                  {formatCurrency(ordersRevenue)} ({totalOrdersCount} đơn)
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>Tổng cộng <strong>{totalOrdersCount}</strong> đơn hàng</span>
              <span className="text-blue-300">TB: {formatCurrency(avgOrderValue)}/đơn</span>
            </p>
          )}
        </div>

        {/* KPI 2: Tổng Tiền Nhập Vật Tư (Vốn Kho) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Chi Phí Nhập Vật Tư Kho
            </span>
            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Boxes className="w-5 h-5" />
            </span>
          </div>
          <div className="font-mono text-3xl font-black text-rose-400">
            {formatCurrency(totalImportCost)}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span>Đã nhập <strong>{filteredImports.length}</strong> phiếu kho</span>
            <span className="text-rose-300">Tiền mua phôi gỗ, giấy, mica...</span>
          </p>
        </div>

        {/* KPI 3: LỢI NHUẬN THỰC TẾ (LỜI / LÃI) */}
        <div className={`rounded-2xl p-5 border shadow-lg sm:col-span-2 lg:col-span-1 ${
          grossProfit >= 0
            ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white border-emerald-500/50'
            : 'bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900 text-white border-rose-500/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>3. LỜI / LÃI THỰC TẾ (LỢI NHUẬN)</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              grossProfit >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
            }`}>
              {profitMarginPercent > 0 ? `+${profitMarginPercent}% Lãi` : `${profitMarginPercent}%`}
            </span>
          </div>
          <div className={`font-mono text-3xl font-black ${
            grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(grossProfit)}
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center gap-1">
            <span className="font-semibold">= Doanh thu ({formatCurrency(totalRevenue)}) - Vốn nhập ({formatCurrency(totalImportCost)})</span>
          </p>
        </div>
      </div>

      {/* SECONDARY ROW: CASH COLLECTED & OUTSTANDING DEBT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Thực thu */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiền đã thu về (Tiền mặt / CK)</span>
            <div className="font-mono text-2xl font-black text-emerald-600 mt-0.5">
              {formatCurrency(totalCollected)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Đạt {totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0}% tổng doanh số
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Công nợ chưa thu */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Công nợ Studio còn thiếu</span>
            <div className="font-mono text-2xl font-black text-amber-700 mt-0.5">
              {formatCurrency(totalOutstandingDebt)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Khoản tiền cần đối soát thu hồi từ các đối tác
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 12 Months Visual Comparison: Revenue vs Material Cost vs Profit */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              BIỂU ĐỒ DOANH THU - CHI PHÍ VỐN - LỜI LÃI 12 THÁNG NĂM {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">
              Nhấp vào từng cột tháng để xem chi tiết tháng đó
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-500 rounded-xs"></span> Doanh thu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-rose-500 rounded-xs"></span> Tiền nhập vật tư
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span> Lợi nhuận (Lời)
            </span>
          </div>
        </div>

        {/* Bar chart container */}
        <div className="h-64 flex items-end justify-between gap-1 sm:gap-2.5 pt-6 pb-2 px-1 border-b border-slate-200">
          {monthlyData.map(m => {
            const revHeight = maxChartValue > 0 ? (m.revenue / maxChartValue) * 100 : 0;
            const costHeight = maxChartValue > 0 ? (m.importCost / maxChartValue) * 100 : 0;
            const profitHeight = maxChartValue > 0 ? Math.max(0, m.profit / maxChartValue) * 100 : 0;
            const isCurrentSelected = selectedMonth === m.month;

            return (
              <div
                key={m.month}
                onClick={() => setSelectedMonth(selectedMonth === m.month ? 'all' : m.month)}
                className={`flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative p-1 rounded-xl transition ${
                  isCurrentSelected ? 'bg-amber-50/80 border border-amber-300 ring-2 ring-amber-400/20' : 'hover:bg-slate-50'
                }`}
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-20 bg-slate-900 text-white text-[10px] rounded-lg py-1.5 px-2.5 whitespace-nowrap z-20 shadow-xl transition duration-150">
                  <p className="font-extrabold text-amber-400">Tháng {m.month}/{selectedYear}</p>
                  <p className="text-blue-200">Doanh thu: {formatCurrency(m.revenue)}</p>
                  <p className="text-rose-200">Chi phí nhập: {formatCurrency(m.importCost)}</p>
                  <p className="text-emerald-300 font-bold">Lợi nhuận: {formatCurrency(m.profit)} ({m.profitMargin}%)</p>
                </div>

                {/* 3 Bars: Revenue, Cost, Profit */}
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${Math.max(revHeight, 3)}%` }}
                    className="w-1.5 sm:w-2.5 bg-blue-500 rounded-t-xs transition-all duration-300 group-hover:bg-blue-600"
                    title={`Doanh thu: ${formatCurrency(m.revenue)}`}
                  />
                  {/* Cost Bar */}
                  <div
                    style={{ height: `${Math.max(costHeight, m.importCost > 0 ? 3 : 0)}%` }}
                    className="w-1.5 sm:w-2.5 bg-rose-500 rounded-t-xs transition-all duration-300 group-hover:bg-rose-600"
                    title={`Chi phí nhập: ${formatCurrency(m.importCost)}`}
                  />
                  {/* Profit Bar */}
                  <div
                    style={{ height: `${Math.max(profitHeight, m.profit > 0 ? 3 : 0)}%` }}
                    className="w-1.5 sm:w-2.5 bg-emerald-500 rounded-t-xs transition-all duration-300 group-hover:bg-emerald-600"
                    title={`Lợi nhuận: ${formatCurrency(m.profit)}`}
                  />
                </div>

                <span className="text-[10px] sm:text-xs font-bold text-slate-600 mt-2">
                  T{m.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MONTHLY DETAILED PROFIT & LOSS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">BẢNG TỔNG HỢP LỜI - LÃI 12 THÁNG NĂM {selectedYear}</h3>
            <p className="text-xs text-slate-500">So sánh chi tiết doanh thu, chi phí vật tư và lợi nhuận từng tháng</p>
          </div>
          {selectedMonth !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className="text-xs text-amber-700 hover:underline font-bold"
            >
              Xem toàn bộ cả năm
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                <th className="py-3 px-3 w-24">Tháng</th>
                <th className="py-3 px-3 w-24 text-center">Số Đơn</th>
                <th className="py-3 px-3 text-right">Doanh Thu Bán Ảnh</th>
                <th className="py-3 px-3 text-right">Chi Phí Nhập Vật Tư</th>
                <th className="py-3 px-3 text-right">Lợi Nhuận (Lời/Lãi)</th>
                <th className="py-3 px-3 w-28 text-center">Tỷ Suất Lãi %</th>
                <th className="py-3 px-3 w-28 text-center">Đánh Giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {totalCustomersInitialRevenue > 0 && (
                <tr className="bg-amber-50/70 text-slate-800 font-semibold border-b border-amber-200">
                  <td className="py-2.5 px-3 font-bold text-amber-950 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Đầu kỳ (Sổ khách hàng)</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                    Trước app
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                    {formatCurrency(totalCustomersInitialRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">---</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                    {formatCurrency(totalCustomersInitialRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">---</td>
                  <td className="py-2.5 px-3 text-center text-[11px] font-semibold text-amber-800">
                    Sổ khách hàng
                  </td>
                </tr>
              )}
              {monthlyData.map(m => {
                const isSelected = selectedMonth === m.month;
                return (
                  <tr
                    key={m.month}
                    onClick={() => setSelectedMonth(selectedMonth === m.month ? 'all' : m.month)}
                    className={`hover:bg-slate-50 cursor-pointer transition ${
                      isSelected ? 'bg-amber-50/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900">
                      Tháng {m.month}/{selectedYear}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {m.ordersCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                          {m.ordersCount} đơn
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                      {m.importCost > 0 ? `-${formatCurrency(m.importCost)}` : '0 đ'}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-black text-sm ${
                      m.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {formatCurrency(m.profit)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {m.revenue > 0 ? (
                        <span className={`px-2 py-0.5 rounded-md ${
                          m.profitMargin >= 40
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.profitMargin > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {m.profitMargin}%
                        </span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {m.revenue === 0 && m.importCost === 0 ? (
                        <span className="text-slate-400 text-[11px]">Chưa phát sinh</span>
                      ) : m.profit > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5" /> Có lãi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <AlertCircle className="w-3.5 h-3.5" /> Âm vốn
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-extrabold text-sm">
                <td className="py-3.5 px-3">TỔNG NĂM {selectedYear}</td>
                <td className="py-3.5 px-3 text-center font-mono text-amber-400">
                  {monthlyData.reduce((s, m) => s + m.ordersCount, 0)} đơn
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-rose-400">
                  -{formatCurrency(totalImportCost)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-emerald-400 text-base">
                  {formatCurrency(grossProfit)}
                </td>
                <td className="py-3.5 px-3 text-center text-amber-400">
                  {profitMarginPercent}%
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-400 font-bold">
                  {grossProfit >= 0 ? 'LÃI RÒNG' : 'THUA LỖ'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Category & Size Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Categories */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-600" />
            Cơ Cấu Doanh Thu Theo Nhóm Sản Phẩm
          </h3>
          <p className="text-xs text-slate-500 mb-4">Ép gỗ, tráng gương, pha lê, album, khung...</p>

          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Chưa có dữ liệu đơn hàng trong kỳ này</p>
            ) : (
              categoryStats.map(cat => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{cat.name} ({cat.count} SP)</span>
                    <span className="font-mono text-slate-900">{formatCurrency(cat.revenue)} ({cat.percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${cat.percent}%` }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Sizes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            Các Khổ Ảnh Bán Chạy Nhất
          </h3>
          <p className="text-xs text-slate-500 mb-4">Các kích thước thông dụng nhất tiệm sản xuất</p>

          <div className="space-y-3">
            {sizeStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Chưa có dữ liệu đơn hàng trong kỳ này</p>
            ) : (
              sizeStats.map((item, idx) => (
                <div key={item.size} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Khổ {item.size}</p>
                      <p className="text-[11px] text-slate-500">{item.quantity} sản phẩm</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-900">{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
