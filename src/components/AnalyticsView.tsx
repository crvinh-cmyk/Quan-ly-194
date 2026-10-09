import React, { useState, useMemo } from 'react';
import { Order, Product, StockImportReceipt, Customer } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Calendar, DollarSign, Award, BarChart3, RotateCcw,
  Sparkles, CheckCircle2, Flame, ArrowDown, TrendingUp, Coins,
  Table2
} from 'lucide-react';
import { ProductCostAnalyticsTable } from './ProductCostAnalyticsTable';

interface AnalyticsViewProps {
  orders: Order[];
  products: Product[];
  stockImports?: StockImportReceipt[];
  customers?: Customer[];
  currentUserEmail?: string | null;
  onResetYearData?: (year: number, resetType: 'all' | 'ordersOnly' | 'baselineOnly') => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  orders,
  products,
  customers = [],
  currentUserEmail,
  onResetYearData
}) => {
  // Current real year
  const currentRealYear = new Date().getFullYear();
  const currentRealMonth = new Date().getMonth() + 1;
  const currentRealDayStr = new Date().toISOString().slice(0, 10);

  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // 1-12 or 'all'
  const [dailyMonth, setDailyMonth] = useState<number>(currentRealMonth);
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'monthly' | 'daily'>('all');
  const [activeMainSection, setActiveMainSection] = useState<'sales' | 'product_cost'>('sales');

  // Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOption, setResetOption] = useState<'all' | 'ordersOnly' | 'baselineOnly'>('all');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Extract all existing years from orders & customer initial records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (let y = currentRealYear; y <= currentRealYear + 5; y++) {
      yearsSet.add(y);
    }
    orders.forEach(o => {
      const y = new Date(o.date).getFullYear();
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
  }, [orders, customers, currentRealYear]);

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

  // Top level KPI: "1. Doanh Thu Bán Ảnh (Cả Năm 2026)" liên kết lấy cả số liệu "Tổng doanh thu năm" bên Quản Lý Khách Hàng
  const totalRevenue = useMemo(() => {
    if (selectedMonth === 'all') {
      return ordersRevenue + totalCustomersInitialRevenue;
    }
    return ordersRevenue;
  }, [selectedMonth, ordersRevenue, totalCustomersInitialRevenue]);

  const totalOrdersCount = filteredOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Monthly 1-12 data for the selected year
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: `Th ${i + 1}`,
      revenue: 0,
      ordersCount: 0
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
          months[mIdx].ordersCount += 1;
        }
      }
    });

    return months;
  }, [orders, selectedYear]);

  const maxChartValue = useMemo(() => {
    let max = 1000000;
    monthlyData.forEach(m => {
      if (m.revenue > max) max = m.revenue;
    });
    return max;
  }, [monthlyData]);

  // ==========================================
  // THỐNG KÊ DOANH SỐ PHÁT SINH TỪNG NGÀY TRONG THÁNG
  // ==========================================
  const dailyBreakdown = useMemo(() => {
    // Number of days in dailyMonth of selectedYear
    const daysCount = new Date(selectedYear, dailyMonth, 0).getDate();
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    const days = Array.from({ length: daysCount }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${selectedYear}-${String(dailyMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayDate = new Date(selectedYear, dailyMonth - 1, dayNum);
      const dayName = dayNames[dayDate.getDay()];

      // Find orders on this day
      const dayOrders = orders.filter(o => {
        if (o.status === 'cancelled') return false;
        return o.date === dateStr;
      });

      const revenue = dayOrders.reduce((sum, o) => sum + (o.subtotal - (o.discount || 0)), 0);

      return {
        day: dayNum,
        dateStr,
        dayName,
        isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
        isToday: dateStr === currentRealDayStr,
        ordersCount: dayOrders.length,
        orders: dayOrders,
        revenue
      };
    });

    const totalMonthRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
    const totalMonthOrders = days.reduce((sum, d) => sum + d.ordersCount, 0);

    const activeDays = days.filter(d => d.revenue > 0);
    const maxRevenue = activeDays.length > 0 ? Math.max(...activeDays.map(d => d.revenue)) : 0;
    const minRevenue = activeDays.length > 0 ? Math.min(...activeDays.map(d => d.revenue)) : 0;

    const maxDay = activeDays.find(d => d.revenue === maxRevenue) || null;
    const minDay = activeDays.length > 1 ? activeDays.find(d => d.revenue === minRevenue) : (activeDays.length === 1 ? activeDays[0] : null);

    const avgDailyRevenue = activeDays.length > 0 ? Math.round(totalMonthRevenue / daysCount) : 0;
    const avgPerActiveDay = activeDays.length > 0 ? Math.round(totalMonthRevenue / activeDays.length) : 0;

    return {
      days,
      daysCount,
      totalMonthRevenue,
      totalMonthOrders,
      activeDaysCount: activeDays.length,
      maxDay,
      minDay,
      maxRevenue,
      minRevenue,
      avgDailyRevenue,
      avgPerActiveDay
    };
  }, [orders, selectedYear, dailyMonth, currentRealDayStr]);

  const handleConfirmReset = () => {
    if (onResetYearData) {
      onResetYearData(selectedYear, resetOption);
      setResetSuccessMsg(`Đã đặt lại thành công dữ liệu năm ${selectedYear}!`);
      setTimeout(() => {
        setResetSuccessMsg('');
        setIsResetModalOpen(false);
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP PRIMARY TABS: DOANH SỐ / ĐỊNH MỨC GIÁ VỐN & TỶ SUẤT LỢI NHUẬN GỘP */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMainSection('sales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeMainSection === 'sales'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>1. Báo Cáo Doanh Số Bán Hàng</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
              Năm {selectedYear}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainSection('product_cost')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeMainSection === 'product_cost'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Table2 className="w-4 h-4 text-slate-900" />
            <span>2. Bảng Định Mức Giá Vốn & Tỷ Suất LNG</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold">
              Mẫu PDF (63 Mã)
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5 px-2">
          {activeMainSection === 'sales' ? (
            <span className="flex items-center gap-1 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Doanh số 12 tháng & chi tiết từng ngày
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Tự động liên kết Bảng Giá SP & Tự động tính Tỷ suất LNG / Giá bán
            </span>
          )}
        </div>
      </div>

      {activeMainSection === 'product_cost' ? (
        <ProductCostAnalyticsTable products={products} currentUserEmail={currentUserEmail} />
      ) : (
        <>
          {/* Header & Year/Month Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 uppercase">
              BÁO CÁO THỐNG KÊ DOANH SỐ BÁN ẢNH
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xs">
              NĂM {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tổng hợp doanh số 12 tháng và chi tiết doanh số phát sinh từng ngày trong tháng
          </p>
        </div>

        {/* Action controls & Year selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year selector buttons */}
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
                  onClick={() => {
                    setSelectedYear(year);
                    if (selectedMonth !== 'all') {
                      setDailyMonth(selectedMonth);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedYear === year
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {year} {year === currentRealYear ? '(Nay)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Month selector for KPI filter */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              setSelectedMonth(val);
              if (val !== 'all') {
                setDailyMonth(val);
              }
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
          >
            <option value="all">📅 Toàn bộ cả năm {selectedYear}</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {i + 1} / {selectedYear}
              </option>
            ))}
          </select>

          {/* Manual Reset Year Data Button */}
          {onResetYearData && (
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer shadow-2xs hover:shadow-xs"
              title={`Xóa hoặc đặt lại dữ liệu của năm ${selectedYear} để làm bảng mới`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Dữ Liệu Năm {selectedYear}</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP REVENUE SUMMARY BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                TỔNG DOANH THU BÁN ẢNH ({selectedMonth !== 'all' ? `THÁNG ${selectedMonth}` : `CẢ NĂM ${selectedYear}`})
              </span>
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-amber-400">
              {formatCurrency(totalRevenue)}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:border-l sm:border-slate-700 sm:pl-6">
            <div>
              <p className="text-xs text-slate-400">Tổng số đơn hàng</p>
              <p className="font-mono text-xl font-bold text-white mt-0.5">{totalOrdersCount} đơn</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Giá trị trung bình / đơn</p>
              <p className="font-mono text-xl font-bold text-blue-300 mt-0.5">{formatCurrency(avgOrderValue)}</p>
            </div>
          </div>
        </div>

        {totalCustomersInitialRevenue > 0 && selectedMonth === 'all' && (
          <div className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
            <span className="text-amber-300 flex items-center gap-1.5 font-semibold">
              <Award className="w-4 h-4 text-amber-400" />
              Doanh thu đầu kỳ (nhập tay trong sổ khách hàng): <strong className="font-mono text-amber-300 text-sm">{formatCurrency(totalCustomersInitialRevenue)}</strong>
            </span>
            <span className="text-slate-400">
              Hóa đơn phát sinh trên app: <strong className="font-mono text-white text-sm">{formatCurrency(ordersRevenue)}</strong> ({totalOrdersCount} đơn)
            </span>
          </div>
        )}
      </div>

      {/* SUB-TAB NAVIGATOR FOR TABLES */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📑 Hiển thị cả 2 bảng
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'monthly'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📊 Bảng Doanh Số 12 Tháng
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('daily')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'daily'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📅 Bảng Doanh Số Từng Ngày
          </button>

          <button
            type="button"
            onClick={() => setActiveMainSection('product_cost')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5 ml-1"
            title="Mở Bảng Định Mức Giá Vốn & Tỷ Suất Lợi Nhuận Gộp theo mẫu PDF"
          >
            <Table2 className="w-3.5 h-3.5 text-amber-700" />
            <span>Bảng Định Mức Giá Vốn & LNG (Mẫu PDF)</span>
          </button>
        </div>

        {/* Hint */}
        <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Bấm nút "Xem ngày" để mở chi tiết từng ngày của tháng đó
        </span>
      </div>

      {/* ========================================================= */}
      {/* 1. BẢNG THỐNG KÊ DOANH SỐ 12 THÁNG TRONG NĂM */}
      {/* ========================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'monthly') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-white">
                  1. BẢNG THỐNG KÊ DOANH SỐ 12 THÁNG NĂM {selectedYear}
                </h3>
                <p className="text-xs text-slate-300">
                  Tổng hợp doanh thu bán ảnh theo từng tháng từ Tháng 1 đến Tháng 12
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onResetYearData && (
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset bảng năm {selectedYear}</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3 px-4 w-36">Tháng</th>
                  <th className="py-3 px-4 w-32 text-center">Số Đơn Hàng</th>
                  <th className="py-3 px-4 text-right text-sm">Doanh Thu Bán Ảnh (VNĐ)</th>
                  <th className="py-3 px-4 w-36 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {totalCustomersInitialRevenue > 0 && (
                  <tr className="bg-amber-50/70 text-slate-800 font-semibold border-b border-amber-200">
                    <td className="py-3 px-4 font-bold text-amber-950 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Đầu kỳ (Sổ khách hàng)</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs">
                      Trước khi dùng app
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-800 text-sm">
                      {formatCurrency(totalCustomersInitialRevenue)}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-amber-800">
                      Sổ ghi nhận
                    </td>
                  </tr>
                )}

                {monthlyData.map(m => {
                  const isCurrentSelected = dailyMonth === m.month;
                  return (
                    <tr
                      key={m.month}
                      className={`hover:bg-slate-50 transition ${
                        isCurrentSelected ? 'bg-amber-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        Tháng {m.month}/{selectedYear}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {m.ordersCount > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                            {m.ordersCount} đơn
                          </span>
                        ) : (
                          <span className="text-slate-400">0 đơn</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        {formatCurrency(m.revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setDailyMonth(m.month);
                            if (activeSubTab === 'monthly') {
                              setActiveSubTab('daily');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs ${
                            isCurrentSelected
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          title={`Xem chi tiết doanh số từng ngày trong Tháng ${m.month}`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Xem ngày</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-sm">
                  <td className="py-3.5 px-4">TỔNG NĂM {selectedYear}</td>
                  <td className="py-3.5 px-4 text-center font-mono text-amber-400">
                    {monthlyData.reduce((s, m) => s + m.ordersCount, 0)} đơn
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-400 text-base font-black">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 text-xs font-normal">
                    12 Tháng
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BẢNG DOANH SỐ PHÁT SINH TỪNG NGÀY TRONG THÁNG */}
      {/* ========================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'daily') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          {/* Header of Daily View */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500/20 text-amber-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-900 flex items-center gap-2">
                  <span>2. BẢNG DOANH SỐ PHÁT SINH TỪNG NGÀY TRONG THÁNG {dailyMonth}/{selectedYear}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800">
                    {dailyBreakdown.daysCount} ngày
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Nắm bắt mỗi ngày phát sinh bao nhiêu doanh số, ngày nhiều nhất và ngày ít nhất trong tháng
                </p>
              </div>
            </div>

            {/* Month Quick Selector for Daily Table */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">Chọn tháng:</span>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDailyMonth(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    dailyMonth === m
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Th{m}
                </button>
              ))}
            </div>
          </div>

          {/* DAILY STATISTICAL HIGHLIGHTS / KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Ngày nhiều doanh thu nhất (Đỉnh điểm) */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white border border-emerald-500/40 shadow-xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-emerald-300 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-400" />
                  DOANH THU CAO NHẤT
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-500 text-slate-950">
                  Kỷ Lục
                </span>
              </div>
              {dailyBreakdown.maxDay ? (
                <div>
                  <div className="font-mono text-xl font-black text-amber-400 mt-1">
                    {formatCurrency(dailyBreakdown.maxDay.revenue)}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 flex items-center justify-between">
                    <span>
                      📅 <strong>{dailyBreakdown.maxDay.dayName}</strong> ({dailyBreakdown.maxDay.dateStr})
                    </span>
                    <span className="text-amber-300 font-bold">{dailyBreakdown.maxDay.ordersCount} đơn</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Chưa có phát sinh doanh thu trong tháng này</p>
              )}
            </div>

            {/* 2. Ngày ít doanh thu nhất */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-rose-300 flex items-center gap-1">
                  <ArrowDown className="w-4 h-4 text-rose-400" />
                  DOANH THU THẤP NHẤT
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slate-700 text-slate-300">
                  Đáy Tháng
                </span>
              </div>
              {dailyBreakdown.minDay ? (
                <div>
                  <div className="font-mono text-xl font-black text-rose-300 mt-1">
                    {formatCurrency(dailyBreakdown.minDay.revenue)}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 flex items-center justify-between">
                    <span>
                      📅 <strong>{dailyBreakdown.minDay.dayName}</strong> ({dailyBreakdown.minDay.dateStr})
                    </span>
                    <span className="text-rose-300 font-bold">{dailyBreakdown.minDay.ordersCount} đơn</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Chưa có phát sinh đơn</p>
              )}
            </div>

            {/* 3. Doanh thu trung bình mỗi ngày */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1 text-slate-600">
                <span className="font-bold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  DOANH THU TRUNG BÌNH
                </span>
                <span className="text-[11px] font-mono text-slate-500">/{dailyBreakdown.daysCount} ngày</span>
              </div>
              <div className="font-mono text-xl font-black text-slate-900 mt-1">
                {formatCurrency(dailyBreakdown.avgDailyRevenue)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                TB ngày có đơn: <strong className="text-blue-700">{formatCurrency(dailyBreakdown.avgPerActiveDay)}</strong>
              </p>
            </div>

            {/* 4. Tổng kết tháng đang xem */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
              <div className="flex items-center justify-between text-xs mb-1 text-amber-900">
                <span className="font-bold flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-700" />
                  TỔNG THÁNG {dailyMonth}/{selectedYear}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-200 text-amber-900">
                  {dailyBreakdown.activeDaysCount}/{dailyBreakdown.daysCount} ngày bán
                </span>
              </div>
              <div className="font-mono text-xl font-black text-amber-900 mt-1">
                {formatCurrency(dailyBreakdown.totalMonthRevenue)}
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Tổng <strong>{dailyBreakdown.totalMonthOrders}</strong> đơn hàng phát sinh
              </p>
            </div>
          </div>

          {/* THE DAILY BREAKDOWN TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3 px-4 w-44">Ngày</th>
                  <th className="py-3 px-4 w-36">Vị Trí / Đánh Giá</th>
                  <th className="py-3 px-4 w-28 text-center">Số Đơn</th>
                  <th className="py-3 px-4 text-right text-sm">Doanh Số Ngày (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyBreakdown.days.map(d => {
                  const isMax = dailyBreakdown.maxDay && d.dateStr === dailyBreakdown.maxDay.dateStr && d.revenue > 0;
                  const isMin = dailyBreakdown.minDay && d.dateStr === dailyBreakdown.minDay.dateStr && d.revenue > 0;
                  const percent = dailyBreakdown.totalMonthRevenue > 0
                    ? Math.round((d.revenue / dailyBreakdown.totalMonthRevenue) * 100)
                    : 0;

                  return (
                    <tr
                      key={d.dateStr}
                      className={`hover:bg-slate-50 transition ${
                        isMax
                          ? 'bg-emerald-50/60 font-semibold'
                          : isMin
                          ? 'bg-rose-50/40'
                          : d.isToday
                          ? 'bg-blue-50/40'
                          : d.isWeekend
                          ? 'bg-slate-50/50'
                          : ''
                      }`}
                    >
                      {/* Ngày & Thứ */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${d.isWeekend ? 'text-rose-700' : 'text-slate-900'}`}>
                            {d.dateStr}
                          </span>
                          <span className="text-xs text-slate-500 font-normal">
                            ({d.dayName})
                          </span>
                          {d.isToday && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-600 text-white">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Đánh giá / Điểm nhấn */}
                      <td className="py-3 px-4">
                        {isMax ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-600 text-white shadow-2xs">
                            <Flame className="w-3.5 h-3.5 text-amber-300" />
                            👑 CAO NHẤT THÁNG
                          </span>
                        ) : isMin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800">
                            <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                            🔻 THẤP NHẤT
                          </span>
                        ) : d.revenue > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Có doanh số
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">---</span>
                        )}
                      </td>

                      {/* Số đơn */}
                      <td className="py-3 px-4 text-center font-mono">
                        {d.ordersCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                            {d.ordersCount} đơn
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Doanh số ngày */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {d.revenue > 0 ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className={isMax ? 'text-emerald-700 font-black text-base' : ''}>
                              {formatCurrency(d.revenue)}
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-400 w-10 text-right">
                              ({percent}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal">0 đ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-sm">
                  <td className="py-3.5 px-4">TỔNG THÁNG {dailyMonth}/{selectedYear}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-normal text-xs">
                    {dailyBreakdown.activeDaysCount}/{dailyBreakdown.daysCount} ngày có doanh số
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-amber-400">
                    {dailyBreakdown.totalMonthOrders} đơn
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-400 text-base font-black">
                    {formatCurrency(dailyBreakdown.totalMonthRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 12 Months Visual Chart & Breakdown */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              BIỂU ĐỒ DOANH SỐ 12 THÁNG NĂM {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">
              Nhấp vào từng cột tháng để chuyển nhanh xem chi tiết từng ngày của tháng đó
            </p>
          </div>
        </div>

        {/* Bar chart container */}
        <div className="h-56 flex items-end justify-between gap-1 sm:gap-3 pt-6 pb-2 px-1 border-b border-slate-200">
          {monthlyData.map(m => {
            const revHeight = maxChartValue > 0 ? (m.revenue / maxChartValue) * 100 : 0;
            const isCurrentSelected = dailyMonth === m.month;

            return (
              <div
                key={m.month}
                onClick={() => setDailyMonth(m.month)}
                className={`flex-1 flex flex-col items-center h-full justify-end group cursor-pointer p-1 rounded-t-lg transition ${
                  isCurrentSelected ? 'bg-amber-100/60 font-bold' : 'hover:bg-slate-50'
                }`}
                title={`Tháng ${m.month}/${selectedYear}: Doanh thu ${formatCurrency(m.revenue)}`}
              >
                {/* Value tooltip on hover */}
                <div className="text-[10px] font-mono text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap hidden sm:block">
                  {m.revenue > 0 ? `${Math.round(m.revenue / 1000000)}Tr` : '0'}
                </div>

                <div className="w-full flex items-end justify-center h-40">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${Math.max(revHeight, m.revenue > 0 ? 4 : 0)}%` }}
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                      isCurrentSelected
                        ? 'bg-amber-500 group-hover:bg-amber-600'
                        : 'bg-blue-500 group-hover:bg-blue-600'
                    }`}
                  />
                </div>

                <span className={`text-[10px] sm:text-xs font-bold mt-2 ${
                  isCurrentSelected ? 'text-amber-900 font-black scale-110' : 'text-slate-600'
                }`}>
                  T{m.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESET DỮ LIỆU NĂM THỦ CÔNG */}
      {/* ========================================================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Đặt Lại / Reset Dữ Liệu Năm {selectedYear}</h3>
                  <p className="text-[11px] text-slate-400">Xóa dữ liệu để chuẩn bị đón năm mới hoặc bắt đầu năm tài chính mới</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {resetSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 font-bold flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  <span>{resetSuccessMsg}</span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                    <strong>Lưu ý:</strong> Hành động này sẽ xóa dữ liệu doanh số và đơn hàng của riêng <strong>Năm {selectedYear}</strong>. Các năm khác và danh mục bảng giá, danh sách khách hàng sẽ <strong>vẫn được giữ nguyên an toàn</strong>.
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Chọn hình thức đặt lại cho Năm {selectedYear}:</label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      resetOption === 'all'
                        ? 'bg-rose-50 border-rose-400 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="resetOpt"
                        checked={resetOption === 'all'}
                        onChange={() => setResetOption('all')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold">Xóa sạch toàn bộ đơn hàng & doanh thu đầu kỳ Năm {selectedYear}</p>
                        <p className="text-[11px] text-slate-500">Đưa toàn bộ doanh số Năm {selectedYear} về 0đ để bắt đầu năm mới hoàn toàn.</p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      resetOption === 'ordersOnly'
                        ? 'bg-rose-50 border-rose-400 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="resetOpt"
                        checked={resetOption === 'ordersOnly'}
                        onChange={() => setResetOption('ordersOnly')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold">Chỉ xóa các đơn hàng phát sinh trong Năm {selectedYear}</p>
                        <p className="text-[11px] text-slate-500">Giữ nguyên số liệu doanh thu ban đầu đã nhập tay trong sổ khách hàng.</p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      resetOption === 'baselineOnly'
                        ? 'bg-rose-50 border-rose-400 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="resetOpt"
                        checked={resetOption === 'baselineOnly'}
                        onChange={() => setResetOption('baselineOnly')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold">Chỉ xóa số liệu doanh thu ban đầu nhập tay (Sổ khách hàng)</p>
                        <p className="text-[11px] text-slate-500">Giữ nguyên các hóa đơn đã tạo trên app.</p>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!resetSuccessMsg && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xác Nhận Đặt Lại Năm {selectedYear}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
