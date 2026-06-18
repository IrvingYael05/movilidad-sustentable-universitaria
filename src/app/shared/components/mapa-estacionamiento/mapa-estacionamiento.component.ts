import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SupabaseService } from '../../data-access/supabase.service';

interface ElementoEstatico {
  tipo: string;
  puntos: string;
  texto: string;
  centro_x: number;
  centro_y: number;
}

interface CajonSVG {
  espacio_id: number;
  identificador: string;
  puntos: string;
  centro_x: number;
  centro_y: number;
  disponible?: boolean;
}

@Component({
  selector: 'app-mapa-estacionamiento',
  standalone: true,
  imports: [CommonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './mapa-estacionamiento.component.html',
  styleUrls: ['./mapa-estacionamiento.component.scss'],
})
export class MapaEstacionamientoComponent implements OnInit, OnDestroy {
  cargando = true;
  private supabase = inject(SupabaseService).supabaseClient;
  private realtimeChannel: any;

  // Variables del Motor del Mapa
  zoom = 1;
  panX = 0;
  panY = 0;
  isDragging = false;
  startX = 0;
  startY = 0;

  // Datos del Mapa
  viewBoxConfig = '0 0 1000 800';
  elementosEstaticos: ElementoEstatico[] = [];
  cajonesGraficos: CajonSVG[] = [];

  async ngOnInit() {
    await this.cargarEstadoYConstruirMapa();
    this.iniciarSuscripcionOpenCV();
  }

  ngOnDestroy() {
    if (this.realtimeChannel) this.supabase.removeChannel(this.realtimeChannel);
  }

  async cargarEstadoYConstruirMapa() {
    try {
      // 1. CARGAR EL ARCHIVO JSON
      const response = await fetch('/coordenadas.json');
      if (!response.ok) throw new Error('No se pudo cargar el archivo JSON.');
      const mapaData = await response.json();

      // 2. ASIGNAR LOS DATOS DEL JSON A LAS VARIABLES
      this.viewBoxConfig = mapaData.config_visor.viewBox;
      this.elementosEstaticos = mapaData.elementos_estaticos;
      const coordenadasCajones: CajonSVG[] = mapaData.cajones;

      // 3. OBTENER EL ESTADO DE LA BD
      const { data, error } = await this.supabase
        .from('espaciosestacionamiento')
        .select('espacio_id, esta_disponible')
        .eq('lote_id', 3);

      if (error) throw error;
      const estadoBD = data || [];

      // FUSIÓN
      this.cajonesGraficos = coordenadasCajones.map((coord) => {
        const registroBD = estadoBD.find(
          (e: any) => e.espacio_id === coord.espacio_id,
        );
        return {
          ...coord,
          disponible: registroBD ? registroBD.esta_disponible : true,
        };
      });
    } catch (error) {
      console.error('Error inicializando el mapa:', error);
    } finally {
      this.cargando = false;
    }
  }

  private iniciarSuscripcionOpenCV() {
    this.realtimeChannel = this.supabase
      .channel('public:espaciosestacionamiento')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'espaciosestacionamiento' },
        (payload: any) => {
          const index = this.cajonesGraficos.findIndex(
            (c) => c.espacio_id === payload.new.espacio_id,
          );
          if (index !== -1) {
            this.cajonesGraficos[index].disponible =
              payload.new.esta_disponible;
          }
        },
      )
      .subscribe();
  }

  // ====================== MOTOR DE FÍSICAS ======================
  // Variables adicionales para el Pinch-to-Zoom
  initialPinchDistance: number | null = null;

  // Función matemática para calcular la distancia entre dos dedos
  private getPinchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomIn = event.deltaY < 0;
    this.zoom += zoomIn ? 0.1 : -0.1;
    this.zoom = Math.max(0.5, Math.min(this.zoom, 3));
  }

  onDragStart(event: MouseEvent | TouchEvent) {
    if (event instanceof TouchEvent && event.touches.length === 2) {
      // MODO ZOOM TÁCTIL: Guardamos la distancia inicial de los dos dedos
      this.initialPinchDistance = this.getPinchDistance(event.touches);
      this.isDragging = false; // Desactivamos el paneo mientras hacemos zoom
      return;
    }

    // MODO PANEO (1 dedo o Mouse)
    this.isDragging = true;
    const clientX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.startX = clientX - this.panX;
    this.startY = clientY - this.panY;
  }

  onDragMove(event: MouseEvent | TouchEvent) {
    if (
      event instanceof TouchEvent &&
      event.touches.length === 2 &&
      this.initialPinchDistance !== null
    ) {
      // MODO ZOOM TÁCTIL: Calculamos qué tanto se movieron los dedos
      event.preventDefault(); // Evita que la pantalla completa del celular haga zoom
      const currentDistance = this.getPinchDistance(event.touches);
      const distanceDiff = currentDistance - this.initialPinchDistance;

      // Ajustamos el zoom basado en la diferencia (sensibilidad del 1%)
      this.zoom += distanceDiff * 0.01;
      this.zoom = Math.max(0.5, Math.min(this.zoom, 3)); // Límite de zoom igual que en PC

      // Actualizamos la distancia inicial para el siguiente milisegundo
      this.initialPinchDistance = currentDistance;
      return;
    }

    // MODO PANEO (1 dedo o Mouse)
    if (!this.isDragging) return;
    event.preventDefault();
    const clientX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.panX = clientX - this.startX;
    this.panY = clientY - this.startY;
  }

  onDragEnd() {
    this.isDragging = false;
    this.initialPinchDistance = null; // Reseteamos el zoom táctil
  }
}
