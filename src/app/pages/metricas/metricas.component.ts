import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { MetricasService } from './services/metricas.service';
import { SupabaseService } from '../../shared/data-access/supabase.service';

@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    CalendarModule,
    ButtonModule,
  ],
  templateUrl: './metricas.component.html',
  styleUrls: ['./metricas.component.scss'],
})
export class MetricasComponent implements OnInit, OnDestroy {
  private metricasService = inject(MetricasService);
  private supabaseService = inject(SupabaseService);

  private realtimeChannel: any;

  // Variables de UI y Fechas
  rangoFechas: Date[] = [];
  cargando = false;

  // Variables de Datos
  volumenTotal: number = 0;
  dataHorasPico: any;
  dataModalidad: any;
  barChartOptions: any;
  pieChartOptions: any;
  promedioOcupacion: number = 0;
  cajonesLiberados: number = 0;
  dataEstadoViajes: any;
  datosEstacionamiento = {
    total: 0,
    libres: 0,
    ocupados: 0,
    ocupacion_pct: 0,
  };

  cargandoB = false;
  cargandoC = false;

  // Para guardar los datos crudos y poder exportarlos a CSV
  private rawDatosPico: any[] = [];
  private rawDatosModalidad: any[] = [];
  private rawDatosEstadoViajes: any[] = [];

