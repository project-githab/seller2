import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./private/pw-dashboard/pw-dashboard').then((m) => m.PwDashboard),
    pathMatch: 'full',
  },
  {
    path: 'inventory',
    loadComponent: () => import('./private/pw-inventory/pw-inventory').then((m) => m.PwInventory),
    pathMatch: 'full',
  },
  {
    path: 'orders',
    loadComponent: () => import('./private/pw-orders/pw-orders').then((m) => m.PwOrders),
    pathMatch: 'full',
  },
  {
    path: 'analytics',
    loadComponent: () => import('./private/pw-analytics/pw-analytics').then((m) => m.PwAnalytics),
    pathMatch: 'full',
  },
  {
    path: 'settings',
    loadComponent: () => import('./private/pw-settings/pw-settings').then((m) => m.PwSettings),
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () => import('./public/w-home/w-home').then((m) => m.WHome),
    pathMatch: 'full',
  },
];
