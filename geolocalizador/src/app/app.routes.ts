import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardPrincipalComponent } from './dashboard-principal/dashboard-principal';
import { Incidencia } from './incidencia/incidencia';
import { MapaInteractivoComponent } from './mapa-interactivo/mapa-interactivo';
import { NuevaIncidenciaComponent } from './crear-incidencia/crear-incidencia';
import { DetalleIncidenciaComponent } from './detalle-incidencia/detalle-incidencia';
import { ReportesComponent } from './reportes/reportes';
import { UsuariosComponent } from './usuarios/usuarios';
import { authGuard } from './guards/auth.guard'; // 👈 Asegúrate de ajustar la ruta según dónde hayas creado tu guard

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
    component: DashboardPrincipalComponent,
    canActivate: [authGuard] // 🔒 Protegido
  },
  {
    path: 'incidencias',
    component: Incidencia,
    canActivate: [authGuard] // 🔒 Protegido
  },
  {
    path: 'mapa',
    component: MapaInteractivoComponent,
    canActivate: [authGuard] // 🔒 Protegido
  },
  {
    path: 'nueva-incidencia',
    component: NuevaIncidenciaComponent,
    canActivate: [authGuard] // 🔒 Protegido
  },
  {
    path: 'detalle-incidencia/:id', 
    component: DetalleIncidenciaComponent,
    canActivate: [authGuard] // 🔒 Protegido
  },
  {
    path: 'reportes',
    component: ReportesComponent,
    canActivate: [authGuard] // 🔒 Protegido
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard] // 🔒 Protegido
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];