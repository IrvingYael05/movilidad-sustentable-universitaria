// src/app/pages/viajes/viajes.component.ts
import { Component, OnInit, inject } from '@angular/core';
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
  es_mio: boolean;
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
  puedeSolicitar = true;
  esConductorConViajeActivo = false; // ← NUEVA Y CLAVE

  private _supabase = inject(SupabaseService).supabaseClient;

  constructor(
    private viajesService: ViajesService,
    private msg: MessageService
  ) {}

  async ngOnInit() {
    await this.cargarUsuario();
    await this.cargarRestriccionesUsuario();
    await this.cargarViajes();
  }

  private async cargarUsuario() {
    const { data: { session } } = await this._supabase.auth.getSession();
    this.usuarioId = session?.user?.id || null;
  }

  private async cargarRestriccionesUsuario() {
    if (!this.usuarioId) {
      this.puedeSolicitar = false;
      this.esConductorConViajeActivo = false;
      return;
    }

    try {
      const tieneViajeActivo = await this.viajesService.usuarioTieneViajeActivo(this.usuarioId);

      if (tieneViajeActivo) {
        // ¿Tiene un viaje activo como CONDUCTOR?
        const { data: viajeConductor, error } = await this._supabase
          .from('viajes')
          .select('viaje_id')
          .eq('conductor_id', this.usuarioId)
          .eq('estado_viaje', 'activo')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (viajeConductor) {
          // Es conductor con viaje activo
          this.esConductorConViajeActivo = true;
          this.puedeSolicitar = false;
        } else {
          // Es pasajero aceptado en un viaje
          this.esConductorConViajeActivo = false;
          this.puedeSolicitar = false;
        }
      } else {
        // No tiene ningún viaje activo
        this.esConductorConViajeActivo = false;
        this.puedeSolicitar = true;
      }
    } catch (error) {
      console.error('Error verificando restricciones:', error);
      this.puedeSolicitar = true;
      this.esConductorConViajeActivo = false;
    }
  }

  private async cargarViajes() {
    try {
      this.cargando = true;
      const data = await this.viajesService.obtenerViajes();

      const viajesProcesados = await Promise.all(
        data.map(async (v: any) => {
          const esMio = v.conductor_id === this.usuarioId;

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
            es_mio: esMio
          };

          // Solo verificar solicitud si no es su propio viaje
          if (this.usuarioId && !esMio) {
            viaje.solicitud_pendiente = await this.viajesService.tieneSolicitudPendiente(viaje.viaje_id, this.usuarioId);
          }

          return viaje;
        })
      );

      this.viajes = viajesProcesados;

      // === REGLAS DE VISUALIZACIÓN ===
      if (!this.usuarioId) {
        // Visitante → solo viajes con asientos
        this.viajesFiltrados = viajesProcesados.filter(v => v.asientos_disponibles > 0);
      }
      else if (this.esConductorConViajeActivo) {
        // Conductor con viaje activo → SOLO ve el suyo
        this.viajesFiltrados = viajesProcesados.filter(v => v.es_mio);
      }
      else {
        // Pasajero normal (puede o no solicitar) → ve viajes con asientos + los suyos
        this.viajesFiltrados = viajesProcesados.filter(v =>
          v.asientos_disponibles > 0 || v.es_mio
        );
      }

    } catch (error: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: error.message || 'Error al cargar viajes' });
    } finally {
      this.cargando = false;
    }
  }

onSearch() {
  const term = this.searchTerm.toLowerCase().trim();

  if (!term) {
    // Si no hay texto → mostrar según el tipo de usuario
    if (this.esConductorConViajeActivo) {
      this.viajesFiltrados = this.viajes.filter(v => v.es_mio);
    } else {
      this.viajesFiltrados = this.viajes.filter(v => v.asientos_disponibles > 0 || v.es_mio);
    }
    return;
  }

  // Filtrar en tiempo real
  this.viajesFiltrados = this.viajes.filter(viaje => {
    const coincideConductor = `${viaje.usuarios.nombre} ${viaje.usuarios.apellido}`
      .toLowerCase()
      .includes(term);

    const coincideSalida = viaje.lugar_salida.toLowerCase().includes(term);
    const coincideLlegada = viaje.lugar_llegada.toLowerCase().includes(term);

    // Solo mostrar si tiene asientos o es del usuario (excepto si es conductor activo)
    const esVisible = this.esConductorConViajeActivo
      ? viaje.es_mio
      : (viaje.asientos_disponibles > 0 || viaje.es_mio);

    return esVisible && (coincideConductor || coincideSalida || coincideLlegada);
  });
}

  getBotonLabel(viaje: Viaje): string {
    if (viaje.solicitud_pendiente) return 'Pendiente';
    if (viaje.asientos_disponibles === 0) return 'Sin asientos';
    if (!this.puedeSolicitar) return 'Viaje en curso';
    return 'Solicitar Unirme';
  }

  getBotonEnabled(viaje: Viaje): boolean {
    return this.puedeSolicitar && !viaje.solicitud_pendiente && viaje.asientos_disponibles > 0 && !viaje.es_mio;
  }

  async onJoin(viaje: Viaje) {
    if (!this.usuarioId) {
      this.msg.add({ severity: 'warn', summary: 'Acceso', detail: 'Inicia sesión' });
      return;
    }

    if (viaje.es_mio) return;

    if (!this.puedeSolicitar) {
      this.msg.add({ severity: 'info', summary: 'No disponible', detail: 'Ya tienes un viaje en curso' });
      return;
    }

    if (viaje.solicitud_pendiente) {
      this.msg.add({ severity: 'info', summary: 'Pendiente', detail: 'Ya enviaste una solicitud' });
      return;
    }

    if (viaje.asientos_disponibles <= 0) {
      this.msg.add({ severity: 'info', summary: 'Lleno', detail: 'No hay asientos disponibles' });
      return;
    }

    try {
      await this.viajesService.solicitarUnirse(viaje.viaje_id, this.usuarioId);
      viaje.solicitud_pendiente = true;
      this.msg.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud enviada al conductor' });
    } catch (error: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: error.message || 'No se pudo enviar' });
    }
  }
}