import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./public/w-home/w-home').then((m) => m.WHome),
    pathMatch: 'full',
  },
];
