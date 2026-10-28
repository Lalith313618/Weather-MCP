import { Component, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private readonly router = inject(Router, { optional: true });
  private readonly authService = inject(AuthService);

  readonly switchToLogin = output<void>();

  name = '';
  email = '';
  password = '';
  rememberMe = false;

  readonly showPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  openLogin(): void {
    this.errorMessage.set(null);
    this.switchToLogin.emit();
    if (this.router) {
      this.router.navigate([], { queryParams: { view: 'login' } });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  handleRegister(): void {
    this.errorMessage.set(null);

    if (!this.name || !this.name.trim()) {
      this.errorMessage.set('Please enter your full name');
      return;
    }

    if (!this.email || !this.email.trim()) {
      this.errorMessage.set('Please enter your email address');
      return;
    }

    if (!this.password || !this.password.trim()) {
      this.errorMessage.set('Please enter your password');
      return;
    }

    this.loading.set(true);

    setTimeout(() => {
      this.loading.set(false);

      const res = this.authService.register(this.name, this.email, this.password, this.rememberMe);
      if (!res.success) {
        this.errorMessage.set(res.error || 'Registration failed');
        return;
      }

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('weather_mcp_tab', 'dashboard');
        } catch (e) {}
      }

      if (this.router) {
        this.router.navigate(['/']);
      }
    }, 400);
  }
}
