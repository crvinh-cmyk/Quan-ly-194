import React, { useState } from 'react';
import { clearAllOrdersAndDebts, wipeAllDataClean, loadDemoData, exportBackupJSON, clearAllInventoryData } from '../utils/storage';
import {
  Trash2, Database, Download, RefreshCw, AlertTriangle, CheckCircle2,
  FileSpreadsheet, ShieldAlert, Sparkles, X, ArrowRight, Boxes
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

  const handleBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiemin194_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-500/20 text-red-400 rounded-lg">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm">Quản Lý & Xóa Dữ Liệu Phần Mềm</h3>
              <p className="text-xs text-slate-400">Xóa dữ liệu để bán hàng thực tế hoặc nạp lại dữ liệu mẫu</p>
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
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current system stats */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Hiện có trong hệ thống:</span>
            <div className="flex items-center gap-3 font-mono font-bold">
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                {ordersCount} Đơn hàng
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                {customersCount} Khách/Studio
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-amber-700">
                {productsCount} Mã SP
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-blue-700">
                {materialsCount} Vật tư kho
              </span>
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-3">
            {/* Card 1: Xóa toàn bộ đơn hàng & công nợ */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-amber-500/20 text-amber-800 rounded font-bold text-xs">Khuyên dùng</span>
                  <h4 className="font-bold text-sm text-slate-900">Xóa toàn bộ đơn hàng & công nợ</h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Đưa toàn bộ đơn hàng về 0, xóa sạch nợ cũ để Tiệm In 194 bắt đầu bán hàng thực tế. (Vẫn giữ nguyên bảng giá sản phẩm).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmStep('clearOrders')}
                className="shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xóa đơn & nợ
              </button>
            </div>

            {/* Card 2: Nạp dữ liệu mẫu */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 bg-blue-500/20 text-blue-800 rounded font-bold text-xs">Thử nghiệm</span>
                  <h4 className="font-bold text-sm text-slate-900">Nạp lại dữ liệu mẫu (Tiệm In 194)</h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Nạp 9 đơn hàng mẫu, các Studio Hoàng Gia, Tuấn Minh... kèm đầy đủ biểu đồ thống kê các tháng năm 2026.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmStep('loadDemo')}
                className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                Nạp dữ liệu mẫu
              </button>
            </div>

            {/* Card 3: Xóa toàn bộ dữ liệu kho nhập & vật tư */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-rose-800">
                  <Boxes className="w-4 h-4 text-rose-600" />
                  <h4 className="font-bold text-sm text-slate-900">Xóa hết dữ liệu kho nhập & vật tư</h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Xóa tất cả các vật liệu kho và toàn bộ lịch sử các phiếu nhập hàng (đưa kho về 0 để tự nhập từ đầu).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmStep('clearInventory')}
                className="shrink-0 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xóa hết kho
              </button>
            </div>

            {/* Card 4: Xóa trắng toàn bộ phần mềm */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <h4 className="font-bold text-sm text-red-900">Xóa trắng toàn bộ phần mềm</h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Xóa tất cả đơn hàng và tất cả khách hàng. Phần mềm sẽ hoàn toàn trắng dữ liệu như vừa mới cài đặt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmStep('wipeAll')}
                className="shrink-0 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                Xóa trắng
              </button>
            </div>
          </div>

          {/* Backup recommendation banner */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
            <span>Nên sao lưu trước khi xóa:</span>
            <button
              onClick={handleBackup}
              className="text-amber-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Tải file sao lưu (JSON)
            </button>
          </div>
        </div>

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
