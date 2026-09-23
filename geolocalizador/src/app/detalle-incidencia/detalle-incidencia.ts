import { Component , OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-detalle-incidencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-incidencia.html',
  styleUrl: './detalle-incidencia.css',
})
export class DetalleIncidenciaComponent implements OnInit, AfterViewInit {

  // Datos de ejemplo basados en el diseño de la incidencia
  incidencia = {
    codigo: 'INC-2026-00001',
    estado: 'En atención',
    tipo: 'Robo',
    titulo: 'Robo de celular',
    descripcion: 'Ciudadano indica que le robaron su celular mientras caminaba por la avenida San Martín, frente a la plaza de armas.',
    fechaHora: '21/05/2026 14:30',
    direccion: 'Av. San Martín 123, Ica',
    referencia: 'Frente a la plaza de armas',
    sector: 'Sector Centro',
    comisaria: 'Comisaría PNP Ica',
    registradoPor: 'Juan Pérez (Operador)',
    asignadoA: 'María López (Operador)',
    prioridad: 'Alta',
    latitud: -14.0678,
    longitud: -75.7286,
    historial: [
      { estado: 'Registrada', fecha: '21/05/2026 14:35', autor: 'Juan Pérez' },
      { estado: 'En atención', fecha: '21/05/2026 15:10', autor: 'María López' }
    ]
  };

  private map: any;
  private L: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      this.initMiniMap();
    }
  }

  private initMiniMap(): void {
    // Inicializar mapa de ubicación estática o centrada en la incidencia
    this.map = this.L.map('map-detalle', {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false
    }).setView([this.incidencia.latitud, this.incidencia.longitud], 15);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Marcador de la ubicación de la incidencia
    this.L.marker([this.incidencia.latitud, this.incidencia.longitud]).addTo(this.map);
  }

  editarIncidencia(): void {
    console.log('Editar incidencia:', this.incidencia.codigo);
  }
}