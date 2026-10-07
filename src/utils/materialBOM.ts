import { OrderItem, Material, MaterialDeduction, Product, Order } from '../types';

export interface BOMRequirement {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantityNeeded: number;
  currentStock: number;
  remainingStockAfterOrder: number;
  isLowStockWarning: boolean;
  isOutOfStockError: boolean;
  reason: string; // e.g. "1 tấm gỗ cốt 60x90 cho Ảnh Cổng 60x90"
}

export interface MaterialUsageInfo {
  usedQuantity: number;
  orderCount: number;
  lastUsedDate?: string;
  orderNumbers: string[];
}

// Normalize size strings like "60x90", "60 x 90", "60*90" -> "6090"
export function normalizeSize(size: string): string {
  if (!size) return '';
  return size.toLowerCase().replace(/[^0-9]/g, '');
}

/**
 * Extracts effective dimension like "60x90" from size field or product name/code
 */
export function extractEffectiveSize(size?: string, name?: string, code?: string): string {
  if (size && size.trim()) {
    const m = size.match(/(\d{1,3})\s*[xX*_\-]\s*(\d{1,3})/);
    if (m) return `${m[1]}*${m[2]}`;
    return size.trim();
  }
  const text = `${name || ''} ${code || ''}`;
  const match = text.match(/(\d{1,3})\s*[xX*_\-]\s*(\d{1,3})/);
  if (match) {
    return `${match[1]}*${match[2]}`;
  }
  return '';
}

/**
 * Calculates raw materials for a SINGLE item in the sales invoice
 */
