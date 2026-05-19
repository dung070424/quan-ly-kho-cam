import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DataService, ProductItem, BatchItem } from '../../services/data.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, NzTableModule, NzTagModule, NzCardModule, NzIconModule, NzButtonModule,
    NzModalModule, NzFormModule, NzInputModule, NzInputNumberModule, NzPopconfirmModule,
    NzSelectModule, NzDividerModule, ReactiveFormsModule
  ],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
  listOfData: (ProductItem & { totalQuantity?: number })[] = [];
  
  // Product Modal
  isModalVisible = false;
  productForm!: FormGroup;
  editingId: string | null = null;

  // Batch Modal
  isBatchModalVisible = false;
  batchForm!: FormGroup;
  currentProductIdForBatch: string | null = null;

  constructor(
    private dataService: DataService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.dataService.products$.subscribe(data => {
      this.listOfData = data.map(p => ({
        ...p,
        totalQuantity: p.batches.reduce((sum, b) => sum + b.quantity, 0)
      }));
    });

    this.productForm = this.fb.group({
      id: [null, [Validators.required]],
      name: [null, [Validators.required]],
      category: ['Cám lợn thịt', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]]
    });

    this.batchForm = this.fb.group({
      batchNo: [null, [Validators.required]],
      mfgDate: [null, [Validators.required]],
      expDate: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  // --- Product Operations ---
  showAddModal(): void {
    this.editingId = null;
    this.productForm.reset({ category: 'Cám lợn thịt', price: 0 });
    this.productForm.patchValue({ id: 'CAM-' + Math.floor(Math.random() * 10000) });
    this.isModalVisible = true;
  }

  showEditModal(product: ProductItem): void {
    this.editingId = product.id;
    this.productForm.patchValue(product);
    this.isModalVisible = true;
  }

  handleModalCancel(): void {
    this.isModalVisible = false;
  }

  handleModalOk(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      if (this.editingId) {
        const p = this.dataService.getProducts().find(x => x.id === this.editingId);
        if (p) {
          this.dataService.updateProduct({ ...p, ...formValue });
          this.message.success('Cập nhật sản phẩm thành công!');
        }
      } else {
        this.dataService.addProduct({ ...formValue, batches: [], expand: false });
        this.message.success('Thêm sản phẩm thành công!');
      }
      this.isModalVisible = false;
    } else {
      Object.values(this.productForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  deleteProduct(id: string): void {
    this.dataService.deleteProduct(id);
    this.message.success('Xóa sản phẩm thành công!');
  }

  // --- Batch Operations ---
  showAddBatchModal(productId: string): void {
    this.currentProductIdForBatch = productId;
    this.batchForm.reset({ quantity: 100 });
    this.batchForm.patchValue({ batchNo: 'B-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 1000) });
    this.isBatchModalVisible = true;
  }

  handleBatchModalCancel(): void {
    this.isBatchModalVisible = false;
  }

  handleBatchModalOk(): void {
    if (this.batchForm.valid && this.currentProductIdForBatch) {
      const formValue = this.batchForm.value;
      
      // Auto calculate status based on expDate
      const expDate = new Date(formValue.expDate);
      const today = new Date();
      const timeDiff = expDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      let status: 'An toàn' | 'Cận Date' | 'Hết hạn' = 'An toàn';
      if (daysDiff < 0) {
        status = 'Hết hạn';
      } else if (daysDiff <= 30) {
        status = 'Cận Date';
      }

      const batchItem: BatchItem = {
        ...formValue,
        status: status
      };

      this.dataService.addBatch(this.currentProductIdForBatch, batchItem);
      this.message.success('Thêm lô hàng thành công!');
      this.isBatchModalVisible = false;
    } else {
      Object.values(this.batchForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  deleteBatch(productId: string, batchNo: string): void {
    this.dataService.deleteBatch(productId, batchNo);
    this.message.success('Xóa lô hàng thành công!');
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'An toàn': return 'success';
      case 'Cận Date': return 'warning';
      case 'Hết hạn': return 'error';
      default: return 'default';
    }
  }
}
