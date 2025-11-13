import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar'; // <--- IMPORTANTE
import { ConfirmationService, MessageService } from 'primeng/api';

// Servicios e Interfaces
import { ViajesService, SolicitudViaje, PasajeroViaje } from '../services/viajes.service';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { AuthService } from '../../../auth/services/auth.service';

interface ViajeForm {
  calle: string;
  numeroExterior: string;
  codigoPostal: string;
  colonia: string;
  hora: Date | null; // <--- CAMBIO: Ahora es Date
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
    ConfirmDialogModule,
    InputTextModule,
    CalendarModule // <--- AGREGADO
  ],
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
  // Inyecciones
  private authService = inject(AuthService);
  private viajesService = inject(ViajesService);
  private supabase = inject(SupabaseService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

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
    hora: null, // <--- INICIALIZA EN NULL
    lugaresDisponibles: 1,
  };
  pasajerosList: number[] = [1];
  isPublishing = false;

  async ngOnInit() {
    const { data: { user } } = await this.supabase.supabaseClient.auth.getUser();
    this.usuarioId = user?.id || null;

    if (this.usuarioId) {
      this.authService.currentUserProfile$.subscribe(profile => {
        if (profile) {
          this.esConductor = profile.roles.includes('conductor');
        }
      });

      await this.cargarDatosIniciales();
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

  async cargarDatosIniciales() {
    this.isLoading = true;
    await this.cargarViajeComoPasajero();
    
    if (!this.viajeActivo) {
      await this.cargarViajeActivo();
    }
    
    if (!this.viajeActivo && this.esConductor) {
      await this.verificarVehiculo();
    }

    this.isLoading = false;
  }

  // ... (Métodos de carga: cargarViajeActivo, cargarViajeComoPasajero, cargarSolicitudes, cargarPasajeros se mantienen igual)
  async cargarViajeActivo() {
    try {
      const { data } = await this.viajesService.obtenerViajeActivoConductor(this.usuarioId!);
      this.viajeActivo = data || null;
      this.esPasajero = false;
      if (this.viajeActivo) {
        await this.cargarSolicitudes();
        await this.cargarPasajeros();
      }
    } catch (err) { console.error(err); }
  }

  async cargarViajeComoPasajero() {
    try {
      const { data } = await this.supabase.supabaseClient
        .from('solicitudesviaje')
        .select(`*, viajes (*, conductor:conductor_id(*), vehiculo_id)`)
        .eq('pasajero_id', this.usuarioId)
        .eq('estado_solicitud', 'aceptada')
        .maybeSingle();

      if (data && data.viajes) {
        const viaje = data.viajes;
        // Cargar vehículo manualmente si falta
        if (!viaje.vehiculo && viaje.vehiculo_id) {
            const { data: vehiculo } = await this.supabase.supabaseClient
                .from('vehiculos').select('*').eq('vehiculo_id', viaje.vehiculo_id).single();
            viaje.vehiculo = vehiculo;
        }
        this.viajeActivo = viaje;
        this.esPasajero = true;
        await this.cargarPasajeros();
      } else {
        this.viajeActivo = null;
        this.esPasajero = false;
      }
    } catch (error) { console.error(error); }
  }

  async cargarSolicitudes() {
    if (!this.viajeActivo) return;
    this.isLoadingSolicitudes = true;
    const { data } = await this.viajesService.obtenerSolicitudesViaje(this.viajeActivo.viaje_id);
    this.solicitudesPendientes = data || [];
    this.isLoadingSolicitudes = false;
  }

  async cargarPasajeros() {
    if (!this.viajeActivo) return;
    const { data } = await this.viajesService.obtenerPasajerosViaje(this.viajeActivo.viaje_id);
    this.pasajerosConfirmados = data || [];
  }

  // ... (Métodos aceptar/rechazar/eliminar/salir se mantienen igual, omitidos por brevedad, el código anterior funciona bien)
  async aceptarSolicitud(solicitud: SolicitudViaje) {
    this.confirmationService.confirm({
        message: `¿Aceptar a ${solicitud.pasajero.nombre}?`,
        header: 'Confirmar',
        icon: 'pi pi-check-circle',
        acceptButtonStyleClass: 'p-button-success',
        accept: async () => {
            await this.viajesService.aceptarSolicitud(solicitud.solicitud_id, solicitud.viaje_id, solicitud.pasajero_id);
            this.messageService.add({ severity: 'success', summary: 'Aceptado', detail: 'Pasajero agregado.' });
            await this.cargarViajeActivo();
        }
    });
  }

  async rechazarSolicitud(solicitud: SolicitudViaje) {
    this.confirmationService.confirm({
        message: `¿Rechazar a ${solicitud.pasajero.nombre}?`,
        header: 'Rechazar',
        icon: 'pi pi-times-circle',
        acceptButtonStyleClass: 'p-button-danger',
        accept: async () => {
            await this.viajesService.rechazarSolicitud(solicitud.solicitud_id);
            this.messageService.add({ severity: 'info', summary: 'Rechazado', detail: 'Solicitud rechazada.' });
            await this.cargarSolicitudes();
        }
    });
  }

  confirmarEliminar(viajeId: string) {
    this.confirmationService.confirm({
        message: '¿Eliminar este viaje?',
        header: 'Confirmar',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => this.eliminarViaje(viajeId)
    });
  }

  async eliminarViaje(viajeId: string) {
    await this.viajesService.actualizarEstadoViaje(viajeId, 'inactivo');
    this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Viaje finalizado.' });
    this.viajeActivo = null;
    this.solicitudesPendientes = [];
    this.pasajerosConfirmados = [];
    if (this.esConductor) await this.verificarVehiculo();
  }

  async salirDelViaje() {
    this.confirmationService.confirm({
        message: '¿Salir del viaje?',
        header: 'Salir',
        icon: 'pi pi-sign-out',
        acceptButtonStyleClass: 'p-button-danger',
        accept: async () => {
            // Lógica de salida...
             await this.supabase.supabaseClient.from('pasajerosviaje').delete()
                .eq('viaje_id', this.viajeActivo.viaje_id).eq('pasajero_id', this.usuarioId);
            await this.supabase.supabaseClient.from('solicitudesviaje').update({ estado_solicitud: 'cancelada' })
                .eq('viaje_id', this.viajeActivo.viaje_id).eq('pasajero_id', this.usuarioId);
            
            const nuevosAsientos = (this.viajeActivo.asientos_disponibles || 0) + 1;
            await this.supabase.supabaseClient.from('viajes').update({ asientos_disponibles: nuevosAsientos })
                .eq('viaje_id', this.viajeActivo.viaje_id);

            this.viajeActivo = null;
            this.esPasajero = false;
            this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Has salido del viaje.' });
            if (this.esConductor) await this.verificarVehiculo();
        }
    });
  }

  async verificarVehiculo() {
    try {
      const { data: vehiculo } = await this.supabase.supabaseClient
        .from('vehiculos').select('vehiculo_id').eq('propietario_id', this.usuarioId).single();
      if (vehiculo) this.vehiculoId = vehiculo.vehiculo_id;
    } catch (err) { console.error('Error verificando vehículo:', err); }
  }

  agregarPasajeroForm() {
    this.pasajerosList.push(this.pasajerosList.length + 1);
    this.viajeForm.lugaresDisponibles = this.pasajerosList.length;
  }

  eliminarPasajeroForm(index: number) {
    if (this.pasajerosList.length > 1) {
      this.pasajerosList.splice(index, 1);
      this.viajeForm.lugaresDisponibles = this.pasajerosList.length;
    }
  }

  async publicarViaje() {
    if (!this.validarFormulario()) return;
    if (!this.vehiculoId) {
      this.messageService.add({ severity: 'warn', summary: 'Sin vehículo', detail: 'Registra un vehículo primero.' });
      return;
    }

    this.isPublishing = true;

    try {
      // Formatear Hora Date a String "HH:MM"
      const horas = this.viajeForm.hora!.getHours().toString().padStart(2, '0');
      const minutos = this.viajeForm.hora!.getMinutes().toString().padStart(2, '0');
      const horaString = `${horas}:${minutos}`;

      const direccionCompleta = `${this.viajeForm.calle} ${this.viajeForm.numeroExterior}, ${this.viajeForm.colonia}, CP ${this.viajeForm.codigoPostal}`;

      const nuevoViaje = {
        conductor_id: this.usuarioId!,
        vehiculo_id: this.vehiculoId,
        lugar_salida: direccionCompleta,
        lugar_llegada: 'UTEQ',
        hora_salida: horaString, // <--- Enviamos el string formateado
        asientos_disponibles: this.viajeForm.lugaresDisponibles,
        estado_viaje: 'activo',
      };

      const { error } = await this.viajesService.crearViaje(nuevoViaje);
      if (error) throw error;

      this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'Viaje creado exitosamente.' });
      this.limpiarFormulario();
      await this.cargarViajeActivo();

    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo publicar.' });
    } finally {
      this.isPublishing = false;
    }
  }

  private validarFormulario(): boolean {
    const f = this.viajeForm;
    if (!f.calle || !f.numeroExterior || !f.colonia || !f.codigoPostal) {
      this.messageService.add({ severity: 'warn', detail: 'Completa la dirección.' });
      return false;
    }
    if (!f.hora) { // <--- Validación simple de objeto
      this.messageService.add({ severity: 'warn', detail: 'Ingresa una hora válida.' });
      return false;
    }
    return true;
  }

  private limpiarFormulario() {
    this.viajeForm = {
      calle: '', numeroExterior: '', codigoPostal: '', colonia: '', hora: null, lugaresDisponibles: 1
    };
    this.pasajerosList = [1];
  }
}