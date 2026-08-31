import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardPrincipal } from './dashboard-principal/dashboard-principal';
import { Incidencia } from './incidencia/incidencia';
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
    component: DashboardPrincipal
  },
  {
  path: 'incidencia',
  component: Incidencia
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];