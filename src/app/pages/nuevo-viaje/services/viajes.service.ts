import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

export interface NuevoViajeData {
  conductor_id: string;
  vehiculo_id: string;
  lugar_salida: string;
  lugar_llegada: string;
  hora_salida: string; // Format: "HH:MM"
  asientos_disponibles: number;
  estado_viaje?: string;
}

export interface Viaje {
  viaje_id: string;
  conductor_id: string;
  vehiculo_id: string;
  lugar_salida: string;
  lugar_llegada: string;
  hora_salida: string;
  asientos_disponibles: number;
  estado_viaje: string;
  creado_en: string;
}

@Injectable({
  providedIn: 'root',
})
export class ViajesService {
  private _supabase = inject(SupabaseService).supabaseClient;

  /**
   * Crea un nuevo viaje en la base de datos
   */
  async crearViaje(viajeData: NuevoViajeData) {
    try {
      // Convertir hora a timestamptz (agregar fecha de hoy)
      const today = new Date();
      const [hours, minutes] = viajeData.hora_salida.split(':');
      today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const { data, error } = await this._supabase
        .from('viajes')
        .insert({
          conductor_id: viajeData.conductor_id,
          vehiculo_id: viajeData.vehiculo_id,
          lugar_salida: viajeData.lugar_salida,
          lugar_llegada: viajeData.lugar_llegada,
          hora_salida: today.toISOString(),
          asientos_disponibles: viajeData.asientos_disponibles,
          estado_viaje: viajeData.estado_viaje || 'activo',
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error al crear viaje:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtiene todos los viajes activos
   */
  async obtenerViajesActivos() {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .select(
          `
          *,
          conductor:usuarios!conductor_id (
            usuario_id,
            nombre,
            apellido,
            email
          ),
          vehiculo:vehiculos!vehiculo_id (
            vehiculo_id,
            placa,
            marca,
            modelo,
            color,
            ano
          )
        `
        )
        .eq('estado_viaje', 'activo')
        .order('hora_salida', { ascending: true });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener viajes:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtiene los viajes de un conductor específico
   */
  async obtenerViajesConductor(conductorId: string) {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .select('*')
        .eq('conductor_id', conductorId)
        .order('creado_en', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener viajes del conductor:', error);
      return { data: null, error };
    }
  }

  /**
   * Actualiza el estado de un viaje
   */
  async actualizarEstadoViaje(viajeId: string, nuevoEstado: string) {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .update({ estado_viaje: nuevoEstado })
        .eq('viaje_id', viajeId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error al actualizar estado del viaje:', error);
      return { data: null, error };
    }
  }
}