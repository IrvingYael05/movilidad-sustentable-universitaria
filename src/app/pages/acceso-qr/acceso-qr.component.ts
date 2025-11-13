import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccesoQrService } from './services/acceso-qr.service';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-acceso-qr',
  standalone: true,
  imports: [CommonModule, QRCodeComponent], 
  templateUrl: './acceso-qr.component.html',
  styleUrls: ['./acceso-qr.component.scss'],
})
export class AccesoQrComponent implements OnInit {
  private accesoQrService = inject(AccesoQrService);

  tokenQR: string | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  async ngOnInit() {
    await this.generarCodigoQR();
  }

  async generarCodigoQR() {
    this.isLoading = true;
    this.errorMessage = null;
    try {
      const viaje = await this.accesoQrService.getActiveTravel();
      if (!viaje) {
        throw new Error('No tienes un viaje activo para generar un código QR.');
      }
      this.tokenQR = await this.accesoQrService.getTokenQR(viaje.viaje_id);
    } catch (error: any) {
      this.errorMessage = error.message || 'Ocurrió un error inesperado.';
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }
}