import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product, Customer, Order, Material, StockImportReceipt, WorkshopInfo } from '../types';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CUSTOMERS,
  DEFAULT_ORDERS,
  DEFAULT_MATERIALS,
  DEFAULT_STOCK_IMPORTS,
  DEFAULT_WORKSHOP_INFO
} from '../data/initialData';
import {
  getStoredProducts,
  getStoredCustomers,
  getStoredOrders,
  getStoredMaterials,
  getStoredStockImports,
  getStoredWorkshopInfo,
  saveStoredProducts,
  saveStoredCustomers,
  saveStoredOrders,
  saveStoredMaterials,
  saveStoredStockImports,
  saveStoredWorkshopInfo
} from '../utils/storage';

// Tên các Collection trên Firestore
export const COLLECTIONS = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  MATERIALS: 'materials',
  STOCK_IMPORTS: 'stock_imports',
  SETTINGS: 'settings'
} as const;

// 1. WORKSHOP INFO
export function subscribeWorkshopInfo(
  onData: (info: WorkshopInfo) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'workshop_info');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as WorkshopInfo;
      saveStoredWorkshopInfo(data);
      onData(data);
    } else {
      // Nếu chưa có trên Firestore, lấy từ local hoặc default và lưu lên
      const initial = getStoredWorkshopInfo() || DEFAULT_WORKSHOP_INFO;
      saveWorkshopInfoToFirestore(initial);
      onData(initial);
    }
  }, (error) => {
    console.error('Firestore workshop_info sync error:', error);
    if (onError) onError(error);
  });
}

export async function saveWorkshopInfoToFirestore(info: WorkshopInfo): Promise<void> {
  saveStoredWorkshopInfo(info);
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'workshop_info');
  await setDoc(docRef, info);
}

// 2. PRODUCTS
export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  return onSnapshot(colRef, (snapshot) => {
    const list: Product[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Product);
    });

    if (list.length > 0 || snapshot.metadata.fromCache === false) {
      saveStoredProducts(list);
      onData(list);
    }
  }, (error) => {
    console.error('Firestore products sync error:', error);
    if (onError) onError(error);
  });
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
  await setDoc(docRef, product);
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
  await deleteDoc(docRef);
}

export async function syncAllProductsToFirestore(products: Product[]): Promise<void> {
  saveStoredProducts(products);
  const batch = writeBatch(db);
  products.forEach(p => {
    const ref = doc(db, COLLECTIONS.PRODUCTS, p.id);
    batch.set(ref, p);
  });
  await batch.commit();
}

// 3. CUSTOMERS
export function subscribeCustomers(
  onData: (customers: Customer[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.CUSTOMERS);
  return onSnapshot(colRef, (snapshot) => {
    const list: Customer[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Customer);
    });

    if (list.length > 0 || snapshot.metadata.fromCache === false) {
      saveStoredCustomers(list);
      onData(list);
    }
  }, (error) => {
    console.error('Firestore customers sync error:', error);
    if (onError) onError(error);
  });
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
  await setDoc(docRef, customer);
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
  await deleteDoc(docRef);
}

export async function syncAllCustomersToFirestore(customers: Customer[]): Promise<void> {
  saveStoredCustomers(customers);
  const batch = writeBatch(db);
  customers.forEach(c => {
    const ref = doc(db, COLLECTIONS.CUSTOMERS, c.id);
    batch.set(ref, c);
  });
  await batch.commit();
}

// 4. ORDERS
export function subscribeOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.ORDERS);
  return onSnapshot(colRef, (snapshot) => {
    const list: Order[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Order);
    });

    // Sort newest first
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (list.length > 0 || snapshot.metadata.fromCache === false) {
      saveStoredOrders(list);
      onData(list);
    }
  }, (error) => {
    console.error('Firestore orders sync error:', error);
    if (onError) onError(error);
  });
}

export async function saveOrderToFirestore(order: Order): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
  await setDoc(docRef, order);
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
  await deleteDoc(docRef);
}

export async function syncAllOrdersToFirestore(orders: Order[]): Promise<void> {
  saveStoredOrders(orders);
  const batch = writeBatch(db);
  orders.forEach(o => {
    const ref = doc(db, COLLECTIONS.ORDERS, o.id);
    batch.set(ref, o);
  });
  await batch.commit();
}

