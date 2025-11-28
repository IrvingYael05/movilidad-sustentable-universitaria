import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

export interface NuevoViajeData {
  conductor_id: string;
  vehiculo_id: string;
  lugar_salida: string;
  lugar_llegada: string;
  hora_salida: string; // Format: "HH:MM"
  asientos_disponibles: number;
  estado_viaje?: string;
}

export interface Viaje {
  viaje_id: string;
  conductor_id: string;
  vehiculo_id: string;
  lugar_salida: string;
  lugar_llegada: string;
  hora_salida: string;
  asientos_disponibles: number;
  estado_viaje: string;
  creado_en: string;
}

export interface SolicitudViaje {
  solicitud_id: string;
  viaje_id: string;
  pasajero_id: string;
  estado_solicitud: string;
  solicitado_en: string;
  pasajero: {
    usuario_id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
}

export interface PasajeroViaje {
  viaje_id: string;
  pasajero_id: string;
  unido_en: string;
  pasajero: {
    usuario_id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ViajesService {
  private _supabase = inject(SupabaseService).supabaseClient;

  /** Crea un nuevo viaje en la base de datos */
  async crearViaje(viajeData: NuevoViajeData) {
    try {
      const today = new Date();
      const [hours, minutes] = viajeData.hora_salida.split(':');
      today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const { data, error } = await this._supabase
        .from('viajes')
        .insert({
          conductor_id: viajeData.conductor_id,
          vehiculo_id: viajeData.vehiculo_id,
          lugar_salida: viajeData.lugar_salida,
          lugar_llegada: viajeData.lugar_llegada,
          hora_salida: today.toISOString(),
          asientos_disponibles: viajeData.asientos_disponibles,
          estado_viaje: viajeData.estado_viaje || 'activo',
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al crear viaje:', error);
      return { data: null, error };
    }
  }

  /** Obtiene todos los viajes activos (para vista general o admin) */
  async obtenerViajesActivos() {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .select(`
          *,
          conductor:usuarios!conductor_id (
            usuario_id,
            nombre,
            apellido,
            email
          ),
          vehiculo:vehiculos!vehiculo_id (
            vehiculo_id,
            placa,
            marca,
            modelo,
            color,
            ano
          )
        `)
        .eq('estado_viaje', 'activo')
        .order('hora_salida', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener viajes:', error);
      return { data: null, error };
    }
  }

  /** Obtiene todos los viajes de un conductor (historial) */
  async obtenerViajesConductor(conductorId: string) {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .select('*')
        .eq('conductor_id', conductorId)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener viajes del conductor:', error);
      return { data: null, error };
    }
  }

  /** Obtiene SOLO el viaje activo del conductor actual */
  async obtenerViajeActivoConductor(conductorId: string) {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .select('*')
        .eq('conductor_id', conductorId)
        .eq('estado_viaje', 'activo')
        .order('creado_en', { ascending: false })
        .limit(1)
        .single(); // Solo devuelve uno

      if (error && error.code !== 'PGRST116') throw error; // Ignorar "no rows found"
      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener viaje activo:', error);
      return { data: null, error };
    }
  }

  /** Actualiza el estado de un viaje (activo/inactivo) */
  async actualizarEstadoViaje(viajeId: string, nuevoEstado: string) {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .update({ estado_viaje: nuevoEstado })
        .eq('viaje_id', viajeId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al actualizar estado del viaje:', error);
      return { data: null, error };
    }
  }

  /** Obtiene las solicitudes pendientes de un viaje específico */
  async obtenerSolicitudesViaje(viajeId: string) {
    try {
      const { data, error } = await this._supabase
        .from('solicitudesviaje')
        .select(`
          *,
          pasajero:usuarios!pasajero_id (
            usuario_id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('viaje_id', viajeId)
        .eq('estado_solicitud', 'pendiente')
        .order('solicitado_en', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      return { data: null, error };
    }
  }

  /** Acepta una solicitud de viaje */
  async aceptarSolicitud(solicitudId: string, viajeId: string, pasajeroId: string) {
    try {
      // 1. Actualizar estado de la solicitud a 'aceptada'
      const { error: updateError } = await this._supabase
        .from('solicitudesviaje')
        .update({ estado_solicitud: 'aceptada' })
        .eq('solicitud_id', solicitudId);

      if (updateError) throw updateError;

      // 2. Agregar pasajero a la tabla pasajerosviaje
      const { error: insertError } = await this._supabase
        .from('pasajerosviaje')
        .insert({
          viaje_id: viajeId,
          pasajero_id: pasajeroId,
        });

      if (insertError) throw insertError;

      // 3. Decrementar asientos disponibles usando la función de Postgres
      const { error: rpcError } = await this._supabase
        .rpc('decrementar_asientos', { viaje_id: viajeId });

      if (rpcError) throw rpcError;

      return { data: true, error: null };
    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
      return { data: null, error };
    }
  }

  /** Rechaza una solicitud de viaje */
  async rechazarSolicitud(solicitudId: string) {
    try {
      const { data, error } = await this._supabase
        .from('solicitudesviaje')
        .update({ estado_solicitud: 'rechazada' })
        .eq('solicitud_id', solicitudId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      return { data: null, error };
    }
  }

  /** Obtiene los pasajeros que ya están confirmados en el viaje */
  async obtenerPasajerosViaje(viajeId: string) {
    try {
      const { data, error } = await this._supabase
        .from('pasajerosviaje')
        .select(`
          *,
          pasajero:usuarios!pasajerosviaje_pasajero_id_fkey (
            usuario_id,
            nombre,
            apellido,
            email
          )
        `)
        .eq('viaje_id', viajeId)
        .order('unido_en', { ascending: true });

      if (error) throw error;
      return { data, error: null };

    } catch (error) {
      console.error('Error al obtener pasajeros:', error);
      return { data: null, error };
    }
  }

  /** Obtiene los detalles de un pasajero por su ID */
  async obtenerDetallesPasajero(pasajeroId: string) {
    try {
      const { data, error } = await this._supabase
        .from('usuarios')
        .select('usuario_id, nombre, apellido, email')
        .eq('usuario_id', pasajeroId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener detalles del pasajero:', error);
      return null;
    }
  }

  /** Incrementa los asientos de un viaje */
  async incrementarAsientos(viajeId: string) {
    try {
      const { error } = await this._supabase.rpc('incrementar_asientos', {
        p_viaje_id: viajeId,
      });
      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      console.error('Error al incrementar asientos:', error);
      return { data: null, error };
    }
  }

  /** El pasajero sale de un viaje */
  async salirDelViaje(viajeId: string, pasajeroId: string) {
    try {
      // 1. Eliminar al pasajero de la tabla pasajerosviaje
      const { error: deleteError } = await this._supabase
        .from('pasajerosviaje')
        .delete()
        .eq('viaje_id', viajeId)
        .eq('pasajero_id', pasajeroId);

      if (deleteError) throw deleteError;

      // 2. Incrementar los asientos disponibles
      const { error: rpcError } = await this.incrementarAsientos(viajeId);
      if (rpcError) throw rpcError;

      return { data: true, error: null };
    } catch (error) {
      console.error('Error al salir del viaje:', error);
      return { data: null, error };
    }
  }

  /** El conductor elimina a un pasajero de un viaje */
  async eliminarPasajero(viajeId: string, pasajeroId: string) {
    try {
      // 1. Eliminar al pasajero de la tabla pasajerosviaje
      const { error: deleteError } = await this._supabase
        .from('pasajerosviaje')
        .delete()
        .eq('viaje_id', viajeId)
        .eq('pasajero_id', pasajeroId);

      if (deleteError) throw deleteError;

      // 2. Incrementar los asientos disponibles
      const { error: rpcError } = await this.incrementarAsientos(viajeId);
      if (rpcError) throw rpcError;

      return { data: true, error: null };
    } catch (error) {
      console.error('Error al eliminar pasajero:', error);
      return { data: null, error };
    }
  }

  /** Solicitud para unirse a un viaje (Maneja historial con UPSERT) */
  async solicitarUnirse(viajeId: string, pasajeroId: string) {
    try {
      // Usamos upsert para:
      // 1. Crear nueva si no existe.
      // 2. Actualizar a 'pendiente' si ya existía (aunque estuviera cancelada/rechazada).
      const { data, error } = await this._supabase
        .from('solicitudesviaje')
        .upsert(
          {
            viaje_id: viajeId,
            pasajero_id: pasajeroId,
            estado_solicitud: 'pendiente',
            solicitado_en: new Date().toISOString(), // Actualizamos la fecha
          },
          { onConflict: 'viaje_id, pasajero_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al solicitar unirse:', error);
      throw error;
    }
  }

  /** Obtiene el último viaje registrado por el conductor (activo o inactivo) para prellenar formulario */
  async obtenerUltimoViajeRegistrado(conductorId: string) {
    try {
      const { data, error } = await this._supabase
        .from('viajes')
        .select('*')
        .eq('conductor_id', conductorId)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error al obtener último viaje:', error);
      return { data: null, error };
    }
  }
}