import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  private _supabase = inject(SupabaseService).supabaseClient;

  constructor() {}

  // 🔹 Obtener el perfil del usuario actual
  async obtenerPerfil() {
    const { data: sessionData, error: sessionError } = await this._supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) throw new Error('No hay sesión activa');

    const userId = sessionData.session.user.id;

    const { data, error } = await this._supabase
      .from('usuarios')
      .select('usuario_id, nombre, apellido, email')
      .eq('usuario_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  // 🔹 Actualizar datos personales (nombre, apellidos, correo)
  async actualizarPerfil(perfil: { nombre: string; apellido: string; email: string }) {
    const { data: sessionData } = await this._supabase.auth.getSession();
    if (!sessionData.session?.user) throw new Error('No hay sesión activa');

    const userId = sessionData.session.user.id;

    const { data, error } = await this._supabase
      .from('usuarios')
      .update({
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        email: perfil.email,
      })
      .eq('usuario_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
  
  async cambiarPassword(actual: string, nueva: string) {
    // 1. Obtener sesión
    const { data: sessionData, error: sessionError } = await this._supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) throw new Error('No hay sesión activa');

    const user = sessionData.session.user;

    // 2. Reautenticar (verificar contraseña actual)
    const { error: signInError } = await this._supabase.auth.signInWithPassword({
      email: user.email,
      password: actual,
    });

    if (signInError) {
      throw new Error('La contraseña actual es incorrecta');
    }

    // 3. Si pasa la verificación, actualizar la contraseña
    const { error: updateError } = await this._supabase.auth.updateUser({
      password: nueva,
    });

    if (updateError) throw updateError;

    // 4. Éxito
    return { success: true };
  }
}
