export interface ProductRecipeItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantityPerProduct: number;
}

export type ProductCategory = 'GIÁ STUDIO' | 'Freelance' | 'Khách Lẻ';

export interface Product {
  id: string;
  code: string; // e.g. 'EG1015', 'TG6090'
  name: string; // e.g. 'Ảnh ép gỗ láng'
  size: string; // e.g. '10x15', '60x90'
  price: number; // VND
  costPrice?: number;
  category: ProductCategory | string;
  unit: string; // 'tấm', 'cái', 'cuốn', 'bộ'
  description?: string;
  recipe?: ProductRecipeItem[]; // Danh sách vật tư kho cấu thành tấm ảnh này
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  studioName?: string;
  address?: string;
  initialDebt: number; // Nợ ban đầu
  customerType?: ProductCategory; // 'GIÁ STUDIO' | 'Freelance' | 'Khách Lẻ'
  notes?: string;
  createdAt: string;
  yearlyRevenue?: number; // Tổng doanh thu từ 01/01 đến 31/12 hàng năm (cộng dồn sau mỗi hóa đơn)
  initialYearlyRevenue?: number; // Doanh thu ban đầu trước khi dùng phần mềm (cho năm hiện tại hoặc mặc định)
  initialYearlyRevenues?: Record<number, number>; // Doanh thu ban đầu theo từng năm { 2026: 25000000, 2025: ... }
}

export interface OrderItem {
  id: string;
  date: string; // YYYY-MM-DD
  productCode: string;
  productName: string;
  size: string;
  price: number;
  quantity: number;
  amount: number; // quantity * price
  note?: string;
  customMaterials?: MaterialDeduction[]; // Danh sách vật tư tùy chỉnh cho dòng ảnh này
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'delivered' | 'cancelled';

export interface MaterialDeduction {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. 'XI194-2026-0042'
  date: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal: number; // Tổng tiền hàng
  discount: number; // Giảm giá
  previousDebt: number; // Nợ cũ của khách
  paid: number; // Đã thanh toán / Tạm ứng
  totalDue: number; // Cần thanh toán = subtotal - discount + previousDebt - paid
  status: OrderStatus;
  materialsDeducted?: MaterialDeduction[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer';
  note?: string;
}

export interface WorkshopInfo {
  name: string;
  subtitle: string;
  phone: string;
  hotline: string;
  address: string;
  zalo: string;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export type MaterialCategory =
  | 'Gỗ MDF'
  | 'Fomex siêu nhẹ'
  | 'Giấy In Ảnh'
  | 'Mica & Pha Lê'
  | 'Khung Ảnh'
  | 'Mực In'
  | 'Keo & Màng Lụa';

export interface Material {
  id: string;
  code: string; // e.g. 'VT-GO-6090'
  name: string; // e.g. 'Gỗ MDF 60x90 chống ẩm'
  category: MaterialCategory;
  unit: string; // 'Tấm', 'Cuộn', 'Cái', 'Bộ', 'Can'
  costPrice: number; // Giá nhập mỗi đơn vị (VNĐ)
  stockQuantity: number; // Số lượng tồn kho hiện có
  minStockAlert: number; // Ngưỡng cảnh báo sắp hết (ví dụ: < 5)
  supplier?: string; // Nhà cung cấp
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockImportItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number; // Nhập bao nhiêu cái/tấm mỗi loại
  costPrice: number; // Đơn giá nhập
  totalCost: number; // Tổng giá nhập = quantity * costPrice
}

export interface StockImportReceipt {
  id: string;
  receiptNumber: string; // e.g. 'NK-194-2026-001'
  date: string; // YYYY-MM-DD
  supplier: string; // Tên nhà cung cấp / Nguồn nhập
  items: StockImportItem[];
  totalAmount: number; // Tổng giá nhập đợt này
  paid: number; // Số tiền đã thanh toán cho nhà cung cấp
  notes?: string;
  createdAt: string;
}

