import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { SupabaseService } from '../../data-access/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Espacio {
  espacio_id: number;
  identificador_espacio: string;
  esta_disponible: boolean;
}

@Component({
  selector: 'app-mapa-estacionamiento',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './mapa-estacionamiento.component.html',
  styleUrls: ['./mapa-estacionamiento.component.scss']
})
export class MapaEstacionamientoComponent implements OnInit, OnDestroy {
  @Input() loteId: number = 3; 
  @Input() espacioAsignadoId: number | null = null;
  
  private supabase = inject(SupabaseService).supabaseClient;
  
  espaciosDinamicos: Espacio[] = []; 
  channel: RealtimeChannel | null = null;
  
  async ngOnInit() {
    await this.cargarEspacios();
    this.escucharCambiosEspacios();
  }

  async cargarEspacios() {
    const { data, error } = await this.supabase
      .from('espaciosestacionamiento')
      .select('*')
      .eq('lote_id', this.loteId)
      .order('identificador_espacio', { ascending: true });

    if (data) this.espaciosDinamicos = data;
  }

  escucharCambiosEspacios() {
    if (this.channel) this.supabase.removeChannel(this.channel);

    this.channel = this.supabase
      .channel('public:espaciosestacionamiento')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'espaciosestacionamiento',
          filter: `lote_id=eq.${this.loteId}`
        },
        (payload: { new: Espacio }) => this.handleUpdateEspacio(payload.new as Espacio)
      )
      .subscribe();
  }

  handleUpdateEspacio(espacioActualizado: Espacio) {
    const index = this.espaciosDinamicos.findIndex(e => e.espacio_id === espacioActualizado.espacio_id);
    if (index > -1) {
      this.espaciosDinamicos[index].esta_disponible = espacioActualizado.esta_disponible;
    }
  }

  // --- Funciones Helper para el HTML ---
  getLabel(espacio: Espacio): string {
    return espacio.identificador_espacio.split('-')[1] || espacio.identificador_espacio;
  }

  getClass(espacio: Espacio): any {
    return {
      'asignado': espacio.espacio_id === this.espacioAsignadoId,
      'ocupado': !espacio.esta_disponible && espacio.espacio_id !== this.espacioAsignadoId
    };
  }
  
  ngOnDestroy() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
    }
  }
}