import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardPrincipalComponent } from './dashboard-principal/dashboard-principal';
import { Incidencia } from './incidencia/incidencia';
import { MapaInteractivoComponent } from './mapa-interactivo/mapa-interactivo';
import { NuevaIncidenciaComponent } from './crear-incidencia/crear-incidencia';
import { DetalleIncidenciaComponent } from './detalle-incidencia/detalle-incidencia';
import { ReportesComponent } from './reportes/reportes';
import { UsuariosComponent } from './usuarios/usuarios';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    component: DashboardPrincipalComponent
  },
  {
    path: 'incidencias',
    component: Incidencia
  },
  {
    path: 'mapa',
    component: MapaInteractivoComponent
  },
  {
    path: 'nueva-incidencia',
    component: NuevaIncidenciaComponent
  },
  {
    path: 'detalle-incidencia/:id', // Recibe el ID de la incidencia seleccionada
    component: DetalleIncidenciaComponent
  },
  {
    path: 'reportes',
    component: ReportesComponent
  },
  {
    path: 'usuarios',
    component: UsuariosComponent
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];