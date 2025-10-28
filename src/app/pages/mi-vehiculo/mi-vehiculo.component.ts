import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// --- PrimeNG ---
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-mi-vehiculo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule
  ],
  templateUrl: './mi-vehiculo.component.html',
  styleUrls: ['./mi-vehiculo.component.scss']
})
export class MiVehiculoComponent {
  vehiculo = {
    marca: 'Nissan',
    modelo: 'Versa 2020',
    color: 'Gris',
    placa: 'XYZ-1234'
  };

  registrarVehiculo() {
    console.log('Vehículo registrado:', this.vehiculo);
    // Aquí puedes conectar con tu backend para guardar los datos
  }
}
