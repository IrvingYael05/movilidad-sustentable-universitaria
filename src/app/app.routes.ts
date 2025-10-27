import { Routes } from '@angular/router';
import { MiPerfilComponent } from './pages/mi-perfil/mi-perfil.component';
import { MiVehiculoComponent } from './pages/mi-vehiculo/mi-vehiculo.component';
import { NuevoViajeComponent } from './pages/nuevo-viaje/nuevo-viaje.component';

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
  },

  {
    path: 'mi-perfil',
    component: MiPerfilComponent
  },
  
  {
    path: 'mi-vehiculo',
    component: MiVehiculoComponent
  },

  {
    path: 'nuevo-viaje',
    component: NuevoViajeComponent
  }

];