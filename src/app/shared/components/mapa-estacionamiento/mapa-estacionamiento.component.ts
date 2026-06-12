import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../data-access/supabase.service';

interface EspacioBD {
  espacio_id: number;
  esta_disponible: boolean;
}

interface CajonSVG {
  espacio_id: number;
  identificador: string;
  puntos: string; // Coordenadas del polígono de Python
  disponible: boolean; // Estado que viene de Supabase
}

@Component({
  selector: 'app-mapa-estacionamiento',
  standalone: true,
  imports: [CommonModule],
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

  // Los cajones combinados (Coordenadas Python + Estado BD)
  cajonesGraficos: CajonSVG[] = [];

  // Simulamos la exportación de Python (En producción vendrá de un .json real)
  private coordenadasPython = [
    {
      espacio_id: 1,
      identificador: 'A1',
      puntos: '100,100 200,100 220,250 80,250',
    },
    {
      espacio_id: 2,
      identificador: 'A2',
      puntos: '210,100 310,100 330,250 230,250',
    },
    {
      espacio_id: 3,
      identificador: 'A3',
      puntos: '320,100 420,100 440,250 340,250',
    },
  ];

  async ngOnInit() {
    await this.cargarEstadoYConstruirMapa();
    this.iniciarSuscripcionOpenCV();
  }

  ngOnDestroy() {
    if (this.realtimeChannel) this.supabase.removeChannel(this.realtimeChannel);
  }

  async cargarEstadoYConstruirMapa() {
    try {
      const { data } = await this.supabase
        .from('espaciosestacionamiento')
        .select('espacio_id, esta_disponible');
      const estadoBD = data || [];

      // Fusionamos las coordenadas con el estado actual
      this.cajonesGraficos = this.coordenadasPython.map((coord) => {
        const bd = estadoBD.find((e: any) => e.espacio_id === coord.espacio_id);
        return {
          ...coord,
          disponible: bd ? bd.esta_disponible : true,
        };
      });
    } catch (error) {
      console.error(error);
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
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomIn = event.deltaY < 0;
    this.zoom += zoomIn ? 0.1 : -0.1;
    this.zoom = Math.max(0.5, Math.min(this.zoom, 2)); // Limitamos el zoom entre 0.5x y 3x
  }

  onDragStart(event: MouseEvent | TouchEvent) {
    this.isDragging = true;
    const clientX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.startX = clientX - this.panX;
    this.startY = clientY - this.panY;
  }

  onDragMove(event: MouseEvent | TouchEvent) {
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
  }
}
