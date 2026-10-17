import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar';
import { IncidenciaService, Incidencia as IncidenciaModel } from '../services/incidencia';
import { ApiService } from '../api.service';

// 🟢 Librerías para exportación en el Frontend
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class ReportesComponent implements OnInit, AfterViewInit {
  private incidenciaService = inject(IncidenciaService);
  private apiService = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  tabActiva: 'generar' | 'historial' = 'generar';

  reporte = {
    tipoReporte: 'Incidencias por periodo',
    fechaInicio: '',
    fechaFin: '',
    sector: 'Todos',
    formato: 'PDF' as 'PDF' | 'Excel'
  };

  incidencias: IncidenciaModel[] = [];
  incidenciasFiltradas: any[] = [];
  sectoresDisponibles: any[] = [];
  totalIncidencias: number = 0;
  datosGrafico: { label: string; count: number; porcentaje: number; color: string }[] = [];

  private chart: any;
  private ChartLib: any;

  ngOnInit(): void {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.reporte.fechaInicio = primerDia.toISOString().split('T')[0];
    this.reporte.fechaFin = hoy.toISOString().split('T')[0];

    this.cargarSectoresOficiales();
    this.cargarIncidenciasBackend();
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const chartModule = await import('chart.js/auto');
      this.ChartLib = chartModule.default || chartModule;
    }
  }

  cargarSectoresOficiales(): void {
    this.apiService.obtenerSectores().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.sectoresDisponibles = response;
        } else if (response && Array.isArray(response.data)) {
          this.sectoresDisponibles = response.data;
        } else {
          this.sectoresDisponibles = [];
        }
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar sectores oficiales:', err)
    });
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

        this.procesarDatosReporte();
      },
      error: (err) => {
        console.error('Error al cargar incidencias para reportes:', err);
      }
    });
  }

  procesarDatosReporte(): void {
    this.incidenciasFiltradas = this.incidencias.filter((inc: any) => {
      let coincideFecha = true;
      if (this.reporte.fechaInicio && inc.fechaHora) {
        coincideFecha = coincideFecha && new Date(inc.fechaHora) >= new Date(this.reporte.fechaInicio);
      }
      if (this.reporte.fechaFin && inc.fechaHora) {
        coincideFecha = coincideFecha && new Date(inc.fechaHora) <= new Date(this.reporte.fechaFin + 'T23:59:59');
      }

      let coincideSector = true;
      if (this.reporte.sector && this.reporte.sector !== 'Todos') {
        const sectorInc = inc.sector?._id || inc.sector;
        coincideSector = sectorInc === this.reporte.sector;
      }

      return coincideFecha && coincideSector;
    });

    this.totalIncidencias = this.incidenciasFiltradas.length;

    const conteoTipos: { [key: string]: number } = {};
    this.incidenciasFiltradas.forEach((inc: any) => {
      const tipo = inc.tipoDelito || inc.tipo || 'Sin especificar';
      conteoTipos[tipo] = (conteoTipos[tipo] || 0) + 1;
    });

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

  onFiltroChange(): void {
    this.procesarDatosReporte();
  }

  seleccionarFormato(formato: 'PDF' | 'Excel'): void {
    this.reporte.formato = formato;
  }

  // 🟢 EJECUTA LA GENERACIÓN Y DESCARGA
  generarReporte(): void {
    if (this.totalIncidencias === 0) {
      alert('No existen registros para exportar en el rango de fechas y sector seleccionados.');
      return;
    }

    if (this.reporte.formato === 'PDF') {
      this.exportarPDF();
    } else {
      this.exportarExcel();
    }
  }

// 🟢 Función auxiliar para extraer latitud y longitud de forma flexible
  private obtenerCoordenadas(inc: any): { lat: string; lng: string } {
    let lat: any = '';
    let lng: any = '';

    // 1. Probar nombres directos
    if (inc.latitud !== undefined && inc.latitud !== null) lat = inc.latitud;
    else if (inc.lat !== undefined && inc.lat !== null) lat = inc.lat;

    if (inc.longitud !== undefined && inc.longitud !== null) lng = inc.longitud;
    else if (inc.lng !== undefined && inc.lng !== null) lng = inc.lng;

    // 2. Probar estructuras GeoJSON o anidadas (ej. inc.ubicacion.coordinates = [lng, lat])
    if (!lat && !lng && inc.ubicacion) {
      if (Array.isArray(inc.ubicacion.coordinates) && inc.ubicacion.coordinates.length >= 2) {
        lng = inc.ubicacion.coordinates[0]; // GeoJSON guarda primero Longitud
        lat = inc.ubicacion.coordinates[1]; // GeoJSON guarda segundo Latitud
      } else if (inc.ubicacion.latitud || inc.ubicacion.lat) {
        lat = inc.ubicacion.latitud || inc.ubicacion.lat;
        lng = inc.ubicacion.longitud || inc.ubicacion.lng;
      }
    }

    if (!lat && !lng && inc.coordenadas) {
      lat = inc.coordenadas.latitud || inc.coordenadas.lat || '';
      lng = inc.coordenadas.longitud || inc.coordenadas.lng || '';
    }

    return {
      lat: lat !== '' ? String(lat) : 'N/A',
      lng: lng !== '' ? String(lng) : 'N/A'
    };
  }

  // 🟢 DESCARGA PDF INSTITUCIONAL (Incorporta Latitud y Longitud)
  private exportarPDF(): void {
    const doc = new jsPDF('landscape'); // Modo Horizontal para dar espacio a las coordenadas

    // Franja Superior Corporativa
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 297, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA DE SEGURIDAD CIUDADANA - ICA', 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('REPORTE GENERAL DE INCIDENCIAS', 220, 16);

    // Datos del Reporte
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tipo de Reporte: ${this.reporte.tipoReporte}`, 14, 33);

    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${this.reporte.fechaInicio} al ${this.reporte.fechaFin}`, 14, 39);

    const sectorNombre = this.sectoresDisponibles.find(s => s._id === this.reporte.sector)?.nombre || 'Todos';
    doc.text(`Sector: ${sectorNombre}`, 140, 39);
    doc.text(`Total Registros: ${this.totalIncidencias}`, 230, 39);

    // Mapeo de la Tabla con Coordenadas
    const filasTabla = this.incidenciasFiltradas.map((inc, index) => {
      const coords = this.obtenerCoordenadas(inc);
      return [
        index + 1,
        inc.tipoDelito || inc.tipo || 'N/A',
        inc.titulo || 'Sin título',
        inc.fechaHora ? new Date(inc.fechaHora).toLocaleString('es-PE') : 'N/A',
        inc.sector?.nombre || inc.ubicacionSector || 'Sector Centro',
        inc.prioridad || 'MEDIA',
        inc.estado || 'REGISTRADA',
        coords.lat,
        coords.lng
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Tipo', 'Título', 'Fecha y Hora', 'Sector', 'Prioridad', 'Estado', 'Latitud', 'Longitud']],
      body: filasTabla,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [243, 244, 246] }
    });

    doc.save(`Reporte_Incidencias_${this.reporte.fechaInicio}_al_${this.reporte.fechaFin}.pdf`);
  }

  // 🟢 DESCARGA EXCEL (.XLSX) (Incorporta Latitud y Longitud)
  private exportarExcel(): void {
    const dataExcel = this.incidenciasFiltradas.map((inc, index) => {
      const coords = this.obtenerCoordenadas(inc);

      return {
        'N°': index + 1,
        'Tipo de Delito': inc.tipoDelito || inc.tipo || 'N/A',
        'Título': inc.titulo || 'Sin título',
        'Descripción': inc.descripcion || '',
        'Fecha y Hora': inc.fechaHora ? new Date(inc.fechaHora).toLocaleString('es-PE') : 'N/A',
        'Sector': inc.sector?.nombre || inc.ubicacionSector || 'Sector Centro',
        'Comisaría': inc.comisaria?.nombre || inc.comisaria || '',
        'Prioridad': inc.prioridad || 'MEDIA',
        'Estado': inc.estado || 'REGISTRADA',
        'Latitud': coords.lat,
        'Longitud': coords.lng
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incidencias');

    worksheet['!cols'] = [
      { wch: 5 },  // N°
      { wch: 18 }, // Tipo
      { wch: 25 }, // Título
      { wch: 30 }, // Descripción
      { wch: 22 }, // Fecha
      { wch: 18 }, // Sector
      { wch: 20 }, // Comisaría
      { wch: 12 }, // Prioridad
      { wch: 15 }, // Estado
      { wch: 15 }, // Latitud
      { wch: 15 }  // Longitud
    ];

    XLSX.writeFile(workbook, `Reporte_Incidencias_${this.reporte.fechaInicio}_al_${this.reporte.fechaFin}.xlsx`);
  }
}