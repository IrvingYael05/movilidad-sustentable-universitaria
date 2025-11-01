import { Routes } from '@angular/router';
import { ViajesComponent } from './viajes/viajes.component';
import { NuevoViajeComponent } from './nuevo-viaje/nuevo-viaje.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { MiVehiculoComponent } from './mi-vehiculo/mi-vehiculo.component';


export default [
  {
    path: '',
    component: ViajesComponent
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
  },
  {
    path: '**',
    redirectTo: '',
  }
] as Routes;