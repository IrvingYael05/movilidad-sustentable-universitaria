// src/app/pages/viajes/viajes.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext'; // ← NUEVO: para el input
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ViajesService } from './services/viajes.service';
import { SupabaseService } from '../../shared/data-access/supabase.service';

interface Viaje {
  viaje_id: string;
  conductor_id: string;
  vehiculo_id: string;
  lugar_salida: string;
  lugar_llegada: string;
  hora_salida: string;
  asientos_disponibles: number;
  estado_viaje: string;
  usuarios: {
    nombre: string;
    apellido: string;
  };
}

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,  // ← AGREGADO
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.scss']
})
export class ViajesComponent implements OnInit {
  viajes: Viaje[] = [];
  viajesFiltrados: Viaje[] = []; // ← Para búsqueda
  cargando = true;
  usuarioId: string | null = null;

  // ← NUEVO: Propiedad para el input
  searchTerm: string = '';

  constructor(
    private viajesService: ViajesService,
    private supabaseService: SupabaseService,
    private msg: MessageService
  ) {}

  async ngOnInit() {
    await this.cargarUsuario();
    await this.cargarViajes();
  }

  private async cargarUsuario() {
    const { data: { session } } = await this.supabaseService.supabaseClient.auth.getSession();
    this.usuarioId = session?.user?.id || null;
  }

  private async cargarViajes() {
    try {
      this.cargando = true;
      const data = await this.viajesService.obtenerViajes();

      this.viajes = data.map((v: any) => ({
        viaje_id: v.viaje_id,
        conductor_id: v.conductor_id,
        vehiculo_id: v.vehiculo_id,
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
        usuarios: v.usuarios || { nombre: 'Conductor', apellido: '' }
      }));

      this.viajesFiltrados = [...this.viajes]; // Inicializa filtrados
    } catch (error: any) {
      this.msg.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: error.message || 'No se pudieron cargar los viajes' 
      });
    } finally {
      this.cargando = false;
    }
  }

  // ← NUEVO: Método de búsqueda
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

  async onJoin(viaje: Viaje) {
    if (!this.usuarioId) {
      this.msg.add({ severity: 'warn', summary: 'Acceso', detail: 'Inicia sesión para solicitar unirte' });
      return;
    }

    if (viaje.asientos_disponibles <= 0) {
      this.msg.add({ severity: 'info', summary: 'No disponible', detail: 'No hay asientos disponibles' });
      return;
    }

    try {
      await this.viajesService.solicitarUnirse(viaje.viaje_id, this.usuarioId);
      this.msg.add({ severity: 'success', summary: 'Solicitud enviada', detail: 'Tu solicitud ha sido enviada al conductor' });
    } catch (error: any) {
      this.msg.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: error.message || 'No se pudo enviar la solicitud' 
      });
    }
  }
}