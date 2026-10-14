import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token = '';

  if (typeof window !== 'undefined') {
    // Leemos directamente la clave 'token' que vimos en tu Local Storage
    token = localStorage.getItem('token') || '';
  }

  if (token) {
    console.log('🔹 [Interceptor] Token inyectado correctamente para:', req.url);
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  } else {
    console.warn('⚠️ [Interceptor] Petición enviada SIN TOKEN a:', req.url);
  }

  return next(req);
};