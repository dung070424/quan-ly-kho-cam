import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'inventory', loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent) },
  { path: 'pos', loadComponent: () => import('./pages/pos/pos.component').then(m => m.PosComponent) },
  { path: 'import', loadComponent: () => import('./pages/import/import.component').then(m => m.ImportComponent) },
  { path: 'invoices', loadComponent: () => import('./pages/invoices/invoices.component').then(m => m.InvoicesComponent) },
  { path: 'customers', loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent) },
  { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent) },
];
