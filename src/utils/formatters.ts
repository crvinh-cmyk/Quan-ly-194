export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function parseNumber(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  // remove non-numeric chars except minus
  const cleaned = val.toString().replace(/[^\d-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];

function readThreeDigits(n: number, full: boolean = false): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const ten = Math.floor(remainder / 10);
  const unit = remainder % 10;
  let res = '';

  if (hundreds > 0 || full) {
    res += units[hundreds] + ' trăm ';
    if (ten === 0 && unit > 0) {
      res += 'lẻ ';
    }
  }

  if (ten > 0) {
    res += tens[ten] + ' ';
  }

  if (unit > 0) {
    if (ten > 1 && unit === 1) {
      res += 'mốt ';
    } else if (ten > 0 && unit === 5) {
      res += 'lăm ';
    } else {
      res += units[unit] + ' ';
    }
  }

  return res.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (!amount || amount === 0) return 'Không đồng';
  if (amount < 0) return 'Âm ' + numberToVietnameseWords(Math.abs(amount)).toLowerCase();

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let numStr = Math.round(amount).toString();
  const groups: number[] = [];

  while (numStr.length > 0) {
    const chunk = numStr.slice(-3);
    groups.push(parseInt(chunk, 10));
    numStr = numStr.slice(0, -3);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group > 0) {
      const isFull = i < groups.length - 1;
      const groupWords = readThreeDigits(group, isFull);
      words += groupWords + ' ' + scales[i] + ' ';
    }
  }

  words = words.trim();
  if (!words) return 'Không đồng';

  // Capitalize first letter
  const formatted = words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() + ' đồng chẵn.';
  return formatted.replace(/\s+/g, ' ');
}
