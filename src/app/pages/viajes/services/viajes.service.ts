// src/app/viajes/services/viajes.service.ts
import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ViajesService {
  private _supabase = inject(SupabaseService).supabaseClient;

  // Obtener viajes disponibles (solo 'activo' y con hora de salida futura) 
  async obtenerViajes() {
    const horaActualIso = new Date().toISOString();

    const { data, error } = await this._supabase
      .from('viajes')
      .select(
        `
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
      `,
      )
      .eq('estado_viaje', 'activo')
      .gte('hora_salida', horaActualIso)
      .order('hora_salida', { ascending: true });

    if (error) {
      console.error('Error al obtener viajes:', error);
      throw error;
    }

    return data;
  }

  // Busca si el usuario tiene un viaje activo
  async usuarioTieneViajeActivo(usuarioId: string): Promise<boolean> {
    const { data, error } = await this._supabase
      .rpc('usuario_tiene_viaje_activo', { uid: usuarioId })
      .single();

    if (error) {
      console.error('Error RPC:', error);
      throw error;
    }
    return data;
  }

  // Busca todos los viajes donde el usuario tiene solicitudes pendientes
  async obtenerSolicitudesPendientesUsuario(
    usuarioId: string,
  ): Promise<string[]> {
    const { data, error } = await this._supabase
      .from('solicitudesviaje')
      .select('viaje_id')
      .eq('pasajero_id', usuarioId)
      .eq('estado_solicitud', 'pendiente');

    if (error) {
      console.error('Error al obtener solicitudes:', error);
      throw error;
    }

    // Retornamos un arreglo solo con los IDs de los viajes
    return data ? data.map((s: any) => s.viaje_id) : [];
  }

  // Solicitar unirse
  async solicitarUnirse(viajeId: string, usuarioId: string) {
    const {
      data: { user },
      error: authError,
    } = await this._supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión');

    const { data, error } = await this._supabase
      .from('solicitudesviaje')
      .upsert(
        {
          viaje_id: viajeId,
          pasajero_id: user.id,
          estado_solicitud: 'pendiente',
          solicitado_en: new Date().toISOString(),
        },
        { onConflict: 'viaje_id, pasajero_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
