import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

export type AuthViewState = 'welcome' | 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly authService = inject(AuthService);

  name = '';
  email = '';
  password = '';
  rememberMe = true;

  readonly viewState = signal<AuthViewState>('welcome');
  readonly showPassword = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (this.route) {
      this.route.queryParams.subscribe((params) => {
        const view = params['view'] || params['mode'];
        if (view === 'register') {
          this.viewState.set('register');
        } else if (view === 'login') {
          this.viewState.set('login');
        } else {
          this.viewState.set('welcome');
        }
      });
    }
  }

  openForm(mode: 'login' | 'register'): void {
    this.viewState.set(mode);
    this.errorMessage.set(null);
    if (this.router) {
      this.router.navigate([], { queryParams: { view: mode } });
    }
  }

  goBackToWelcome(): void {
    this.viewState.set('welcome');
    this.errorMessage.set(null);
    if (this.router) {
      this.router.navigate([], { queryParams: {} });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  handleLogin(): void {
    this.errorMessage.set(null);

    if (this.viewState() === 'register') {
      if (!this.name || !this.name.trim()) {
        this.errorMessage.set('Please enter your full name');
        return;
      }
    }

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

      if (this.viewState() === 'register') {
        const res = this.authService.register(this.name, this.email, this.password);
        if (!res.success) {
          this.errorMessage.set(res.error || 'Registration failed');
          return;
        }
      } else {
        const res = this.authService.login(this.email, this.password);
        if (!res.success) {
          this.errorMessage.set(res.error || 'Login failed');
          return;
        }
      }

      // Navigate to home dashboard on successful authentication
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
