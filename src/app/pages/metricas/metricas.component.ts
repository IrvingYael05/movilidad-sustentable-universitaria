import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricasService } from './services/metricas.service';
import { ChartData, ChartType } from 'chart.js';
import { ChartWrapperComponent } from '../../shared/components/chart-wrapper/chart-wrapper.component';

@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [CommonModule, ChartWrapperComponent],
  templateUrl: './metricas.component.html',
  styleUrl: './metricas.component.scss'
})
export class MetricasComponent implements OnInit {
  private metricasService = inject(MetricasService);
  
  // --- KPIs ---
  ocupacionActual = { ocupados: 0, total: 0, porcentaje: 0 };
  co2AhorradoAcumulado: number = 0; // en kg
  vehiculosAhorradosHoy: number = 0;
  vehiculosAhorradosProyeccion: number = 0;

  // --- Constantes de Sostenibilidad ---
  // Factor de CO2: 1.4 kg de CO2 por pasajero transportado (ejemplo basado en un viaje promedio)
  CO2_FACTOR_KG_PER_PASSENGER = 1.4; 

  // --- Datos de Gráficos ---
  viajesChartData: ChartData<'line'> | undefined;
  co2ChartData: ChartData<'bar'> | undefined;

  ngOnInit(): void {
    this.cargarMetricas();
  }

  async cargarMetricas() {
    await Promise.all([
      this.cargarOcupacionActual(),
      this.cargarDatosHistoricos()
    ]);
  }

  // ============== Lógica de Estacionamiento =============
  async cargarOcupacionActual() {
    const data = await this.metricasService.getOcupacionActual();
    this.ocupacionActual = {
      ...data,
      porcentaje: data.total > 0 ? (data.ocupados / data.total) * 100 : 0
    };
  }

  // ============== Lógica de Viajes y Sostenibilidad =============
  async cargarDatosHistoricos() {
    const rawData = await this.metricasService.getDatosHistoricosViajes();
    
    // 1. Procesamiento para KPIs y Regresión
    this.procesarDatosPasajeros(rawData.pasajeros);
    
    // 2. Preparar data para gráfico de Viajes
    const viajesByDay = this.groupDataByDay(rawData.viajes.map(v => v.creado_en));
    if (viajesByDay.size > 0) {
      this.viajesChartData = this.createLineChartData(viajesByDay, 'Viajes Compartidos Creados');
    }
  }

  procesarDatosPasajeros(pasajeros: { unido_en: string }[]) {
    const today = new Date().toISOString().split('T')[0];
    let totalPasajeros = 0;
    this.vehiculosAhorradosHoy = 0;
    
    // Agrupar por semana para la regresión (X: semana, Y: vehículos ahorrados)
    const passengersByWeek = this.groupDataByWeek(pasajeros.map(p => p.unido_en));
    
    // Contar pasajeros para KPIs
    pasajeros.forEach(p => {
        totalPasajeros++;
        if (p.unido_en.startsWith(today)) {
            this.vehiculosAhorradosHoy++;
        }
    });

    // Calcular el CO2 total ahorrado
    this.co2AhorradoAcumulado = totalPasajeros * this.CO2_FACTOR_KG_PER_PASSENGER;
    
    // Regresión lineal para la predicción
    this.predecirVehiculosAhorrados(passengersByWeek);

    // Data para el gráfico de CO2 (usando los datos semanales)
    if (passengersByWeek.length > 0) {
      const co2Data = passengersByWeek.map(p => p.count * this.CO2_FACTOR_KG_PER_PASSENGER);
      this.co2ChartData = {
          labels: passengersByWeek.map(p => `Semana ${p.week}`),
          datasets: [{
              data: co2Data,
              label: 'Reducción de CO2 (kg)',
              backgroundColor: '#1cc88a',
              hoverBackgroundColor: '#1cc88a',
          }]
      };
    }
  }

  // Algoritmo de Regresión Lineal (Implementación de Mínimos Cuadrados)
  predecirVehiculosAhorrados(weeklyData: { week: number, count: number }[]) {
    if (weeklyData.length < 2) {
      // Si no hay suficientes datos históricos, la predicción es el último valor o cero.
      this.vehiculosAhorradosProyeccion = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].count : 0;
      return;
    }
    
    const n = weeklyData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    // Calcular sumatorias
    weeklyData.forEach((point, index) => {
      const x = index + 1; // 1, 2, 3... (semanas relativas)
      const y = point.count; // Conteo de pasajeros (vehículos ahorrados)
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    // Denominador (D) y pendiente (m)
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      this.vehiculosAhorradosProyeccion = weeklyData[weeklyData.length - 1].count;
      return;
    }

    const m = (n * sumXY - sumX * sumY) / denominator; // Pendiente
    const b = (sumY - m * sumX) / n; // Intercepto

    // Proyectar la próxima semana (n+1)
    const nextWeek = n + 1;
    let prediction = m * nextWeek + b;

    this.vehiculosAhorradosProyeccion = Math.max(0, Math.round(prediction));
  }

  // ============== Funciones de Utilidad de Datos (Grouping) =============

  // Agrupa eventos por día (para Viajes)
  private groupDataByDay(dates: string[]): Map<string, number> {
    const map = new Map<string, number>();
    dates.forEach(dateStr => {
      const date = new Date(dateStr).toISOString().split('T')[0];
      map.set(date, (map.get(date) || 0) + 1);
    });
    return map;
  }

  // Agrupa eventos por semana (para Regresión y CO2)
  private groupDataByWeek(dates: string[]): { week: number, count: number }[] {
    const weeklyMap = new Map<number, number>();
    const datesParsed = dates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
    if (datesParsed.length === 0) return [];

    const firstDay = datesParsed[0];
    const firstWeek = this.getWeekNumber(firstDay);
    
    datesParsed.forEach(date => {
      // Calcular el número de semana relativo al primer dato
      const weekNum = this.getWeekNumber(date);
      // Ajustar para que la primera semana de datos sea '1'
      const relativeWeek = weekNum - firstWeek + 1; 
      weeklyMap.set(relativeWeek, (weeklyMap.get(relativeWeek) || 0) + 1);
    });
    
    // Convertir el mapa a un array ordenado
    return Array.from(weeklyMap.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week - b.week);
  }

  // Helper para obtener el número de semana del año
  private getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }
  
  // Función genérica para crear datos de gráfico de líneas/área
  private createLineChartData(dataMap: Map<string, number>, label: string): ChartData<'line'> {
    const labels = Array.from(dataMap.keys()).sort();
    const data = labels.map(key => dataMap.get(key) || 0);

    return {
      labels: labels,
      datasets: [{
        data: data,
        label: label,
        borderColor: '#4e73df',
        backgroundColor: 'rgba(78, 115, 223, 0.1)',
        tension: 0.3,
        fill: true,
      }]
    };
  }
}