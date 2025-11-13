import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

interface ActiveTravel {
  viaje_id: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccesoQrService {
  private _supabase = inject(SupabaseService).supabaseClient;

  //Busca el primer viaje activo del usuario, ya sea como conductor o pasajero.
  async getActiveTravel(): Promise<ActiveTravel | null> {
    const { data: { user } } = await this._supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado.');

    // 1. Buscar si es conductor de un viaje activo
    const { data: conductorData, error: conductorError } = await this._supabase
      .from('viajes')
      .select('viaje_id')
      .eq('conductor_id', user.id)
      .eq('estado_viaje', 'activo')
      .limit(1)
      .maybeSingle();

    if (conductorError) throw conductorError;
    if (conductorData) return conductorData;

    // 2. Si no, buscar si es pasajero de un viaje activo
    const { data: pasajeroData, error: pasajeroError } = await this._supabase
      .from('pasajerosviaje')
      .select('viajes!inner(viaje_id)')
      .eq('pasajero_id', user.id)
      .eq('viajes.estado_viaje', 'activo')
      .limit(1)
      .maybeSingle();
      
    if (pasajeroError) throw pasajeroError;

    if (pasajeroData && pasajeroData.viajes) {
      return pasajeroData.viajes;
    }

    // 3. Si no se encuentra ninguno
    return null;
  }

  // Llama a la función RPC para generar el token QR
  async getTokenQR(viajeId: string): Promise<string> {
    const { data, error } = await this._supabase.rpc('generar_qr_acceso', {
      viaje_id_param: viajeId,
    });

    if (error) {
      throw new Error(`Error al generar token QR: ${error.message}`);
    }
    
    return data;
  }
}