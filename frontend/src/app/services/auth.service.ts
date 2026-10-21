import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

export interface UserAccount {
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router, { optional: true });

  readonly currentUser = signal<string | null>(null);
  readonly currentUserEmail = signal<string | null>(null);
  readonly isLoggedIn = signal<boolean>(false);
  readonly authStateChanged = new Subject<{ isLoggedIn: boolean; email: string | null }>();

  constructor() {
    this.checkInitialAuth();
  }

  checkInitialAuth(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('weather_mcp_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          this.currentUser.set(user.name || user.email || 'User');
          this.currentUserEmail.set(user.email || null);
          this.isLoggedIn.set(true);
        } catch {
          this.currentUser.set(stored);
          this.currentUserEmail.set(stored);
          this.isLoggedIn.set(true);
        }
      } else {
        this.currentUser.set(null);
        this.currentUserEmail.set(null);
        this.isLoggedIn.set(false);
      }
    }
  }

  getRegisteredUsers(): UserAccount[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const stored = localStorage.getItem('weather_mcp_registered_users');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  register(name: string, email: string, password: string): { success: boolean; error?: string } {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      return { success: false, error: 'Please enter your full name' };
    }

    if (!trimmedEmail) {
      return { success: false, error: 'Please enter your email address' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address (e.g. user@example.com)' };
    }

    if (!trimmedPassword || trimmedPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long' };
    }

    const users = this.getRegisteredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      return {
        success: false,
        error: 'An account with this email already exists. Please sign in instead.'
      };
    }

    const newUser: UserAccount = {
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('weather_mcp_registered_users', JSON.stringify(users));
    }

    this.setCurrentSession(newUser);
    return { success: true };
  }

  login(identifier: string, password: string): { success: boolean; error?: string } {
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedId) {
      return { success: false, error: 'Please enter your email or username' };
    }

    if (!trimmedPassword) {
      return { success: false, error: 'Please enter your password' };
    }

    const users = this.getRegisteredUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === trimmedId || u.name.toLowerCase() === trimmedId
    );

    if (!user) {
      return {
        success: false,
        error: 'No account found with this email. Please register first.'
      };
    }

    if (user.password !== trimmedPassword) {
      return {
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.'
      };
    }

    this.setCurrentSession(user);
    return { success: true };
  }

  private setCurrentSession(user: UserAccount): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('weather_mcp_user', JSON.stringify(user));
    }
    this.currentUser.set(user.name);
    this.currentUserEmail.set(user.email);
    this.isLoggedIn.set(true);
    this.authStateChanged.next({ isLoggedIn: true, email: user.email });
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('weather_mcp_user');
      try {
        localStorage.setItem('weather_mcp_tab', 'dashboard');
      } catch (e) {}
    }
    this.currentUser.set(null);
    this.currentUserEmail.set(null);
    this.isLoggedIn.set(false);
    this.authStateChanged.next({ isLoggedIn: false, email: null });
    if (this.router) {
      this.router.navigate(['/']);
    }
  }
}
