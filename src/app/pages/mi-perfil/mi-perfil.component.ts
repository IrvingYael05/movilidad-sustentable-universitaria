import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PerfilService } from './services/mi-perfil.service';

// --- PrimeNG ---
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {
  perfil = {
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    correo: '',
    passwordActual: '',
    passwordNueva: ''
  };

  cargando = false;

  constructor(private perfilService: PerfilService, private msg: MessageService) {}

  async ngOnInit() {
    try {
      const data = await this.perfilService.obtenerPerfil();

      // Divide el apellido si viene junto
      const [paterno = '', materno = ''] = (data.apellido || '').split(' ');

      this.perfil = {
        nombre: data.nombre,
        apellidoPaterno: paterno,
        apellidoMaterno: materno,
        correo: data.email,
        passwordActual: '',
        passwordNueva: '',
      };
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu perfil' });
    }
  }

  async actualizarPerfil() {
    try {
      this.cargando = true;

      const perfilActualizado = {
        nombre: this.perfil.nombre,
        apellido: `${this.perfil.apellidoPaterno} ${this.perfil.apellidoMaterno}`.trim(),
        email: this.perfil.correo,
      };

      await this.perfilService.actualizarPerfil(perfilActualizado);

      if (this.perfil.passwordNueva) {
        await this.perfilService.cambiarPassword(this.perfil.passwordActual, this.perfil.passwordNueva);
      }

      this.msg.add({ severity: 'success', summary: 'Éxito', detail: 'Perfil actualizado correctamente' });
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      this.msg.add({ severity: 'error', summary: 'Error', detail: error.message || 'No se pudo actualizar el perfil' });
    } finally {
      this.cargando = false;
    }
  }
}
