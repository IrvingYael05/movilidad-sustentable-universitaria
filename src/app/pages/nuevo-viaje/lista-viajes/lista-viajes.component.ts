import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ViajesService } from '../services/viajes.service';
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
  isLoading = true;

  constructor(
    private viajesService: ViajesService,
    private supabase: SupabaseService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  /** 🔹 Al iniciar: obtiene el usuario y su viaje activo */
  async ngOnInit() {
    const { data: { user } } = await this.supabase.supabaseClient.auth.getUser();
    this.usuarioId = user?.id || null;

    if (this.usuarioId) {
      await this.cargarViajeActivo();
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

  /** 🔹 Cargar el viaje activo del conductor */
  async cargarViajeActivo() {
    try {
      this.isLoading = true;
      const { data, error } = await this.viajesService.obtenerViajeActivoConductor(this.usuarioId!);
      this.viajeActivo = data || null;

      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el viaje activo.',
          life: 3000,
        });
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

  /** 🔹 Confirmación antes de eliminar viaje */
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

  /** 🔹 Elimina o inactiva el viaje actual */
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

  /** 🔹 Navega al formulario de nuevo viaje */
  irANuevoViaje() {
    this.router.navigate(['/nuevo-viaje']);
  }
}
