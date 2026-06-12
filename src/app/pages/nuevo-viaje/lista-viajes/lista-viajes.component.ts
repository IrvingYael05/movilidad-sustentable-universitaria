import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { GeocercaService } from '../../../shared/services/geocerca.service';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

// Servicios e Interfaces
import {
  ViajesService,
  SolicitudViaje,
  PasajeroViaje,
} from '../services/viajes.service';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { AuthService } from '../../../auth/services/auth.service';

interface ViajeForm {
  calle: string;
  numeroExterior: string;
  codigoPostal: string;
  colonia: string;
  hora: Date | null;
  lugaresDisponibles: number;
}

@Component({
  selector: 'app-lista-viajes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    InputTextModule,
    RouterModule,
  ],
  templateUrl: './lista-viajes.component.html',
  styleUrls: ['./lista-viajes.component.scss'],
  providers: [MessageService],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '500ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ opacity: 0, transform: 'translateY(20px)' }),
        ),
      ]),
    ]),
  ],
})
export class ListaViajesComponent implements OnInit, OnDestroy {
  // Inyecciones
  private authService = inject(AuthService);
  private viajesService = inject(ViajesService);
  private supabase = inject(SupabaseService);
  private messageService = inject(MessageService);
  private geocercaService = inject(GeocercaService);

  // Canales de Realtime
  private viajesChannel: any;
  private pasajerosChannel: any;
  private solicitudesChannel: any;

  // Estado Usuario
  usuarioId: string | null = null;
  esConductor = false;
  vehiculoId: string | null = null;

  // Estado Viaje Activo
  viajeActivo: any = null;
  solicitudesPendientes: SolicitudViaje[] = [];
  pasajerosConfirmados: PasajeroViaje[] = [];
  isLoading = true;
  isLoadingSolicitudes = false;
  esPasajero = false;

  // Estado Formulario (Nuevo Viaje)
  viajeForm: ViajeForm = {
    calle: '',
    numeroExterior: '',
    codigoPostal: '',
    colonia: '',
    hora: null,
    lugaresDisponibles: 1,
  };
  pasajerosList: number[] = [1];
  isPublishing = false;

  horaString: string = '';
  horaMinima: string = '';
  permisoGpsActivo: boolean = false;

  // ====================== MODAL CONFIRMACIÓN ======================
  confirmModalVisible = false;
  confirmModalData: any = {};
  private _confirmAction: ((confirmed: boolean) => void) | null = null;

