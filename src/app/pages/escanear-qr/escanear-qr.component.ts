import { Component, OnDestroy, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { delay } from 'rxjs';

// 🔽 --- IMPORTS ADICIONALES DEL EJEMPLO --- 🔽
import {
  ScannerQRCodeResult,
  ScannerQRCodeConfig,       // Para la configuración
  NgxScannerQrcodeComponent, // Para ViewChild
  ScannerQRCodeDevice,       // Para la lista de cámaras
} from 'ngx-scanner-qrcode';
import { EscanearQrService, ScanResult } from './services/escanear-qr.service';

@Component({
  selector: 'app-escanear-qr',
  standalone: true,
  imports: [CommonModule, NgxScannerQrcodeComponent, DialogModule],
  templateUrl: './escanear-qr.component.html',
  styleUrls: ['./escanear-qr.component.scss'],
})
export class EscanearQrComponent implements AfterViewInit, OnDestroy {
  private escanerService = inject(EscanearQrService);

  showResultDialog = false;
  scanResult: ScanResult | null = null;
  isLoading = false;

  // 🔽 --- CÓDIGO DEL EJEMPLO ADAPTADO --- 🔽

  // 1. Configuración de la cámara
  public config: ScannerQRCodeConfig = {
    constraints: {
      video: {
        width: window.innerWidth, // Usar el ancho de la ventana
      },
    },
  };

  // 2. Referencia al componente del escáner en el HTML
  @ViewChild('action')
  action!: NgxScannerQrcodeComponent;

  // 3. Esperar a que el componente esté listo y luego iniciarlo
  ngAfterViewInit(): void {
    this.action.isReady.pipe(delay(1000)).subscribe(() => {
      this.handle(this.action, 'start');
    });
  }

  // 4. Se dispara al escanear un QR
  async onEvent(event: ScannerQRCodeResult[]) {
    if (!event || event.length === 0 || this.isLoading) {
      return;
    }

    const token = event[0].value;
    if (!token) return;

    this.isLoading = true;
    this.handle(this.action, 'stop'); // Detener cámara mientras procesamos

    try {
      this.scanResult = await this.escanerService.validarToken(token);
    } catch (error: any) {
      this.scanResult = { aprobado: false, motivo: error.message };
    } finally {
      this.isLoading = false;
      this.showResultDialog = true;
    }
  }

  // 5. Cierra el modal y reactiva el escáner
  closeDialog() {
    this.showResultDialog = false;
    this.scanResult = null;
    this.handle(this.action, 'start'); // Listo para el siguiente auto
  }

  // 6. Función de control (del ejemplo)
  public handle(action: any, fn: string): void {
    const playDeviceFacingBack = (devices: ScannerQRCodeDevice[]) => {
      // Busca la cámara trasera
      const device = devices.find(f =>
        /back|rear|environment/gi.test(f.label)
      );
      // Inicia esa cámara, o la primera que encuentre si no hay "back"
      action.playDevice(device ? device.deviceId : devices[0].deviceId);
    };

    if (fn === 'start') {
      action[fn](playDeviceFacingBack).subscribe(
        (r: any) => console.log(fn, r),
        alert
      );
    } else {
      action[fn]().subscribe((r: any) => console.log(fn, r), alert);
    }
  }

  ngOnDestroy() {
    // Detener la cámara al salir del componente
    if (this.action) {
      this.handle(this.action, 'stop');
    }
  }
}