import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup'; 


@Component({
  selector: 'app-mi-vehiculo',
    imports: [
    FormsModule,
    InputTextModule,
    ButtonModule,
    InputGroupModule
  ],
  templateUrl: './mi-vehiculo.component.html',
  styleUrl: './mi-vehiculo.component.scss'
})
export class MiVehiculoComponent {
  vehiculo = {
    marca: '',
    modelo: '',
    color: '',
    placa: ''
  };

  registrarVehiculo() {
    console.log('Vehículo registrado:', this.vehiculo);
    // Aquí puedes conectar con tu backend para guardar los datos
  }
}