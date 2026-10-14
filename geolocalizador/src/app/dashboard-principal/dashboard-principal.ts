import { Component, inject, ChangeDetectorRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar';
import { timeout } from 'rxjs/operators';
import { DashboardService, DashboardMetricasResponse } from '../services/dashboard';
import Chart from 'chart.js/auto';
import { HeaderComponent } from '../components/header/header';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  templateUrl: './dashboard-principal.html',
  styleUrl: './dashboard-principal.css'
})
export class DashboardPrincipalComponent {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  isLoading: boolean = true;
  metricas: DashboardMetricasResponse | null = null;
  usuario: any = null;
  
  // Referencias a los gráficos
  private donutChart: any = null;
  private barChart: any = null;
  private lineChart: any = null;

  constructor() {
    // Se ejecuta EXCLUSIVAMENTE en el navegador, evitando peticiones fantasma desde el servidor SSR
    afterNextRender(() => {
      this.obtenerUsuarioSesion();
      this.cargarMetricas();
    });
  }

  obtenerUsuarioSesion(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('usuario');
      if (userStr) {
        try {
          this.usuario = JSON.parse(userStr);
        } catch (e) {
          console.error('Error al parsear el usuario del localStorage:', e);
        }
      }
    }
  }

  get totalGraficoTipo(): number {
    const porTipo = (this.metricas as any)?.graficos?.porTipo || [];
    return porTipo.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);
  }

  getColorByType(tipo: string): string {
    switch (tipo?.toUpperCase()) {
      case 'ROBO': return '#3B82F6';
      case 'HURTO': return '#10B981';
      case 'ACCIDENTES': return '#F59E0B';
      case 'VIOLENCIA': return '#EF4444';
      case 'DISTURBIOS': return '#8B5CF6';
      default: return '#6B7280';
    }
  }

  cargarMetricas(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.dashboardService.getMetricas().pipe(
      timeout(12000)
    ).subscribe({
      next: (data) => {
        this.metricas = data;
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderCharts(data), 50);
      },
      error: (error: any) => {
        console.error('Error al cargar las métricas:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderCharts(null), 50);
      }
    });
  }

  renderCharts(rawMetrics: DashboardMetricasResponse | null): void {
    if (typeof document === 'undefined') {
      return;
    }

    const data = rawMetrics as any;

    if(this.donutChart) this.donutChart.destroy();
    if(this.barChart) this.barChart.destroy();
    if(this.lineChart) this.lineChart.destroy();

    // 1. Gráfico Circular (Donut) - Incidencias por tipo
    const donutCtx = document.getElementById('donutChart') as HTMLCanvasElement;
    if (donutCtx) {
      const porTipo = data?.graficos?.porTipo || [];
      const tiposLabels = porTipo.length > 0 ? porTipo.map((item: any) => item._id) : ['Robo'];
      const tiposValues = porTipo.length > 0 ? porTipo.map((item: any) => item.total) : [3];
      const backgroundColors = porTipo.length > 0 
        ? porTipo.map((item: any) => this.getColorByType(item._id)) 
        : ['#3B82F6'];

      this.donutChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: tiposLabels,
          datasets: [{ data: tiposValues, backgroundColor: backgroundColors, borderWidth: 0 }]
        },
        options: {
          cutout: '75%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

    // 2. Gráfico de Barras - Incidencias por sector
    const barCtx = document.getElementById('barChart') as HTMLCanvasElement;
    if (barCtx) {
      const porSector = data?.graficos?.porSector || [];
      const sectoresLabels = porSector.length > 0 
        ? porSector.map((item: any) => item.infoSector?.[0]?.nombre || item._id) 
        : ['Sector Centro'];
      const sectoresValues = porSector.length > 0 
        ? porSector.map((item: any) => item.total) 
        : [3];

      const maxSectorValue = Math.max(...sectoresValues, 0);

      this.barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: sectoresLabels,
          datasets: [{
            label: 'Incidencias',
            data: sectoresValues,
            backgroundColor: '#4F46E5',
            borderRadius: 4,
            barThickness: 12
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { 
              beginAtZero: true,
              grid: { display: false }, 
              border: { display: false },
              ticks: { precision: 0, stepSize: maxSectorValue <= 10 ? 1 : undefined }
            },
            y: { grid: { display: false }, border: { display: false } }
          }
        }
      });
    }

    // 3. Gráfico de Líneas - Últimos 7 días
    const lineCtx = document.getElementById('lineChart') as HTMLCanvasElement;
    if (lineCtx) {
      const diasLabels = data?.graficos?.ultimos7Dias?.labels || ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const registradasValues = data?.graficos?.ultimos7Dias?.registradas || [0, 0, 0, 0, 0, 1, 2];
      const atendidasValues = data?.graficos?.ultimos7Dias?.atendidas || [0, 0, 0, 0, 0, 0, 1];

      this.lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: diasLabels,
          datasets: [
            { label: 'Registradas', data: registradasValues, borderColor: '#4F46E5', tension: 0.4, borderWidth: 2, pointRadius: 3 },
            { label: 'Atendidas', data: atendidasValues, borderColor: '#10B981', tension: 0.4, borderWidth: 2, pointRadius: 3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true } } },
          scales: {
            y: { beginAtZero: true, border: { display: false }, ticks: { stepSize: 1, precision: 0 } },
            x: { grid: { display: false }, border: { display: false } }
          }
        }
      });
    }
  }
}