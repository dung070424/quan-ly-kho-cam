import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { DataService, Order } from '../../services/data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzTableModule, NzCardModule, NzInputModule,
    NzSelectModule, NzButtonModule, NzIconModule, NzTagModule, NzModalModule,
    NzPopconfirmModule, NzDescriptionsModule, NzDividerModule
  ],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.css']
})
export class InvoicesComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  
  searchText = '';
  selectedType: 'ALL' | 'PX' | 'PN' | 'PT' = 'ALL';
  
  isDetailsVisible = false;
  selectedOrder: Order | null = null;

  private sub = new Subscription();

  constructor(
    private dataService: DataService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.sub.add(this.dataService.orders$.subscribe(data => {
      this.orders = data;
      this.applyFilters();
    }));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  applyFilters(): void {
    this.filteredOrders = this.orders.filter(o => {
      const matchesSearch = o.id.toLowerCase().includes(this.searchText.toLowerCase()) ||
                            o.customerName.toLowerCase().includes(this.searchText.toLowerCase());
      
      let matchesType = true;
      if (this.selectedType !== 'ALL') {
        matchesType = o.id.startsWith(this.selectedType + '-');
      }
      
      return matchesSearch && matchesType;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onTypeChange(): void {
    this.applyFilters();
  }

  getInvoiceTypeName(id: string): string {
    if (id.startsWith('PX-')) return 'Phiếu Xuất (Bán lẻ)';
    if (id.startsWith('PN-')) return 'Phiếu Nhập (Kho)';
    if (id.startsWith('PT-')) return 'Phiếu Thu (Nợ)';
    return 'Khác';
  }

  getInvoiceTypeColor(id: string): string {
    if (id.startsWith('PX-')) return 'orange';
    if (id.startsWith('PN-')) return 'green';
    if (id.startsWith('PT-')) return 'blue';
    return 'default';
  }

  viewDetails(order: Order): void {
    this.selectedOrder = order;
    this.isDetailsVisible = true;
  }

  closeDetails(): void {
    this.isDetailsVisible = false;
    this.selectedOrder = null;
  }

  deleteInvoice(id: string): void {
    this.dataService.deleteOrder(id);
    this.message.success('Xóa hóa đơn thành công! Khôi phục công nợ và tồn kho tương ứng.');
  }
}
