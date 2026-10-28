import { Component, OnInit, inject, signal, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { WeatherService } from './services/weather.service';
import { CurrentWeather } from './models/weather.model';
import { HeaderComponent } from './components/header/header.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { CurrentWeatherComponent } from './components/current-weather/current-weather.component';
import { AiChatComponent, ChatMessage, ChatSession } from './components/ai-chat/ai-chat.component';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SearchBarComponent,
    CurrentWeatherComponent,
    AiChatComponent,
    Login,
    Register
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly weatherService = inject(WeatherService);
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly authService = inject(AuthService);
  readonly aiChat = viewChild<AiChatComponent>('aiChat');
  readonly showDashboardDrawer = signal<boolean>(false);
  readonly authView = signal<'login' | 'register'>('login');

  setAuthView(view: 'login' | 'register'): void {
    this.authView.set(view);
    if (this.router) {
      this.router.navigate([], { queryParams: { view } });
    }
  }

  handleToggleSidebar(): void {
    if (this.activeTab() === 'dashboard') {
      this.showDashboardDrawer.update((v) => !v);
    } else {
      this.aiChat()?.toggleHistory();
    }
  }

  closeDashboardDrawer(): void {
    this.showDashboardDrawer.set(false);
  }

  navigateToAssistant(): void {
    this.showDashboardDrawer.set(false);
    this.switchTab('ai-chat');
  }

  openSessionFromDrawer(sessionId: string): void {
    this.showDashboardDrawer.set(false);
    this.switchTab('ai-chat');
    this.handleSelectSession(sessionId);
  }

  handleLogoutFromDrawer(): void {
    this.showDashboardDrawer.set(false);
    this.authService.logout();
  }

  readonly isLoginPage = computed<boolean>(() => !this.authService.isLoggedIn());

  readonly currentWeather = signal<CurrentWeather | null>(null);

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentTheme = signal<string>('theme-night');

  readonly activeTab = signal<'dashboard' | 'ai-chat'>(
    (() => {
      if (typeof localStorage !== 'undefined') {
        try {
          const saved = localStorage.getItem('weather_mcp_tab');
          if (saved === 'ai-chat' || saved === 'dashboard') {
            return saved;
          }
        } catch (e) {}
      }
      return 'dashboard';
    })()
  );

  readonly chatThinking = signal<boolean>(false);
  readonly chatClearing = signal<boolean>(false);

  private readonly defaultWelcomeMessage: ChatMessage = {
    sender: 'assistant',
    text: 'Hello! I am your Weather MCP Assistant. Ask me about real-time weather in any city, or compare conditions across cities.',
    time: 'Online'
  };

  readonly chatSessions = signal<ChatSession[]>([]);
  readonly activeSessionId = signal<string>('');

  readonly chatMessages = computed<ChatMessage[]>(() => {
    const current = this.chatSessions().find((s) => s.id === this.activeSessionId());
    return current ? current.messages : [this.defaultWelcomeMessage];
  });

  ngOnInit(): void {
    if (this.route) {
      this.route.queryParams.subscribe((params) => {
        const view = params['view'] || params['mode'];
        if (view === 'register') {
          this.authView.set('register');
        } else if (view === 'login') {
          this.authView.set('login');
        }
      });
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const savedTab = localStorage.getItem('weather_mcp_tab');
        if (savedTab === 'ai-chat' || savedTab === 'dashboard') {
          this.activeTab.set(savedTab);
        }
      } catch (e) {}
    }

    if (this.authService.isLoggedIn() && this.authService.currentUserEmail()) {
      this.loadPersistedChat(this.authService.currentUserEmail()!);
    }

    this.authService.authStateChanged.subscribe(({ isLoggedIn, email }) => {
      this.activeTab.set('dashboard');
      try {
        localStorage.setItem('weather_mcp_tab', 'dashboard');
      } catch (e) {}

      if (isLoggedIn && email) {
        this.loadPersistedChat(email);
      } else {
        this.chatSessions.set([]);
        this.activeSessionId.set('');
      }
    });
  }

  switchTab(tab: 'dashboard' | 'ai-chat'): void {
    this.activeTab.set(tab);
    try {
      localStorage.setItem('weather_mcp_tab', tab);
    } catch (e) {}

    if (tab === 'ai-chat' && this.authService.isLoggedIn() && this.authService.currentUserEmail()) {
      if (this.chatSessions().length === 0) {
        this.loadPersistedChat(this.authService.currentUserEmail()!);
      }
    }
  }

  searchCity(city: string): void {
    if (!city || !city.trim()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.weatherService.getCurrentWeather(city).subscribe({
      next: (weatherRes) => {
        this.currentWeather.set(weatherRes);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const serverError = err.error?.error || 'Unable to retrieve weather. Please check the city name.';
        this.errorMessage.set(serverError);
      }
    });
  }

  handleNewChat(): void {
    const email = (this.authService.currentUserEmail() || 'guest').toLowerCase().trim();
    const newId = 'session_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      userEmail: email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [this.defaultWelcomeMessage]
    };

    this.chatSessions.update((sessions) => [newSession, ...sessions]);
    this.activeSessionId.set(newId);
    this.persistLocalSessions(this.chatSessions());
    try {
      localStorage.setItem(`weather_mcp_active_session_${email}`, newId);
    } catch (e) {}
  }

  handleSelectSession(sessionId: string): void {
    this.activeSessionId.set(sessionId);
    const email = (this.authService.currentUserEmail() || 'guest').toLowerCase().trim();
    try {
      localStorage.setItem(`weather_mcp_active_session_${email}`, sessionId);
    } catch (e) {}
  }

  handleDeleteSession(sessionId: string): void {
    const email = this.authService.currentUserEmail() || undefined;
    this.weatherService.clearChatMessages(email, sessionId).subscribe({
      error: (e) => console.warn('Could not delete session on backend:', e)
    });

    this.chatSessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));
    const remaining = this.chatSessions();

    if (this.activeSessionId() === sessionId) {
      if (remaining.length > 0) {
        this.activeSessionId.set(remaining[0].id);
      } else {
        this.handleNewChat();
        return;
      }
    }

    this.persistLocalSessions(this.chatSessions());
  }

  handleAiChat(query: string): void {
    let currentId = this.activeSessionId();
    if (!currentId || !this.chatSessions().some((s) => s.id === currentId)) {
      this.handleNewChat();
      currentId = this.activeSessionId();
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text: query, time };

    this.chatSessions.update((sessions) =>
      sessions.map((s) => {
        if (s.id === currentId) {
          const isInitialTitle = s.title === 'New Conversation' || s.title === 'New Chat';
          const newTitle = isInitialTitle
            ? (query.length > 28 ? query.slice(0, 28) + '...' : query)
            : s.title;
          return {
            ...s,
            title: newTitle,
            updatedAt: time,
            messages: [...s.messages, userMsg]
          };
        }
        return s;
      })
    );
    this.persistLocalSessions(this.chatSessions());

    const userEmail = this.authService.currentUserEmail() || undefined;
    this.weatherService.saveChatMessage(userMsg, userEmail, currentId).subscribe({
      error: (e) => console.warn('Could not save user message to database:', e)
    });

    this.processAiResponse(query, currentId);
  }

  handleEditAiChat(event: { index: number; newText: string }): void {
    const currentId = this.activeSessionId();
    const { index, newText } = event;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.chatSessions.update((sessions) =>
      sessions.map((s) => {
        if (s.id === currentId) {
          const updatedMessages = [...s.messages];
          if (index >= 0 && index < updatedMessages.length) {
            updatedMessages[index] = {
              sender: 'user',
              text: newText,
              time,
              edited: true
            };
            if (index + 1 < updatedMessages.length && updatedMessages[index + 1].sender === 'assistant') {
              updatedMessages.splice(index + 1, 1);
            }
          }
          return {
            ...s,
            updatedAt: time,
            messages: updatedMessages
          };
        }
        return s;
      })
    );
    this.persistLocalSessions(this.chatSessions());

    const userEmail = this.authService.currentUserEmail() || undefined;
    this.weatherService.saveChatMessage({ sender: 'user', text: newText, time }, userEmail, currentId).subscribe({
      error: (e) => console.warn('Could not save edited user message:', e)
    });

    this.processAiResponse(newText, currentId);
  }

  handleClearChat(): void {
    this.chatClearing.set(true);
    const currentId = this.activeSessionId();
    const userEmail = this.authService.currentUserEmail() || undefined;

    this.weatherService.clearChatMessages(userEmail, currentId).subscribe({
      next: () => {
        this.resetActiveSessionMessages();
      },
      error: (err) => {
        console.error('Failed to clear database chat messages', err);
        this.resetActiveSessionMessages();
      }
    });
  }

  private resetActiveSessionMessages(): void {
    const currentId = this.activeSessionId();
    this.chatSessions.update((sessions) =>
      sessions.map((s) => (s.id === currentId ? { ...s, messages: [this.defaultWelcomeMessage] } : s))
    );
    this.persistLocalSessions(this.chatSessions());
    this.chatClearing.set(false);
  }

  private processAiResponse(rawQuery: string, sessionId: string): void {
    this.chatThinking.set(true);

    const activeSession = this.chatSessions().find((s) => s.id === sessionId);
    const messages = activeSession ? activeSession.messages : [];

    const historyForGemini = messages
      .filter((m) => m && m.text && !m.text.includes('Hello! I am your Weather MCP Assistant'))
      .map((m) => ({ sender: m.sender, text: m.text }));

    this.weatherService.sendAiChat(rawQuery, historyForGemini).subscribe({
      next: (res) => {
        if (res.success && res.reply) {
          this.addBotResponse(res.reply, sessionId);
        } else {
          this.addBotResponse(res.error || 'Unable to retrieve weather intelligence. Please try again.', sessionId);
        }
      },
      error: (err) => {
        const errorMsg = err?.error?.error || 'Could not connect to Gemini AI. Please check that the backend is running and GEMINI_API_KEY is set in backend/.env.';
        this.addBotResponse(`⚠️ ${errorMsg}`, sessionId);
      }
    });
  }

  private cleanBotText(text: string): string {
    if (!text) return '';
    const cleaned = text
      .replace(/(?:for\s*turn|forturn|call)?[:\s]*(?:default_?api:)?\w+\s*\{[\s\S]*?\}\s*result:\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\})\s*[\u4e00-\u9fa5]*\s*/gi, '')
      .replace(/(?:for\s*turn|forturn|default_?api)[\s\S]*?(?:[\u4e00-\u9fa5]|result:[\s\S]*?\]|result:[\s\S]*?\})\s*/gi, '')
      .replace(/^(?:\[[\s\S]*?\]|\{[\s\S]*?\})\s*[\u4e00-\u9fa5]*\s*/g, '')
      .replace(/^[\s\u4e00-\u9fa5:]+/g, '')
      .trim();

    if (
      /\b(actor|actress|film\s*actor|kollywood|bollywood|cinema|formula\s*(?:two|one|2|1)|racing\s*driver|celebrity)\b/i.test(cleaned) ||
      /clarify if you meant/i.test(cleaned)
    ) {
      return 'This is not a recognized place or city name. Kindly ask about the weather condition, forecast, or history for a specific city or location.';
    }

    return cleaned;
  }

  private addBotResponse(text: string, sessionId: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatThinking.set(false);
    const sanitizedText = this.cleanBotText(text);
    const botMsg: ChatMessage = { sender: 'assistant', text: sanitizedText, time };

    this.chatSessions.update((sessions) =>
      sessions.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            updatedAt: time,
            messages: [...s.messages, botMsg]
          };
        }
        return s;
      })
    );
    this.persistLocalSessions(this.chatSessions());

    const userEmail = this.authService.currentUserEmail() || undefined;
    this.weatherService.saveChatMessage(botMsg, userEmail, sessionId).subscribe({
      error: (e) => console.warn('Could not save bot message to database:', e)
    });
  }

  private loadPersistedChat(userEmail?: string): void {
    const email = (userEmail || this.authService.currentUserEmail() || '').trim().toLowerCase();
    if (!email) {
      this.chatSessions.set([]);
      this.activeSessionId.set('');
      return;
    }

    const storageKey = `weather_mcp_sessions_${email}`;

    let localSessions: ChatSession[] = [];
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localSessions = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached sessions:', e);
    }

    let savedActiveId: string | null = null;
    try {
      savedActiveId = localStorage.getItem(`weather_mcp_active_session_${email}`);
    } catch (e) {}

    if (localSessions.length > 0) {
      this.chatSessions.set(localSessions);
      if (savedActiveId && localSessions.some((s) => s.id === savedActiveId)) {
        this.activeSessionId.set(savedActiveId);
      } else if (!localSessions.some((s) => s.id === this.activeSessionId())) {
        this.activeSessionId.set(localSessions[0].id);
      }
    } else {
      const firstId = 'session_' + Date.now();
      const firstSession: ChatSession = {
        id: firstId,
        title: 'New Conversation',
        userEmail: email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [this.defaultWelcomeMessage]
      };
      this.chatSessions.set([firstSession]);
      this.activeSessionId.set(firstId);
      this.persistLocalSessions([firstSession]);
    }

    this.weatherService.getChatMessages(email).subscribe({
      next: (res) => {
        if (res.success && res.messages && res.messages.length > 0) {
          const sessionMap = new Map<string, ChatMessage[]>();
          for (const m of res.messages) {
            const sId = m.sessionId || 'default';
            if (!sessionMap.has(sId)) {
              sessionMap.set(sId, []);
            }
            sessionMap.get(sId)!.push({
              sender: m.sender,
              text: m.text,
              time: m.time
            });
          }

          const currentSessions = [...this.chatSessions()];
          const merged: ChatSession[] = [];

          for (const s of currentSessions) {
            if (sessionMap.has(s.id)) {
              const msgs = sessionMap.get(s.id)!;
              const formatted = msgs[0]?.sender === 'assistant' && msgs[0]?.text.includes('Hello! I am your Weather MCP Assistant')
                ? msgs
                : [this.defaultWelcomeMessage, ...msgs];
              merged.push({ ...s, messages: formatted });
              sessionMap.delete(s.id);
            } else {
              merged.push(s);
            }
          }

          sessionMap.forEach((msgs, sId) => {
            const firstUserMsg = msgs.find((m) => m.sender === 'user');
            const title = firstUserMsg ? (firstUserMsg.text.length > 28 ? firstUserMsg.text.slice(0, 28) + '...' : firstUserMsg.text) : 'Conversation';
            const formatted = msgs[0]?.sender === 'assistant' && msgs[0]?.text.includes('Hello! I am your Weather MCP Assistant')
              ? msgs
              : [this.defaultWelcomeMessage, ...msgs];

            merged.push({
              id: sId,
              title,
              userEmail: email,
              createdAt: new Date().toISOString(),
              updatedAt: msgs[msgs.length - 1]?.time || 'Recent',
              messages: formatted
            });
          });

          this.chatSessions.set(merged);
          this.persistLocalSessions(merged);
          if (!merged.some((s) => s.id === this.activeSessionId()) && merged.length > 0) {
            this.activeSessionId.set(merged[0].id);
          }
        }
      },
      error: (err) => console.warn('Could not sync chat messages from database:', err)
    });
  }

  private persistLocalSessions(sessions: ChatSession[]): void {
    const email = (this.authService.currentUserEmail() || '').trim().toLowerCase();
    if (!email) return;
    try {
      localStorage.setItem(`weather_mcp_sessions_${email}`, JSON.stringify(sessions));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }
}
