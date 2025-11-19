// src/app/pages/metricas/services/metricas.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service'; // La ruta relativa es correcta

@Injectable({
  providedIn: 'root'
})
export class MetricasService {
  private supabase = inject(SupabaseService);

  /**
   * Obtiene la ocupación actual del estacionamiento (en tiempo real).
   */
  async getOcupacionActual(): Promise<{ ocupados: number, total: number }> {
    // 1. Contar total de espacios
    const { count: totalSpaces } = await this.supabase.supabaseClient // ✅ CORRECCIÓN
      .from('espaciosestacionamiento')
      .select('*', { count: 'exact', head: true });

    // 2. Contar asignaciones activas (liberado_en IS NULL)
    const { count: activeAssignments } = await this.supabase.supabaseClient // ✅ CORRECCIÓN
      .from('asignacionesestacionamiento')
      .select('*', { count: 'exact', head: true })
      .is('liberado_en', null);

    return {
      ocupados: activeAssignments || 0,
      total: totalSpaces || 0,
    };
  }

  /**
   * Obtiene los datos de viajes compartidos (pasajeros y viajes) para el cálculo de CO2 y regresión.
   */
  async getDatosHistoricosViajes(): Promise<{ pasajeros: { unido_en: string }[], viajes: { creado_en: string }[] }> {
    // Fetch para Pasajeros (para CO2 y vehículos ahorrados)
    const pasajerosResponse = await this.supabase.supabaseClient // ✅ CORRECCIÓN
        .from('pasajerosviaje')
        .select('unido_en');

    // Fetch para Viajes (para tendencia de viajes)
    const viajesResponse = await this.supabase.supabaseClient // ✅ CORRECCIÓN
        .from('viajes')
        .select('creado_en');

    return { 
      pasajeros: pasajerosResponse.data as { unido_en: string }[] || [],
      viajes: viajesResponse.data as { creado_en: string }[] || []
    };
  }
}