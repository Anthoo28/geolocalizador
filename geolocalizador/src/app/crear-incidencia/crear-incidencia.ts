import { Component, NgZone, ChangeDetectorRef, afterNextRender, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../api.service';
import { HeaderComponent } from '../components/header/header';

@Component({
  selector: 'app-nueva-incidencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  templateUrl: './crear-incidencia.html',
  styleUrl: './crear-incidencia.css',
})
export class NuevaIncidenciaComponent {

  tabActiva: string = 'general';

  // Coordenadas del Centro de Ica y Radio permitido
  private readonly CENTRO_ICA: [number, number] = [-14.0677, -75.7286];
  private readonly RADIO_MAXIMO_KM = 1.3;

  incidencia = {
    tipo: 'Robo',
    titulo: '',
    tipoDelito: 'ROBO',
    descripcion: '',
    fechaHora: '', 
    prioridad: 'ALTA',
    direccion: '',
    referencia: '',
    sector: '',      // ID del sector seleccionado
    comisaria: '',   // ID de la comisaría seleccionada
    latitud: -14.0678,
    longitud: -75.7286
  };

  sectores: any[] = [];
  comisarias: any[] = [];

  // Variables para el control del Toast / Popup flotante elegante
  toastMessage = '';
  toastType: 'success' | 'error' = 'error';
  private toastTimeout: any;

  private map: any;
  private marker: any;
  private L: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) { 
    this.incidencia.fechaHora = this.obtenerFechaHoraActual();

    afterNextRender(() => {
      this.cargarCatalogos();
    });
  }

  private obtenerFechaHoraActual(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${anio}-${mes}-${dia}T${hora}:${minutos}`;
  }

  showToast(message: string, type: 'success' | 'error' = 'error', duration: number = 4000): void {
    this.zone.run(() => {
      this.toastMessage = message;
      this.toastType = type;

      if (this.toastTimeout) clearTimeout(this.toastTimeout);

      this.toastTimeout = setTimeout(() => {
        this.toastMessage = '';
        this.cdr.detectChanges();
      }, duration);

      this.cdr.detectChanges();
    });
  }

  cargarCatalogos(): void {
    this.apiService.obtenerSectores().subscribe({
      next: (response: any) => {
        this.zone.run(() => {
          if (Array.isArray(response)) {
            this.sectores = response;
          } else if (response && Array.isArray(response.data)) {
            this.sectores = response.data;
          } else {
            this.sectores = [];
          }
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => console.error('Error al cargar sectores:', err)
    });

    this.apiService.obtenerComisarias().subscribe({
      next: (response: any) => {
        this.zone.run(() => {
          if (Array.isArray(response)) {
            this.comisarias = response;
          } else if (response && Array.isArray(response.data)) {
            this.comisarias = response.data;
          } else {
            this.comisarias = [];
          }
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => console.error('Error al cargar comisarías:', err)
    });

    if (isPlatformBrowser(this.platformId)) {
      this.initLeafletMap();
    }
  }

  private async initLeafletMap(): Promise<void> {
    const leafletModule = await import('leaflet');
    this.L = leafletModule.default || leafletModule;
    this.initMiniMap();
  }

  /**
   * Calcula la distancia Haversine en kilómetros entre dos coordenadas
   */
  private calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Verifica si la coordenada está dentro del rango permitido (1.3 km)
   */
  private estaDentroDelRango(lat: number, lng: number): boolean {
    const distancia = this.calcularDistanciaKm(this.CENTRO_ICA[0], this.CENTRO_ICA[1], lat, lng);
    return distancia <= this.RADIO_MAXIMO_KM;
  }

  private initMiniMap(): void {
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    setTimeout(() => {
      this.map = this.L.map('mini-map', {
        zoomControl: true,
        maxBounds: [
          [-14.0950, -75.7550], // Límite Suroeste de Ica
          [-14.0400, -75.7000]  // Límite Noreste de Ica
        ],
        maxBoundsViscosity: 1.0,
        minZoom: 14,
        maxZoom: 18
      }).setView([this.incidencia.latitud, this.incidencia.longitud], 15.5);

      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      // 🟢 MÁSCARA CIRCULAR (Igual al mapa de navegación principal)
      const numPuntos = 48; 
      const huecoCircular: [number, number][] = [];

      for (let i = 0; i < numPuntos; i++) {
        const angulo = (i * 2 * Math.PI) / numPuntos;
        const latOffset = (this.RADIO_MAXIMO_KM / 111) * Math.cos(angulo);
        const lngOffset = (this.RADIO_MAXIMO_KM / (111 * Math.cos(this.CENTRO_ICA[0] * Math.PI / 180))) * Math.sin(angulo);
        huecoCircular.push([this.CENTRO_ICA[0] + latOffset, this.CENTRO_ICA[1] + lngOffset]);
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
        fillOpacity: 0.65,    
        weight: 0,
        interactive: false
      }).addTo(this.map);

      // Marcador
      this.marker = this.L.marker([this.incidencia.latitud, this.incidencia.longitud], {
        draggable: true
      }).addTo(this.map);

      // Control de arrastre del marcador
      this.marker.on('dragend', (event: any) => {
        const position = event.target.getLatLng();
        if (this.estaDentroDelRango(position.lat, position.lng)) {
          this.actualizarCoordenadas(position.lat, position.lng);
        } else {
          this.showToast('Solo se pueden registrar incidencias dentro del Cercado de Ica.', 'error');
          this.marker.setLatLng([this.incidencia.latitud, this.incidencia.longitud]);
        }
      });

      // Control de clic en el mapa
      this.map.on('click', (event: any) => {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;

        if (this.estaDentroDelRango(lat, lng)) {
          this.marker.setLatLng([lat, lng]);
          this.actualizarCoordenadas(lat, lng);
        } else {
          this.showToast('Ubicación fuera del área de cobertura. Seleccione un punto dentro del círculo.', 'error');
        }
      });

      this.map.invalidateSize();
    }, 150);
  }

  private actualizarCoordenadas(lat: number, lng: number): void {
    this.zone.run(() => {
      this.incidencia.latitud = Number(lat.toFixed(6));
      this.incidencia.longitud = Number(lng.toFixed(6));
      this.cdr.detectChanges();
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

            if (this.estaDentroDelRango(lat, lon)) {
              if (this.map) {
                this.map.setView([lat, lon], 17);
                this.marker.setLatLng([lat, lon]);
              }
              this.actualizarCoordenadas(lat, lon);
              this.incidencia.direccion = data[0].display_name;
            } else {
              this.showToast('La dirección encontrada está fuera de la jurisdicción permitida (Cercado de Ica).', 'error');
            }
          } else {
            this.showToast('No se encontró la dirección especificada.', 'error');
          }
          this.cdr.detectChanges();
        });
      })
      .catch(err => {
        console.error('Error en la búsqueda de dirección:', err);
      });
  }

  guardarIncidencia(): void {
    if (!this.estaDentroDelRango(this.incidencia.latitud, this.incidencia.longitud)) {
      this.showToast('No se puede guardar. La ubicación seleccionada está fuera del rango permitido.', 'error');
      return;
    }

    console.log('Enviando incidencia al backend...', this.incidencia);
    
    this.apiService.registrarIncidencia(this.incidencia).subscribe({
      next: (response: any) => {
        console.log('Incidencia registrada con éxito:', response);
        this.showToast('¡Incidencia registrada correctamente!', 'success', 2000);
        setTimeout(() => {
          this.router.navigate(['/incidencias']);
        }, 1200);
      },
      error: (error: any) => {
        console.error('Error al registrar la incidencia:', error);
        this.showToast('Ocurrió un error al registrar la incidencia. Verifica los datos.', 'error');
      }
    });
  }
}