export function calculateItemBOM(
  item: OrderItem,
  materials: Material[],
  products?: Product[]
): { material: Material; quantity: number; reason: string }[] {
  if (!item.quantity || item.quantity <= 0) return [];

  // 1. If item has custom materials specified by user
  if (item.customMaterials && item.customMaterials.length > 0) {
    const list: { material: Material; quantity: number; reason: string }[] = [];
    item.customMaterials.forEach(cm => {
      const mat = materials.find(m => m.id === cm.materialId || m.code === cm.materialCode);
      if (mat) {
        list.push({
          material: mat,
          quantity: cm.quantity * item.quantity,
          reason: `Vật tư cấu thành tùy chỉnh cho ${item.productName || item.productCode} (${item.size})`
        });
      }
    });
    return list;
  }

  // 2. If matching product has defined recipe
  const matchingProd = products?.find(
    p => p.code.toLowerCase() === (item.productCode || '').trim().toLowerCase()
  );
  if (matchingProd?.recipe && matchingProd.recipe.length > 0) {
    const list: { material: Material; quantity: number; reason: string }[] = [];
    matchingProd.recipe.forEach(rc => {
      const mat = materials.find(m => m.id === rc.materialId || m.code === rc.materialCode);
      if (mat) {
        list.push({
          material: mat,
          quantity: rc.quantityPerProduct * item.quantity,
          reason: `Định mức công thức cho ${matchingProd.name} (${matchingProd.size})`
        });
      }
    });
    return list;
  }

  // 3. Quy chuẩn định mức tinh giản theo yêu cầu Tiệm In 194:
  // - Bỏ hết các vật tư rắc rối (mika, keo AB, màng lụa, giấy in, khung...)
  // - Chỉ thống kê 2 loại cốt ảnh:
  //   + FOMEX SIÊU NHẸ 9LI: DÙNG DUY NHẤT CHO 2 DẠNG SẢN PHẨM: "ẢNH 4K" VÀ "ẢNH HD PRO"
  //   + VÁN MDF: Dùng làm cốt cho tất cả các loại ảnh khác (kể cả Ảnh HD Gương Siêu Bóng, Lụa Viền, Mika Bo Viền, Ép Gỗ, Ảnh Cổng...)
  const effectiveSize = extractEffectiveSize(item.size, item.productName, item.productCode);
  const normItemSize = normalizeSize(effectiveSize);
  const prodName = (item.productName || '').toLowerCase().trim();
  const prodCode = (item.productCode || '').toLowerCase().trim();
  const prodNote = (item.note || '').toLowerCase().trim();
  const fullText = `${prodName} ${prodCode} ${prodNote}`;

  // Kiểm tra nếu là dòng sản phẩm "In", "In Ép", hoặc "Album mở phẳng":
  // User lưu ý: "in và in ép không dùng cốt vật tư là gỗ mdf, có thể bỏ trống" và "album mở phẳng ... mục không cốt"
  const isNoCore =
    prodCode.startsWith('inst') ||
    prodCode.startsWith('infl') ||
    prodCode.startsWith('inkl') ||
    prodCode.startsWith('inepst') ||
    prodCode.startsWith('inepfl') ||
    prodCode.startsWith('inepkl') ||
    prodCode.startsWith('inep') ||
    prodCode.startsWith('nep') ||
    prodCode.startsWith('abmp') ||
    prodCode.startsWith('fl-abmp') ||
    prodCode.startsWith('kl-abmp') ||
    prodCode.startsWith('ab') ||
    prodCode === 'in' ||
    prodName.startsWith('in ảnh') ||
    prodName.startsWith('in ép') ||
    prodName.includes('gia cố') ||
    prodName.includes('nẹp') ||
    prodName.includes('album') ||
    prodName.includes('photobook') ||
    prodName.includes('mở phẳng') ||
    prodName === 'in';

  if (isNoCore) {
    // Không dùng cốt gỗ MDF / Fomex -> bỏ trống
    return [];
  }

  // CHỈ CÓ 2 DẠNG DÙNG FOMEX SIÊU NHẸ 9LI: ẢNH 4K VÀ ẢNH HD PRO
  // Ảnh "HD Gương Siêu Bóng" (HDST, HDFL, HDKL...) dùng cốt GỖ MDF!
  const is4K = fullText.includes('4k');
  const isHDPro =
    fullText.includes('hd pro') ||
    fullText.includes('hd-pro') ||
    fullText.includes('hd_pro') ||
    fullText.includes('hdpro');

  const isFomex = is4K || isHDPro;
  const result: { material: Material; quantity: number; reason: string }[] = [];

  if (isFomex) {
    // 1. TẤM FOMEX SIÊU NHẸ 9LI (Chỉ dùng cho ảnh 4K và ảnh HD Pro)
    const fomexMat = materials.find(m => {
      if (m.category !== 'Fomex siêu nhẹ') return false;
      const normMatCode = normalizeSize(m.code);
      const normMatName = normalizeSize(m.name);
      return (
        (normItemSize && (normMatCode.includes(normItemSize) || normMatName.includes(normItemSize))) ||
        (effectiveSize && m.name.toLowerCase().includes(effectiveSize.toLowerCase()))
      );
    }) || materials.find(m => m.category === 'Fomex siêu nhẹ');

    if (fomexMat) {
      result.push({
        material: fomexMat,
        quantity: item.quantity * 1,
        reason: `${item.quantity} tấm Fomex siêu nhẹ 9li cho ${is4K ? 'Ảnh 4K' : 'Ảnh HD Pro'} (${effectiveSize || 'tiêu chuẩn'})`
      });
    }
  } else {
    // 2. TẤM VÁN MDF (Cho tất cả các loại ảnh khác: HD gương siêu bóng, lụa viền, mika bo viền, ép gỗ, ảnh cổng cưới, để bàn...)
    const woodMat = materials.find(m => {
      if (m.category !== 'Gỗ MDF') return false;
      const normMatCode = normalizeSize(m.code);
      const normMatName = normalizeSize(m.name);
      return (
        (normItemSize && (normMatCode.includes(normItemSize) || normMatName.includes(normItemSize))) ||
        (effectiveSize && m.name.toLowerCase().includes(effectiveSize.toLowerCase()))
      );
    }) || materials.find(m => m.category === 'Gỗ MDF');

    if (woodMat) {
      result.push({
        material: woodMat,
        quantity: item.quantity * 1,
        reason: `${item.quantity} tấm Ván MDF làm cốt gỗ cho ${item.productName || item.productCode} (${effectiveSize || 'tiêu chuẩn'})`
      });
    }
  }

  return result;
}

/**
 * Calculates all raw materials required for an entire order based on items in the cart
 */
