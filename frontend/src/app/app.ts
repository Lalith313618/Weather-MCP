import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from './services/weather.service';
import { AssistantService } from './services/assistant.service';
import { CurrentWeather } from './models/weather.model';
import { HeaderComponent } from './components/header/header.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { CurrentWeatherComponent } from './components/current-weather/current-weather.component';
import { AiChatComponent, ChatMessage } from './components/ai-chat/ai-chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SearchBarComponent,
    CurrentWeatherComponent,
    AiChatComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly weatherService = inject(WeatherService);
  private readonly assistantService = inject(AssistantService);

  readonly currentWeather = signal<CurrentWeather | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentTheme = signal<string>('theme-night');

  readonly activeTab = signal<'dashboard' | 'ai-chat'>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('weather_mcp_tab') as 'dashboard' | 'ai-chat')) || 'dashboard'
  );

  readonly chatThinking = signal<boolean>(false);
  readonly chatClearing = signal<boolean>(false);

  private readonly defaultWelcomeMessage: ChatMessage = {
    sender: 'assistant',
    text: 'Hello! I am your Weather MCP Assistant. Ask me about real-time weather in any city, or compare conditions across cities.',
    time: 'Online'
  };

  readonly chatMessages = signal<ChatMessage[]>([this.defaultWelcomeMessage]);

  ngOnInit(): void {
    this.loadPersistedChat();
  }

  switchTab(tab: 'dashboard' | 'ai-chat'): void {
    this.activeTab.set(tab);
    try {
      localStorage.setItem('weather_mcp_tab', tab);
    } catch (e) {}
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

  handleAiChat(query: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text: query, time };

    this.chatMessages.update((msgs) => {
      const updated = [...msgs, userMsg];
      this.persistLocalChat(updated);
      return updated;
    });

    this.weatherService.saveChatMessage(userMsg).subscribe({
      error: (e) => console.warn('Could not save user message to database:', e)
    });

    this.processAiResponse(query);
  }

  handleEditAiChat(event: { index: number; newText: string }): void {
    const { index, newText } = event;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.chatMessages.update((msgs) => {
      const updated = [...msgs];
      if (index >= 0 && index < updated.length) {
        updated[index] = {
          sender: 'user',
          text: newText,
          time,
          edited: true
        };
        // Remove subsequent assistant response so a fresh answer is generated for the edited question
        if (index + 1 < updated.length && updated[index + 1].sender === 'assistant') {
          updated.splice(index + 1, 1);
        }
      }
      this.persistLocalChat(updated);
      return updated;
    });

    this.weatherService.saveChatMessage({ sender: 'user', text: newText, time }).subscribe({
      error: (e) => console.warn('Could not save edited user message:', e)
    });

    this.processAiResponse(newText);
  }

  handleClearChat(): void {
    this.chatClearing.set(true);

    this.weatherService.clearChatMessages().subscribe({
      next: () => {
        this.resetChat();
      },
      error: (err) => {
        console.error('Failed to clear database chat messages', err);
        this.resetChat();
      }
    });
  }

  private resetChat(): void {
    this.chatMessages.set([this.defaultWelcomeMessage]);
    try {
      localStorage.removeItem('weather_mcp_chat');
    } catch (e) {}
    this.chatClearing.set(false);
  }

  private processAiResponse(rawQuery: string): void {
    this.chatThinking.set(true);

    this.assistantService.respond(rawQuery, this.currentWeather()?.city).subscribe({
      next: (botReply) => {
        this.addBotResponse(botReply);
      },
      error: () => {
        this.addBotResponse("I couldn't process that request right now. Please try again.");
      }
    });
  }

  private addBotResponse(text: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatThinking.set(false);
    const botMsg: ChatMessage = { sender: 'assistant', text, time };

    this.chatMessages.update((msgs) => {
      const updated = [...msgs, botMsg];
      this.persistLocalChat(updated);
      return updated;
    });

    this.weatherService.saveChatMessage(botMsg).subscribe({
      error: (e) => console.warn('Could not save bot message to database:', e)
    });
  }

  private loadPersistedChat(): void {
    try {
      const cached = localStorage.getItem('weather_mcp_chat');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed[0]?.sender === 'assistant' && parsed[0]?.text.includes('Hello! I am your Weather MCP Assistant')
            ? parsed
            : [this.defaultWelcomeMessage, ...parsed];
          this.chatMessages.set(formatted);
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached chat', e);
    }

    this.weatherService.getChatMessages().subscribe({
      next: (res) => {
        if (res.success && res.messages && res.messages.length > 0) {
          const loaded: ChatMessage[] = res.messages.map((m) => ({
            sender: m.sender,
            text: m.text,
            time: m.time
          }));

          const fullList = loaded[0]?.sender === 'assistant' && loaded[0]?.text.includes('Hello! I am your Weather MCP Assistant')
            ? loaded
            : [this.defaultWelcomeMessage, ...loaded];

          this.chatMessages.set(fullList);
          this.persistLocalChat(fullList);

          const lastMsg = fullList[fullList.length - 1];
          if (lastMsg && lastMsg.sender === 'user') {
            this.processAiResponse(lastMsg.text);
          }
        }
      },
      error: (err) => {
        console.warn('Could not load chat messages from database:', err);
      }
    });
  }

  private persistLocalChat(msgs: ChatMessage[]): void {
    try {
      localStorage.setItem('weather_mcp_chat', JSON.stringify(msgs));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }
}
