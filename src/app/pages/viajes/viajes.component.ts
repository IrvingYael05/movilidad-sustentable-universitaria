// src/app/pages/viajes/viajes.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ViajesService } from './services/viajes.service';
import { SupabaseService } from '../../shared/data-access/supabase.service';

interface Viaje {
  viaje_id: string;
  conductor_id: string;
  lugar_salida: string;
  lugar_llegada: string;
  hora_salida: string;
  asientos_disponibles: number;
  estado_viaje: string;
  usuarios: { nombre: string; apellido: string };
  solicitud_pendiente: boolean;
  es_mio: boolean; // ← NUEVO
}

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ToastModule],
  providers: [MessageService],
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.scss']
})
export class ViajesComponent implements OnInit {
  viajes: Viaje[] = [];
  viajesFiltrados: Viaje[] = [];
  cargando = true;
  usuarioId: string | null = null;
  searchTerm: string = '';
  puedeSolicitar: boolean = true;

  constructor(
    private viajesService: ViajesService,
    private supabaseService: SupabaseService,
    private msg: MessageService
  ) {}

  async ngOnInit() {
    await this.cargarUsuario();
    await this.cargarRestriccionesUsuario();
    await this.cargarViajes();
  }

  private async cargarUsuario() {
    const { data: { session } } = await this.supabaseService.supabaseClient.auth.getSession();
    this.usuarioId = session?.user?.id || null;
  }

  private async cargarRestriccionesUsuario() {
    if (!this.usuarioId) {
      this.puedeSolicitar = false;
      return;
    }
    try {
      const tieneActivo = await this.viajesService.usuarioTieneViajeActivo(this.usuarioId);
      this.puedeSolicitar = !tieneActivo;
    } catch (error) {
      console.error('Error verificando viaje activo:', error);
      this.puedeSolicitar = true;
    }
  }

  private async cargarViajes() {
  try {
    this.cargando = true;
    const data = await this.viajesService.obtenerViajes();

    const viajesProcesados = await Promise.all(
      data.map(async (v: any) => {
        const viaje: Viaje = {
          viaje_id: v.viaje_id,
          conductor_id: v.conductor_id,
          lugar_salida: v.lugar_salida,
          lugar_llegada: v.lugar_llegada,
          hora_salida: new Date(v.hora_salida).toLocaleString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          }),
          asientos_disponibles: v.asientos_disponibles,
          estado_viaje: v.estado_viaje,
          usuarios: v.usuarios || { nombre: 'Conductor', apellido: '' },
          solicitud_pendiente: false,
          es_mio: v.conductor_id === this.usuarioId // ← NUEVO: saber si es del conductor
        };

        // Solo verificar solicitud si NO es su propio viaje
        if (this.usuarioId && viaje.conductor_id !== this.usuarioId) {
          viaje.solicitud_pendiente = await this.viajesService.tieneSolicitudPendiente(viaje.viaje_id, this.usuarioId);
        }

        return viaje;
      })
    );

    // NO FILTRAR AQUÍ → EL CONDUCTOR VE TODOS LOS VIAJES
    this.viajes = viajesProcesados;
    this.viajesFiltrados = [...this.viajes];

  } catch (error: any) {
    this.msg.add({ severity: 'error', summary: 'Error', detail: error.message });
  } finally {
    this.cargando = false;
  }
}

  onSearch() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.viajesFiltrados = [...this.viajes];
      return;
    }
    this.viajesFiltrados = this.viajes.filter(viaje =>
      `${viaje.usuarios.nombre} ${viaje.usuarios.apellido}`.toLowerCase().includes(term) ||
      viaje.lugar_salida.toLowerCase().includes(term) ||
      viaje.lugar_llegada.toLowerCase().includes(term)
    );
  }

  getBotonLabel(viaje: Viaje): string {
    if (viaje.solicitud_pendiente) return 'Pendiente';
    if (viaje.asientos_disponibles === 0) return 'Sin asientos';
    if (!this.puedeSolicitar) return 'Viaje en curso';
    return 'Solicitar Unirme';
  }

  getBotonEnabled(viaje: Viaje): boolean {
    return this.puedeSolicitar && !viaje.solicitud_pendiente && viaje.asientos_disponibles > 0;
  }

  async onJoin(viaje: Viaje) {
    if (!this.usuarioId) {
      this.msg.add({ severity: 'warn', summary: 'Acceso', detail: 'Inicia sesión' });
      return;
    }

    if (!this.puedeSolicitar) {
      this.msg.add({ severity: 'info', summary: 'No disponible', detail: 'Ya tienes un viaje en curso' });
      return;
    }

    if (viaje.solicitud_pendiente) {
      this.msg.add({ severity: 'info', summary: 'Ya solicitaste', detail: 'Tu solicitud está pendiente' });
      return;
    }

    if (viaje.asientos_disponibles <= 0) {
      this.msg.add({ severity: 'info', summary: 'No disponible', detail: 'No hay asientos' });
      return;
    }

    try {
      await this.viajesService.solicitarUnirse(viaje.viaje_id, this.usuarioId);
      viaje.solicitud_pendiente = true;
      this.viajesFiltrados = [...this.viajesFiltrados];
      this.msg.add({ severity: 'success', summary: 'Enviada', detail: 'Solicitud enviada al conductor' });
    } catch (error: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: error.message || 'No se pudo enviar' });
    }
  }
}