export function calculateOrderBOM(
  items: OrderItem[],
  materials: Material[],
  products?: Product[]
): BOMRequirement[] {
  const requirementMap = new Map<string, {
    material: Material;
    quantity: number;
    reasons: string[];
  }>();

  items.forEach(item => {
    if (!item.quantity || item.quantity <= 0) return;
    if (!item.productCode.trim() && !item.productName.trim() && item.amount <= 0) return;

    const itemRequirements = calculateItemBOM(item, materials, products);
    itemRequirements.forEach(({ material, quantity, reason }) => {
      const cur = requirementMap.get(material.id) || { material, quantity: 0, reasons: [] };
      cur.quantity += quantity;
      cur.reasons.push(reason);
      requirementMap.set(material.id, cur);
    });
  });

  // Convert map to list of BOMRequirement
  const result: BOMRequirement[] = [];

  requirementMap.forEach(({ material, quantity, reasons }) => {
    const curStock = material.stockQuantity || 0;
    const roundedQty = Math.round(quantity * 100) / 100;
    const remaining = Math.round((curStock - roundedQty) * 100) / 100;

    result.push({
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      unit: material.unit,
      quantityNeeded: roundedQty,
      currentStock: curStock,
      remainingStockAfterOrder: remaining,
      isLowStockWarning: remaining <= material.minStockAlert && remaining >= 0,
      isOutOfStockError: remaining < 0,
      reason: reasons.join('; ')
    });
  });

  return result;
}

/**
 * Converts BOMRequirement into MaterialDeduction records to attach to the Order
 */
export function createMaterialDeductionRecords(bom: BOMRequirement[]): MaterialDeduction[] {
  return bom.map(b => ({
    materialId: b.materialId,
    materialCode: b.materialCode,
    materialName: b.materialName,
    unit: b.unit,
    quantity: b.quantityNeeded
  }));
}

/**
 * Calculates summary of materials USED across all orders
 */
export function getMaterialUsageSummary(
  orders: Order[],
  materials: Material[],
  products?: Product[]
): Record<string, MaterialUsageInfo> {
  const map: Record<string, MaterialUsageInfo> = {};

  // Initialize for all materials in warehouse
  materials.forEach(mat => {
    map[mat.id] = { usedQuantity: 0, orderCount: 0, orderNumbers: [] };
  });

  const validOrders = orders.filter(o => o.status !== 'cancelled');

  validOrders.forEach(order => {
    // If order has explicitly recorded materialsDeducted
    if (order.materialsDeducted && order.materialsDeducted.length > 0) {
      order.materialsDeducted.forEach(ded => {
        const targetMat = materials.find(m => m.id === ded.materialId || m.code === ded.materialCode);
        const targetId = targetMat ? targetMat.id : ded.materialId;

        if (!map[targetId]) {
          map[targetId] = { usedQuantity: 0, orderCount: 0, orderNumbers: [] };
        }
        map[targetId].usedQuantity += ded.quantity;
        map[targetId].orderCount += 1;
        if (!map[targetId].orderNumbers.includes(order.orderNumber)) {
          map[targetId].orderNumbers.push(order.orderNumber);
        }
        if (!map[targetId].lastUsedDate || order.date > map[targetId].lastUsedDate!) {
          map[targetId].lastUsedDate = order.date;
        }
      });
    } else if (order.items && order.items.length > 0) {
      // Dynamic calculation for orders that did not have materialsDeducted stored
      const calculatedBOM = calculateOrderBOM(order.items, materials, products);
      calculatedBOM.forEach(bom => {
        if (!map[bom.materialId]) {
          map[bom.materialId] = { usedQuantity: 0, orderCount: 0, orderNumbers: [] };
        }
        map[bom.materialId].usedQuantity += bom.quantityNeeded;
        map[bom.materialId].orderCount += 1;
        if (!map[bom.materialId].orderNumbers.includes(order.orderNumber)) {
          map[bom.materialId].orderNumbers.push(order.orderNumber);
        }
        if (!map[bom.materialId].lastUsedDate || order.date > map[bom.materialId].lastUsedDate!) {
          map[bom.materialId].lastUsedDate = order.date;
        }
      });
    }
  });

  // Clean rounding
  Object.keys(map).forEach(key => {
    map[key].usedQuantity = Math.round(map[key].usedQuantity * 100) / 100;
  });

  return map;
}
