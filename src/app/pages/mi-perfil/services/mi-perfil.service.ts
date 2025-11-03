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

  // 🔹 Cambiar contraseña
  async cambiarPassword(actual: string, nueva: string) {
    const { data: sessionData } = await this._supabase.auth.getSession();
    if (!sessionData.session?.user) throw new Error('No hay sesión activa');

    const { data, error } = await this._supabase.auth.updateUser({
      password: nueva,
    });

    if (error) throw error;
    return data;
  }
}
