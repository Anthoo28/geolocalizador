import { Component, inject, ChangeDetectorRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar';
import { timeout } from 'rxjs/operators';
import { DashboardService, DashboardMetricasResponse } from '../services/dashboard';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule,SidebarComponent],
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
    afterNextRender(() => {
      this.obtenerUsuarioSesion();
      this.cargarMetricas();
    });
  }

  obtenerUsuarioSesion(): void {
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      try {
        this.usuario = JSON.parse(userStr);
      } catch (e) {
        console.error('Error al parsear el usuario del localStorage:', e);
      }
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
        // Damos un pequeño respiro al DOM antes de renderizar canvas
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (error: any) => {
        console.error('Error o tiempo de espera agotado al cargar las métricas:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        // Renderizamos los gráficos estáticos de todas formas para mantener la UI visual
        setTimeout(() => this.renderCharts(), 100);
      }
    });
  }

  renderCharts(): void {
    // Destruir instancias previas si existen (útil al recargar)
    if(this.donutChart) this.donutChart.destroy();
    if(this.barChart) this.barChart.destroy();
    if(this.lineChart) this.lineChart.destroy();

    // 1. Gráfico Circular (Donut) - Incidencias por tipo
    const donutCtx = document.getElementById('donutChart') as HTMLCanvasElement;
    if (donutCtx) {
      this.donutChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: ['Robo', 'Hurto', 'Accidentes', 'Violencia', 'Disturbios'],
          datasets: [{
            data: [30, 20, 15, 25, 10],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
            borderWidth: 0
            // Eliminamos "cutout" de aquí para evitar el error de TypeScript
          }]
        },
        options: {
          cutout: '75%', // Grosor del anillo movido a options
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } } // Leyenda oculta, la hacemos en HTML
        }
      });
    }

    // 2. Gráfico de Barras - Incidencias por sector
    const barCtx = document.getElementById('barChart') as HTMLCanvasElement;
    if (barCtx) {
      this.barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: ['Sector Centro', 'Sector San Isidro', 'Sector La Tinguiña', 'Sector Parcona', 'Sector Subtanjalla'],
          datasets: [{
            label: 'Incidencias',
            data: [45, 30, 25, 15, 10],
            backgroundColor: '#4F46E5',
            borderRadius: 4,
            barThickness: 12
          }]
        },
        options: {
          indexAxis: 'y', // Barras horizontales
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: { grid: { display: false }, border: { display: false } }
          }
        }
      });
    }

    // 3. Gráfico de Líneas - Últimos 7 días
    const lineCtx = document.getElementById('lineChart') as HTMLCanvasElement;
    if (lineCtx) {
      this.lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
          datasets: [
            {
              label: 'Registradas',
              data: [12, 19, 15, 25, 22, 30, 28],
              borderColor: '#4F46E5',
              tension: 0.4, // Curvatura de la línea
              borderWidth: 2,
              pointRadius: 0
            },
            {
              label: 'Atendidas',
              data: [10, 15, 12, 20, 18, 25, 24],
              borderColor: '#10B981',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true } }
          },
          scales: {
            y: { beginAtZero: true, border: { display: false } },
            x: { grid: { display: false }, border: { display: false } }
          }
        }
      });
    }
  }
}