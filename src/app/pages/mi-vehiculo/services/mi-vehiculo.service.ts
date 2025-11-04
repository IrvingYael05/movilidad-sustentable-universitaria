import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class MiVehiculoService {

  constructor(private supabase: SupabaseService) {}

  // 🔹 Obtener vehículo del usuario actual
  async obtenerVehiculo(usuarioId: string) {
    const { data, error } = await this.supabase.supabaseClient
      .from('vehiculos')
      .select('*')
      .eq('propietario_id', usuarioId)
      .single();

    if (error) throw error;
    return data;
  }

  // 🔹 Actualizar vehículo
  async actualizarVehiculo(vehiculoId: string, vehiculo: any) {
    const { data, error } = await this.supabase.supabaseClient
      .from('vehiculos')
      .update({
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        color: vehiculo.color,
        placa: vehiculo.placa
      })
      .eq('vehiculo_id', vehiculoId)
      .select();

    if (error) throw error;
    return data;
  }

  // 🔹 Registrar nuevo vehículo (por si el usuario no tiene uno)
  async registrarVehiculo(usuarioId: string, vehiculo: any) {
    const { data, error } = await this.supabase.supabaseClient
      .from('vehiculos')
      .insert({
        propietario_id: usuarioId,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        color: vehiculo.color,
        placa: vehiculo.placa,
        ano: vehiculo.ano ? parseInt(vehiculo.ano, 10) : null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
