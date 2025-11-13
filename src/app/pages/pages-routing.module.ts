import { Routes } from '@angular/router';
import { ViajesComponent } from './viajes/viajes.component';
import NuevoViajeComponent from './nuevo-viaje/nuevo-viaje.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { MiVehiculoComponent } from './mi-vehiculo/mi-vehiculo.component';
import { ListaViajesComponent } from './nuevo-viaje/lista-viajes/lista-viajes.component';
import { AccesoQrComponent } from './acceso-qr/acceso-qr.component';
import { roleGuard } from '../shared/guards/role.guard';
import { EscanearQrComponent } from './escanear-qr/escanear-qr.component';

// import { MetricasComponent } from './metricas/metricas.component';

export default [
  {
    path: '',
    component: ViajesComponent,
    canActivate: [roleGuard],
    data: { roles: ['usuario', 'conductor'] },
  },
  {
    path: 'mi-perfil',
    component: MiPerfilComponent,
    canActivate: [roleGuard],
    data: { roles: ['usuario', 'conductor'] },
  },
  {
    path: 'mi-vehiculo',
    component: MiVehiculoComponent,
    canActivate: [roleGuard],
    data: { roles: ['usuario', 'conductor'] },
  },
  {
    path: 'lista-viajes', 
    component: ListaViajesComponent,
    canActivate: [roleGuard],
    data: { roles: ['usuario', 'conductor'] },
  },
  {
    path: 'acceso-qr',
    component: AccesoQrComponent,
    canActivate: [roleGuard],
    data: { roles: ['usuario', 'conductor'] },
  },
  {
    path: 'escanear-qr',
    component: EscanearQrComponent,
    canActivate: [roleGuard],
    data: { roles: ['guardia'] },
  },
  // {
  //   path: 'metricas',
  //   component: MetricasComponent,
  //   canActivate: [roleGuard],
  //   data: { roles: ['administrador'] }
  // },
  {
    path: '**',
    redirectTo: '',
  },
] as Routes;
