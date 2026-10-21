import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router, { optional: true });

  readonly isLoginPage = signal<boolean>(false);
  readonly activeTab = input<'dashboard' | 'ai-chat'>('dashboard');
  readonly tabChange = output<'dashboard' | 'ai-chat'>();

  switchTab(tab: 'dashboard' | 'ai-chat'): void {
    this.tabChange.emit(tab);
  }

  ngOnInit(): void {
    if (this.router) {
      this.isLoginPage.set(this.router.url.includes('/login'));
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.isLoginPage.set(event.urlAfterRedirects.includes('/login'));
        }
      });
    }
  }

  handleLogout(): void {
    this.authService.logout();
  }
}
