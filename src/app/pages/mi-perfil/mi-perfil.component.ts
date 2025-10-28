import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// --- PrimeNG ---
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    PasswordModule
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent {
  perfil = {
    nombre: 'Raymundo',
    apellidoPaterno: 'Rodríguez',
    apellidoMaterno: 'López',
    correo: 'raymundo@example.com',
    passwordActual: '',
    passwordNueva: ''
  };

  actualizarPerfil() {
    console.log('Datos actualizados:', this.perfil);
    // Aquí puedes conectar con tu API o servicio
  }
}
