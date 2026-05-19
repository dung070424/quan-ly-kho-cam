import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  oldDebt: number;
}

export interface BatchItem {
  batchNo: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  status: 'An toàn' | 'Cận Date' | 'Hết hạn';
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  expand?: boolean;
  batches: BatchItem[];
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  totalAmount: number;
  paymentAmount: number;
  newDebt: number;
  items: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private customersData: Customer[] = [
    { id: 'KH-LE', name: 'Khách lẻ / Vãng lai', phone: '', address: '', oldDebt: 0 },
    { id: 'DL-01', name: 'Đại lý A - Hà Nội', phone: '0901234567', address: 'Hoài Đức, Hà Nội', oldDebt: 5000000 },
    { id: 'DL-02', name: 'Đại lý B - Hưng Yên', phone: '0912345678', address: 'Văn Lâm, Hưng Yên', oldDebt: 0 },
    { id: 'TT-01', name: 'Trang trại C - Bắc Ninh', phone: '0987654321', address: 'Từ Sơn, Bắc Ninh', oldDebt: 12000000 }
  ];

  private productsData: ProductItem[] = [
    {
      id: 'CAM-01', name: 'Cám Lợn Siêu Nạc 25kg', category: 'Cám lợn thịt', price: 350000, expand: false,
      batches: [
        { batchNo: 'B-2023-01', mfgDate: '2025-05-01', expDate: '2025-11-01', quantity: 100, status: 'An toàn' },
        { batchNo: 'B-2023-02', mfgDate: '2025-01-15', expDate: '2025-07-15', quantity: 50, status: 'Cận Date' },
      ]
    },
    {
      id: 'CAM-02', name: 'Cám Lợn Con 15kg', category: 'Cám lợn con', price: 280000, expand: false,
      batches: [
        { batchNo: 'B-2023-03', mfgDate: '2024-12-01', expDate: '2025-04-01', quantity: 200, status: 'Hết hạn' }
      ]
    },
    {
      id: 'CAM-03', name: 'Cám Lợn Nái Mang Thai 25kg', category: 'Cám lợn nái', price: 320000, expand: false,
      batches: [
        { batchNo: 'B-2023-04', mfgDate: '2025-06-01', expDate: '2025-12-01', quantity: 300, status: 'An toàn' }
      ]
    }
  ];

  private ordersData: Order[] = [];

  customers$ = new BehaviorSubject<Customer[]>(this.customersData);
  products$ = new BehaviorSubject<ProductItem[]>(this.productsData);
  orders$ = new BehaviorSubject<Order[]>(this.ordersData);

  // --- Customers CRUD ---
  getCustomers() { return this.customers$.getValue(); }
  
  addCustomer(c: Customer) {
    const list = [...this.getCustomers(), c];
    this.customers$.next(list);
  }

  updateCustomer(c: Customer) {
    const list = this.getCustomers().map(item => item.id === c.id ? c : item);
    this.customers$.next(list);
  }

  deleteCustomer(id: string) {
    const list = this.getCustomers().filter(item => item.id !== id);
    this.customers$.next(list);
  }

  // --- Products CRUD ---
  getProducts() { return this.products$.getValue(); }

  addProduct(p: ProductItem) {
    const list = [...this.getProducts(), p];
    this.products$.next(list);
  }

  updateProduct(p: ProductItem) {
    const list = this.getProducts().map(item => item.id === p.id ? p : item);
    this.products$.next(list);
  }

  deleteProduct(id: string) {
    const list = this.getProducts().filter(item => item.id !== id);
    this.products$.next(list);
  }

  // --- Batches CRUD ---
  addBatch(productId: string, batch: BatchItem) {
    const list = this.getProducts().map(p => {
      if (p.id === productId) {
        return { ...p, batches: [...p.batches, batch] };
      }
      return p;
    });
    this.products$.next(list);
  }

  deleteBatch(productId: string, batchNo: string) {
    const list = this.getProducts().map(p => {
      if (p.id === productId) {
        return { ...p, batches: p.batches.filter(b => b.batchNo !== batchNo) };
      }
      return p;
    });
    this.products$.next(list);
  }

  // --- Orders & Logic ---
  addOrder(order: Order) {
    // 1. Add order
    const list = [...this.orders$.getValue(), order];
    this.orders$.next(list);

    // 2. Update customer debt
    const customers = this.getCustomers();
    const cIndex = customers.findIndex(c => c.id === order.customerId);
    if (cIndex > -1) {
      customers[cIndex].oldDebt = order.newDebt;
      this.customers$.next([...customers]);
    }

    // 3. Deduct product quantity from batches
    const products = this.getProducts();
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const batch = product.batches.find(b => b.batchNo === item.batchNo);
        if (batch) {
          batch.quantity -= item.quantity;
        }
      }
    });
    this.products$.next([...products]);
  }

  deleteOrder(orderId: string) {
    const orders = this.orders$.getValue();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // 1. Revert customer debt
    const customers = this.getCustomers();
    const customer = customers.find(c => c.id === order.customerId);
    if (customer) {
      if (orderId.startsWith('PX-') || orderId.startsWith('PN-')) {
        customer.oldDebt -= (order.totalAmount - order.paymentAmount);
      } else if (orderId.startsWith('PT-')) {
        customer.oldDebt += order.paymentAmount;
      }
      this.customers$.next([...customers]);
    }

    // 2. Restore product quantities in batches
    if (orderId.startsWith('PX-')) {
      const products = this.getProducts();
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const batch = product.batches.find(b => b.batchNo === item.batchNo);
          if (batch) {
            batch.quantity += item.quantity;
          }
        }
      });
      this.products$.next([...products]);
    } else if (orderId.startsWith('PN-')) {
      // Remove imported batches
      const products = this.getProducts();
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          product.batches = product.batches.filter(b => b.batchNo !== item.batchNo);
        }
      });
      this.products$.next([...products]);
    }

    // 3. Remove order
    this.orders$.next(orders.filter(o => o.id !== orderId));
  }
}
