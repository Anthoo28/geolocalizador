import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { IncidenciaService, Incidencia as IncidenciaModel } from '../services/incidencia';

@Component({
  selector: 'app-mapa-interactivo',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './mapa-interactivo.html',
  styleUrl: './mapa-interactivo.css',
})
export class MapaInteractivoComponent implements OnInit, AfterViewInit {
  private incidenciaService = inject(IncidenciaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  usuario = {
    nombre: 'Juan Pérez',
    rol: 'Operador'
  };

  incidencias: IncidenciaModel[] = [];
  incidenciasFiltradas: IncidenciaModel[] = [];
  incidenciaSeleccionada: IncidenciaModel | null = null; 
  totalIncidencias: number = 0;

  // Modo de visualización: 'marcadores' o 'calor'
  modoMapa: 'marcadores' | 'calor' = 'marcadores';

  // Variables para los filtros
  tiposDelitoDisponibles: string[] = [];
  filtroTipo: string = 'Todos';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';

  private map: any;
  private L: any; 
  private markersLayer: any; 
  private heatLayer: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      
      // Cargar dinámicamente el plugin leaflet.heat para el mapa de calor
      await import('leaflet.heat');

      setTimeout(() => {
        this.initMap();
      }, 100);
    }
  }

  private initMap(): void {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.warn('Contenedor del mapa no encontrado aún en el DOM.');
      return;
    }

    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    const centroIca: [number, number] = [-14.0677, -75.7286];

    this.map = this.L.map('map', {
      zoomControl: false,
      maxBounds: [
        [-14.0950, -75.7550], // Suroeste permitido
        [-14.0400, -75.7000]  // Noreste permitido
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 15,
      maxZoom: 18
    }).setView(centroIca, 15.5);

    // Capa base oficial de OpenStreetMap
    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Máscara circular para Ica Centro (Oscurece el exterior)
    const radioKm = 1.3; 
    const numPuntos = 48; 
    const huecoCircular: [number, number][] = [];

    for (let i = 0; i < numPuntos; i++) {
      const angulo = (i * 2 * Math.PI) / numPuntos;
      const latOffset = (radioKm / 111) * Math.cos(angulo);
      const lngOffset = (radioKm / (111 * Math.cos(centroIca[0] * Math.PI / 180))) * Math.sin(angulo);
      huecoCircular.push([centroIca[0] + latOffset, centroIca[1] + lngOffset]);
    }

    const mundoExterior: [number, number][] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180]
    ];

    this.L.polygon([mundoExterior, huecoCircular], {
      color: 'transparent',
      fillColor: '#0f172a', 
      fillOpacity: 0.85,    
      weight: 0,
      interactive: false
    }).addTo(this.map);

    this.markersLayer = this.L.layerGroup().addTo(this.map);

    if (this.incidenciasFiltradas.length > 0) {
      this.actualizarCapaMapa();
    }
  }

  cargarIncidencias(): void {
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

        this.totalIncidencias = res && typeof res.total === 'number' ? res.total : this.incidencias.length;
        this.incidenciasFiltradas = [...this.incidencias];

        this.cdr.markForCheck();
        this.cdr.detectChanges();

        const tiposSet = new Set<string>();
        this.incidencias.forEach((inc: any) => {
          if (inc.tipoDelito) tiposSet.add(inc.tipoDelito);
        });
        this.tiposDelitoDisponibles = Array.from(tiposSet);

        if (this.map && this.L) {
          this.actualizarCapaMapa();
        }
      },
      error: (err) => {
        console.error('Error al cargar incidencias para el mapa:', err);
      }
    });
  }

  cambiarModoMapa(modo: 'marcadores' | 'calor'): void {
    this.modoMapa = modo;
    this.actualizarCapaMapa();
  }

  actualizarCapaMapa(): void {
    if (!this.map || !this.L) return;

    // Limpiar capas previas
    if (this.markersLayer) this.markersLayer.clearLayers();
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.map.off('zoomend.heat'); // Limpiar listener anterior para evitar fugas de memoria
    }

    if (this.modoMapa === 'marcadores') {
      this.pintarMarcadores();
    } else {
      this.pintarMapaDeCalor();
    }
  }

  private pintarMarcadores(): void {
    if (!this.markersLayer) return;
    const coordenadasVistas = new Map<string, number>();

    this.incidenciasFiltradas.forEach(inc => {
      const item = inc as any;

      if (item.ubicacion && item.ubicacion.coordinates && item.ubicacion.coordinates.length >= 2) {
        let lng = item.ubicacion.coordinates[0]; 
        let lat = item.ubicacion.coordinates[1]; 

        const claveCoord = `${lat.toFixed(5)},${lng.toFixed(5)}`;

        if (coordenadasVistas.has(claveCoord)) {
          const veces = coordenadasVistas.get(claveCoord)!;
          coordenadasVistas.set(claveCoord, veces + 1);
          lat += veces * 0.00018;
          lng += veces * 0.00018;
        } else {
          coordenadasVistas.set(claveCoord, 1);
        }

        let colorHex = '#ef4444'; 
        const estadoUpper = (item.estado || '').toUpperCase();
        if (estadoUpper.includes('ATENCION') || estadoUpper.includes('EN_ATENCION')) {
          colorHex = '#f59e0b'; 
        } else if (estadoUpper.includes('ATENDIDA') || estadoUpper.includes('RESUELTA')) {
          colorHex = '#10b981'; 
        }

        const customIcon = this.L.divIcon({
          className: 'custom-pin-icon',
          html: `
            <div style="pointer-events: none; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.4));">
              <svg width="36" height="46" viewBox="0 0 24 24" fill="${colorHex}" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C7.58 0 4 3.58 4 8C4 13.25 12 24 12 24C12 24 20 13.25 20 8C20 3.58 16.42 0 12 0ZM12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11Z" fill="${colorHex}" stroke="#ffffff" stroke-width="1.5"/>
              </svg>
            </div>
          `,
          iconSize: [36, 46],
          iconAnchor: [18, 46],
          popupAnchor: [0, -42]
        });

        const marker = this.L.marker([lat, lng], { icon: customIcon });

        marker.on('click', () => {
          this.incidenciaSeleccionada = { ...inc }; 
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });

        this.markersLayer.addLayer(marker);
      }
    });
  }

  private pintarMapaDeCalor(): void {
    const heatPoints: [number, number, number][] = [];

    this.incidenciasFiltradas.forEach(inc => {
      const item = inc as any;
      if (item.ubicacion && item.ubicacion.coordinates && item.ubicacion.coordinates.length >= 2) {
        const lng = item.ubicacion.coordinates[0];
        const lat = item.ubicacion.coordinates[1];
        const peso = item.peso || 1.0;
        heatPoints.push([lat, lng, peso]);
      }
    });

    if (this.L.heatLayer && heatPoints.length > 0) {
      const currentZoom = this.map.getZoom();
      const dynamicRadius = this.calcularRadioPorZoom(currentZoom);

      this.heatLayer = this.L.heatLayer(heatPoints, {
        radius: dynamicRadius,
        blur: Math.round(dynamicRadius * 0.6),
        minOpacity: 0.35,
        max: 1,
        maxZoom: 18,
        gradient: {
          0.2: '#3b82f6', // Azul: Baja densidad / Aislado
          0.5: '#eab308', // Amarillo: Densidad moderada
          0.75: '#f97316',// Naranja: Zona de atención
          1.0: '#dc2626'  // Rojo: Alta concentración crítica
        }
      }).addTo(this.map);

      // Escucha el evento de zoom para actualizar el radio en tiempo real (Producción Ready)
      this.map.on('zoomend.heat', () => {
        if (this.modoMapa === 'calor' && this.heatLayer) {
          const newZoom = this.map.getZoom();
          const newRadius = this.calcularRadioPorZoom(newZoom);
          this.heatLayer.setOptions({
            radius: newRadius,
            blur: Math.round(newRadius * 0.6)
          });
        }
      });
    }
  }

  private calcularRadioPorZoom(zoom: number): number {
    if (zoom <= 15) return 18;
    if (zoom === 16) return 26;
    if (zoom === 17) return 38;
    return 52; // Zoom 18+
  }

  aplicarFiltros(): void {
    this.incidenciasFiltradas = this.incidencias.filter(inc => {
      const item = inc as any;
      const coincideTipo = this.filtroTipo === 'Todos' || item.tipoDelito === this.filtroTipo;
      
      let coincideFecha = true;
      if (this.filtroFechaInicio && item.fechaHora) {
        coincideFecha = coincideFecha && new Date(item.fechaHora) >= new Date(this.filtroFechaInicio);
      }
      if (this.filtroFechaFin && item.fechaHora) {
        coincideFecha = coincideFecha && new Date(item.fechaHora) <= new Date(this.filtroFechaFin + 'T23:59:59');
      }

      return coincideTipo && coincideFecha;
    });

    this.totalIncidencias = this.incidenciasFiltradas.length; 
    this.actualizarCapaMapa();
    this.incidenciaSeleccionada = null; 
  }

  limpiarFiltros(): void {
    this.filtroTipo = 'Todos';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.incidenciasFiltradas = [...this.incidencias];
    this.totalIncidencias = this.incidenciasFiltradas.length; 
    this.actualizarCapaMapa();
    this.incidenciaSeleccionada = null;
  }

  verDetalles(id?: string): void {
    if (id) {
      this.router.navigate(['/detalle-incidencia', id]);
    }
  }

  cerrarDetalle(): void {
    this.incidenciaSeleccionada = null;
  }

  acercarZoom(): void {
    if (this.map) this.map.zoomIn();
  }

  alejarZoom(): void {
    if (this.map) this.map.zoomOut();
  }

  restablecerVista(): void {
    if (this.map) this.map.setView([-14.0677, -75.7286], 15.5);
  }
}