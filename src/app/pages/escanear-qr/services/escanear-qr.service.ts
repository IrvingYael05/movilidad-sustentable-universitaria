// src/app/pages/escanear-qr/services/escanear-qr.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

export interface ScanResult {
  aprobado: boolean;
  motivo?: string;
  conductor?: string;
  placa?: string;
  pasajeros?: number;
  espacio_asignado?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EscanearQrService {
  private _supabase = inject(SupabaseService).supabaseClient;

  async validarToken(token: string): Promise<ScanResult> {
    const { data, error } = await this._supabase.rpc('validar_acceso_qr', {
      token_escaneado: token
    });

    if (error) {
      console.error('Error RPC:', error);
      return { aprobado: false, motivo: error.message };
    }

    return data as ScanResult;
  }
}