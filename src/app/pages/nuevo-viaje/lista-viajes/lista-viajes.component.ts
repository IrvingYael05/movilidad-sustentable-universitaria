import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ViajesService, SolicitudViaje, PasajeroViaje } from '../services/viajes.service';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lista-viajes',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, ConfirmDialogModule],
  templateUrl: './lista-viajes.component.html',
  styleUrls: ['./lista-viajes.component.scss'],
  providers: [MessageService, ConfirmationService],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' })),
      ]),
    ]),
  ],
})
export class ListaViajesComponent implements OnInit {
  usuarioId: string | null = null;
  viajeActivo: any = null;
  solicitudesPendientes: SolicitudViaje[] = [];
  pasajerosConfirmados: PasajeroViaje[] = [];
  isLoading = true;
  isLoadingSolicitudes = false;
  esPasajero = false; // 🔹 Bandera para distinguir si es pasajero

  constructor(
    private viajesService: ViajesService,
    private supabase: SupabaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  /** Al iniciar: obtiene el usuario y su viaje activo */
  async ngOnInit() {
    const { data: { user } } = await this.supabase.supabaseClient.auth.getUser();
    this.usuarioId = user?.id || null;

    if (this.usuarioId) {
      await this.cargarViajeComoPasajero();
      if (!this.viajeActivo) await this.cargarViajeActivo();
    } else {
      this.isLoading = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Sesión no iniciada',
        detail: 'Por favor inicia sesión para ver tus viajes.',
        life: 3000,
      });
    }
  }

  /** Cargar el viaje activo del conductor */
  async cargarViajeActivo() {
    try {
      this.isLoading = true;
      const { data, error } = await this.viajesService.obtenerViajeActivoConductor(this.usuarioId!);
      this.viajeActivo = data || null;
      this.esPasajero = false;

      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el viaje activo.',
          life: 3000,
        });
      }

      if (this.viajeActivo) {
        await this.cargarSolicitudes();
        await this.cargarPasajeros();
      }
    } catch (err) {
      console.error('Error al cargar viaje activo:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error inesperado',
        detail: 'Ocurrió un problema al cargar el viaje.',
        life: 3000,
      });
    } finally {
      this.isLoading = false;
    }
  }

  /** 🔹 Cargar el viaje activo del usuario como PASAJERO */
  async cargarViajeComoPasajero() {
    try {
      this.isLoading = true;

      const { data, error } = await this.supabase.supabaseClient
        .from('solicitudesviaje')
        .select(`
          solicitud_id,
          estado_solicitud,
          viaje_id,
          viajes (
            viaje_id,
            lugar_salida,
            lugar_llegada,
            hora_salida,
            asientos_disponibles,
            conductor:conductor_id (
              usuario_id,
              nombre,
              apellido,
              email
            ),
            vehiculo_id
          )
        `)
        .eq('pasajero_id', this.usuarioId)
        .eq('estado_solicitud', 'aceptada')
        .maybeSingle();

      if (error) throw error;

      console.log('🚗 Resultado Supabase:', data);

      if (data && data.viajes) {
        const viaje = data.viajes;

        // 🔹 Si no vienen datos del vehículo, los obtenemos manualmente
        if (!viaje.vehiculo && viaje.vehiculo_id) {
          const { data: vehiculoData, error: vehiculoError } = await this.supabase.supabaseClient
            .from('vehiculos')
            .select('placa, marca, modelo, color')
            .eq('vehiculo_id', viaje.vehiculo_id)
            .maybeSingle();

          if (vehiculoError) {
            console.warn('No se pudo obtener datos del vehículo:', vehiculoError);
          } else if (vehiculoData) {
            viaje.vehiculo = vehiculoData;
            console.log('Vehículo cargado manualmente:', vehiculoData);
          }
        }

        this.viajeActivo = viaje;
        this.esPasajero = true;
        console.log('Viaje del pasajero cargado:', this.viajeActivo);
        await this.cargarPasajeros();
      } else {
        this.viajeActivo = null;
        this.esPasajero = false;
        console.warn('No se encontró viaje activo como pasajero.');
      }
    } catch (error) {
      console.error(' Error al cargar viaje como pasajero:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error al cargar viaje',
        detail: 'No se pudo obtener el viaje como pasajero.',
        life: 3000,
      });
    } finally {
      this.isLoading = false;
    }
  }

  /** Cargar solicitudes pendientes del viaje activo */
  async cargarSolicitudes() {
    if (!this.viajeActivo) return;
    try {
      this.isLoadingSolicitudes = true;
      const { data, error } = await this.viajesService.obtenerSolicitudesViaje(
        this.viajeActivo.viaje_id
      );
      this.solicitudesPendientes = error ? [] : data || [];
    } catch (err) {
      console.error('Error al cargar solicitudes:', err);
      this.solicitudesPendientes = [];
    } finally {
      this.isLoadingSolicitudes = false;
    }
  }

  /** Cargar pasajeros confirmados del viaje activo */
  async cargarPasajeros() {
    if (!this.viajeActivo) return;
    try {
      const { data, error } = await this.viajesService.obtenerPasajerosViaje(this.viajeActivo.viaje_id);
      this.pasajerosConfirmados = error ? [] : data || [];
    } catch (err) {
      console.error('Error al cargar pasajeros:', err);
      this.pasajerosConfirmados = [];
    }
  }

  /** Aceptar una solicitud */
  async aceptarSolicitud(solicitud: SolicitudViaje) {
    if (this.viajeActivo.asientos_disponibles <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin asientos',
        detail: 'No hay asientos disponibles para este viaje.',
        life: 3000,
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Deseas aceptar la solicitud de ${solicitud.pasajero.nombre} ${solicitud.pasajero.apellido}?`,
      header: 'Confirmar aceptación',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Sí, aceptar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text',
      accept: async () => {
        try {
          const { data, error } = await this.viajesService.aceptarSolicitud(
            solicitud.solicitud_id,
            solicitud.viaje_id,
            solicitud.pasajero_id
          );

          if (!error && data) {
            this.messageService.add({
              severity: 'success',
              summary: 'Solicitud aceptada',
              detail: `${solicitud.pasajero.nombre} ha sido agregado al viaje.`,
              life: 3000,
            });
            await this.cargarViajeActivo();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo aceptar la solicitud.',
              life: 3000,
            });
          }
        } catch (error) {
          console.error('Error al aceptar solicitud:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error inesperado',
            detail: 'Ocurrió un problema al aceptar la solicitud.',
            life: 3000,
          });
        }
      },
    });
  }

  /** Rechazar una solicitud */
  async rechazarSolicitud(solicitud: SolicitudViaje) {
    this.confirmationService.confirm({
      message: `¿Deseas rechazar la solicitud de ${solicitud.pasajero.nombre} ${solicitud.pasajero.apellido}?`,
      header: 'Confirmar rechazo',
      icon: 'pi pi-times-circle',
      acceptLabel: 'Sí, rechazar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: async () => {
        try {
          const { data, error } = await this.viajesService.rechazarSolicitud(solicitud.solicitud_id);
          if (!error && data) {
            this.messageService.add({
              severity: 'info',
              summary: 'Solicitud rechazada',
              detail: 'La solicitud ha sido rechazada.',
              life: 3000,
            });
            await this.cargarSolicitudes();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo rechazar la solicitud.',
              life: 3000,
            });
          }
        } catch (error) {
          console.error('Error al rechazar solicitud:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error inesperado',
            detail: 'Ocurrió un problema al rechazar la solicitud.',
            life: 3000,
          });
        }
      },
    });
  }

  /** Confirmación antes de eliminar viaje */
  confirmarEliminar(viajeId: string) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar este viaje?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.eliminarViaje(viajeId),
    });
  }

  /** Elimina o inactiva el viaje actual */
  async eliminarViaje(viajeId: string) {
    try {
      const { data, error } = await this.viajesService.actualizarEstadoViaje(viajeId, 'inactivo');
      if (!error && data) {
        this.messageService.add({
          severity: 'success',
          summary: 'Viaje eliminado',
          detail: 'Tu viaje ha sido eliminado exitosamente.',
          life: 3000,
        });
        this.viajeActivo = null;
        this.solicitudesPendientes = [];
        this.pasajerosConfirmados = [];
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el viaje. Inténtalo nuevamente.',
          life: 3000,
        });
      }
    } catch (error) {
      console.error('Error al eliminar viaje:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error inesperado',
        detail: 'Ocurrió un problema al eliminar el viaje.',
        life: 3000,
      });
    }
  }

  irANuevoViaje() {
    this.router.navigate(['/nuevo-viaje']);
  }

  /** 🔹 Permite que el pasajero salga del viaje actual */
  async salirDelViaje() {
    if (!this.viajeActivo || !this.usuarioId) return;

    this.confirmationService.confirm({
      message: '¿Seguro que deseas salir de este viaje?',
      header: 'Salir del viaje',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Sí, salir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: async () => {
        try {
          const { error } = await this.supabase.supabaseClient
            .from('pasajerosviaje')
            .delete()
            .eq('viaje_id', this.viajeActivo.viaje_id)
            .eq('pasajero_id', this.usuarioId);

          if (error) throw error;

          await this.supabase.supabaseClient
            .from('solicitudesviaje')
            .update({ estado_solicitud: 'cancelada' })
            .eq('viaje_id', this.viajeActivo.viaje_id)
            .eq('pasajero_id', this.usuarioId);

          const nuevosAsientos = (this.viajeActivo.asientos_disponibles || 0) + 1;
          await this.supabase.supabaseClient
            .from('viajes')
            .update({ asientos_disponibles: nuevosAsientos })
            .eq('viaje_id', this.viajeActivo.viaje_id);

          this.viajeActivo = null;
          this.esPasajero = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Has salido del viaje',
            detail: 'Tu lugar ha sido liberado correctamente.',
            life: 3000,
          });
        } catch (error) {
          console.error('Error al salir del viaje:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo salir del viaje. Inténtalo de nuevo.',
            life: 3000,
          });
        }
      },
    });
  }
}
