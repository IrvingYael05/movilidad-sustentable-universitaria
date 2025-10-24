import { Routes } from '@angular/router';

export const routes: Routes = [
  // 1. AÑADE ESTO: Redirige la ruta raíz ('/') a '/auth'
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth'
  },

  // 2. Esta es la ruta que ya tenías
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  }
];