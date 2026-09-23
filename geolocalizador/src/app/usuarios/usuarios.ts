import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class UsuariosComponent implements OnInit {

  // Pestaña principal activa ('usuarios' o 'roles')
  pestanaPrincipal: 'usuarios' | 'roles' = 'usuarios';

  // Sub-pestaña para la sección de roles ('roles' o 'permisos')
  pestanaRoles: 'roles' | 'permisos' = 'roles';

  // Búsqueda de usuarios
  filtroBusqueda: string = '';

  // Lista de usuarios simulada
  usuarios = [
    { nombre: 'Juan Pérez', correo: 'juan.perez@munica.gob.pe', rol: 'Operador', estado: 'Activo' },
    { nombre: 'María López', correo: 'maria.lopez@munica.gob.pe', rol: 'Operador', estado: 'Activo' },
    { nombre: 'Carlos Ramírez', correo: 'carlos.ramirez@munica.gob.pe', rol: 'Administrador', estado: 'Activo' },
    { nombre: 'Ana Morales', correo: 'ana.morales@munica.gob.pe', rol: 'Consultor', estado: 'Inactivo' }
  ];

  // Lista de roles para la sección de Roles y Permisos
  roles = [
    { nombre: 'Administrador', tipo: 'Sistema', seleccionado: false },
    { nombre: 'Operador', tipo: 'Sistema', seleccionado: true },
    { nombre: 'Consultor', tipo: 'Sistema', seleccionado: false },
    { nombre: 'Ciudadano', tipo: 'Consulta pública', seleccionado: false }
  ];

  rolSeleccionado = this.roles[1]; // Por defecto 'Operador'

  // Permisos asociados al rol seleccionado
  permisosIncidencias = [
    { nombre: 'Registrar incidencia', activo: true },
    { nombre: 'Editar incidencia', activo: true },
    { nombre: 'Eliminar incidencia', activo: false },
    { nombre: 'Ver todas las incidencias', activo: true },
    { nombre: 'Asignar incidencias', activo: true }
  ];

  permisosReportes = [
    { nombre: 'Generar reportes', activo: true },
    { nombre: 'Exportar reportes', activo: true }
  ];

  constructor() {}

  ngOnInit(): void {}

  seleccionarRol(rol: any): void {
    this.rolSeleccionado = rol;
  }

  // >>> FUNCIÓN REQUERIDA POR EL HTML <<<
  rolSelectedEqual(rol: any): boolean {
    return this.rolSeleccionado?.nombre === rol.nombre;
  }

  guardarCambiosRoles(): void {
    console.log('Guardando permisos para el rol:', this.rolSeleccionado.nombre, {
      incidencias: this.permisosIncidencias,
      reportes: this.permisosReportes
    });
    alert('¡Cambios de roles y permisos guardados exitosamente!');
  }

  nuevoUsuario(): void {
    console.log('Abriendo modal para crear nuevo usuario...');
  }
}