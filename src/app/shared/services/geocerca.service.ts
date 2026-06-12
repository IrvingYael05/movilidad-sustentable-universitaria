import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../data-access/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class GeocercaService {
  private _supabase = inject(SupabaseService).supabaseClient;

  // ID del proceso de rastreo del GPS
  private watchId: number | null = null;

  // Coordenadas exactas de la entrada de la UTEQ
  private UTEQ_LAT = 20.654167760512216;
  private UTEQ_LNG = -100.40688971900015;

  // Radio de tolerancia en kilómetros (0.15 km = 150 metros)
  private RADIO_KM = 0.15;

  constructor() {}

  /**
   * 1. Solicita permiso al usuario y comienza a rastrear su ubicación.
   * @param viajeId El ID del viaje activo que se va a cerrar al llegar.
   */
  iniciarRastreo(viajeId: string): Promise<string> {
    this.detenerRastreo();
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Tu dispositivo no soporta geolocalización.');
        return;
      }

      // Opciones para exigir alta precisión del GPS del celular
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      // Inicia el monitoreo continuo
      this.watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const latActual = position.coords.latitude;
          const lngActual = position.coords.longitude;

          // Calculamos la distancia entre el celular y la escuela
          const distancia = this.calcularDistanciaHaversine(
            latActual,
            lngActual,
            this.UTEQ_LAT,
            this.UTEQ_LNG,
          );

          console.log(`Distancia actual al destino: ${distancia.toFixed(3)} km`);

          // Si la distancia es menor a los 150 metros
          if (distancia <= this.RADIO_KM) {
            // 1. Apagamos el GPS para ahorrar batería
            this.detenerRastreo();

            // 2. Disparamos la función de Supabase para la Telemetría
            try {
              await this.notificarLlegadaSupabase(viajeId);
              resolve('Llegada registrada exitosamente.');
            } catch (error) {
              reject('Error al guardar la telemetría.');
            }
          }
        },
        (error) => {
          console.error('Error de GPS:', error);
          reject('No se pudo obtener la ubicación. Verifica tus permisos.');
        },
        options,
      );
    });
  }

  /**
   * Apaga el sensor GPS.
   */
  detenerRastreo() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Llama a la función RPC que creamos en Supabase para registrar la telemetría.
   */
  private async notificarLlegadaSupabase(viajeId: string) {
    const { data, error } = await this._supabase.rpc(
      'registrar_entrada_geocerca',
      {
        p_viaje_id: viajeId,
      },
    );

    if (error) throw error;
    return data;
  }

  /**
   * Fórmula Matemática de Haversine para calcular distancia en Km entre dos coordenadas.
   */
  private calcularDistanciaHaversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.grad2rad(lat2 - lat1);
    const dLon = this.grad2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.grad2rad(lat1)) *
        Math.cos(this.grad2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Devuelve la distancia en Km
  }

  private grad2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Verifica la ubicación actual con una tolerancia expandida para el ingreso manual.
   * @param toleranciaKm Radio permitido en kilómetros
   */
  validarUbicacionManual(toleranciaKm: number = 0.3): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Tu dispositivo no soporta geolocalización.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latActual = position.coords.latitude;
          const lngActual = position.coords.longitude;

          const distancia = this.calcularDistanciaHaversine(
            latActual,
            lngActual,
            this.UTEQ_LAT,
            this.UTEQ_LNG,
          );

          // Retorna true si está dentro de la tolerancia expandida
          resolve(distancia <= toleranciaKm);
        },
        (error) => {
          console.error('Error GPS Manual:', error);
          reject(
            'No se pudo obtener tu ubicación actual. Revisa tus permisos.',
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }

  /**
   * Fuerza al navegador a mostrar el pop-up de permisos de ubicación.
   * Debe llamarse mediante un evento de clic (User Gesture).
   */
  solicitarPermisos(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Tu navegador o dispositivo no soporta geolocalización.');
        return;
      }

      // Al pedir la posición actual, el navegador lanza el modal de permisos automáticamente
      navigator.geolocation.getCurrentPosition(
        () => resolve(true), // El usuario hizo clic en "Permitir"
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(
              'Permiso de GPS denegado. Por favor, búscalo en la barra de direcciones y permítelo para publicar viajes.',
            );
          } else {
            reject('No se pudo acceder a tu ubicación. Intenta nuevamente.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }
}
