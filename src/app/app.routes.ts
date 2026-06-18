import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./private/dashboard/dashboard').then((m) => m.Dashboard),
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () => import('./public/w-home/w-home').then((m) => m.WHome),
    pathMatch: 'full',
  },
];
