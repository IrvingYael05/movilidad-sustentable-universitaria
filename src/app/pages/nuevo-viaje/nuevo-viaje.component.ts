import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ViajesService } from './services/viajes.service';
import { SupabaseService } from '../../shared/data-access/supabase.service';

interface ViajeForm {
  calle: string;
  numeroExterior: string;
  codigoPostal: string;
  colonia: string;
  hora: string;
  lugaresDisponibles: number;
}

@Component({
  selector: 'app-nuevo-viaje',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    InputMaskModule,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './nuevo-viaje.component.html',
  styleUrls: ['./nuevo-viaje.component.scss'],
})
export default class NuevoViajeComponent implements OnInit {
  viaje: ViajeForm = {
    calle: '',
    numeroExterior: '',
    codigoPostal: '',
    colonia: '',
    hora: '',
    lugaresDisponibles: 1,
  };

  pasajeros: number[] = [1];
  isLoading = false;
  usuarioId: string | null = null;
  vehiculoId: string | null = null;

  constructor(
    private viajesService: ViajesService,
    private supabase: SupabaseService,
    private messageService: MessageService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Obtener usuario autenticado
    const { data: { user } } = await this.supabase.supabaseClient.auth.getUser();
    this.usuarioId = user?.id || null;

    if (this.usuarioId) {
      try {
        // Verificar si el usuario tiene vehículo registrado
        const { data: vehiculo, error } = await this.supabase.supabaseClient
          .from('vehiculos')
          .select('vehiculo_id')
          .eq('propietario_id', this.usuarioId)
          .single();

        if (error || !vehiculo) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Sin vehículo registrado',
            detail: 'Necesitas registrar un vehículo antes de publicar un viaje.',
            life: 3000
          });
          setTimeout(() => {
            this.router.navigate(['/mi-vehiculo']);
          }, 2000);
        } else {
          this.vehiculoId = vehiculo.vehiculo_id;
        }
      } catch (err) {
        console.error('Error al verificar vehículo:', err);
      }
    }
  }

  agregarPasajero() {
    const siguientePasajero = this.pasajeros.length + 1;
    this.pasajeros.push(siguientePasajero);
    this.viaje.lugaresDisponibles = this.pasajeros.length;
  }

  eliminarPasajero(index: number) {
    if (this.pasajeros.length > 1) {
      this.pasajeros.splice(index, 1);
      this.viaje.lugaresDisponibles = this.pasajeros.length;
    }
  }

  private validarFormulario(): boolean {
    if (!this.viaje.calle?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Debes ingresar la calle del punto de partida.',
        life: 3000
      });
      return false;
    }

    if (!this.viaje.numeroExterior?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Debes ingresar el número exterior.',
        life: 3000
      });
      return false;
    }

    if (!this.viaje.codigoPostal?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Debes ingresar el código postal.',
        life: 3000
      });
      return false;
    }

    if (!this.viaje.colonia?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Debes ingresar la colonia.',
        life: 3000
      });
      return false;
    }

    if (!this.viaje.hora?.trim() || this.viaje.hora.includes('_')) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Debes ingresar una hora válida (formato 00:00).',
        life: 3000
      });
      return false;
    }

    // Validar hora (HH:MM)
    const [hours, minutes] = this.viaje.hora.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Hora inválida',
        detail: 'La hora debe estar entre 00:00 y 23:59.',
        life: 3000
      });
      return false;
    }

    if (!this.viaje.lugaresDisponibles || this.viaje.lugaresDisponibles < 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Lugares inválidos',
        detail: 'Debes tener al menos 1 lugar disponible.',
        life: 3000
      });
      return false;
    }

    return true;
  }

  async publicarViaje() {
    if (!this.validarFormulario()) {
      return;
    }

    if (!this.usuarioId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes iniciar sesión para publicar un viaje.',
        life: 3000
      });
      return;
    }

    if (!this.vehiculoId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin vehículo',
        detail: 'Necesitas registrar un vehículo primero.',
        life: 3000
      });
      return;
    }

    this.isLoading = true;

    try {
      // Construir la dirección completa
      const direccionCompleta = `${this.viaje.calle} ${this.viaje.numeroExterior}, ${this.viaje.colonia}, CP ${this.viaje.codigoPostal}`;

      const nuevoViaje = {
        conductor_id: this.usuarioId,
        vehiculo_id: this.vehiculoId,
        lugar_salida: direccionCompleta,
        lugar_llegada: 'UTEQ', // Puedes hacerlo dinámico después
        hora_salida: this.viaje.hora,
        asientos_disponibles: this.viaje.lugaresDisponibles,
        estado_viaje: 'activo',
      };

      const { data, error } = await this.viajesService.crearViaje(nuevoViaje);

      if (error) throw error;

      this.messageService.add({
        severity: 'success',
        summary: '¡Viaje publicado!',
        detail: 'Tu viaje ha sido publicado exitosamente.',
        life: 3000
      });

      // Limpiar formulario
      this.viaje = {
        calle: '',
        numeroExterior: '',
        codigoPostal: '',
        colonia: '',
        hora: '',
        lugaresDisponibles: 1,
      };
      this.pasajeros = [1];

      // ✅ Redirigir correctamente a lista-viajes
      setTimeout(() => {
        this.router.navigate(['/lista-viajes']);
      }, 2000);
    } catch (error) {
      console.error('Error al publicar viaje:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo publicar el viaje. Inténtalo de nuevo.',
        life: 3000
      });
    } finally {
      this.isLoading = false;
    }
  }
}
