// src/app/viajes/services/viajes.service.ts
import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ViajesService {
  private _supabase = inject(SupabaseService).supabaseClient;

  // Obtener viajes disponibles (solo 'activo')
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
        ),
        codigosqracceso (
          estado
        )
      `)
      .eq('estado_viaje', 'activo')
      .order('hora_salida', { ascending: true });
      console.log('Viajes obtenidos:', data);

    if (error) throw error;

    // Filtrar viajes cuyo QR ya fue utilizado (ya ingresaron)
    const viajesFiltrados = data.filter((viaje: any) => {
      const qrs = viaje.codigosqracceso;
      if (qrs && Array.isArray(qrs) && qrs.length > 0) {
        // Si alguno de los QRs asociados está utilizado, no mostrar el viaje
        return !qrs.some((qr: any) => qr.estado === 'utilizado');
      }
      return true;
    });

    return viajesFiltrados;
  }

  // ¿El usuario tiene un viaje activo?
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

  // ¿Ya tiene solicitud pendiente?
  async tieneSolicitudPendiente(viajeId: string, usuarioId: string): Promise<boolean> {
    const { data, error } = await this._supabase
      .from('solicitudesviaje')
      .select('solicitud_id')
      .eq('viaje_id', viajeId)
      .eq('pasajero_id', usuarioId)
      .eq('estado_solicitud', 'pendiente')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  // Solicitar unirse
  async solicitarUnirse(viajeId: string, usuarioId: string) {
    const { data: { user }, error: authError } = await this._supabase.auth.getUser();
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
        { onConflict: 'viaje_id, pasajero_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}