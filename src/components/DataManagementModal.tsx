import React, { useState } from 'react';
import {
  clearAllOrdersAndDebts,
  wipeAllDataClean,
  loadDemoData,
  exportBackupJSON,
  downloadBackupJSON,
  importBackupJSON,
  clearAllInventoryData,
  generateInitialDataTsCode,
  downloadInitialDataTs
} from '../utils/storage';
import {
  Trash2, Database, Download, RefreshCw, AlertTriangle, CheckCircle2,
  ShieldAlert, Sparkles, X, Boxes, Upload, Copy, Check, FileCode, Github, ExternalLink
} from 'lucide-react';

interface DataManagementModalProps {
  ordersCount: number;
  customersCount: number;
  productsCount: number;
  materialsCount?: number;
  onDataChanged: () => void;
  onClose: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  ordersCount,
  customersCount,
  productsCount,
  materialsCount = 0,
  onDataChanged,
  onClose
}) => {
  const [confirmStep, setConfirmStep] = useState<null | 'clearOrders' | 'wipeAll' | 'loadDemo' | 'clearInventory'>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [pasteError, setPasteError] = useState('');

  const handleBackup = () => {
    downloadBackupJSON();
    setSuccessMessage('Đã tải xuống file sao lưu .json thành công!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDownloadInitialData = () => {
    downloadInitialDataTs();
    setSuccessMessage('Đã tải xuống file initialData.ts chứa toàn bộ sản phẩm/đơn hàng hiện tại!');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleCopyInitialDataCode = () => {
    const code = generateInitialDataTsCode();
    navigator.clipboard.writeText(code).then(() => {
      setIsCopiedCode(true);
      setSuccessMessage('Đã sao chép toàn bộ mã nguồn initialData.ts vào bộ nhớ tạm!');
      setTimeout(() => setIsCopiedCode(false), 2500);
      setTimeout(() => setSuccessMessage(''), 3500);
    }).catch(() => {
      setSuccessMessage('Không thể sao chép, vui lòng dùng nút Tải file.');
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importBackupJSON(content)) {
        onDataChanged();
        setSuccessMessage('Đã nhập và khôi phục toàn bộ dữ liệu thành công!');
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1800);
      } else {
        setSuccessMessage('Lỗi: File sao lưu không hợp lệ!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleImportPastedJson = () => {
    if (!pastedJson.trim()) {
      setPasteError('Vui lòng dán chuỗi JSON dữ liệu vào ô');
      return;
    }
    if (importBackupJSON(pastedJson.trim())) {
      onDataChanged();
      setIsPasteModalOpen(false);
      setPastedJson('');
      setSuccessMessage('Đã đồng bộ thành công dữ liệu vào hệ thống!');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1800);
    } else {
      setPasteError('Lỗi cú pháp: Định dạng JSON không hợp lệ!');
    }
  };

  const handleClearOrdersOnly = () => {
    clearAllOrdersAndDebts();
    onDataChanged();
    setConfirmStep(null);
    setSuccessMessage('Đã xóa sạch toàn bộ đơn hàng và đưa công nợ về 0đ!');
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1800);
  };

  const handleClearInventoryOnly = () => {
    clearAllInventoryData();
    onDataChanged();
    setConfirmStep(null);
    setSuccessMessage('Đã xóa sạch toàn bộ dữ liệu kho vật tư và lịch sử nhập hàng!');
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1800);
  };

  const handleWipeAllClean = () => {
    wipeAllDataClean();
    onDataChanged();
    setConfirmStep(null);
    setSuccessMessage('Đã xóa trắng toàn bộ dữ liệu phần mềm! Bạn có thể bắt đầu sử dụng mới.');
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1800);
  };

  const handleLoadDemo = () => {
    loadDemoData();
    onDataChanged();
    setConfirmStep(null);
    setSuccessMessage('Đã nạp thành công toàn bộ dữ liệu mẫu Tiệm In 194!');
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm">Quản Lý & Đồng Bộ Dữ Liệu Tiệm In 194</h3>
              <p className="text-xs text-slate-400">Xuất file mã nguồn initialData.ts, sao lưu JSON & đồng bộ Vercel/GitHub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Message */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current system stats */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="text-slate-600 font-medium">Dữ liệu hiện có trên trình duyệt này:</span>
            <div className="flex items-center gap-2 font-mono font-bold flex-wrap">
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                {ordersCount} Đơn hàng
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                {customersCount} Khách/Studio
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-amber-700">
                {productsCount} Sản phẩm
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-blue-700">
                {materialsCount} Vật tư
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: ĐỒNG BỘ SANG GITHUB & VERCEL (PRIMARY) */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 border-2 border-amber-400/80 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                  <FileCode className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <span>Đồng Bộ Sang GitHub & Vercel</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                      Mã Nguồn
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    Lưu trực tiếp toàn bộ dữ liệu bạn đã nhập thành mã nguồn mặc định (initial data) để khi đẩy lên GitHub & Vercel dữ liệu hoàn toàn đồng nhất!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Button 1: Download initialData.ts */}
              <button
                type="button"
                onClick={handleDownloadInitialData}
                className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                title="Tải về file initialData.ts để thay thế file src/data/initialData.ts"
              >
                <Download className="w-4 h-4" />
                <span>1. Tải File initialData.ts</span>
              </button>

              {/* Button 2: Copy Code */}
              <button
                type="button"
                onClick={handleCopyInitialDataCode}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                title="Sao chép toàn bộ code mã nguồn của initialData.ts vào clipboard"
              >
                {isCopiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{isCopiedCode ? 'Đã sao chép code!' : '2. Sao Chép Mã Nguồn'}</span>
              </button>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-slate-700 leading-relaxed">
              <strong className="text-amber-900">Cách đồng bộ lên Vercel:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-600 text-[11px]">
                <li>Bấm nút <strong>"Tải File initialData.ts"</strong> ở trên.</li>
                <li>Lưu/ghi đè file này vào đường dẫn: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-900 font-mono font-bold">src/data/initialData.ts</code> trong dự án.</li>
                <li>Commit & Push lên GitHub. Vercel sẽ tự động build lại và hiển thị chính xác 100% dữ liệu của bạn!</li>
              </ol>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: SAO LƯU & KHÔI PHỤC FILE JSON */}
          {/* ======================================================== */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Sao Lưu & Khôi Phục Nhanh (JSON)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">Đồng bộ trực tiếp giữa các trình duyệt</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Tải sao lưu */}
              <button
                type="button"
                onClick={handleBackup}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Xuất file .json</span>
              </button>

              {/* Nhập từ file */}
              <label className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nhập file .json</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              {/* Dán JSON */}
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(true)}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-600" />
                <span>Dán mã JSON</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: DỌN DẸP / QUẢN TRỊ DỮ LIỆU */}
          {/* ======================================================== */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Thao Tác Xóa Dữ Liệu Bán Hàng & Kho
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Xóa toàn bộ đơn hàng & công nợ */}
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between gap-2">
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Xóa hết đơn hàng & công nợ</h5>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Đưa đơn hàng về 0 để bắt đầu năm mới (giữ bảng giá & khách hàng).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmStep('clearOrders')}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa đơn hàng
                </button>
              </div>

              {/* Card 2: Xóa toàn bộ kho */}
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between gap-2">
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Xóa hết kho & phiếu nhập</h5>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Xóa vật tư kho và lịch sử nhập hàng để tự tạo danh mục kho mới.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmStep('clearInventory')}
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa sạch kho
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Dán JSON */}
        {isPasteModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-3 border border-slate-200 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900">Dán Dữ Liệu Sao Lưu JSON</h4>
                <button
                  onClick={() => setIsPasteModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Dán chuỗi JSON đã sao lưu từ phiên làm việc khác để khôi phục toàn bộ vào trình duyệt hiện tại:
              </p>
              <textarea
                value={pastedJson}
                onChange={(e) => {
                  setPastedJson(e.target.value);
                  setPasteError('');
                }}
                rows={6}
                placeholder="Dán nội dung JSON vào đây..."
                className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {pasteError && (
                <p className="text-xs text-rose-600 font-bold">{pasteError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleImportPastedJson}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs"
                >
                  Nạp Dữ Liệu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal Overlay */}
        {confirmStep && (
          <div className="p-4 bg-slate-900 text-white border-t border-slate-800 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                  Xác nhận hành động
                </h5>
                <p className="text-xs text-slate-300 mt-0.5">
                  {confirmStep === 'clearOrders' &&
                    'Bạn có chắc chắn muốn XÓA TOÀN BỘ ĐƠN HÀNG và đưa số nợ cũ của khách về 0? Hành động này không thể hoàn tác.'}
                  {confirmStep === 'clearInventory' &&
                    'CẢNH BÁO: Bạn có chắc chắn muốn XÓA HẾT TOÀN BỘ VẬT TƯ KHO và lịch sử phiếu nhập hàng?'}
                  {confirmStep === 'wipeAll' &&
                    'CẢNH BÁO: Bạn có chắc chắn muốn XÓA TRẮNG toàn bộ đơn hàng và khách hàng khỏi phần mềm?'}
                  {confirmStep === 'loadDemo' &&
                    'Nạp lại dữ liệu mẫu sẽ ghi đè các đơn hàng hiện có bằng dữ liệu mẫu demo của Tiệm In 194. Tiếp tục?'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmStep(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              {confirmStep === 'clearOrders' && (
                <button
                  type="button"
                  onClick={handleClearOrdersOnly}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-xs"
                >
                  Đồng ý xóa đơn & nợ
                </button>
              )}
              {confirmStep === 'clearInventory' && (
                <button
                  type="button"
                  onClick={handleClearInventoryOnly}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs"
                >
                  Xác nhận xóa hết kho
                </button>
              )}
              {confirmStep === 'wipeAll' && (
                <button
                  type="button"
                  onClick={handleWipeAllClean}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-xs"
                >
                  Xác nhận xóa trắng
                </button>
              )}
              {confirmStep === 'loadDemo' && (
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                >
                  Nạp dữ liệu mẫu
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
