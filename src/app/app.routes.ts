import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pub/w-home/w-home').then((m) => m.WHome),
    pathMatch: 'full',
  },
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
    path: 'add-product',
    loadComponent: () =>
      import('./private/pw-add-product/pw-add-product').then((m) => m.PwAddProduct),
    pathMatch: 'full',
  },
  {
    path: 'registration',
    loadComponent: () => import('./pub/w-registration/w-registration').then((m) => m.WRegistration),
    pathMatch: 'full',
  },
  {
    path: 'confirm',
    loadComponent: () => import('./pub/w-confirm/w-confirm').then((m) => m.WConfirm),
    pathMatch: 'full',
  },
];
