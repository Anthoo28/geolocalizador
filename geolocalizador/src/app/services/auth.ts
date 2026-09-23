import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol?: string;
}

export interface AuthResponse {
  mensaje: string; // <-- Cambiado 'msg' por 'mensaje'
  token: string;
  usuario: Usuario;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.token) {
          this.saveToken(res.token);
          this.saveUser(res.usuario);
        }
      })
    );
  }
  

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  saveUser(user: Usuario): void {
    localStorage.setItem('usuario', JSON.stringify(user));
  }

  getToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('token'); 
  }
  return null;  }

  getUser(): Usuario | null {
    const user = localStorage.getItem('usuario');
    return user ? JSON.parse(user) : null;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
