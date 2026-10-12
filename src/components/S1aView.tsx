import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Download } from 'lucide-react';
import { isPartnerMode, getRevenueMultiplier } from '../utils/partnerConfig';

interface Order {
  id: string;
  createdAt: string; // ISO String
  totalAmount: number;
}

interface S1aViewProps {
  orders?: Order[];
}

export const S1aView: React.FC<S1aViewProps> = ({ orders = [] }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const isPartner = isPartnerMode();
  const multiplier = getRevenueMultiplier();

  // Tính số ngày trong tháng được chọn
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Gom nhóm doanh thu theo từng ngày
  const dailyData = useMemo(() => {
    const map = new Map<number, number>();

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      if (date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear) {
        const day = date.getDate();
        const amount = (order.totalAmount || 0) * (isPartner ? multiplier : 1);
        map.set(day, (map.get(day) || 0) + amount);
      }
    });

    const list = [];
    let total = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const revenue = map.get(day) || 0;
      total += revenue;
      list.push({
        day,
        revenue,
        description: revenue > 0 ? 'In ảnh và đóng khung ảnh' : 'Nghỉ bán không phát sinh doanh thu',
      });
    }

    return { list, total };
  }, [orders, selectedMonth, selectedYear, daysInMonth, isPartner, multiplier]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 max-w-5xl mx-auto bg-slate-900 text-slate-100 min-h-screen">
      {/* Bảng điều khiển / Bấm in */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">Chọn kỳ báo cáo:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {i + 1}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition shadow-lg active:scale-95"
        >
          <Printer className="w-4 h-4" />
          In Sổ S1a (20x30 cm)
        </button>
      </div>

      {/* KHUNG HIỂN THỊ TRẮNG / CHUẨN IN KÍCH THƯỚC 20x30 CM */}
      <div className="bg-white text-slate-900 p-8 shadow-2xl rounded-sm print:p-0 print:shadow-none mx-auto text-xs font-serif leading-relaxed" style={{ width: '100%', maxWidth: '200mm' }}>
        {/* Header Quốc Hiệu / Tiêu Đề */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="font-bold text-sm uppercase">Tên hộ kinh doanh: Tiệm in 194</p>
            <p className="text-[11px]">Địa chỉ: Khối 3, TT Cầu Giát, Quỳnh Lưu, Nghệ An</p>
            <p className="text-[11px]">Mã số thuế: .......................................</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[11px]">Mẫu số S1a-HKD</p>
            <p className="italic text-[10px]">(Ban hành kèm theo Thông tư số 152/2025/TT-BTC)</p>
          </div>
        </div>

        <div className="text-center my-6">
          <h1 className="text-base font-bold uppercase tracking-wide">SỔ THEO DÕI DOANH THU BÁN HÀNG HOẶC CUNG CẤP DỊCH VỤ</h1>
          <p className="italic font-sans text-xs mt-1">
            Tháng {selectedMonth} năm {selectedYear}
          </p>
        </div>

        {/* Bảng Doanh Thu */}
        <table className="w-full border-collapse border border-slate-900 text-center mb-6 text-[11px]">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="border border-slate-900 p-1.5 w-12">Ngày</th>
              <th className="border border-slate-900 p-1.5 text-left">Diễn giải</th>
              <th className="border border-slate-900 p-1.5 w-32 text-right">Doanh thu (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {dailyData.list.map((row) => (
              <tr key={row.day} className="hover:bg-slate-50">
                <td className="border border-slate-900 p-1 font-mono text-center">{row.day < 10 ? `0${row.day}` : row.day}</td>
                <td className="border border-slate-900 p-1 text-left">{row.description}</td>
                <td className="border border-slate-900 p-1 text-right font-mono">
                  {row.revenue > 0 ? row.revenue.toLocaleString('vi-VN') : '-'}
                  </td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-100">
              <td colSpan={2} className="border border-slate-900 p-2 text-center uppercase">
                Tổng cộng doanh thu tháng
              </td>
              <td className="border border-slate-900 p-2 text-right font-mono text-sm">
                {dailyData.total.toLocaleString('vi-VN')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Phần Chữ Ký */}
        <div className="flex justify-between items-start mt-8 pt-4 text-center text-[11px]">
          <div className="w-1/2">
            <p className="font-bold">NGƯỜI LẬP SỔ</p>
            <p className="italic text-[10px]">(Ký, ghi rõ họ tên)</p>
            <div className="h-16"></div>
          </div>
          <div className="w-1/2">
            <p className="italic text-[10px]">Ngày ..... tháng ..... năm .....</p>
            <p className="font-bold mt-1">NGƯỜI ĐẠI DIỆN HỘ KINH DOANH</p>
            <p className="italic text-[10px]">(Ký, ghi rõ họ tên, đóng dấu)</p>
            <div className="h-16"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default S1aView;
