import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzGridModule,
    NzStatisticModule,
    NzTableModule,
    NzIconModule,
    NzTagModule,
    NzProgressModule,
    NzDividerModule,
    NzSelectModule,
    FormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  totalDebt = 0;
  totalInventoryValue = 0;
  nearExpiryCount = 0;
  outOfStockCount = 0;
  
  topProducts: any[] = [];
  categoryStats: any[] = [];
  weeklySales: any[] = [];
  customerDebts: any[] = [];
  monthlySalesData: any[] = [];
  yearlySalesData: any[] = [];
  
  selectedYear = '2026';
  availableYears = ['2026', '2025', '2024'];

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // Calculate total debt from customers
    this.dataService.customers$.subscribe(customers => {
      this.totalDebt = customers.reduce((sum, c) => sum + c.oldDebt, 0);
      
      // Top 5 highest debts
      this.customerDebts = [...customers]
        .filter(c => c.oldDebt > 0)
        .sort((a, b) => b.oldDebt - a.oldDebt)
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          debt: c.oldDebt,
          percent: this.totalDebt > 0 ? Math.round((c.oldDebt / this.totalDebt) * 100) : 0
        }));
    });

    // Mock weekly sales & reports
    this.generateWeeklySales();
    this.generateReportData();

    // Calculate inventory value & expiry
    this.dataService.products$.subscribe(products => {
      let invVal = 0;
      let expCount = 0;
      let oosCount = 0;
      
      const categoryMap = new Map<string, { value: number, quantity: number }>();
      
      this.topProducts = products.map(p => {
        let totalQty = 0;
        p.batches.forEach(b => {
          totalQty += b.quantity;
          if (b.status === 'Cận Date' || b.status === 'Hết hạn') {
            expCount++;
          }
        });
        
        if (totalQty === 0) oosCount++;
        
        invVal += totalQty * p.price;
        
        // Category stats
        const catStat = categoryMap.get(p.category) || { value: 0, quantity: 0 };
        catStat.value += totalQty * p.price;
        catStat.quantity += totalQty;
        categoryMap.set(p.category, catStat);

        return {
          id: p.id,
          name: p.name,
          sales: totalQty, // just mock sales as current quantity for display
          unit: 'Bao',
          totalQty: totalQty
        };
      }).sort((a, b) => b.sales - a.sales);

      this.totalInventoryValue = invVal;
      this.nearExpiryCount = expCount;
      this.outOfStockCount = oosCount;
      
      this.categoryStats = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        quantity: data.quantity,
        percent: invVal > 0 ? Math.round((data.value / invVal) * 100) : 0
      }));
    });
  }

  getCatColor(index: number): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    return colors[index % colors.length];
  }

  generateWeeklySales() {
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const values = [12, 19, 15, 25, 22, 30, 28]; // Mock data in millions
    const maxVal = Math.max(...values);
    
    this.weeklySales = days.map((day, i) => ({
      day,
      value: values[i] * 1000000,
      heightPercent: Math.round((values[i] / maxVal) * 100)
    }));
  }

  generateReportData() {
    this.onYearChange('2026');
    
    const rawYears = [
      { period: '2024', revenue: 1850000000, growth: 0 },
      { period: '2025', revenue: 2400000000, growth: 29 },
      { period: '2026', revenue: 755000000, growth: -68 },
    ];
    const maxYear = Math.max(...rawYears.map(y => y.revenue));
    this.yearlySalesData = rawYears.map(item => ({ 
      ...item, 
      absGrowth: Math.abs(item.growth),
      heightPercent: Math.round((item.revenue / maxYear) * 100)
    }));
  }

  onYearChange(year: string) {
    this.selectedYear = year;
    let rawMonths: any[] = [];
    if (year === '2026') {
      rawMonths = [
        { period: 'Tháng 1', revenue: 150000000, growth: 5 },
        { period: 'Tháng 2', revenue: 120000000, growth: -20 },
        { period: 'Tháng 3', revenue: 180000000, growth: 50 },
        { period: 'Tháng 4', revenue: 210000000, growth: 16 },
        { period: 'Tháng 5', revenue: 95000000, growth: -54 },
      ];
    } else if (year === '2025') {
      rawMonths = [
        { period: 'T1', revenue: 140000000, growth: 10 },
        { period: 'T2', revenue: 145000000, growth: 3 },
        { period: 'T3', revenue: 160000000, growth: 10 },
        { period: 'T4', revenue: 180000000, growth: 12 },
        { period: 'T5', revenue: 175000000, growth: -2 },
        { period: 'T6', revenue: 190000000, growth: 8 },
        { period: 'T7', revenue: 200000000, growth: 5 },
        { period: 'T8', revenue: 210000000, growth: 5 },
        { period: 'T9', revenue: 220000000, growth: 4 },
        { period: 'T10', revenue: 230000000, growth: 4 },
        { period: 'T11', revenue: 250000000, growth: 8 },
        { period: 'T12', revenue: 300000000, growth: 20 },
      ];
    } else {
      rawMonths = [
        { period: 'T1', revenue: 100000000, growth: 0 },
        { period: 'T2', revenue: 110000000, growth: 10 },
        { period: 'T3', revenue: 115000000, growth: 4 },
        { period: 'T4', revenue: 120000000, growth: 4 },
        { period: 'T5', revenue: 130000000, growth: 8 },
        { period: 'T6', revenue: 140000000, growth: 7 },
        { period: 'T7', revenue: 150000000, growth: 7 },
        { period: 'T8', revenue: 155000000, growth: 3 },
        { period: 'T9', revenue: 160000000, growth: 3 },
        { period: 'T10', revenue: 170000000, growth: 6 },
        { period: 'T11', revenue: 180000000, growth: 5 },
        { period: 'T12', revenue: 200000000, growth: 11 },
      ];
    }
    
    const maxMonth = Math.max(...rawMonths.map(m => m.revenue));
    this.monthlySalesData = rawMonths.map(item => ({ 
      ...item, 
      absGrowth: Math.abs(item.growth),
      heightPercent: Math.round((item.revenue / maxMonth) * 100)
    }));
  }
}
