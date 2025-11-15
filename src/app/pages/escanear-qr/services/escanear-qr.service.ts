import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

/**
 * Interfaz que define la estructura de la respuesta
 */
export interface ScanResult {
  aprobado: boolean;
  motivo?: string;
  conductor?: string;
  placa?: string;
  pasajeros?: number;
  espacio_asignado?: string;
  pasajeros_detalles?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EscanearQrService {
  private _supabase = inject(SupabaseService).supabaseClient;

  /**
   * Llama a una función RPC en Supabase para validar un token QR.
   */
  async validarToken(token: string): Promise<ScanResult> {
    const { data, error } = await this._supabase.rpc('validar_acceso_qr', {
      token_escaneado: token
    });

    if (error) {
      return { aprobado: false, motivo: error.message };
    }

    return data as ScanResult;
  }
}