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
import { NzRadioModule } from 'ng-zorro-antd/radio';
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
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, NzGridModule, NzCardModule, NzAutocompleteModule,
    NzInputModule, NzSelectModule, NzTableModule, NzButtonModule, NzFormModule,
    NzInputNumberModule, NzIconModule, FormsModule, NzTagModule
  ],
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.css']
})
export class PosComponent implements OnInit, OnDestroy {
  paymentForm!: FormGroup;
  searchValue = '';
  searchOptions: string[] = [];
  
  customers: Customer[] = [];
  products: ProductItem[] = [];
  
  orderItems: OrderItem[] = [];
  
  orderType: 'XUAT' = 'XUAT';
  
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

    // Set Khách lẻ as default to save time
    setTimeout(() => {
      const khLe = this.customers.find(c => c.id === 'KH-LE');
      this.paymentForm.get('customerId')?.setValue(khLe ? khLe.name : 'Khách lẻ / Vãng lai');
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
  
  onOptionSelected(id: string): void {
    if (id) {
      this.addProduct(id);
      // Giúp ô search trống lại để tìm tiếp
      setTimeout(() => {
        this.searchValue = '';
      });
    }
  }

  addProduct(val?: string): void {
    const searchVal = val || this.searchValue;
    if (!searchVal) return;
    
    // searchVal is exactly the product ID when coming from nz-select
    const product = this.products.find(p => p.id === searchVal);
    
    if (!product) {
      this.message.error('Mã hàng hoặc tên sản phẩm không hợp lệ!');
      return;
    }

    const availableBatch = product.batches.find(b => b.quantity > 0);
    if (!availableBatch) {
      this.message.warning(`Sản phẩm ${product.name} đã hết hàng trong kho!`);
      return;
    }
    
    const existingItem = this.orderItems.find(i => i.productId === product.id && i.batchNo === availableBatch.batchNo);
    if (existingItem) {
      if (existingItem.quantity < (existingItem.maxQuantity || 9999)) {
        existingItem.quantity++;
        this.message.success('Đã tăng số lượng!');
      } else {
        this.message.warning('Vượt quá tồn kho của lô hiện tại!');
      }
    } else {
      this.orderItems = [...this.orderItems, {
        productId: product.id,
        name: product.name,
        batchNo: availableBatch.batchNo,
        quantity: 1,
        maxQuantity: availableBatch.quantity,
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
    if (item.maxQuantity && item.quantity > item.maxQuantity) {
      this.message.warning(`Số lượng xuất không được vượt quá tồn kho (${item.maxQuantity})!`);
      item.quantity = item.maxQuantity;
    }
    this.calculateTotal();
  }

  calculateTotal(): void {
    const totalAmount = this.orderItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
    const oldDebt = this.paymentForm.get('oldDebt')?.value || 0;
    const paymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;
    
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

    // If new customer, we might want to add them to DataService so debt tracks correctly
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
      // 1. Tạo phiếu xuất bán hàng (PX) thanh toán đủ tiền hàng
      const pxOrder: Order = {
        id: 'PX-' + new Date().getTime().toString().slice(-6),
        customerId: orderCustomerId,
        customerName: orderCustomerName,
        date: new Date().toISOString(),
        totalAmount: formVal.totalAmount,
        paymentAmount: formVal.totalAmount,
        newDebt: formVal.oldDebt, // Công nợ cũ giữ nguyên
        items: [...this.orderItems]
      };
      this.dataService.addOrder(pxOrder);

      // 2. Tạo phiếu thu nợ (PT) cho phần trả thêm
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
      this.dataService.addOrder(ptOrder);

      this.message.success(`Đã tự động tách làm 2 hóa đơn: Phiếu bán hàng ${pxOrder.id} và Phiếu thu nợ ${ptOrder.id}!`);
    } else {
      // Hóa đơn đơn lẻ bình thường
      const order: Order = {
        id: 'PX-' + new Date().getTime().toString().slice(-6),
        customerId: orderCustomerId,
        customerName: orderCustomerName,
        date: new Date().toISOString(),
        totalAmount: formVal.totalAmount,
        paymentAmount: formVal.paymentAmount,
        newDebt: formVal.newDebt,
        items: [...this.orderItems]
      };
      this.dataService.addOrder(order);
      this.message.success(`Chốt phiếu xuất ${order.id} thành công!`);
    }
    
    // Reset form
    this.orderItems = [];
    this.paymentForm.patchValue({ customerId: null, paymentAmount: 0 });
  }
}
