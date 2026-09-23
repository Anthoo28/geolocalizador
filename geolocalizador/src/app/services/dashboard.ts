import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Kpis {
  registradas: number;
  enAtencion: number;
  atendidas: number;
  cerradas: number;
  totalHoy: number;
}

export interface PorTipo {
  _id: string;
  total: number;
}

export interface InfoSector {
  _id: string;
  nombre: string;
}

export interface PorSector {
  _id: string;
  total: number;
  infoSector: InfoSector[];
}

export interface DashboardMetricasResponse {
  kpis: Kpis;
  graficos: {
    porTipo: PorTipo[];
    porSector: PorSector[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getMetricas(): Observable<DashboardMetricasResponse> {
    // Hacemos la petición directa, el Interceptor de tu app le pondrá el token
    return this.http.get<any>(`${this.apiUrl}/metricas`).pipe(
      map(response => {
        // Aplanamos la respuesta según cómo venga del backend
        return response?.data || response?.resultado || response;
      })
    );
  }
}
