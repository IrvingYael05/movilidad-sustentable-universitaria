import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class MetricasService {
  private supabase = inject(SupabaseService).supabaseClient;

  // --- SECCIÓN A: AFLUENCIA ---
  async getVolumenTotal(inicio: string, fin: string) {
    const { data, error } = await this.supabase.rpc('rpc_volumen_ingresos', {
      fecha_inicio: inicio,
      fecha_fin: fin,
    });
    if (error) throw error;
    return data;
  }

  async getHorasPico(inicio: string, fin: string) {
    const { data, error } = await this.supabase.rpc('rpc_horas_pico', {
      fecha_inicio: inicio,
      fecha_fin: fin,
    });
    if (error) throw error;
    return data;
  }

  async getModalidadIngreso(inicio: string, fin: string) {
    const { data, error } = await this.supabase.rpc('rpc_modalidad_ingreso', {
      fecha_inicio: inicio,
      fecha_fin: fin,
    });
    if (error) throw error;
    return data;
  }

  // --- SECCIÓN B: MOVILIDAD COMPARTIDA ---
  async getPromedioOcupacion(inicio: string, fin: string) {
    const { data, error } = await this.supabase.rpc('rpc_promedio_ocupacion', {
      fecha_inicio: inicio,
      fecha_fin: fin,
    });
    if (error) throw error;
    return data;
  }

  async getCajonesLiberados(inicio: string, fin: string) {
    const { data, error } = await this.supabase.rpc('rpc_cajones_liberados', {
      fecha_inicio: inicio,
      fecha_fin: fin,
    });
    if (error) throw error;
    return data;
  }

  async getEstadoViajes(inicio: string, fin: string) {
    const { data, error } = await this.supabase.rpc('rpc_estado_viajes', {
      fecha_inicio: inicio,
      fecha_fin: fin,
    });
    if (error) throw error;
    return data;
  }

  // --- SECCIÓN C: MONITOR EN TIEMPO REAL ---
  async getMonitorEstacionamiento(loteId: number) {
    const { data, error } = await this.supabase.rpc(
      'rpc_monitor_estacionamiento',
      { p_lote_id: loteId },
    );
    if (error) throw error;
    return data[0]; // Retorna solo el primer registro (el resumen del lote)
  }
}
