import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

interface VehiculoProfile {
  vehiculo_id: string;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  ano: number;
}

interface UserProfile {
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  estado: string;
  roles: string[];
  vehiculo: VehiculoProfile | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _supabase = inject(SupabaseService).supabaseClient;
  private currentUserProfile = new BehaviorSubject<UserProfile | null>(null);
  public currentUserProfile$ = this.currentUserProfile.asObservable();

  constructor() {
    this._supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        this.loadUserProfile(session.user.id);

        if (event === 'SIGNED_IN') {
          const pendingReg = localStorage.getItem('pendingRegistration');
          if (!pendingReg) return;

          try {
            const pendingData = JSON.parse(pendingReg);

            if (pendingData.email === session.user.email) {
              await this.completeRegistration(pendingData);
              localStorage.removeItem('pendingRegistration');
            }
          } catch (error) {
            console.error('Error al completar registro:', error);
          }
        }
      } else {
        this.currentUserProfile.next(null);
        return;
      }
    });
  }

  session() {
    return this._supabase.auth.getSession();
  }

  signUp(Credential: SignUpWithPasswordCredentials) {
    return this._supabase.auth.signUp(Credential);
  }

  logIn(Credential: SignUpWithPasswordCredentials) {
    return this._supabase.auth.signInWithPassword(Credential);
  }

  logOut() {
    return this._supabase.auth.signOut();
  }

  async completeRegistration(data: {
    perfil: { nombre: string; apellido_p: string; apellido_m: string };
    email: string;
    vehiculo?: {
      placa: string;
      marca: string;
      modelo: string;
      color: string;
      ano: string;
    } | null;
  }) {
    const { data: sessionData } = await this.session();
    if (!sessionData.session?.user) {
      throw new Error('No hay sesión activa');
    }
    const userId = sessionData.session.user.id;

    const userData = {
      usuario_id: userId,
      nombre: data.perfil.nombre,
      apellido: `${data.perfil.apellido_p} ${data.perfil.apellido_m}`.trim(),
      email: data.email,
      estado: 'activo',
    };

    const result = await this._supabase.from('usuarios').upsert(userData);

    if (data.vehiculo) {
      const vehicleResult = await this._supabase.from('vehiculos').insert({
        propietario_id: userId,
        placa: data.vehiculo.placa,
        marca: data.vehiculo.marca,
        modelo: data.vehiculo.modelo,
        color: data.vehiculo.color,
        ano: data.vehiculo.ano ? parseInt(data.vehiculo.ano, 10) : null,
      });
      if (vehicleResult.error) {
        console.error('Error insertando vehículo:', vehicleResult.error);
        throw vehicleResult.error;
      }
    }

    return result;
  }

  async loadUserProfile(userId: string) {
    try {
      const { data, error } = await this._supabase
        .from('usuarios')
        .select(
          `
          usuario_id,
          nombre,
          apellido,
          email,
          estado,
          usuarioroles (
            roles (
              nombre_rol
            )
          ),
          vehiculos (*)
        `
        )
        .eq('usuario_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const userProfile: UserProfile = {
          usuario_id: data.usuario_id,
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          estado: data.estado,
          roles: data.usuarioroles.map((ur: any) => ur.roles.nombre_rol),
          vehiculo:
            data.vehiculos && data.vehiculos.length > 0
              ? data.vehiculos[0]
              : null,
        };
        this.currentUserProfile.next(userProfile);
      }
    } catch (error) {
      console.error('Error al cargar el perfil del usuario:', error);
      this.currentUserProfile.next(null);
    }
  } 
}
