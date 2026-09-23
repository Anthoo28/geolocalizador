import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface Sector {
  _id: string;
  nombre: string;
}

export interface Comisaria {
  _id: string;
  nombre: string;
}

export interface RegistradoPor {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Incidencia {
  _id: string;
  codigo: string;
  titulo: string;
  tipoDelito: string;
  descripcion?: string;
  prioridad?: string;
  estado: string; // 'REGISTRADA' | 'EN_ATENCION' | 'ATENDIDA' | 'CANCELADA'
  fechaHora: string;
  direccion?: string;
  referencia?: string;
  sector?: Sector | null;
  comisaria?: Comisaria | null;
  registradoPor?: RegistradoPor | null;
}

export interface IncidenciasResponse {
  total: number;
  data: Incidencia[];
}

export interface CrearIncidenciaDTO {
  titulo: string;
  tipoDelito: string;
  descripcion: string;
  prioridad?: string;
  direccion?: string;
  referencia?: string;
  sector?: string;
  comisaria?: string;
  ubicacion?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

@Injectable({
  providedIn: 'root'
})
export class IncidenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/incidencias`;

  // Listar todas las incidencias
  getIncidencias(): Observable<IncidenciasResponse> {
    return this.http.get<IncidenciasResponse>(this.apiUrl);
  }

  // Obtener detalle por ID
  getIncidenciaPorId(id: string): Observable<Incidencia> {
    return this.http.get<Incidencia>(`${this.apiUrl}/${id}`);
  }

  // Crear nueva incidencia (POST /)
  crearIncidencia(incidencia: CrearIncidenciaDTO): Observable<Incidencia> {
    return this.http.post<Incidencia>(this.apiUrl, incidencia);
  }

  // Cambiar estado de incidencia (PATCH /:id/estado)
  cambiarEstado(id: string, estado: string, comentario?: string): Observable<Incidencia> {
    return this.http.patch<Incidencia>(`${this.apiUrl}/${id}/estado`, {
      estado,
      comentario
    });
  }

  // Actualizar datos de la incidencia (PUT /:id)
  actualizarIncidencia(id: string, incidencia: Partial<Incidencia>): Observable<Incidencia> {
    return this.http.put<Incidencia>(`${this.apiUrl}/${id}`, incidencia);
  }
}