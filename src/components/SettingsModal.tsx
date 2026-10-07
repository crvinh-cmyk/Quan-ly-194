import React, { useState } from 'react';
import { WorkshopInfo } from '../types';
import { exportBackupJSON, importBackupJSON, resetAllData, downloadInitialDataTs } from '../utils/storage';
import { Settings, Download, Upload, RefreshCw, Check, Building2, Phone, MapPin, CreditCard, FileCode } from 'lucide-react';

interface SettingsModalProps {
  workshop: WorkshopInfo;
  onUpdateWorkshop: (info: WorkshopInfo) => void;
  onReloadAllData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  workshop,
  onUpdateWorkshop,
  onReloadAllData,
  onClose
}) => {
  const [name, setName] = useState(workshop.name);
  const [subtitle, setSubtitle] = useState(workshop.subtitle);
  const [phone, setPhone] = useState(workshop.phone);
  const [hotline, setHotline] = useState(workshop.hotline);
  const [address, setAddress] = useState(workshop.address);
  const [bankName, setBankName] = useState(workshop.bankAccount.bankName);
  const [accountNumber, setAccountNumber] = useState(workshop.bankAccount.accountNumber);
  const [accountHolder, setAccountHolder] = useState(workshop.bankAccount.accountHolder);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveInfo = () => {
    onUpdateWorkshop({
      name: name.trim(),
      subtitle: subtitle.trim(),
      phone: phone.trim(),
      hotline: hotline.trim(),
      address: address.trim(),
      zalo: phone.trim(),
      bankAccount: {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim()
      }
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportJSON = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xuongin194_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [importStatus, setImportStatus] = useState<string>('');

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importBackupJSON(content)) {
        setImportStatus('Khôi phục dữ liệu thành công!');
        onReloadAllData();
        setTimeout(() => onClose(), 1500);
      } else {
        setImportStatus('Lỗi: File sao lưu không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    resetAllData();
    onReloadAllData();
    setImportStatus('Đã nạp lại dữ liệu tiệm mẫu thành công!');
    setTimeout(() => onClose(), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm">Cài Đặt Tiệm In 194 & Dữ Liệu</h3>
              <p className="text-xs text-slate-400">Thông tin xuất hiện trên phiếu in và sao lưu toàn bộ đơn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Đã cập nhật thông tin tiệm thành công!
            </div>
          )}

          {importStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              importStatus.startsWith('Lỗi')
                ? 'bg-red-50 border border-red-300 text-red-800'
                : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
            }`}>
              <Check className="w-4 h-4 text-emerald-600" />
              {importStatus}
            </div>
          )}

          {/* Workshop Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              Thông Tin Thương Hiệu Tiệm In
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tiệm in</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SĐT Hotline / Zalo</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Slogan / Dịch vụ chính</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ xưởng in</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              Tài Khoản Ngân Hàng Nhận Tiền
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngân hàng</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Techcombank"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số tài khoản</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chủ tài khoản</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>
            <button
              onClick={handleSaveInfo}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Lưu Thông Tin Tiệm
            </button>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-amber-600" />
              Sao Lưu & Đồng Bộ Mã Nguồn GitHub / Vercel
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadInitialDataTs}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                title="Tải file initialData.ts chứa toàn bộ dữ liệu đang lưu trong trình duyệt"
              >
                <FileCode className="w-3.5 h-3.5" />
                Tải file initialData.ts (Cho GitHub)
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Tải file sao lưu (.json)
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Nhập file sao lưu
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
              <button
                type="button"
                onClick={handleResetData}
                className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold border border-red-200 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Nạp lại dữ liệu tiệm mẫu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
