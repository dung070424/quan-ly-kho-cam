import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DataService, Order } from '../../services/data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzTableModule, NzStatisticModule, NzGridModule, NzIconModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  orders: Order[] = [];
  totalRevenue = 0;
  totalOrders = 0;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.orders$.subscribe(data => {
      this.orders = data;
      this.totalOrders = data.length;
      this.totalRevenue = data.reduce((sum, o) => sum + o.totalAmount, 0);
    });
  }
}
