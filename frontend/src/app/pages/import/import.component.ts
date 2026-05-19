import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { DataService, Customer, ProductItem, Order, BatchItem } from '../../services/data.service';
import { Subscription } from 'rxjs';

interface OrderItem {
  productId: string;
  name: string;
  batchNo: string;
  quantity: number;
  maxQuantity?: number;
  price: number;
}

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, NzGridModule, NzCardModule, NzAutocompleteModule,
    NzInputModule, NzSelectModule, NzTableModule, NzButtonModule, NzFormModule,
    NzInputNumberModule, NzIconModule, FormsModule, NzTagModule
  ],
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.css']
})
export class ImportComponent implements OnInit, OnDestroy {
  paymentForm!: FormGroup;
  searchValue = '';
  
  customers: Customer[] = [];
  products: ProductItem[] = [];
  
  orderItems: OrderItem[] = [];
  
  orderType: 'NHAP' = 'NHAP';
  
  formatterVND = (value: number | string): string => {
    if (value === null || value === undefined) return '';
    return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₫';
  };
  parserVND = (value: string): string => {
    return value.replace(/\₫\s?|(,*)/g, '');
  };

  private sub = new Subscription();

  constructor(
    private fb: FormBuilder, 
    private message: NzMessageService,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    this.sub.add(this.dataService.customers$.subscribe(data => this.customers = data));
    this.sub.add(this.dataService.products$.subscribe(data => this.products = data));

    this.paymentForm = this.fb.group({
      customerId: [null, [Validators.required]],
      oldDebt: [{ value: 0, disabled: true }],
      totalAmount: [{ value: 0, disabled: true }],
      paymentAmount: [0, [Validators.required, Validators.min(0)]],
      newDebt: [{ value: 0, disabled: true }]
    });

    this.paymentForm.get('customerId')?.valueChanges.subscribe(val => {
      const customer = this.customers.find(c => c.id === val || c.name === val);
      if (customer) {
        this.paymentForm.patchValue({ oldDebt: customer.oldDebt });
        this.calculateTotal();
      } else {
        this.paymentForm.patchValue({ oldDebt: 0 });
        this.calculateTotal();
      }
    });

    this.paymentForm.get('paymentAmount')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onOptionSelected(id: string): void {
    if (id) {
      this.addProduct(id);
      setTimeout(() => {
        this.searchValue = '';
      });
    }
  }

  addProduct(val?: string): void {
    const searchVal = val || this.searchValue;
    if (!searchVal) return;
    
    const product = this.products.find(p => p.id === searchVal);
    
    if (!product) {
      this.message.error('Mã hàng hoặc tên sản phẩm không hợp lệ!');
      return;
    }

    const existingItem = this.orderItems.find(i => i.productId === product.id);
    if (existingItem) {
      existingItem.quantity++;
      this.message.success('Đã tăng số lượng!');
    } else {
      this.orderItems = [...this.orderItems, {
        productId: product.id,
        name: product.name,
        batchNo: 'B-NEW-' + new Date().getTime().toString().slice(-4),
        quantity: 1,
        price: product.price
      }];
    }
    
    this.searchValue = '';
    this.calculateTotal();
  }

  removeProduct(index: number): void {
    this.orderItems = this.orderItems.filter((_, i) => i !== index);
    this.calculateTotal();
  }

  quantityChange(item: OrderItem): void {
    this.calculateTotal();
  }

  calculateTotal(): void {
    const totalAmount = this.orderItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
    const oldDebt = this.paymentForm.get('oldDebt')?.value || 0;
    const paymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;
    
    // Nhập hàng: Tiền hàng làm tăng công nợ, tiền trả làm giảm công nợ
    const newDebt = oldDebt + totalAmount - paymentAmount;

    this.paymentForm.patchValue({ totalAmount, newDebt }, { emitEvent: false });
  }

  submitOrder(): void {
    if (this.paymentForm.invalid || this.orderItems.length === 0) {
      Object.values(this.paymentForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const formVal = this.paymentForm.getRawValue();
    const customerValue = formVal.customerId;
    const customer = this.customers.find(c => c.name === customerValue || c.id === customerValue);
    
    const orderCustomerName = customer ? customer.name : customerValue;
    const orderCustomerId = customer ? customer.id : 'KH-NEW-' + Math.floor(Math.random() * 10000);

    if (!customer && orderCustomerName) {
      this.dataService.addCustomer({
        id: orderCustomerId,
        name: orderCustomerName,
        phone: '',
        address: '',
        oldDebt: 0
      });
    }

    const extraPayment = formVal.paymentAmount - formVal.totalAmount;

    if (extraPayment > 0) {
      // 1. Tạo phiếu nhập hàng (PN) thanh toán đủ tiền hàng
      const pnOrder: Order = {
        id: 'PN-' + new Date().getTime().toString().slice(-6),
        customerId: orderCustomerId,
        customerName: orderCustomerName,
        date: new Date().toISOString(),
        totalAmount: formVal.totalAmount,
        paymentAmount: formVal.totalAmount,
        newDebt: formVal.oldDebt, // Công nợ cũ giữ nguyên
        items: [...this.orderItems]
      };

      // Lưu phiếu nhập
      const list = [...this.dataService.orders$.getValue(), pnOrder];
      
      // Thêm lô hàng
      const products = this.dataService.getProducts();
      pnOrder.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newBatch: BatchItem = {
            batchNo: item.batchNo,
            mfgDate: new Date().toISOString().split('T')[0],
            expDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
            quantity: item.quantity,
            status: 'An toàn'
          };
          product.batches.push(newBatch);
        }
      });
      this.dataService.products$.next([...products]);

      // 2. Tạo phiếu chi trả nợ (PT) cho NCC
      const ptOrder: Order = {
        id: 'PT-' + (new Date().getTime() + 1).toString().slice(-6),
        customerId: orderCustomerId,
        customerName: orderCustomerName,
        date: new Date().toISOString(),
        totalAmount: 0,
        paymentAmount: extraPayment,
        newDebt: formVal.oldDebt - extraPayment, // Giảm công nợ cũ
        items: []
      };

      const finalOrders = [...list, ptOrder];
      this.dataService.orders$.next(finalOrders);

      // Cập nhật công nợ cuối cùng về cho NCC
      const customers = this.dataService.getCustomers();
      const cIndex = customers.findIndex(c => c.id === orderCustomerId);
      if (cIndex > -1) {
        customers[cIndex].oldDebt = formVal.oldDebt - extraPayment;
        this.dataService.customers$.next([...customers]);
      }

      this.message.success(`Đã tự động tách làm 2 hóa đơn: Phiếu nhập hàng ${pnOrder.id} và Phiếu chi trả nợ ${ptOrder.id}!`);
    } else {
      // Hóa đơn đơn lẻ bình thường
      const order: Order = {
        id: 'PN-' + new Date().getTime().toString().slice(-6),
        customerId: orderCustomerId,
        customerName: orderCustomerName,
        date: new Date().toISOString(),
        totalAmount: formVal.totalAmount,
        paymentAmount: formVal.paymentAmount,
        newDebt: formVal.newDebt,
        items: [...this.orderItems]
      };

      const list = [...this.dataService.orders$.getValue(), order];
      this.dataService.orders$.next(list);

      const customers = this.dataService.getCustomers();
      const cIndex = customers.findIndex(c => c.id === order.customerId);
      if (cIndex > -1) {
        customers[cIndex].oldDebt = order.newDebt;
        this.dataService.customers$.next([...customers]);
      }

      const products = this.dataService.getProducts();
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newBatch: BatchItem = {
            batchNo: item.batchNo,
            mfgDate: new Date().toISOString().split('T')[0],
            expDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
            quantity: item.quantity,
            status: 'An toàn'
          };
          product.batches.push(newBatch);
        }
      });
      this.dataService.products$.next([...products]);

      this.message.success(`Chốt phiếu nhập ${order.id} thành công!`);
    }
    
    this.orderItems = [];
    this.paymentForm.patchValue({ customerId: null, paymentAmount: 0 });
  }
}
