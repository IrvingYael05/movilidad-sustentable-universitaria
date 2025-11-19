import { Component, Input } from '@angular/core';
import { 
        ChartConfiguration, 
        ChartData, 
        ChartType,
        Chart,
        LinearScale, 
        CategoryScale, 
        BarController, 
        BarElement, 
        LineController, 
        PointElement, 
        LineElement,
        Tooltip, 
        Legend
    } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';

Chart.register(
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-chart-wrapper',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  // El template solo renderiza el elemento de ng2-charts
  template: `<canvas baseChart [data]="chartData" [options]="chartOptions" [type]="chartType"></canvas>`,
  styles: [`:host { display: block; height: 100%; }`]
})
export class ChartWrapperComponent {
  // Datos requeridos para el gráfico
  @Input() chartData!: ChartData;
  @Input() chartType: ChartType = 'line';
  
  // Opciones de configuración del gráfico (se pueden sobrescribir)
  @Input() chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };
}