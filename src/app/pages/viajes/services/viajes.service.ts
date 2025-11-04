// src/app/viajes/services/viajes.service.ts
import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ViajesService {
  private _supabase = inject(SupabaseService).supabaseClient;

  constructor() {}

  // Obtener todos los viajes disponibles con datos del conductor
  async obtenerViajes() {
    const { data, error } = await this._supabase
      .from('viajes')
      .select(`
        viaje_id,
        conductor_id,
        vehiculo_id,
        lugar_salida,
        lugar_llegada,
        hora_salida,
        asientos_disponibles,
        estado_viaje,
        usuarios!viajes_conductor_id_fkey (
          usuario_id,
          nombre,
          apellido
        )
      `)
      .eq('estado_viaje', 'activo') // Solo viajes programados
      .order('hora_salida', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Solicitar unirse a un viaje
  async solicitarUnirse(viajeId: string, usuarioId: string) {
    const { data, error } = await this._supabase
      .from('solicitudesviaje')
      .insert({
        viaje_id: viajeId,
        pasajero_id: usuarioId,
        estado_solicitud: 'pending',
      })
      .select()
      .single();

    if (error) {
      // Manejo específico de errores comunes
      if (error.code === '23505') {
        throw new Error('Ya has solicitado unirte a este viaje');
      }
      if (error.code === '23503') {
        throw new Error('El viaje ya no existe');
      }
      throw error;
    }
    return data;
  }
}