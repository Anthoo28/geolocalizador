import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Cambia esta URL por la de tu backend local (ej: 'http://localhost:3000') o tu URL de Render
  private apiUrl = 'https://geolocalizador-backend.onrender.com/api'; 

  constructor(private http: HttpClient) {}

  // --- CATÁLOGOS ---
  obtenerSectores(): Observable<any> {
    return this.http.get(`${this.apiUrl}/catalogos/sectores`); //[cite: 6]
  }

  obtenerComisarias(): Observable<any> {
    return this.http.get(`${this.apiUrl}/catalogos/comisarias`); //[cite: 6]
  }

  // --- INCIDENCIAS ---
  registrarIncidencia(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/incidencias`, data); //[cite: 6]
  }

  actualizarEstadoIncidencia(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/incidencias/${id}/estado`, data); //[cite: 6]
  }

  obtenerDetalleIncidencia(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/incidencias/${id}`); //[cite: 6]
  }

  buscarIncidenciasCercanas(lat: number, lng: number, radioMetros: number = 3000): Observable<any> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('radioMetros', radioMetros.toString());
    return this.http.get(`${this.apiUrl}/incidencias/cercanas`, { params }); //[cite: 6]
  }

  // --- DASHBOARD / MÉTRICAS ---
  obtenerMetricas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/metricas`); //[cite: 6]
  }

  // --- USUARIOS ---
  crearUsuario(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios`, data); //[cite: 6]
  }
}