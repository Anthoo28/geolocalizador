
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
   templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class ReportesComponent implements OnInit {

  // Pestaña activa ('generar' o 'historial')
  tabActiva: string = 'generar';

  // Datos del formulario de reporte
  reporte = {
    tipoReporte: 'Incidencias por periodo',
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-31',
    sector: 'Todos',
    formato: 'PDF'
  };

  constructor() {}

  ngOnInit(): void {}

  seleccionarFormato(formato: string): void {
    this.reporte.formato = formato;
  }

  generarReporte(): void {
    console.log('Generando reporte con los datos:', this.reporte);
    // Aquí puedes integrar la lógica para descargar el PDF o Excel desde tu backend de Node.js
  }
}