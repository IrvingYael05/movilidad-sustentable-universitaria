import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core'; // <--- MODIFICADO
import { CommonModule } from '@angular/common';
import { AccesoQrService, QrTokenResponse, AsignacionActiva } from './services/acceso-qr.service';
import { QRCodeComponent } from 'angularx-qrcode';
import { MapaEstacionamientoComponent } from '../../shared/components/mapa-estacionamiento/mapa-estacionamiento.component';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-acceso-qr',
  standalone: true,
  imports: [CommonModule, QRCodeComponent, MapaEstacionamientoComponent, ButtonModule], 
  templateUrl: './acceso-qr.component.html',
  styleUrls: ['./acceso-qr.component.scss'],
})
export class AccesoQrComponent implements OnInit, OnDestroy {
  
  private accesoQrService = inject(AccesoQrService);
  private messageService = inject(MessageService);
  private cdRef = inject(ChangeDetectorRef);

  // Estado de la vista
  tokenQR: string | null = null;
  estadoQR: 'disponible' | 'utilizado' | null = null;
  esPropietario = false; 
  isLoading = true;
  isMarkingExit = false;
  errorMessage: string | null = null;
  
  // Estado del mapa
  loteId: number = 3; 
  miLugarAsignadoId: number | null = null;

  //Estado del polling
  private pollInterval: any = null;

  async ngOnInit() {
    await this.generarCodigoQR();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  /**
   * Función principal: Obtiene el estado del QR y decide si inicia el polling.
   */
  async generarCodigoQR() {
    this.isLoading = true;
    this.errorMessage = null;
    this.miLugarAsignadoId = null; 
    
    this.stopPolling();

    try {
      // 1. Llamar al servicio
      const response = await this.accesoQrService.getTokenQR();
      
      this.tokenQR = response.token_qr;
      this.estadoQR = response.estado;
      this.esPropietario = response.es_propietario;

      // 2. Decidir el siguiente paso basado en el estado
      if (this.estadoQR === 'utilizado') {
        await this.cargarMiLugarAsignado();
      } 
      else if (this.estadoQR === 'disponible') {
        this.startPolling();
      }

    } catch (error: any) {
      this.errorMessage = error.message || 'Ocurrió un error inesperado.';
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Carga el ID del espacio asignado para mostrarlo en el mapa.
   */
  async cargarMiLugarAsignado() {
    try {
      const asignacion = await this.accesoQrService.getMiLugarAsignado();
      if (asignacion) {
        this.miLugarAsignadoId = asignacion.espacio_id;
      }
    } catch (error) {
      console.error('No se pudo cargar el lugar asignado:', error);
    }
  }

  /**
   * El usuario marca su salida.
   */
  async marcarSalida() {
    this.isMarkingExit = true;
    this.stopPolling();

    try {
      await this.accesoQrService.marcarSalida();
      this.messageService.add({
        severity: 'success',
        summary: 'Salida Registrada',
        detail: 'Tu lugar ha sido liberado y el viaje finalizado.',
        life: 3000
      });
      await this.generarCodigoQR();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo marcar la salida.',
        life: 3000
      });
    } finally {
      this.isMarkingExit = false;
    }
  }

  /**
   * Inicia un temporizador que verifica el estado del QR cada 2 segundos.
   */
  private startPolling() {
    // Asegurarse de que no haya otro polling ejecutándose
    this.stopPolling(); 

    this.pollInterval = setInterval(async () => {
      try {
        const response = await this.accesoQrService.getTokenQR();

        if (response.estado === 'utilizado' && this.estadoQR === 'disponible') {
          this.stopPolling();

          this.messageService.add({
            severity: 'success',
            summary: 'Acceso Autorizado',
            detail: 'Tu QR ha sido validado. Cargando mapa...',
            life: 3000
          });

          this.estadoQR = 'utilizado';
          await this.cargarMiLugarAsignado();

          this.cdRef.detectChanges(); 
        }
      } catch (error) {
        this.stopPolling(); // Detener si hay un error
      }
    }, 2000); // 2000 ms = 2 segundos
  }

  /**
   * Detiene y limpia el temporizador del polling.
   */
  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}