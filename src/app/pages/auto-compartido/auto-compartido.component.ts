import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-auto-compartido',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './auto-compartido.component.html',
  styleUrls: ['./auto-compartido.component.scss']
})
export class AutoCompartidoComponent {
  viaje = {
    calle: '',
    hora: '',
    lugaresDisponibles: ''
  };

  pasajeros = [1, 2, 3];
  solicitudes = [
    { nombre: 'Nombre cualquiera', correo: 'correo@cualquiera.com' },
    { nombre: 'Otra persona', correo: 'otra@persona.com' },
    { nombre: 'Un tercero', correo: 'tercero@ejemplo.com' }
  ];

  agregarPasajero() {
    this.pasajeros.push(this.pasajeros.length + 1);
  }

  eliminarPasajero(index: number) {
    this.pasajeros.splice(index, 1);
  }

  eliminarViaje() {
    alert('Viaje eliminado (aquí va tu lógica real)');
  }

  aceptarSolicitud(solicitud: any) {
    alert(`Solicitud aceptada de: ${solicitud.nombre}`);
  }
}
