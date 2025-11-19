import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart'; // npm install chart.js
import { MetricasService } from './services/metricas.service';

@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [CommonModule, ChartModule],
  templateUrl: './metricas.component.html',
  styles: [`
    .card {
      background: var(--surface-card);
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 1px -1px rgba(0,0,0,0.2), 0 1px 1px 0 rgba(0,0,0,0.14), 0 1px 3px 0 rgba(0,0,0,0.12);
    }
  `]
})
export class MetricasComponent implements OnInit {
  private metricasService = inject(MetricasService);

  dataCO2: any;
  optionsCO2: any;
  ocupacionActual: number = 0;

  ngOnInit() {
    this.cargarDatos();
    this.initChartOptions();
  }

  async cargarDatos() {
    const viajes = await this.metricasService.obtenerDatosHistoricos();
    this.ocupacionActual = await this.metricasService.obtenerOcupacionActual() || 0;

    if (viajes) {
      this.calcularMetricasCO2(viajes);
    }
  }

  calcularMetricasCO2(viajes: any[]) {
    // 1. Procesar datos reales
    // Supuesto: 1 viaje compartido ahorra aprox 2kg de CO2 promedio vs coches individuales
    const datosPorFecha: Record<string, number> = {};
    
    viajes.forEach(v => {
      const fecha = new Date(v.creado_en).toLocaleDateString();
      // El ahorro es proporcional a los pasajeros extra
      const pasajeros = v.pasajeros ? v.pasajeros[0].count : 0; 
      const ahorro = pasajeros * 2; // 2kg por pasajero extra (ejemplo)
      
      datosPorFecha[fecha] = (datosPorFecha[fecha] || 0) + ahorro;
    });

    const labels = Object.keys(datosPorFecha);
    const dataReales = Object.values(datosPorFecha);

    // 2. Generar Predicción (Regresión Lineal Simple: y = mx + b)
    // Transformamos fechas a índices (0, 1, 2...) para la matemática
    const x = dataReales.map((_, i) => i); 
    const y = dataReales;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + (xi * y[i]), 0);
    const sumXX = x.reduce((sum, xi) => sum + (xi * xi), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generamos puntos para la línea de tendencia (incluyendo 3 días futuros)
    const dataPrediccion = [];
    for(let i = 0; i < n + 3; i++) {
       dataPrediccion.push(slope * i + intercept);
    }
    
    // Añadimos etiquetas futuras
    const labelsFuturos = [...labels, 'Día +1', 'Día +2', 'Día +3'];

    // 3. Configurar Gráfica
    this.dataCO2 = {
      labels: labelsFuturos,
      datasets: [
        {
          label: 'Ahorro Real (kg CO2)',
          data: dataReales,
          fill: false,
          borderColor: '#42A5F5',
          tension: .4
        },
        {
          label: 'Tendencia (Predicción)',
          data: dataPrediccion,
          fill: false,
          borderColor: '#FFA726',
          borderDash: [5, 5], // Línea punteada para predicción
          tension: 0
        }
      ]
    };
  }

  initChartOptions() {
    this.optionsCO2 = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: { labels: { color: '#495057' } }
      },
      scales: {
        x: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } },
        y: { ticks: { color: '#495057' }, grid: { color: '#ebedef' } }
      }
    };
  }
}