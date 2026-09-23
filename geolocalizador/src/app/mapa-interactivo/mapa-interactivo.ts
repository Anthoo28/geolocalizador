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
  totalIncidencias: number = 0; // Conteo dinámico

  // Variables para los filtros
  tiposDelitoDisponibles: string[] = [];
  filtroTipo: string = 'Todos';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';

  private map: any;
  private L: any; 
  private markersLayer: any; 

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      
      // Esperar brevemente a que el DOM pinte el elemento del mapa
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

    this.map = this.L.map('map', {
      zoomControl: false
    }).setView([-14.0677, -75.7286], 15);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer = this.L.layerGroup().addTo(this.map);

    if (this.incidenciasFiltradas.length > 0) {
      this.pintarMarcadores();
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

        // Asignar el total que viene del backend o calcularlo del array
        this.totalIncidencias = res && typeof res.total === 'number' ? res.total : this.incidencias.length;

        // Inicialmente las filtradas son todas
        this.incidenciasFiltradas = [...this.incidencias];

        // Forzar actualización inmediata en la vista
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        // Extraer tipos de delito únicos para el select de filtros
        const tiposSet = new Set<string>();
        this.incidencias.forEach((inc: any) => {
          if (inc.tipoDelito) tiposSet.add(inc.tipoDelito);
        });
        this.tiposDelitoDisponibles = Array.from(tiposSet);

        if (this.map && this.L) {
          this.pintarMarcadores();
        }
      },
      error: (err) => {
        console.error('Error al cargar incidencias para el mapa:', err);
      }
    });
  }

  private pintarMarcadores(): void {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers(); 

    // Mapa para rastrear coordenadas repetidas y aplicarles un pequeño desfase visual
    const coordenadasVistas = new Map<string, number>();

    this.incidenciasFiltradas.forEach(inc => {
      const item = inc as any;

      if (item.ubicacion && item.ubicacion.coordinates && item.ubicacion.coordinates.length >= 2) {
        let lng = item.ubicacion.coordinates[0]; 
        let lat = item.ubicacion.coordinates[1]; 

        // Llave única basada en las coordenadas exactas
        const claveCoord = `${lat.toFixed(5)},${lng.toFixed(5)}`;

        if (coordenadasVistas.has(claveCoord)) {
          const veces = coordenadasVistas.get(claveCoord)!;
          coordenadasVistas.set(claveCoord, veces + 1);

          // Desplazamiento sutil para separar los pines con coordenadas idénticas
          lat += veces * 0.00018;
          lng += veces * 0.00018;
        } else {
          coordenadasVistas.set(claveCoord, 1);
        }

        // Definir color según el estado mapeado a la leyenda
        let colorHex = '#ef4444'; // Rojo (Registrado por defecto)
        const estadoUpper = (item.estado || '').toUpperCase();
        if (estadoUpper.includes('ATENCION') || estadoUpper.includes('EN_ATENCION')) {
          colorHex = '#f59e0b'; // Ámbar (En atención)
        } else if (estadoUpper.includes('ATENDIDA') || estadoUpper.includes('RESUELTA')) {
          colorHex = '#10b981'; // Esmeralda (Atendida)
        }

        // Usamos pointer-events: none en el div interno para que el clic lo reciba el marcador Leaflet
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
          console.log('Incidencia seleccionada:', this.incidenciaSeleccionada);
        });

        this.markersLayer.addLayer(marker);
      }
    });
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

    this.totalIncidencias = this.incidenciasFiltradas.length; // Actualizar contador al filtrar
    this.pintarMarcadores();
    this.incidenciaSeleccionada = null; 
  }

  limpiarFiltros(): void {
    this.filtroTipo = 'Todos';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.incidenciasFiltradas = [...this.incidencias];
    this.totalIncidencias = this.incidenciasFiltradas.length; // Actualizar contador al limpiar filtros
    this.pintarMarcadores();
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
    if (this.map) this.map.setView([-14.0677, -75.7286], 15);
  }
}