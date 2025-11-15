import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

// 1. Interfaz para la respuesta del QR
export interface QrTokenResponse {
  token_qr: string;
  estado: 'disponible' | 'utilizado';
  es_propietario: boolean; // Para saber si mostrar el botón "Marcar Salida"
}

// 2. Interfaz para la respuesta del lugar
export interface AsignacionActiva {
  espacio_id: number;
  identificador: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccesoQrService {
  private _supabase = inject(SupabaseService).supabaseClient;

  /**
   * Llama a la función RPC para generar/obtener el token QR del día.
   */
  async getTokenQR(): Promise<QrTokenResponse> {
    const { data, error } = await this._supabase.rpc('generar_qr_acceso');

    if (error) {
      console.error('Error al generar token QR:', error);
      throw new Error(`Error al generar token QR: ${error.message}`);
    }
    
    return data as QrTokenResponse;
  }

  /**
   * Llama a la función RPC para marcar la salida.
   */
  async marcarSalida(): Promise<any> {
    const { data, error } = await this._supabase.rpc('marcar_salida');

    if (error) {
      console.error('Error al marcar salida:', error);
      throw new Error(`Error al marcar salida: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Llama a la función RPC para obtener el lugar asignado.
   */
  async getMiLugarAsignado(): Promise<AsignacionActiva | null> {
    const { data, error } = await this._supabase.rpc('obtener_mi_asignacion_activa');

    if (error) {
      console.error('Error al obtener asignación:', error);
      throw new Error(error.message);
    }

    return data;
  }
}