import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class MetricasService {
  private _supabase = inject(SupabaseService).supabaseClient;

  async obtenerDatosHistoricos() {
    // Obtenemos viajes completados para calcular CO2
    // En producción, esto debería ser una RPC o una View para no traer miles de filas
    const { data, error } = await this._supabase
      .from('viajes')
      .select(`
        creado_en,
        asientos_disponibles,
        pasajeros:pasajerosviaje(count)
      `)
      .eq('estado_viaje', 'inactivo') // Viajes ya terminados
      .order('creado_en', { ascending: true });

    if (error) throw error;
    return data;
  }
  
  async obtenerOcupacionActual() {
     const { count, error } = await this._supabase
      .from('espaciosestacionamiento')
      .select('*', { count: 'exact', head: true })
      .eq('esta_disponible', false);
      
     if(error) throw error;
     return count;
  }
}