import { Component, inject, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- Importante para usar [(ngModel)] en la edición
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-detalle-incidencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], // <-- Asegúrate de incluir FormsModule
  templateUrl: './detalle-incidencia.html',
  styleUrl: './detalle-incidencia.css'
})
export class DetalleIncidenciaComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  incidenciaId: string | null = null;
  incidencia: any = null;
  isLoading: boolean = true;
  
  // 🟢 Bandera para alternar entre ver y editar
  isEditing: boolean = false;

  private L: any;
  private map: any;

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('codigo');
    if (idParam) {
      this.incidenciaId = idParam;
    }

    afterNextRender(() => {
      if (this.incidenciaId) {
        this.cargarDetalle(this.incidenciaId);
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarDetalle(id: string): void {
    this.isLoading = true;
    this.apiService.obtenerDetalleIncidencia(id).subscribe({
      next: async (response: any) => {
        this.incidencia = response.data || response;
        this.isLoading = false;
        this.cdr.detectChanges();
        await this.initLeafletMap();
      },
      error: (err) => {
        console.error('Error al cargar la incidencia:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // 🟢 Alterna el modo edición
  editarIncidencia(): void {
    this.isEditing = !this.isEditing;
  }

  // 🟢 Método para guardar los cambios en el backend
  guardarCambios(): void {
    if (!this.incidenciaId) return;

    this.apiService.actualizarIncidencia(this.incidenciaId, this.incidencia).subscribe({
      next: (res: any) => {
        alert('Incidencia actualizada correctamente');
        this.isEditing = false; // Regresa al modo vista
        this.incidencia = res.data || res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar la incidencia:', err);
        alert('Hubo un error al guardar los cambios.');
      }
    });
  }

  private async initLeafletMap(): Promise<void> {
    if (!this.incidencia?.ubicacion?.coordinates) return;

    const leafletModule = await import('leaflet');
    this.L = leafletModule.default || leafletModule;

    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const [lng, lat] = this.incidencia.ubicacion.coordinates;

    setTimeout(() => {
      const container = document.getElementById('map-detalle');
      if (!container) return;

      if (this.map) {
        this.map.remove();
      }

      this.map = this.L.map('map-detalle', {
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: false
      }).setView([lat, lng], 16);

      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.L.marker([lat, lng]).addTo(this.map);
      this.map.invalidateSize();
    }, 250);
  }
}