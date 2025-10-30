import { Routes } from '@angular/router';
import { privateGuard, publicGuard } from './shared/guards/auth.guard';
import { MiPerfilComponent } from './pages/mi-perfil/mi-perfil.component';
import { MiVehiculoComponent } from './pages/mi-vehiculo/mi-vehiculo.component';
import { NuevoViajeComponent } from './pages/nuevo-viaje/nuevo-viaje.component';
import { AutoCompartidoComponent } from './pages/auto-compartido/auto-compartido.component';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [publicGuard],
    loadChildren: () =>
      import('./auth/auth-routing.module').then((m) => m.default),
  },
  {
    path: '',
    canActivate: [privateGuard],
    loadChildren: () =>
      import('./pages/pages-routing.module').then((m) => m.default),
  },
  {
    path: 'mi-vehiculo',
    component: MiVehiculoComponent,
  },
  {
    path: 'mi-perfil',
    component: MiPerfilComponent,
  },
  {
    path: 'nuevo-viaje',
    component: NuevoViajeComponent,
  },
  {
    path: 'auto-compartido',
    component: AutoCompartidoComponent,
  },
];
