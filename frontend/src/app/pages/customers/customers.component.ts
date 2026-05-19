import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Customer, Order } from '../../services/data.service';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { map } from 'rxjs';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, NzTableModule, NzButtonModule, NzIconModule, 
    NzModalModule, NzFormModule, NzInputModule, NzInputNumberModule, NzPopconfirmModule, 
    NzDrawerModule, NzCardModule, NzDividerModule,
    NzDescriptionsModule, NzTagModule, NzAvatarModule, NzGridModule, NzStatisticModule
  ],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  
  // Modal
  isModalVisible = false;
  customerForm!: FormGroup;
  editingId: string | null = null;

  // Drawer
  isDrawerVisible = false;
  selectedCustomer: Customer | null = null;
  customerOrders: Order[] = [];

  // Payment
  isPaymentModalVisible = false;
  paymentAmount: number = 0;

  constructor(
    private dataService: DataService, 
    private fb: FormBuilder,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.dataService.customers$.subscribe(data => this.customers = data);
    
    this.customerForm = this.fb.group({
      id: [null, [Validators.required]],
      name: [null, [Validators.required]],
      phone: [null, [Validators.required]],
      address: [null, [Validators.required]],
      oldDebt: [0, [Validators.required, Validators.min(0)]]
    });
  }

  showAddModal(): void {
    this.editingId = null;
    this.customerForm.reset({ oldDebt: 0 });
    // Auto generate ID for new customer
    this.customerForm.patchValue({ id: 'KH-' + Math.floor(Math.random() * 10000) });
    this.isModalVisible = true;
  }

  showEditModal(customer: Customer): void {
    this.editingId = customer.id;
    this.customerForm.patchValue(customer);
    this.isModalVisible = true;
  }

  handleModalCancel(): void {
    this.isModalVisible = false;
  }

  handleModalOk(): void {
    if (this.customerForm.valid) {
      const formValue = this.customerForm.value;
      if (this.editingId) {
        this.dataService.updateCustomer(formValue);
        this.message.success('Cập nhật khách hàng thành công!');
      } else {
        this.dataService.addCustomer(formValue);
        this.message.success('Thêm khách hàng thành công!');
      }
      this.isModalVisible = false;
    } else {
      Object.values(this.customerForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  deleteCustomer(id: string): void {
    this.dataService.deleteCustomer(id);
    this.message.success('Xóa khách hàng thành công!');
  }

  viewDetails(customer: Customer): void {
    this.selectedCustomer = customer;
    this.dataService.orders$.pipe(
      map(orders => orders.filter(o => o.customerId === customer.id))
    ).subscribe(orders => this.customerOrders = orders);
    this.isDrawerVisible = true;
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
    this.selectedCustomer = null;
  }

  showPaymentModal(): void {
    if (this.selectedCustomer) {
      this.paymentAmount = this.selectedCustomer.oldDebt;
      this.isPaymentModalVisible = true;
    }
  }

  handlePaymentCancel(): void {
    this.isPaymentModalVisible = false;
  }

  handlePaymentOk(): void {
    if (this.selectedCustomer && this.paymentAmount > 0 && this.paymentAmount <= this.selectedCustomer.oldDebt) {
      const newDebt = this.selectedCustomer.oldDebt - this.paymentAmount;
      
      const paymentOrder: Order = {
        id: 'PT-' + Math.floor(Math.random() * 1000000),
        customerId: this.selectedCustomer.id,
        customerName: this.selectedCustomer.name,
        date: new Date().toISOString(),
        totalAmount: 0,
        paymentAmount: this.paymentAmount,
        newDebt: newDebt,
        items: []
      };

      this.dataService.addOrder(paymentOrder);
      this.selectedCustomer.oldDebt = newDebt; // Update UI immediately
      
      this.message.success('Thanh toán và lưu lịch sử thành công!');
      this.isPaymentModalVisible = false;
      this.paymentAmount = 0;
    } else {
      this.message.error('Số tiền thanh toán không hợp lệ!');
    }
  }
}
