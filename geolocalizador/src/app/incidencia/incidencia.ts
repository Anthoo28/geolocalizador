import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IncidenciaService, Incidencia as IncidenciaModel } from '../services/incidencia';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-incidencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  templateUrl: './incidencia.html',
  styleUrl: './incidencia.css',
})
export class Incidencia implements OnInit {
  private incidenciaService = inject(IncidenciaService);
  private cdr = inject(ChangeDetectorRef);

  incidencias: IncidenciaModel[] = [];
  incidenciasFiltradas: IncidenciaModel[] = [];
  totalRegistros: number = 0;
  isLoading: boolean = true;
  searchTerm: string = '';
  
  // Control del menú de filtros avanzados
  mostrarFiltrosMenu: boolean = false;
  filtroEstadoSeleccionado: string = '';

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  cargarIncidencias(): void {
    this.isLoading = true;
    this.incidenciaService.getIncidencias().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.incidencias = res;
          this.totalRegistros = res.length;
        } else if (res && Array.isArray(res.data)) {
          this.incidencias = res.data;
          this.totalRegistros = res.total || res.data.length;
        } else if (res && Array.isArray(res.incidencias)) {
          this.incidencias = res.incidencias;
          this.totalRegistros = res.total || res.incidencias.length;
        } else {
          this.incidencias = [];
          this.totalRegistros = 0;
        }

        this.incidenciasFiltradas = this.incidencias;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar incidencias:', err);
        this.incidencias = [];
        this.incidenciasFiltradas = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

toggleFiltrosMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation(); // Evita que el clic cierre el menú de golpe
    }
    this.mostrarFiltrosMenu = !this.mostrarFiltrosMenu;
    this.cdr.detectChanges();
  }

  filtrar(): void {
    const term = this.searchTerm.toLowerCase().trim();
    
    this.incidenciasFiltradas = this.incidencias.filter(inc => {
      const cumpleTexto = !term || 
        inc.codigo?.toLowerCase().includes(term) ||
        inc.titulo?.toLowerCase().includes(term) ||
        inc.tipoDelito?.toLowerCase().includes(term) ||
        inc.direccion?.toLowerCase().includes(term);

      const cumpleEstado = !this.filtroEstadoSeleccionado || 
        inc.estado?.toUpperCase() === this.filtroEstadoSeleccionado.toUpperCase();

      return cumpleTexto && cumpleEstado;
    });
  }

  seleccionarFiltroEstado(estado: string): void {
    this.filtroEstadoSeleccionado = estado;
    this.filtrar();
    this.mostrarFiltrosMenu = false; // Cierra el menú al seleccionar
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroEstadoSeleccionado = '';
    this.incidenciasFiltradas = this.incidencias;
    this.mostrarFiltrosMenu = false;
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'REGISTRADA':
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'EN_ATENCION':
      case 'EN_PROCESO':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'ATENDIDA':
      case 'RESUELTA':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  formatearEstado(estado: string): string {
    if (!estado) return '';
    switch (estado.toUpperCase()) {
      case 'REGISTRADA': return 'Registrada';
      case 'EN_ATENCION': return 'En atención';
      case 'ATENDIDA': return 'Atendida';
      case 'CANCELADA': return 'Cancelada';
      default: return estado;
    }
  }
}