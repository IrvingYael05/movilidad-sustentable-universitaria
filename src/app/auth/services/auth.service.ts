import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  AuthError,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface PerfilUsuario {
  nombre: string;
  apellido_p: string;
  apellido_m: string;
}

export interface DatosVehiculo {
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  ano: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /**
   * Inicia sesión de un usuario con su correo y contraseña.
   */
  async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: AuthError | null }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    return { user: data.user, error };
  }

  /**
   * Registra un nuevo usuario (solo Auth; perfil se inserta después de confirmar).
   */
  async signUpWithEmail(
    email: string,
    password: string,
    perfil: PerfilUsuario,
    vehiculo?: DatosVehiculo
  ): Promise<{ user: User | null; error: AuthError | null }> {
    const { data: authData, error: authError } =
      await this.supabase.auth.signUp({
        email: email,
        password: password,
      });

    if (authError) {
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('already in use')
      ) {
        return {
          user: null,
          error: {
            ...authError,
            message: 'Este email ya está registrado y confirmado.',
          } as AuthError,
        };
      }
      return { user: null, error: authError };
    }

    if (authError || !authData.user) {
      return { user: null, error: authError };
    }

    // Guarda los datos temporalmente para insertar después de confirmar
    const tempData = { perfil, vehiculo };
    localStorage.setItem('pendingRegistration', JSON.stringify(tempData));

    return { user: authData.user, error: null };
  }

  /**
   * Completa el registro insertando perfil/vehículo después de confirmar el email.
   */
  async completeRegistration(): Promise<{
    success: boolean;
    error: string | null;
  }> {
    console.log('completeRegistration called'); // Log al inicio
    const tempData = localStorage.getItem('pendingRegistration');
    console.log('Temp data:', tempData); // Verifica si existe
    if (!tempData) {
      return { success: false, error: 'No hay datos pendientes.' };
    }

    const { perfil, vehiculo } = JSON.parse(tempData);
    const user = (await this.supabase.auth.getUser()).data.user;
    console.log('User:', user); // Verifica usuario autenticado
    if (!user) {
      return { success: false, error: 'Usuario no autenticado.' };
    }

    // Inserta perfil
    const { data: profileData, error: profileError } = await this.supabase
      .from('Usuarios')
      .insert({
        usuario_id: user.id,
        email: user.email!,
        nombre: perfil.nombre,
        apellido: `${perfil.apellido_p} ${perfil.apellido_m}`,
      });

    console.log('Profile insert result:', profileData, profileError); // Agrega esto
    if (profileError) {
      console.error('Error creando el perfil:', profileError);
      return {
        success: false,
        error: `Error en perfil: ${profileError.message}`,
      };
    }

    console.log('Perfil insertado'); // Log de éxito

    // Inserta vehículo si existe
    if (vehiculo && vehiculo.placa) {
      const { error: vehicleError } = await this.supabase
        .from('vehiculos')
        .insert({
          propietario_id: user.id,
          placa: vehiculo.placa.toUpperCase(),
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          color: vehiculo.color,
          ano: vehiculo.ano,
        });

      if (vehicleError) {
        console.error('Error registrando el vehículo:', vehicleError);
        return { success: false, error: 'Error en vehículo.' };
      }
      console.log('Vehículo insertado'); // Log de éxito
    }

    localStorage.removeItem('pendingRegistration');
    return { success: true, error: null };
  }
}
