import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AfterViewInit, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-nueva-incidencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crear-incidencia.html',
  styleUrl: './crear-incidencia.css',
})
export class NuevaIncidenciaComponent implements OnInit, AfterViewInit {

  tabActiva: string = 'general';

  incidencia = {
    tipo: 'Robo',
    titulo: '',
    tipoDelito: 'ROBO',
    descripcion: '',
    fechaHora: '2026-05-21T14:30',
    prioridad: 'ALTA',
    direccion: '',
    referencia: '',
    sector: '',       // ID del sector seleccionado
    comisaria: '',    // ID de la comisaría seleccionada
    latitud: -14.0678,
    longitud: -75.7286
  };

  sectores: any[] = [];
  comisarias: any[] = [];

  private map: any;
  private marker: any;
  private L: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.apiService.obtenerSectores().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.sectores = response;
        } else if (response && Array.isArray(response.data)) {
          this.sectores = response.data;
        } else {
          this.sectores = [];
        }
      },
      error: (err: any) => console.error('Error al cargar sectores:', err)
    });

    this.apiService.obtenerComisarias().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.comisarias = response;
        } else if (response && Array.isArray(response.data)) {
          this.comisarias = response.data;
        } else {
          this.comisarias = [];
        }
      },
      error: (err: any) => console.error('Error al cargar comisarías:', err)
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const leafletModule = await import('leaflet');
      this.L = leafletModule.default || leafletModule;
      this.initMiniMap();
    }
  }

  private initMiniMap(): void {
    // Solución para reparar la imagen rota del marcador en Leaflet
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Se usa setTimeout para asegurar que el DOM calcule el tamaño antes de pintar el mapa
    setTimeout(() => {
      this.map = this.L.map('mini-map', {
        zoomControl: true
      }).setView([this.incidencia.latitud, this.incidencia.longitud], 15);

      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.marker = this.L.marker([this.incidencia.latitud, this.incidencia.longitud], {
        draggable: true
      }).addTo(this.map);

      // Evento en tiempo real al arrastrar el marcador
      this.marker.on('drag', (event: any) => {
        const position = event.target.getLatLng();
        this.actualizarCoordenadas(position.lat, position.lng);
      });

      // Evento al soltar el marcador
      this.marker.on('dragend', (event: any) => {
        const position = event.target.getLatLng();
        this.actualizarCoordenadas(position.lat, position.lng);
      });

      // Evento al hacer clic en el mapa
      this.map.on('click', (event: any) => {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;
        this.marker.setLatLng([lat, lng]);
        this.actualizarCoordenadas(lat, lng);
      });

      // Fuerza a Leaflet a recalcular dimensiones para evitar el fondo gris/blanco
      this.map.invalidateSize();
    }, 150);
  }

  private actualizarCoordenadas(lat: number, lng: number): void {
    this.zone.run(() => {
      this.incidencia.latitud = Number(lat.toFixed(6));
      this.incidencia.longitud = Number(lng.toFixed(6));
      this.cdr.detectChanges(); // Fuerza el refresco inmediato de los inputs en la interfaz
    });
  }

  buscarDireccion(query: string): void {
    if (!query || query.trim() === '') return;
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Ica, Peru')}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        this.zone.run(() => {
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            if (this.map) {
              this.map.setView([lat, lon], 17);
              this.marker.setLatLng([lat, lon]);
            }
            this.actualizarCoordenadas(lat, lon);
            this.incidencia.direccion = data[0].display_name;
          } else {
            alert('No se encontró la dirección especificada.');
          }
          this.cdr.detectChanges();
        });
      })
      .catch(err => {
        console.error('Error en la búsqueda de dirección:', err);
      });
  }

  guardarIncidencia(): void {
    console.log('Enviando incidencia al backend...', this.incidencia);
    
    this.apiService.registrarIncidencia(this.incidencia).subscribe({
      next: (response: any) => {
        console.log('Incidencia registrada con éxito:', response);
        alert('¡Incidencia registrada correctamente!');
        this.router.navigate(['/incidencias']);
      },
      error: (error: any) => {
        console.error('Error al registrar la incidencia:', error);
        alert('Ocurrió un error al registrar la incidencia. Verifica los datos.');
      }
    });
  }
}