import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup'; 

@Component({
  selector: 'app-mi-perfil',
  imports: [
    FormsModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    InputGroupModule
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrl: './mi-perfil.component.scss'
})
export class MiPerfilComponent {
  perfil = {
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    correo: '',
    passwordActual: '',
    passwordNueva: ''
  };

  mostrarActual = false;
  mostrarNueva = false;

  actualizarPerfil() {
    console.log('Datos actualizados:', this.perfil);
    // Aquí irá la lógica de actualización (API o servicio)
  }
}