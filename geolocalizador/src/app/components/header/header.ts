import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);

  usuario: any = null;
  isDropdownOpen: boolean = false;

  ngOnInit(): void {
    // Recupera la información guardada en el localStorage al iniciar sesión
    const usuarioStorage = localStorage.getItem('usuario');
    if (usuarioStorage) {
      try {
        this.usuario = JSON.parse(usuarioStorage);
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
      }
    }
  }

  // Alterna el menú desplegable del perfil
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // Cierra sesión limpiando el localStorage y redirigiendo al login
  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}