  ngOnInit() {
    this.configurarOpcionesGraficas();
    this.establecerFechasPorDefecto();
    this.cargarMetricasSeccionA();
    this.cargarMetricasSeccionB();
    this.cargarMetricasSeccionC();

    this.suscribirseATiempoReal();
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabaseService.supabaseClient.removeChannel(this.realtimeChannel);
    }
  }

  establecerFechasPorDefecto() {
    // Por defecto: últimos 7 días hasta hoy al final del día
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);
    this.rangoFechas = [hace7Dias, hoy];
  }

  async cargarMetricasSeccionA() {
    if (!this.rangoFechas || !this.rangoFechas[0] || !this.rangoFechas[1])
      return;

    this.cargando = true;

    // Formateamos las fechas a formato ISO para PostgreSQL
    const inicio = this.rangoFechas[0].toISOString();
    // Al fin del día para que incluya todo el día seleccionado
    const fin = new Date(
      this.rangoFechas[1].setHours(23, 59, 59, 999),
    ).toISOString();

    try {
      // 1. Cargar Volumen
      this.volumenTotal = await this.metricasService.getVolumenTotal(
        inicio,
        fin,
      );

      // 2. Cargar Horas Pico
      this.rawDatosPico = await this.metricasService.getHorasPico(inicio, fin);
      this.dataHorasPico = {
        labels: this.rawDatosPico.map((d: any) => `${d.hora}:00`),
        datasets: [
          {
            label: 'Ingresos por Hora',
            backgroundColor: '#232e56',
            borderRadius: 6,
            data: this.rawDatosPico.map((d: any) => d.total_ingresos),
          },
        ],
      };

      // 3. Cargar Modalidad de Ingreso
      this.rawDatosModalidad = await this.metricasService.getModalidadIngreso(
        inicio,
        fin,
      );
      this.dataModalidad = {
        labels: this.rawDatosModalidad.map((d: any) => d.modalidad),
        datasets: [
          {
            data: this.rawDatosModalidad.map((d: any) => d.cantidad),
            backgroundColor: ['#3a8251', '#244e7c'],
            borderWidth: 0,
          },
        ],
      };
    } catch (error) {
      console.error('Error cargando la Sección A:', error);
    } finally {
      this.cargando = false;
    }
  }

  async cargarMetricasSeccionB() {
    if (!this.rangoFechas || !this.rangoFechas[0] || !this.rangoFechas[1])
      return;
    this.cargandoB = true;

    const inicio = this.rangoFechas[0].toISOString();
    const fin = new Date(
      this.rangoFechas[1].setHours(23, 59, 59, 999),
    ).toISOString();

    try {
      this.promedioOcupacion = await this.metricasService.getPromedioOcupacion(
        inicio,
        fin,
      );
      this.cajonesLiberados = await this.metricasService.getCajonesLiberados(
        inicio,
        fin,
      );

      this.rawDatosEstadoViajes = await this.metricasService.getEstadoViajes(
        inicio,
        fin,
      );

      // Asignar colores fijos según el estado para mantener semántica
      const colores = this.rawDatosEstadoViajes.map((d) => {
        if (d.estado === 'Completado') return '#3a8251'; // --success-color
        if (d.estado === 'Cancelado') return '#a82424'; // --error-color
        return '#cf6118'; // --warning-color (Programado)
      });

      this.dataEstadoViajes = {
        labels: this.rawDatosEstadoViajes.map((d: any) => d.estado),
        datasets: [
          {
            data: this.rawDatosEstadoViajes.map((d: any) => d.cantidad),
            backgroundColor: colores,
            borderWidth: 0,
          },
        ],
      };
    } catch (error) {
      console.error('Error cargando la Sección B:', error);
    } finally {
      this.cargandoB = false;
    }
  }

  async cargarMetricasSeccionC() {
    this.cargandoC = true;
    try {
      const data = await this.metricasService.getMonitorEstacionamiento(3);
      if (data) {
        this.datosEstacionamiento = data;
      }
    } catch (error) {
      console.error('Error cargando el monitor de estacionamiento:', error);
    } finally {
      this.cargandoC = false;
    }
  }

  suscribirseATiempoReal() {
    // Creamos un canal único para el Dashboard Directivo
    this.realtimeChannel = this.supabaseService.supabaseClient
      .channel('dashboard-directivo-avm')

      // 1. Escuchar la Sección A (Nuevos ingresos por geocerca)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'telemetria_ingresos' },
        (payload: any) => {
          console.log('📡 [AVM Realtime] Nuevo ingreso detectado:', payload);
          this.cargarMetricasSeccionA(); // Recarga las gráficas de afluencia
        },
      )

      // 2. Escuchar la Sección B (Viajes creados, completados o cancelados)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viajes' },
        (payload: any) => {
          console.log('📡 [AVM Realtime] Actualización en viajes:', payload);
          this.cargarMetricasSeccionB();
        },
      )

      // 3. Escuchar la Sección C (Cámara de OpenCV cambiando lugares a true/false)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'espaciosestacionamiento' },
        (payload: any) => {
          console.log('📡 [AVM Realtime] Actualización en espacios estacionamiento:', payload);
          this.cargarMetricasSeccionC();
        },
      )

      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado a Telemetría en Tiempo Real');
        }
      });
  }

  exportarReporte() {
    let csv = `Reporte AVM - Inteligencia de Movilidad\nRango: ${this.rangoFechas[0].toLocaleDateString()} al ${this.rangoFechas[1].toLocaleDateString()}\n\n`;

    // --- SECCIÓN A ---
    csv += `--- SECCION A: ANALITICA DE AFLUENCIA ---\n`;
    csv += `Volumen Total de Ingresos,${this.volumenTotal}\n\n`;
    csv += `Modalidad de Ingreso\nModalidad,Cantidad\n`;
    this.rawDatosModalidad.forEach(
      (m) => (csv += `${m.modalidad},${m.cantidad}\n`),
    );
    csv += `\nDistribucion de Horas Pico\nHora,Ingresos\n`;
    this.rawDatosPico.forEach(
      (h) => (csv += `${h.hora}:00,${h.total_ingresos}\n`),
    );

    // --- SECCIÓN B ---
    csv += `\n--- SECCION B: MOVILIDAD COMPARTIDA ---\n`;
    csv += `Ocupacion Promedio (Personas por Auto),${this.promedioOcupacion}\n`;
    csv += `Cajones Liberados Estimados,${this.cajonesLiberados}\n\n`;
    csv += `Estado de Viajes\nEstado,Cantidad\n`;
    this.rawDatosEstadoViajes.forEach(
      (v) => (csv += `${v.estado},${v.cantidad}\n`),
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Reporte_Metricas_AVM.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  configurarOpcionesGraficas() {
    const textColor = '#232e56';
    const textColorSecondary = '#71706f';
    const surfaceBorder = '#e2e8f0';
    const fontFamily = '"Poppins", sans-serif';

    // 1. Opciones exclusivas para Gráfica de Barras
    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // Ocultamos la leyenda para que se vea más limpio
        tooltip: {
          titleFont: { family: fontFamily },
          bodyFont: { family: fontFamily },
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            font: { family: fontFamily, weight: '500' },
          },
          grid: { display: false, drawBorder: false },
        },
        y: {
          ticks: {
            color: textColorSecondary,
            font: { family: fontFamily },
          },
          grid: { color: surfaceBorder, drawBorder: false },
        },
      },
    };

    // 2. Opciones exclusivas para Gráfica de Pastel
    this.pieChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            color: textColor,
            font: { family: fontFamily, size: 12, weight: '500' },
            padding: 20,
          },
        },
        tooltip: {
          titleFont: { family: fontFamily },
          bodyFont: { family: fontFamily },
        },
      },
    };
  }
}