// 5. MATERIALS (Kho vật tư)
export function subscribeMaterials(
  onData: (materials: Material[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.MATERIALS);
  return onSnapshot(colRef, (snapshot) => {
    const list: Material[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Material);
    });

    if (list.length > 0 || snapshot.metadata.fromCache === false) {
      saveStoredMaterials(list);
      onData(list);
    }
  }, (error) => {
    console.error('Firestore materials sync error:', error);
    if (onError) onError(error);
  });
}

export async function saveMaterialToFirestore(material: Material): Promise<void> {
  const docRef = doc(db, COLLECTIONS.MATERIALS, material.id);
  await setDoc(docRef, material);
}

export async function deleteMaterialFromFirestore(materialId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.MATERIALS, materialId);
  await deleteDoc(docRef);
}

export async function syncAllMaterialsToFirestore(materials: Material[]): Promise<void> {
  saveStoredMaterials(materials);
  const batch = writeBatch(db);
  materials.forEach(m => {
    const ref = doc(db, COLLECTIONS.MATERIALS, m.id);
    batch.set(ref, m);
  });
  await batch.commit();
}

// 6. STOCK IMPORTS (Phiếu nhập kho)
export function subscribeStockImports(
  onData: (imports: StockImportReceipt[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.STOCK_IMPORTS);
  return onSnapshot(colRef, (snapshot) => {
    const list: StockImportReceipt[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as StockImportReceipt);
    });

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (list.length > 0 || snapshot.metadata.fromCache === false) {
      saveStoredStockImports(list);
      onData(list);
    }
  }, (error) => {
    console.error('Firestore stock_imports sync error:', error);
    if (onError) onError(error);
  });
}

export async function saveStockImportToFirestore(receipt: StockImportReceipt): Promise<void> {
  const docRef = doc(db, COLLECTIONS.STOCK_IMPORTS, receipt.id);
  await setDoc(docRef, receipt);
}

export async function deleteStockImportFromFirestore(receiptId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.STOCK_IMPORTS, receiptId);
  await deleteDoc(docRef);
}

export async function syncAllStockImportsToFirestore(imports: StockImportReceipt[]): Promise<void> {
  saveStoredStockImports(imports);
  const batch = writeBatch(db);
  imports.forEach(imp => {
    const ref = doc(db, COLLECTIONS.STOCK_IMPORTS, imp.id);
    batch.set(ref, imp);
  });
  await batch.commit();
}

// =================================================================
// INITIAL DATA SEED / MIGRATION (Chuyển toàn bộ dữ liệu hiện tại lên Cloud)
// =================================================================
export async function pushCurrentLocalDataToFirestore(): Promise<{
  productsCount: number;
  customersCount: number;
  ordersCount: number;
  materialsCount: number;
  stockImportsCount: number;
}> {
  const workshop = getStoredWorkshopInfo() || DEFAULT_WORKSHOP_INFO;
  const products = getStoredProducts().length > 0 ? getStoredProducts() : DEFAULT_PRODUCTS;
  const customers = getStoredCustomers().length > 0 ? getStoredCustomers() : DEFAULT_CUSTOMERS;
  const orders = getStoredOrders().length > 0 ? getStoredOrders() : DEFAULT_ORDERS;
  const materials = getStoredMaterials().length > 0 ? getStoredMaterials() : DEFAULT_MATERIALS;
  const stockImports = getStoredStockImports().length > 0 ? getStoredStockImports() : DEFAULT_STOCK_IMPORTS;

  await saveWorkshopInfoToFirestore(workshop);
  await syncAllProductsToFirestore(products);
  await syncAllCustomersToFirestore(customers);
  await syncAllOrdersToFirestore(orders);
  await syncAllMaterialsToFirestore(materials);
  await syncAllStockImportsToFirestore(stockImports);

  return {
    productsCount: products.length,
    customersCount: customers.length,
    ordersCount: orders.length,
    materialsCount: materials.length,
    stockImportsCount: stockImports.length
  };
}

// Kiểm tra xem Firestore đã có dữ liệu chưa, nếu hoàn toàn rỗng thì tự động seed
export async function initializeFirestoreIfEmpty(): Promise<boolean> {
  try {
    const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    if (productsSnap.empty) {
      console.log('Firestore is empty, seeding initial data to cloud...');
      await pushCurrentLocalDataToFirestore();
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error checking Firestore initial state:', e);
    return false;
  }
}
