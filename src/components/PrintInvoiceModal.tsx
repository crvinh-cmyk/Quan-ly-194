import React, { useState, useRef, useEffect } from 'react';
import { Order, WorkshopInfo } from '../types';
import { formatCurrency, formatDateVN, numberToVietnameseWords } from '../utils/formatters';
import {
  Printer, X, Download, Share2, Check, Phone, MapPin,
  Building2, Image, FileText, CheckCircle2, Loader2, Sparkles, ExternalLink
} from 'lucide-react';
import { generateInvoicePortraitCanvas, downloadCanvasAsJPG } from '../utils/exportInvoice4K';

export type PaperSize = 'a4' | 'a5-portrait' | 'a5-landscape';

interface PrintInvoiceModalProps {
  order: Order | null;
  workshop: WorkshopInfo;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ order, workshop, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [isExportingJPG, setIsExportingJPG] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');
  const [exportedJpgUrl, setExportedJpgUrl] = useState<string>('');
  const [exportedFilename, setExportedFilename] = useState<string>('');
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Dynamically update print @page style based on chosen paper size
  useEffect(() => {
    let styleTag = document.getElementById('dynamic-invoice-print-style') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-invoice-print-style';
      document.head.appendChild(styleTag);
    }

    let pageCss = '';
    if (paperSize === 'a4') {
      pageCss = `
        @page {
          size: A4 portrait;
          margin: 8mm 6mm;
        }
      `;
    } else if (paperSize === 'a5-portrait') {
      pageCss = `
        @page {
          size: A5 portrait;
          margin: 4mm 4mm;
        }
      `;
    } else if (paperSize === 'a5-landscape') {
      pageCss = `
        @page {
          size: A5 landscape;
          margin: 4mm 4mm;
        }
      `;
    }

    styleTag.innerHTML = pageCss;

    return () => {
      const el = document.getElementById('dynamic-invoice-print-style');
      if (el) el.remove();
    };
  }, [paperSize]);

  if (!order) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Copy Zalo Text
  const handleCopyZalo = () => {
    let text = `📸 *${workshop.name} - PHIẾU BÁN HÀNG & GIAO ẢNH*\n`;
    text += `Mã đơn: ${order.orderNumber} | Ngày: ${formatDateVN(order.date)}\n`;
    text += `Khách hàng: ${order.customerName} - ĐT: ${order.customerPhone || '---'}\n`;
    text += `------------------------------------\n`;
    order.items.forEach((item, idx) => {
      text += `${idx + 1}. [${item.productCode}] ${item.productName} (${item.size})\n`;
      text += `   SL: ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.amount)}\n`;
      if (item.note) text += `   (Ghi chú: ${item.note})\n`;
    });
    text += `------------------------------------\n`;
    text += `👉 Tiền hàng: ${formatCurrency(order.subtotal)}\n`;
    if (order.discount > 0) {
      text += `👉 Chiết khấu: -${formatCurrency(order.discount)}\n`;
    }
    if (order.previousDebt > 0) {
      text += `👉 Nợ cũ: +${formatCurrency(order.previousDebt)}\n`;
    }
    if (order.paid > 0) {
      text += `👉 Đã thanh toán / Tạm ứng: -${formatCurrency(order.paid)}\n`;
    }
    text += `💰 *CẦN THANH TOÁN: ${formatCurrency(order.totalDue)}*\n`;
    text += `(Bằng chữ: ${numberToVietnameseWords(order.totalDue)})\n`;
    text += `------------------------------------\n`;
    text += `🏦 STK Techcombank: ${workshop.bankAccount.accountNumber} - ${workshop.bankAccount.accountHolder}\n`;
    text += `Hotline: ${workshop.phone} - Cảm ơn quý khách!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Export Portrait JPG for easy mobile viewing
  const handleExportJPGPortrait = async () => {
    setIsExportingJPG(true);
    setExportSuccessMsg('');

    try {
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }
      const canvas = await generateInvoicePortraitCanvas(order, workshop);
      const cleanCustomer = (order.customerName || 'Khach').replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
      const filename = `Phieu_194_${order.orderNumber}_${cleanCustomer}_Doc.jpg`;
      const dataUrl = downloadCanvasAsJPG(canvas, filename);

      setExportedJpgUrl(dataUrl);
      setExportedFilename(filename);
      setExportSuccessMsg(`Đã xuất phiếu hóa đơn thành công! (${filename})`);
    } catch (err: any) {
      console.error('Lỗi khi xuất ảnh dọc:', err);
      setExportSuccessMsg(`⚠️ Không thể tạo ảnh: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsExportingJPG(false);
    }
  };

  // Determine container styling based on selected paper size
  const isA5 = paperSize === 'a5-portrait' || paperSize === 'a5-landscape';
  const isLandscape = paperSize === 'a5-landscape';

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      {/* Modal Card */}
      <div className="printable-modal-card bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-800">
          
          {/* Left Info & Title */}
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base">In & Xuất Phiếu Giao Hàng</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                Khách: <strong className="text-slate-200">{order.customerName}</strong>
              </p>
            </div>
          </div>

          {/* Center: Paper Size Selector (A4 vs A5) */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 self-start md:self-auto">
            <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Khổ in:
            </span>
            <button
              type="button"
              onClick={() => setPaperSize('a4')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                paperSize === 'a4'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Khổ A4 (Dọc)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('a5-portrait')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                paperSize === 'a5-portrait'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Khổ A5 (Dọc)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('a5-landscape')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                paperSize === 'a5-landscape'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Khổ A5 (Ngang)
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-end">
            {/* Copy Zalo Text */}
            <button
              type="button"
              onClick={handleCopyZalo}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition cursor-pointer"
              title="Sao chép tóm tắt gửi tin nhắn Zalo"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã copy!' : 'Copy Zalo'}</span>
            </button>

            {/* Export Invoice Button */}
            <button
              type="button"
              disabled={isExportingJPG}
              onClick={handleExportJPGPortrait}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
              title="Xuất phiếu hóa đơn gửi Zalo cho khách hàng"
            >
              {isExportingJPG ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xuất phiếu...</span>
                </>
              ) : (
                <>
                  <Image className="w-3.5 h-3.5 text-blue-200" />
                  <span>Xuất Phiếu Hóa Đơn</span>
                </>
              )}
            </button>

            {/* Print Button (A4 / A5) */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
              title={`In phiếu khổ ${paperSize === 'a4' ? 'A4' : 'A5'}`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu ({paperSize === 'a4' ? 'A4' : paperSize === 'a5-portrait' ? 'A5 Dọc' : 'A5 Ngang'})</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Export Notification & Direct Download Button */}
        {exportSuccessMsg && (
          <div className="no-print bg-emerald-50 border-b border-emerald-300 px-4 py-2.5 text-xs font-bold text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
            <div className="flex items-center gap-2">
              {exportedJpgUrl && (
                <a
                  href={exportedJpgUrl}
                  download={exportedFilename}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Bấm để tải lại phiếu hóa đơn</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setExportSuccessMsg('');
                  setExportedJpgUrl('');
                }}
                className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Printable Invoice Container */}
        <div className="overflow-y-auto flex-1 bg-slate-100/60 p-3 sm:p-6 flex justify-center">
          <div
            ref={invoiceRef}
            className={`printable-area bg-white text-slate-900 shadow-lg border border-slate-200 transition-all ${
              paperSize === 'a4'
                ? 'w-full max-w-[800px] p-6 sm:p-8 rounded-xl'
                : paperSize === 'a5-portrait'
                ? 'w-full max-w-[580px] p-4 sm:p-5 rounded-lg text-xs'
                : 'w-full max-w-[840px] p-4 sm:p-5 rounded-lg text-xs'
            }`}
          >
            {/* Header Lab Info */}
            <div className={`border-b-2 border-slate-900 ${isA5 ? 'pb-2.5 mb-3' : 'pb-4 mb-4'}`}>
              <div className="flex flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`${isA5 ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'} rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 tracking-tighter shrink-0 shadow-xs`}>
                    194
                  </div>
                  <div>
                    <h1 className={`${isA5 ? 'text-base' : 'text-lg sm:text-xl'} font-extrabold tracking-tight text-slate-900 uppercase`}>
                      {workshop.name}
                    </h1>
                    <p className={`${isA5 ? 'text-[11px]' : 'text-xs'} font-medium text-slate-600`}>
                      {workshop.subtitle}
                    </p>
                  </div>
                </div>
                <div className={`text-right ${isA5 ? 'text-[11px] space-y-0.5' : 'text-xs space-y-0.5'} text-slate-600`}>
                  <p className="flex items-center justify-end gap-1 font-bold text-slate-900">
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                    <span>Hotline / Zalo: {workshop.phone}</span>
                  </p>
                  <p className="flex items-center justify-end gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{workshop.address}</span>
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    STK Techcombank: <strong className="font-mono text-slate-800">{workshop.bankAccount.accountNumber}</strong> ({workshop.bankAccount.accountHolder})
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Title & Meta */}
            <div className={`text-center ${isA5 ? 'my-2.5' : 'my-4'}`}>
              <h2 className={`${isA5 ? 'text-base font-extrabold' : 'text-lg sm:text-xl font-black'} uppercase tracking-wider text-slate-900`}>
                HÓA ĐƠN BÁN HÀNG & PHIẾU XUẤT KHO
              </h2>
              <div className={`flex items-center justify-center gap-4 ${isA5 ? 'text-[11px]' : 'text-xs'} text-slate-600 mt-0.5 font-mono`}>
                <span>Mã số phiếu: <strong className="text-slate-950">{order.orderNumber}</strong></span>
                <span>•</span>
                <span>Ngày lập: <strong className="text-slate-950">{formatDateVN(order.date)}</strong></span>
                <span>•</span>
                <span className="text-amber-800 font-bold">Khổ: {paperSize === 'a4' ? 'A4' : 'A5'}</span>
              </div>
            </div>

            {/* Customer Info Box */}
            <div className={`bg-slate-50 ${isA5 ? 'p-2.5 mb-3 gap-1.5 text-xs' : 'p-3.5 mb-4 gap-2 text-xs'} rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2`}>
              <div>
                <p className="text-slate-500 text-[11px]">Khách hàng / Studio đối tác:</p>
                <p className="font-bold text-slate-950">{order.customerName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">Số điện thoại liên hệ:</p>
                <p className="font-bold text-slate-950">{order.customerPhone || 'Chưa cập nhật'}</p>
              </div>
              {order.customerAddress && (
                <div className="sm:col-span-2">
                  <p className="text-slate-500 text-[11px]">Địa chỉ giao nhận ảnh:</p>
                  <p className="font-medium text-slate-800">{order.customerAddress}</p>
                </div>
              )}
              {order.notes && (
                <div className="sm:col-span-2 border-t border-slate-200/80 pt-1 mt-0.5">
                  <span className="text-slate-500 text-[11px]">Ghi chú đơn: </span>
                  <span className="font-medium text-amber-700 italic">{order.notes}</span>
                </div>
              )}
            </div>

            {/* Table Items */}
            <div className={`border border-slate-300 rounded-lg overflow-hidden ${isA5 ? 'mb-3' : 'mb-4'}`}>
              <table className={`w-full text-left border-collapse ${isA5 ? 'text-[11px]' : 'text-xs'}`}>
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <th className={`${isA5 ? 'py-1.5 px-1.5' : 'py-2 px-2'} text-center w-8`}>STT</th>
                    <th className={`${isA5 ? 'py-1.5 px-2' : 'py-2 px-2.5'} text-center w-20`}>Ngày</th>
                    <th className={`${isA5 ? 'py-1.5 px-2' : 'py-2 px-2.5'} w-20`}>Mã hàng</th>
                    <th className={`${isA5 ? 'py-1.5 px-2' : 'py-2 px-3'}`}>Tên hàng & Quy cách ảnh</th>
                    <th className={`${isA5 ? 'py-1.5 px-2' : 'py-2 px-2.5'} text-center w-20`}>Khổ</th>
                    <th className={`${isA5 ? 'py-1.5 px-1.5' : 'py-2 px-2'} text-center w-12`}>SL</th>
                    <th className={`${isA5 ? 'py-1.5 px-2' : 'py-2 px-2.5'} text-right w-24`}>Đơn giá</th>
                    <th className={`${isA5 ? 'py-1.5 px-2' : 'py-2 px-3'} text-right w-28`}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className={`${isA5 ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-center text-slate-500 font-mono`}>{idx + 1}</td>
                      <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-1.5 px-2.5 text-[11px]'} text-center font-mono text-slate-600`}>
                        {formatDateVN(item.date || order.date)}
                      </td>
                      <td className={`${isA5 ? 'py-1 px-2' : 'py-1.5 px-2.5'} font-mono font-bold text-slate-950 bg-slate-50/80`}>
                        {item.productCode}
                      </td>
                      <td className={`${isA5 ? 'py-1 px-2' : 'py-1.5 px-3'} font-medium text-slate-800`}>
                        <div>{item.productName}</div>
                        {item.note && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            ↳ {item.note}
                          </div>
                        )}
                      </td>
                      <td className={`${isA5 ? 'py-1 px-2' : 'py-1.5 px-2.5'} text-center font-bold text-slate-700 bg-slate-50/50`}>
                        {item.size}
                      </td>
                      <td className={`${isA5 ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-center font-black text-slate-900`}>
                        {item.quantity}
                      </td>
                      <td className={`${isA5 ? 'py-1 px-2' : 'py-1.5 px-2.5'} text-right font-mono text-slate-700`}>
                        {formatCurrency(item.price)}
                      </td>
                      <td className={`${isA5 ? 'py-1 px-2' : 'py-1.5 px-3'} text-right font-mono font-bold text-slate-950`}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations */}
            <div className={`flex justify-end items-start ${isA5 ? 'mb-3' : 'mb-5'}`}>
              {/* Right Totals Box */}
              <div className={`w-full sm:w-80 bg-slate-50 border border-slate-300 rounded-lg ${isA5 ? 'p-2 space-y-1 text-xs' : 'p-3 space-y-1.5 text-xs'}`}>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-mono font-bold">{formatCurrency(order.subtotal)}</span>
                </div>

                {order.discount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-medium">
                    <span>Chiết khấu / Giảm trừ:</span>
                    <span className="font-mono font-bold">-{formatCurrency(order.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-amber-800 font-medium border-t border-slate-200 pt-1">
                  <span>Nợ cũ:</span>
                  <span className="font-mono font-bold">{formatCurrency(order.previousDebt)}</span>
                </div>

                {order.paid > 0 && (
                  <div className="flex justify-between items-center text-blue-700">
                    <span>Đã thanh toán / Tạm ứng:</span>
                    <span className="font-mono font-bold">-{formatCurrency(order.paid)}</span>
                  </div>
                )}

                <div className={`flex justify-between items-center text-slate-950 font-extrabold border-t-2 border-slate-900 ${isA5 ? 'pt-1.5' : 'pt-2'}`}>
                  <span className="uppercase text-amber-800 font-bold">CẦN THANH TOÁN:</span>
                  <span className={`font-mono text-red-600 ${isA5 ? 'text-sm font-black' : 'text-base font-black'}`}>
                    {formatCurrency(order.totalDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount in Vietnamese Words */}
            <div className={`bg-amber-50/80 border border-amber-200/90 rounded-lg ${isA5 ? 'p-2 text-[11px] mb-4' : 'p-2.5 text-xs mb-6'} text-amber-950`}>
              <span className="font-bold">Số tiền viết bằng chữ: </span>
              <span className="font-medium italic">{numberToVietnameseWords(order.totalDue)}</span>
            </div>

            {/* Signatures */}
            <div className={`grid grid-cols-3 text-center ${isA5 ? 'text-[11px] pt-1' : 'text-xs pt-2'}`}>
              <div>
                <p className="font-bold text-slate-800 uppercase">Khách hàng</p>
                <p className="text-[10px] text-slate-400 italic mb-10 sm:mb-12">(Ký, ghi rõ họ tên)</p>
                <p className="font-bold text-slate-700">{order.customerName}</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 uppercase">Người giao nhận</p>
                <p className="text-[10px] text-slate-400 italic mb-10 sm:mb-12">(Ký, ghi rõ họ tên)</p>
                <p className="text-slate-400">..............................</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 uppercase">Người lập phiếu</p>
                <p className="text-[10px] text-slate-400 italic mb-10 sm:mb-12">(Ký, đóng dấu tiệm)</p>
                <p className="font-extrabold text-slate-900">{workshop.name}</p>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="mt-4 pt-2 border-t border-slate-100 text-center text-[10px] text-slate-400">
              Phần mềm quản lý bán hàng & công nợ chuyên dụng Tiệm In 194 • Hotline: {workshop.phone}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
