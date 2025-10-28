import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Para manejar inputs si los necesitas
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

// Definición de la interfaz Viaje
interface Viaje {
  name: string;
  street: string;
  time: string;
  spots: string;
}

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,      // Si quieres usar [(ngModel)] para búsqueda u otros inputs
    InputTextModule,
    ButtonModule
  ],
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.scss']
})
export class ViajesComponent {
  viajes: Viaje[] = [
    { name: 'Nombre cualquiera', street: 'Calle cualquiera en cualquier lugar', time: 'Hora cualquiera de cualquier día', spots: 'Lugares disponibles' },
    { name: 'Nombre cualquiera', street: 'Calle cualquiera en cualquier lugar', time: 'Hora cualquiera de cualquier día', spots: 'Lugares disponibles' },
    { name: 'Nombre cualquiera', street: 'Calle cualquiera en cualquier lugar', time: 'Hora cualquiera de cualquier día', spots: 'Lugares disponibles' }
  ];

  searchTerm: string = ''; // Para usar en búsqueda si quieres

  onSearch() {
    console.log('Buscar viaje con término:', this.searchTerm);
  }

  onJoin(viaje: Viaje) {
    console.log('Solicitar unirme al viaje:', viaje);
  }
}
