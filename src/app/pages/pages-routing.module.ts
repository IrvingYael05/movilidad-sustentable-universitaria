import { Routes } from '@angular/router';
import { ViajesComponent } from './viajes/viajes.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { MiVehiculoComponent } from './mi-vehiculo/mi-vehiculo.component';
import { ListaViajesComponent } from './nuevo-viaje/lista-viajes/lista-viajes.component';
import { roleGuard } from '../shared/guards/role.guard';
import { MetricasComponent } from './metricas/metricas.component';
import { MapaEstacionamientoComponent } from '../shared/components/mapa-estacionamiento/mapa-estacionamiento.component';

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
    path: 'mapa',
    component: MapaEstacionamientoComponent,
    canActivate: [roleGuard],
    data: { roles: ['usuario', 'conductor', 'guardia'] },
  },
  {
    path: 'metricas',
    component: MetricasComponent,
    canActivate: [roleGuard],
    data: { roles: ['administrador'] },
  },
  {
    path: '**',
    redirectTo: '',
  },
] as Routes;