  async ngOnInit() {
    const now = new Date();
    const limiteMinimo = new Date(now.getTime() + 30 * 60000);
    const hm = limiteMinimo.getHours().toString().padStart(2, '0');
    const mm = limiteMinimo.getMinutes().toString().padStart(2, '0');
    this.horaMinima = `${hm}:${mm}`;

    const {
      data: { user },
    } = await this.supabase.supabaseClient.auth.getUser();
    this.usuarioId = user?.id || null;

    if (this.usuarioId) {
      this.authService.currentUserProfile$.subscribe((profile) => {
        if (profile) {
          this.esConductor = profile.roles.includes('conductor');
        }
      });

      await this.verificarPermisoGPS();
      await this.cargarDatosIniciales();
      this.iniciarRealtimeSubscriptions();
    } else {
      this.isLoading = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Sesión no iniciada',
        detail: 'Por favor inicia sesión.',
        life: 3000,
      });
    }
  }

  ngOnDestroy() {
    this.limpiarRealtimeSubscriptions();
  }

  // ==================== REALTIME SUBSCRIPTIONS ====================
  private iniciarRealtimeSubscriptions() {
    if (!this.viajeActivo) return;

    // Suscripción a cambios en la tabla VIAJES
    this.viajesChannel = this.supabase.supabaseClient
      .channel(`viaje-${this.viajeActivo.viaje_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'viajes',
          filter: `viaje_id=eq.${this.viajeActivo.viaje_id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            this.viajeActivo.asientos_disponibles =
              payload.new.asientos_disponibles;

            if (payload.new.estado_viaje === 'inactivo') {
              this.messageService.add({
                severity: 'warn',
                summary: 'Viaje cancelado',
                detail: 'El conductor ha cancelado este viaje.',
                life: 5000,
              });
              this.viajeActivo = null;
              this.limpiarRealtimeSubscriptions();
            }
          } else if (payload.eventType === 'DELETE') {
            this.messageService.add({
              severity: 'error',
              summary: 'Viaje eliminado',
              detail: 'Este viaje ya no está disponible.',
              life: 5000,
            });
            this.viajeActivo = null;
            this.limpiarRealtimeSubscriptions();
          }
        },
      )
      .subscribe();

    // Suscripción a cambios en PASAJEROSVIAJE
    this.pasajerosChannel = this.supabase.supabaseClient
      .channel(`pasajeros-${this.viajeActivo.viaje_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pasajerosviaje',
          filter: `viaje_id=eq.${this.viajeActivo.viaje_id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            // Un pasajero se unió
            const nuevoPasajero = payload.new;
            this.viajesService
              .obtenerDetallesPasajero(nuevoPasajero.pasajero_id)
              .then((pasajero) => {
                if (pasajero) {
                  this.pasajerosConfirmados.push({
                    ...nuevoPasajero,
                    pasajero,
                  });
                  this.messageService.add({
                    severity: 'info',
                    summary: 'Nuevo Pasajero',
                    detail: `${pasajero.nombre} se ha unido al viaje.`,
                  });
                }
              });
          } else if (payload.eventType === 'DELETE') {
            // Un pasajero se fue
            const pasajeroEliminado = payload.old;
            const index = this.pasajerosConfirmados.findIndex(
              (p) => p.pasajero_id === pasajeroEliminado.pasajero_id,
            );

            if (index !== -1) {
              const pasajero = this.pasajerosConfirmados[index].pasajero;
              this.pasajerosConfirmados.splice(index, 1);
              this.messageService.add({
                severity: 'warn',
                summary: 'Pasajero se fue',
                detail: `${pasajero.nombre} ha salido del viaje.`,
              });
            }

            // Si el que se fue soy yo (como pasajero), reseteo mi vista
            if (
              this.esPasajero &&
              pasajeroEliminado.pasajero_id === this.usuarioId
            ) {
              this.salirDelViajeLocalmente();
            }
          }
        },
      )
      .subscribe();

    // Suscripción a SOLICITUDES (solo para conductores)
    if (!this.esPasajero) {
      this.solicitudesChannel = this.supabase.supabaseClient
        .channel(`solicitudes-${this.viajeActivo.viaje_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitudesviaje',
            filter: `viaje_id=eq.${this.viajeActivo.viaje_id}`,
          },
          (payload: any) => {
            if (
              payload.eventType === 'INSERT' &&
              payload.new.estado_solicitud === 'pendiente'
            ) {
              this.cargarSolicitudes();
              this.messageService.add({
                severity: 'info',
                summary: 'Nueva solicitud',
                detail: 'Tienes una nueva solicitud de viaje.',
                life: 3000,
              });
            } else if (
              payload.eventType === 'UPDATE' ||
              payload.eventType === 'DELETE'
            ) {
              this.cargarSolicitudes();
            }
          },
        )
        .subscribe();
    }
  }

  private limpiarRealtimeSubscriptions() {
    if (this.viajesChannel) {
      this.supabase.supabaseClient.removeChannel(this.viajesChannel);
      this.viajesChannel = undefined;
    }
    if (this.pasajerosChannel) {
      this.supabase.supabaseClient.removeChannel(this.pasajerosChannel);
      this.pasajerosChannel = undefined;
    }
    if (this.solicitudesChannel) {
      this.supabase.supabaseClient.removeChannel(this.solicitudesChannel);
      this.solicitudesChannel = undefined;
    }
  }

  // ==================== RESTO DEL CÓDIGO ====================
  async cargarDatosIniciales() {
    this.isLoading = true;
    await this.cargarViajeComoPasajero();

    if (!this.viajeActivo) {
      await this.cargarViajeActivo();
    }

    if (!this.viajeActivo && this.esConductor) {
      await this.verificarVehiculo();
      await this.prellenarFormularioUltimoViaje();
    }

    this.isLoading = false;
  }

  async cargarViajeActivo() {
    try {
      const { data } = await this.viajesService.obtenerViajeActivoConductor(
        this.usuarioId!,
      );
      this.viajeActivo = data || null;
      this.esPasajero = false;
      if (this.viajeActivo) {
        await this.cargarSolicitudes();
        await this.cargarPasajeros();

        this.geocercaService
          .iniciarRastreo(this.viajeActivo.viaje_id)
          .then((msg) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Ubicación Activa',
              detail: 'Monitoreando trayecto a la UTEQ.',
            });
            this.cargarDatosIniciales();
          })
          .catch((err) => console.log('Aviso de Geocerca:', err));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async cargarViajeComoPasajero() {
    try {
      const { data } = await this.supabase.supabaseClient
        .from('pasajerosviaje')
        .select(
          `
          viaje_id,
          viajes!inner (
            *,
            conductor:conductor_id(*),
            vehiculo:vehiculo_id(*)
          )
        `,
        )
        .eq('pasajero_id', this.usuarioId)
        .eq('viajes.estado_viaje', 'activo')
        .maybeSingle();

      if (data && data.viajes) {
        this.viajeActivo = data.viajes;
        this.esPasajero = true;
        await this.cargarPasajeros();
        this.iniciarRealtimeSubscriptions();
      } else {
        this.viajeActivo = null;
        this.esPasajero = false;
      }
    } catch (error) {
      console.error('Error al cargar viaje como pasajero:', error);
      this.viajeActivo = null;
      this.esPasajero = false;
    }
  }

  async cargarSolicitudes() {
    if (!this.viajeActivo) return;
    this.isLoadingSolicitudes = true;
    const { data } = await this.viajesService.obtenerSolicitudesViaje(
      this.viajeActivo.viaje_id,
    );
    this.solicitudesPendientes = data || [];
    this.isLoadingSolicitudes = false;
  }

  async cargarPasajeros() {
    if (!this.viajeActivo) return;
    const { data } = await this.viajesService.obtenerPasajerosViaje(
      this.viajeActivo.viaje_id,
    );
    this.pasajerosConfirmados = data || [];
  }

  async aceptarSolicitud(solicitud: SolicitudViaje) {
    this.openConfirmModal({
      header: 'Confirmar',
      message: `¿Aceptar a ${solicitud.pasajero.nombre} ${solicitud.pasajero.apellido}?`,
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      acceptClass: 'p-button-success',
      accept: async () => {
        await this.viajesService.aceptarSolicitud(
          solicitud.solicitud_id,
          solicitud.viaje_id,
          solicitud.pasajero_id,
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Aceptado',
          detail: 'Pasajero agregado.',
        });
        await this.cargarViajeActivo();
      },
    });
  }

  async rechazarSolicitud(solicitud: SolicitudViaje) {
    this.openConfirmModal({
      header: 'Rechazar',
      message: `¿Rechazar a ${solicitud.pasajero.nombre}?`,
      acceptLabel: 'Rechazar',
      acceptClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: async () => {
        await this.viajesService.rechazarSolicitud(solicitud.solicitud_id);
        this.messageService.add({
          severity: 'info',
          summary: 'Rechazado',
          detail: 'Solicitud rechazada.',
        });
        await this.cargarSolicitudes();
      },
    });
  }

  confirmarEliminar(viajeId: string) {
    this.openConfirmModal({
      header: 'Confirmar Eliminación',
      message:
        '¿Estás seguro de que quieres eliminar este viaje? Esta acción no se puede deshacer.',
      acceptLabel: 'Eliminar',
      acceptClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminarViaje(viajeId),
    });
  }

  async eliminarViaje(viajeId: string) {
    try {
      this.geocercaService.detenerRastreo();
      await this.supabase.supabaseClient
        .from('pasajerosviaje')
        .delete()
        .eq('viaje_id', viajeId);

      await this.supabase.supabaseClient
        .from('solicitudesviaje')
        .update({ estado_solicitud: 'cancelada' })
        .eq('viaje_id', viajeId)
        .in('estado_solicitud', ['pendiente', 'aceptada']);

      await this.viajesService.actualizarEstadoViaje(viajeId, 'inactivo');

      this.messageService.add({
        severity: 'success',
        summary: 'Eliminado',
        detail: 'Viaje cancelado. Se notificó a los pasajeros.',
      });

      this.limpiarRealtimeSubscriptions();
      this.viajeActivo = null;
      this.solicitudesPendientes = [];
      this.pasajerosConfirmados = [];

      if (this.esConductor) {
        await this.verificarVehiculo();
        await this.prellenarFormularioUltimoViaje();
      }
    } catch (error) {
      console.error('Error al eliminar viaje:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cancelar el viaje.',
      });
    }
  }

  confirmarEliminarPasajero(pasajero: PasajeroViaje) {
    this.openConfirmModal({
      header: 'Eliminar Pasajero',
      message: `¿Estás seguro de que quieres eliminar a ${pasajero.pasajero.nombre} del viaje?`,
      acceptLabel: 'Eliminar',
      acceptClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: async () => {
        const { error } = await this.viajesService.eliminarPasajero(
          pasajero.viaje_id,
          pasajero.pasajero_id,
        );

        // CAMBIO: Actualizamos el estado a 'rechazada' para mantener historial
        if (!error) {
          await this.supabase.supabaseClient
            .from('solicitudesviaje')
            .update({ estado_solicitud: 'rechazada' })
            .eq('viaje_id', pasajero.viaje_id)
            .eq('pasajero_id', pasajero.pasajero_id);
        }

        if (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar al pasajero.',
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Eliminado',
            detail: 'El pasajero ha sido eliminado del viaje.',
          });
        }
      },
    });
  }

  async salirDelViaje() {
    this.openConfirmModal({
      header: 'Salir del Viaje',
      message: '¿Estás seguro de que quieres salir de este viaje?',
      acceptLabel: 'Salir',
      acceptClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: async () => {
        const { error } = await this.viajesService.salirDelViaje(
          this.viajeActivo.viaje_id,
          this.usuarioId!,
        );

        // CAMBIO: Actualizamos el estado a 'cancelada' para mantener historial
        if (!error) {
          await this.supabase.supabaseClient
            .from('solicitudesviaje')
            .update({ estado_solicitud: 'cancelada' })
            .eq('viaje_id', this.viajeActivo.viaje_id)
            .eq('pasajero_id', this.usuarioId);
        }

        if (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo salir del viaje.',
          });
          return;
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Ya no formas parte del viaje.',
          });
          this.salirDelViajeLocalmente();
        }
      },
    });
  }

  private salirDelViajeLocalmente() {
    this.limpiarRealtimeSubscriptions();
    this.viajeActivo = null;
    this.esPasajero = false;
    this.solicitudesPendientes = [];
    this.pasajerosConfirmados = [];
    this.cargarDatosIniciales();
  }

  async verificarVehiculo() {
    try {
      const { data: vehiculo } = await this.supabase.supabaseClient
        .from('vehiculos')
        .select('vehiculo_id')
        .eq('propietario_id', this.usuarioId)
        .single();
      if (vehiculo) this.vehiculoId = vehiculo.vehiculo_id;
    } catch (err) {
      console.error('Error verificando vehículo:', err);
    }
  }

  async publicarViaje() {
    if (this.isPublishing) return;
    if (!this.validarFormulario()) return;
    if (!this.vehiculoId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin vehículo',
        detail: 'Registra un vehículo primero.',
      });
      return;
    }

    const validacionTiempo = this.validarFormatoHorario(this.horaString);
    if (!validacionTiempo.valido) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Horario Inválido',
        detail: validacionTiempo.mensaje,
      });
      return;
    }

    this.isPublishing = true;

    try {
      await this.geocercaService.solicitarPermisos();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'GPS Obligatorio',
        detail:
          typeof error === 'string' ? error : 'Permiso de ubicación denegado.',
      });
      this.isPublishing = false;
      return;
    }

    try {
      const horaString = this.horaString;
      const direccionCompleta = `${this.viajeForm.calle} ${this.viajeForm.numeroExterior}, ${this.viajeForm.colonia}, CP ${this.viajeForm.codigoPostal}`;

      const nuevoViaje = {
        conductor_id: this.usuarioId!,
        vehiculo_id: this.vehiculoId,
        lugar_salida: direccionCompleta,
        lugar_llegada: 'UTEQ',
        hora_salida: horaString,
        asientos_disponibles: this.viajeForm.lugaresDisponibles,
        estado_viaje: 'activo',
      };

      const { error } = await this.viajesService.crearViaje(nuevoViaje);
      if (error) throw error;

      this.messageService.add({
        severity: 'success',
        summary: 'Publicado',
        detail: 'Viaje creado exitosamente.',
      });

      this.limpiarFormulario();

      await this.cargarViajeActivo();
      this.iniciarRealtimeSubscriptions();

      if (this.viajeActivo) {
        this.geocercaService
          .iniciarRastreo(this.viajeActivo.viaje_id)
          .then((msg) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Llegada Registrada',
              detail: msg,
            });
            this.salirDelViajeLocalmente();
          })
          .catch((err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error de GPS',
              detail: err,
            });
          });
      }
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo publicar.',
      });
    } finally {
      this.isPublishing = false;
    }
  }

  async registrarAccesoManual() {
    if (!this.viajeActivo) return;

    this.openConfirmModal({
      header: 'Registrar Ingreso Manual',
      message:
        'El sistema verificará tu ubicación actual. Úsalo solo si estás en la entrada de la universidad y el acceso automático no funcionó.',
      acceptLabel: 'Verificar y Entrar',
      rejectClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          this.isLoading = true;

          const estaCerca =
            await this.geocercaService.validarUbicacionManual(0.5);

          if (!estaCerca) {
            this.messageService.add({
              severity: 'error',
              summary: 'Lejos de la UTEQ',
              detail:
                'Debes estar cerca de la universidad para usar el ingreso manual.',
            });
            return;
          }

          this.geocercaService.detenerRastreo();

          const { error } = await this.supabase.supabaseClient.rpc(
            'registrar_entrada_geocerca',
            {
              p_viaje_id: this.viajeActivo.viaje_id,
            },
          );

          if (error) throw error;

          this.messageService.add({
            severity: 'success',
            summary: 'Ingreso Manual',
            detail: 'Acceso validado y registrado.',
          });
          this.salirDelViajeLocalmente();
        } catch (err: any) {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error de GPS',
            detail:
              typeof err === 'string'
                ? err
                : 'No se pudo verificar la ubicación.',
          });
        } finally {
          this.isLoading = false;
        }
      },
    });
  }

  // ====================== LÓGICA DE HORARIOS ======================
  calcularHoraPredeterminada(horaUltimoViaje?: string): string {
    const ahora = new Date();
    // Limite mínimo: Hora actual + 30 minutos
    const limiteMinimo = new Date(ahora.getTime() + 30 * 60000);

    if (horaUltimoViaje) {
      const [uHoras, uMinutos] = horaUltimoViaje.split(':').map(Number);
      const horaPropuesta = new Date();
      horaPropuesta.setHours(uHoras, uMinutos, 0, 0);

      // Regla: Solo verificamos que no pase de las 22:00 y que dé 30 min de margen
      if (uHoras <= 22 && horaPropuesta >= limiteMinimo) {
        return horaUltimoViaje;
      }
    }

    let horasClave = limiteMinimo.getHours();
    let minutosClave = limiteMinimo.getMinutes();

    // Si la hora calculada se pasa de las 10:00 PM, la topamos a las 22:00 exactas
    if (horasClave > 22 || (horasClave === 22 && minutosClave > 0)) {
      horasClave = 22;
      minutosClave = 0;
    }

    const hh = horasClave.toString().padStart(2, '0');
    const mm = minutosClave.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  validarFormatoHorario(horaIngresada: string): {
    valido: boolean;
    mensaje: string;
  } {
    if (!horaIngresada)
      return { valido: false, mensaje: 'Por favor, selecciona una hora.' };

    const ahora = new Date();
    const [horas, minutos] = horaIngresada.split(':').map(Number);

    const fechaHoraViaje = new Date();
    fechaHoraViaje.setHours(horas, minutos, 0, 0);

    const limiteMinimo = new Date(ahora.getTime() + 30 * 60000);

    // 1. Validar únicamente el tope máximo (10:00 PM)
    if (horas > 22 || (horas === 22 && minutos > 0)) {
      return {
        valido: false,
        mensaje:
          'El horario máximo para registrar llegadas a la universidad es a las 10:00 pm.',
      };
    }

    // 2. Validar anticipación de 30 minutos (Protege contra viajes en el pasado)
    if (fechaHoraViaje < limiteMinimo) {
      return {
        valido: false,
        mensaje:
          'El viaje debe programarse con al menos 30 min de anticipación.',
      };
    }

    return { valido: true, mensaje: '' };
  }

  // ====================== LÓGICA PERMISO GPS ======================
  verificarPermisoGPS() {
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          this.permisoGpsActivo = result.state === 'granted';

          // Esto escucha si el usuario cambia el permiso en tiempo real
          result.onchange = () => {
            this.permisoGpsActivo = result.state === 'granted';
          };
        })
        .catch(() => {
          this.permisoGpsActivo = false;
        });
    } else {
      // Respaldo para navegadores antiguos o iOS Safari viejo
      this.permisoGpsActivo = false;
    }
  }

  // ====================== LÓGICA FORMULARIO NUEVO VIAJE ======================

  private validarFormulario(): boolean {
    const f = this.viajeForm;

    if (!f.calle || !f.numeroExterior || !f.colonia || !f.codigoPostal) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Completa la dirección.',
      });
      return false;
    }

    if (!this.horaString) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Ingresa una hora válida.',
      });
      return false;
    }

    if (f.lugaresDisponibles < 1 || f.lugaresDisponibles > 4) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Los lugares disponibles deben estar entre 1 y 4.',
      });
      return false;
    }

    return true;
  }

  private limpiarFormulario() {
    this.viajeForm = {
      calle: '',
      numeroExterior: '',
      codigoPostal: '',
      colonia: '',
      hora: null,
      lugaresDisponibles: 1,
    };
    this.horaString = '';
  }

  // ====================== MODAL MANUAL ======================
  modalVisible = false;
  searchQuery = '';
  resultadosBusqueda: any[] = [];

  openModal() {
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
    this.searchQuery = '';
    this.resultadosBusqueda = [];
  }

  async buscarUsuario() {
    if (this.searchQuery.trim().length < 2) return;

    const texto = this.searchQuery.trim();

    const { data, error } = await this.supabase.supabaseClient
      .from('usuarios')
      .select('usuario_id, nombre, apellido, email')
      .or(
        `nombre.ilike.%${texto}%,apellido.ilike.%${texto}%,email.ilike.%${texto}%`,
      )
      .neq('usuario_id', this.usuarioId)
      .limit(10);

    if (error) {
      console.error('Error buscando usuarios:', error);
    }

    this.resultadosBusqueda = data || [];
  }

  async agregarPasajeroManual(user: any) {
    if (user.usuario_id === this.usuarioId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail: 'No puedes agregarte a tu propio viaje.',
      });
      return;
    }

    if (this.viajeActivo.asientos_disponibles <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin asientos',
        detail: 'No hay lugares disponibles.',
      });
      return;
    }

    await this.supabase.supabaseClient.from('pasajerosviaje').insert({
      viaje_id: this.viajeActivo.viaje_id,
      pasajero_id: user.usuario_id,
    });

    const nuevosAsientos = this.viajeActivo.asientos_disponibles - 1;

    await this.supabase.supabaseClient
      .from('viajes')
      .update({ asientos_disponibles: nuevosAsientos })
      .eq('viaje_id', this.viajeActivo.viaje_id);

    this.messageService.add({
      severity: 'success',
      summary: 'Pasajero agregado',
      detail: `${user.nombre} agregado al viaje`,
    });

    this.closeModal();
  }

  limitarCP(event: any) {
    const value = event.target.value;
    event.target.value = value.replace(/\D/g, '').slice(0, 5);
    this.viajeForm.codigoPostal = event.target.value;
  }

  limitarNumeroExterior(event: any) {
    const value = event.target.value;
    event.target.value = value.replace(/\D/g, '').slice(0, 4);
    this.viajeForm.numeroExterior = event.target.value;
  }

  soloTexto(event: any) {
    const value = event.target.value;
    event.target.value = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    this.viajeForm.calle = event.target.value;
  }

  // ====================== LÓGICA MODAL CONFIRMACIÓN ======================
  openConfirmModal(data: {
    header: string;
    message: string;
    acceptLabel?: string;
    rejectLabel?: string;
    acceptClass?: string;
    rejectClass?: string;
    accept: () => void;
  }) {
    this.confirmModalData = data;
    this.confirmModalVisible = true;
    this._confirmAction = (confirmed: boolean) => {
      if (confirmed) {
        data.accept();
      }
      this.confirmModalVisible = false;
      this._confirmAction = null;
    };
  }

  onConfirm(confirmed: boolean) {
    if (this._confirmAction) {
      this._confirmAction(confirmed);
    }
  }

  async prellenarFormularioUltimoViaje() {
    if (!this.usuarioId) return;

    const { data: ultimoViaje } =
      await this.viajesService.obtenerUltimoViajeRegistrado(this.usuarioId);

    if (ultimoViaje) {
      // Intentar parsear la dirección: "Calle 123, Colonia, CP 12345"
      const direccion = ultimoViaje.lugar_salida || '';
      // Regex flexible:
      // Grupo 1: Calle (todo hasta el último espacio antes de un número y coma)
      // Grupo 2: Número (dígitos antes de la primera coma)
      // Grupo 3: Colonia (entre la primera coma y ", CP")
      // Grupo 4: CP (dígitos al final)
      const regex = /^(.*?) (\d+), (.*?), CP (\d+)$/;
      const match = direccion.match(regex);

      if (match) {
        this.viajeForm.calle = match[1];
        this.viajeForm.numeroExterior = match[2];
        this.viajeForm.colonia = match[3];
        this.viajeForm.codigoPostal = match[4];
      }

      // Prellenar hora (extraer HH:MM y pasar por el filtro inteligente)
      let horaFormateadaBase = '';
      if (ultimoViaje.hora_salida) {
        const fecha = new Date(ultimoViaje.hora_salida);
        const horas = fecha.getHours().toString().padStart(2, '0');
        const minutos = fecha.getMinutes().toString().padStart(2, '0');
        horaFormateadaBase = `${horas}:${minutos}`;
      }

      // Aquí usamos la nueva función para garantizar que la hora sugerida sea válida HOY
      this.horaString = this.calcularHoraPredeterminada(horaFormateadaBase);

      // Prellenar asientos (asegurando rango 1-4)
      let asientos = ultimoViaje.asientos_disponibles;
      if (asientos < 1) asientos = 1;
      if (asientos > 4) asientos = 4;
      this.viajeForm.lugaresDisponibles = asientos;
      this.pasajerosList = Array(asientos).fill(1); // Actualizar visualización de iconos

      this.messageService.add({
        severity: 'info',
        summary: 'Historial',
        detail: 'Se cargaron los datos de tu último viaje.',
        life: 3000,
      });
    }
  }
}
