import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG imports
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputMaskModule } from 'primeng/inputmask';

@Component({
  selector: 'app-nuevo-viaje',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    InputMaskModule
  ],
  templateUrl: './nuevo-viaje.component.html',
  styleUrls: ['./nuevo-viaje.component.scss']
})
export class NuevoViajeComponent {
  viaje = {
    calle: '',
    numeroExterior: '',
    codigoPostal: '',
    colonia: '',
    hora: '',
    lugaresDisponibles: null
  };

  pasajeros: number[] = [1]; // Array de pasajeros, inicia con 1

  constructor(private router: Router) {}

  agregarPasajero() {
    this.pasajeros.push(this.pasajeros.length + 1);
  }

  eliminarPasajero(index: number) {
    if (this.pasajeros.length > 1) {
      this.pasajeros.splice(index, 1);
    }
  }

  publicarViaje() {
    // Validación básica
    if (!this.viaje.calle || !this.viaje.colonia || !this.viaje.hora) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    console.log('Viaje a publicar:', this.viaje);
    console.log('Número de pasajeros:', this.pasajeros.length);
    
    // Aquí llamarías a tu servicio para guardar el viaje
    // this.viajeService.publicarViaje(this.viaje, this.pasajeros.length);
    
    alert('Viaje publicado exitosamente!');
    // this.router.navigate(['/mis-viajes']); // Redirigir después de publicar
  }
}