import { Routes } from '@angular/router';
import { MiPerfilComponent } from './pages/mi-perfil/mi-perfil.component';
import { MiVehiculoComponent } from './pages/mi-vehiculo/mi-vehiculo.component';
<<<<<<< HEAD
import { ViajesComponent } from './pages/viajes/viajes.component';
=======
import { NuevoViajeComponent } from './pages/nuevo-viaje/nuevo-viaje.component';
>>>>>>> 69a3d607fb3d62ade3863de3719a5fd88c8c6393

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
<<<<<<< HEAD
    path: 'viajes',
    component: ViajesComponent
=======
    path: 'nuevo-viaje',
    component: NuevoViajeComponent
>>>>>>> 69a3d607fb3d62ade3863de3719a5fd88c8c6393
  }

];