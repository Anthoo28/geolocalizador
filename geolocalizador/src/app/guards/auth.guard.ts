import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // 1. Si estamos ejecutando en el servidor durante el SSR inicial, 
  // permitimos temporalmente la navegación para evitar falsos positivos de redirección.
  if (!isPlatformBrowser(platformId)) {
    return true; 
  }

  // 2. Si estamos en el navegador, validamos el token en localStorage
  const token = localStorage.getItem('token');

  if (token && token.trim() !== '') {
    return true; // Usuario autenticado, se queda en su ventana
  }

  // 3. Si no hay token, lo mandamos al login
  return router.createUrlTree(['/login']);
};