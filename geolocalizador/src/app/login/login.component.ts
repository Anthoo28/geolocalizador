import { Component, inject, ChangeDetectorRef } from '@angular/core'; // <--- 1. Importar ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef); // <--- 2. Inyectarlo aquí

  showPassword = false;
  isLoading = false;
  
  toastMessage = '';
  toastType: 'success' | 'error' = 'error';
  private toastTimeout: any;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  showToast(message: string, type: 'success' | 'error' = 'error', duration: number = 3000): void {
    this.toastMessage = message;
    this.toastType = type;

    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
      this.cd.detectChanges(); // Refrescar al ocultar
    }, duration);

    this.cd.detectChanges(); // <--- 3. Forzar refresco visual inmediato al mostrar el toast
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.toastMessage = '';

    const credentials = {
      email: this.loginForm.value.email!,
      password: this.loginForm.value.password!
    };

    this.authService.login(credentials).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const mensajeExito = res?.mensaje || res?.msg || '¡Inicio de sesión exitoso!';
        this.showToast(mensajeExito, 'success', 2000);

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1200);
      },
      error: (err) => {
        this.isLoading = false; // <--- Desactiva el "Iniciando sesión..." al instante
        const mensajeError = err.error?.mensaje || err.error?.msg || 'Usuario o contraseña incorrectos';
        this.showToast(mensajeError, 'error', 4000);
      }
    });
  }
}