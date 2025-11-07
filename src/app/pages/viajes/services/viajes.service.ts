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
  const { data: { user }, error: authError } = await this._supabase.auth.getUser();

  if (!user) {
    console.error('⚠️ Usuario no autenticado');
    throw new Error('Debes iniciar sesión para solicitar un viaje');
  }

  console.log('UID autenticado:', user.id);

  const { data, error } = await this._supabase
    .from('solicitudesviaje')
    .insert({
      viaje_id: viajeId,
      pasajero_id: user.id, // UUID del usuario autenticado
      estado_solicitud: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    console.error('Error insertando solicitud:', error);
    throw error;
  }

  return data;
}

async tieneSolicitudPendiente(viajeId: string, usuarioId: string) {
  const { data, error } = await this._supabase
    .from('solicitudesviaje')
    .select('solicitud_id')
    .eq('viaje_id', viajeId)
    .eq('pasajero_id', usuarioId)
    .eq('estado_solicitud', 'pendiente')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    throw error;
  }

  return !!data; // true si existe, false si no
}
}