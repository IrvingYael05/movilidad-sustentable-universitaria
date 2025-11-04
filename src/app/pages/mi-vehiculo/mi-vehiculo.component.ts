import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

//PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

//Servicios
import { MiVehiculoService } from './services/mi-vehiculo.service';
import { SupabaseService } from '../../shared/data-access/supabase.service';

@Component({
  selector: 'app-mi-vehiculo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './mi-vehiculo.component.html',
  styleUrls: ['./mi-vehiculo.component.scss']
})
export class MiVehiculoComponent implements OnInit {
  vehiculo: any = {};
  usuarioId: string | null = null;

  constructor(
    private miVehiculoService: MiVehiculoService,
    private supabase: SupabaseService,
    private messageService: MessageService
  ) {}

  async ngOnInit() {
    const { data: { user } } = await this.supabase.supabaseClient.auth.getUser();
    this.usuarioId = user?.id;

    if (this.usuarioId) {
      try {
        const vehiculoData = await this.miVehiculoService.obtenerVehiculo(this.usuarioId);
        this.vehiculo = vehiculoData || {};
      } catch (err: any) {
        this.messageService.add({
          severity: 'info',
          summary: 'Sin vehículo',
          detail: 'No tienes vehículo registrado aún.',
          life: 3000
        });
      }
    }
  }

  async actualizarVehiculo() {
    if (!this.usuarioId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No hay usuario autenticado.',
        life: 3000
      });
      return;
    }

    try {
      if (this.vehiculo.vehiculo_id) {
        await this.miVehiculoService.actualizarVehiculo(this.vehiculo.vehiculo_id, this.vehiculo);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Vehículo actualizado correctamente.',
          life: 3000
        });
      } else {
        const nuevo = await this.miVehiculoService.registrarVehiculo(this.usuarioId, this.vehiculo);
        this.vehiculo = nuevo;
        this.messageService.add({
          severity: 'success',
          summary: 'Registrado',
          detail: 'Vehículo agregado correctamente.',
          life: 3000
        });
      }
    } catch (err) {
      console.error('Error al guardar vehículo:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error al guardar el vehículo.',
        life: 3000
      });
    }
  }
}
