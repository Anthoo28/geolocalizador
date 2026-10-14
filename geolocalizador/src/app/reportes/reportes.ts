import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar';
import { IncidenciaService, Incidencia as IncidenciaModel } from '../services/incidencia';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class ReportesComponent implements OnInit, AfterViewInit {
  private incidenciaService = inject(IncidenciaService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  // Pestañas activas: 'generar' o 'historial'
  tabActiva: 'generar' | 'historial' = 'generar';

  // Objeto de reporte sincronizado con el formulario
  reporte = {
    tipoReporte: 'Incidencias por periodo',
    fechaInicio: '',
    fechaFin: '',
    sector: 'Todos',
    formato: 'PDF' as 'PDF' | 'Excel'
  };

  // Datos reales y sectores dinámicos del backend
  incidencias: IncidenciaModel[] = [];
  sectoresDisponibles: string[] = [];
  totalIncidencias: number = 0;
  datosGrafico: { label: string; count: number; porcentaje: number; color: string }[] = [];

  private chart: any;
  private ChartLib: any;

  ngOnInit(): void {
    // Inicializar fechas por defecto (mes actual)
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.reporte.fechaInicio = primerDia.toISOString().split('T')[0];
    this.reporte.fechaFin = hoy.toISOString().split('T')[0];

    // Cargar la data real desde el backend
    this.cargarIncidenciasBackend();
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const chartModule = await import('chart.js/auto');
      this.ChartLib = chartModule.default || chartModule;
    }
  }

  cargarIncidenciasBackend(): void {
    this.incidenciaService.getIncidencias().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.incidencias = res;
        } else if (res && Array.isArray(res.data)) {
          this.incidencias = res.data;
        } else if (res && Array.isArray(res.incidencias)) {
          this.incidencias = res.incidencias;
        } else {
          this.incidencias = [];
        }

        // 🟢 Extracción robusta de sectores únicos (abarcando sector, ubicacionSector o sectorIncidencia)
        const sectoresSet = new Set<string>();
        this.incidencias.forEach((inc: any) => {
          const sec = inc.sector || inc.ubicacionSector || inc.sectorIncidencia;
          if (sec && typeof sec === 'string' && sec.trim() !== '') {
            sectoresSet.add(sec.trim());
          }
        });
        this.sectoresDisponibles = Array.from(sectoresSet);

        // Procesar y agrupar la data real
        this.procesarDatosReporte();
      },
      error: (err) => {
        console.error('Error al cargar incidencias para reportes:', err);
      }
    });
  }

  // Método que filtra y agrupa la data del backend según los filtros seleccionados
  procesarDatosReporte(): void {
    const filtradas = this.incidencias.filter((inc: any) => {
      let coincideFecha = true;
      if (this.reporte.fechaInicio && inc.fechaHora) {
        coincideFecha = coincideFecha && new Date(inc.fechaHora) >= new Date(this.reporte.fechaInicio);
      }
      if (this.reporte.fechaFin && inc.fechaHora) {
        coincideFecha = coincideFecha && new Date(inc.fechaHora) <= new Date(this.reporte.fechaFin + 'T23:59:59');
      }

      let coincideSector = true;
      if (this.reporte.sector && this.reporte.sector !== 'Todos') {
        const sectorInc = inc.sector || inc.ubicacionSector || inc.sectorIncidencia || '';
        coincideSector = sectorInc.trim().toLowerCase() === this.reporte.sector.trim().toLowerCase();
      }

      return coincideFecha && coincideSector;
    });

    this.totalIncidencias = filtradas.length;

    // Agrupar dinámicamente por tipo de delito
    const conteoTipos: { [key: string]: number } = {};
    filtradas.forEach((inc: any) => {
      const tipo = inc.tipoDelito || inc.tipo || 'Sin especificar';
      conteoTipos[tipo] = (conteoTipos[tipo] || 0) + 1;
    });

    // Paleta de colores corporativa
    const colores = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#475569'];
    let index = 0;

    this.datosGrafico = Object.keys(conteoTipos).map(tipo => {
      const count = conteoTipos[tipo];
      const porcentaje = this.totalIncidencias > 0 ? Math.round((count / this.totalIncidencias) * 100) : 0;
      const color = colores[index % colores.length];
      index++;
      return { label: tipo, count, porcentaje, color };
    });

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // Renderizar o actualizar el gráfico de Chart.js
    if (isPlatformBrowser(this.platformId) && this.ChartLib) {
      setTimeout(() => this.initDonutChart(), 50);
    }
  }

  private initDonutChart(): void {
    const canvas = document.getElementById('reportDonutChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new this.ChartLib(canvas, {
      type: 'doughnut',
      data: {
        labels: this.datosGrafico.map(d => d.label),
        datasets: [{
          data: this.datosGrafico.map(d => d.count),
          backgroundColor: this.datosGrafico.map(d => d.color),
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // Se ejecuta al cambiar cualquier filtro
  onFiltroChange(): void {
    this.procesarDatosReporte();
  }

  seleccionarFormato(formato: 'PDF' | 'Excel'): void {
    this.reporte.formato = formato;
  }

  generarReporte(): void {
    alert(`Reporte generado exitosamente en formato ${this.reporte.formato} con ${this.totalIncidencias} registros analizados.`);
  }
}