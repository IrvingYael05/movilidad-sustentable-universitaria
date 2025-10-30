import { Routes } from '@angular/router';
import { privateGuard, publicGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [publicGuard], 
    
    loadChildren: () => import('./auth/auth-routing.module').then(m => m.default)
  },
  {
    path: '',
    canActivate: [privateGuard],
    loadChildren: () => import('./pages/pages-routing.module').then(m => m.default)
  },
];