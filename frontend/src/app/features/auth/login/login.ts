import { Component, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly router = inject(Router, { optional: true });
  private readonly authService = inject(AuthService);

  readonly switchToRegister = output<void>();

  email = '';
  password = '';
  rememberMe = false;

  readonly showPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  openRegister(): void {
    this.errorMessage.set(null);
    this.switchToRegister.emit();
    if (this.router) {
      this.router.navigate([], { queryParams: { view: 'register' } });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  handleLogin(): void {
    this.errorMessage.set(null);

    if (!this.email || !this.email.trim()) {
      this.errorMessage.set('Please enter your email or username');
      return;
    }

    if (!this.password || !this.password.trim()) {
      this.errorMessage.set('Please enter your password');
      return;
    }

    this.loading.set(true);

    setTimeout(() => {
      this.loading.set(false);

      const res = this.authService.login(this.email, this.password, this.rememberMe);
      if (!res.success) {
        this.errorMessage.set(res.error || 'Login failed');
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
