import { Routes } from '@angular/router';
import { ViajesComponent } from './viajes/viajes.component';
import NuevoViajeComponent from './nuevo-viaje/nuevo-viaje.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { MiVehiculoComponent } from './mi-vehiculo/mi-vehiculo.component';
import { ListaViajesComponent } from './nuevo-viaje/lista-viajes/lista-viajes.component';



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
  path: 'lista-viajes',
  component: ListaViajesComponent
  },
  {
    path: '**',
    redirectTo: '',
  }
] as Routes;