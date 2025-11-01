import { Routes } from '@angular/router';
import { privateGuard, publicGuard } from './shared/guards/auth.guard';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [publicGuard], 
    
    loadChildren: () => import('./auth/auth-routing.module').then(m => m.default)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [privateGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./pages/pages-routing.module').then(m => m.default)
      },
    ]
  },
];