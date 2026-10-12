import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from './services/weather.service';
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

  switchTab(tab: 'dashboard' | 'ai-chat'): void {
    this.activeTab.set(tab);
    try {
      localStorage.setItem('weather_mcp_tab', tab);
    } catch (e) {}
  }

  ngOnInit(): void {
    this.loadPersistedChat();
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

          // Always ensure the welcome greeting is the initial message
          const fullList = loaded[0]?.sender === 'assistant' && loaded[0]?.text.includes('Hello! I am your Weather MCP Assistant')
            ? loaded
            : [this.defaultWelcomeMessage, ...loaded];

          this.chatMessages.set(fullList);
          this.persistLocalChat(fullList);

          // If the last message was from the user (e.g. page was refreshed before bot replied), answer it now!
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

  handleClearChat(): void {
    this.chatClearing.set(true);

    this.weatherService.clearChatMessages().subscribe({
      next: () => {
        this.chatMessages.set([this.defaultWelcomeMessage]);
        try {
          localStorage.removeItem('weather_mcp_chat');
        } catch (e) {}
        this.chatClearing.set(false);
      },
      error: (err) => {
        console.error('Failed to clear database chat messages', err);
        this.chatMessages.set([this.defaultWelcomeMessage]);
        try {
          localStorage.removeItem('weather_mcp_chat');
        } catch (e) {}
        this.chatClearing.set(false);
      }
    });
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

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  private normalizeFuzzyQuery(rawQuery: string): string {
    const KEYWORDS: Record<string, string[]> = {
      compare: ['compare', 'comparison', 'versus'],
      weather: ['weather', 'climate'],
      forecast: ['forecast', 'upcoming', 'weekly'],
      temperature: ['temperature', 'temp'],
      tomorrow: ['tomorrow', 'tommorow', 'tomorow'],
      yesterday: ['yesterday', 'yesterdays', 'yestarday'],
      between: ['between']
    };

    const tokens = rawQuery.split(/(\s+|[^\w\s])/);
    return tokens
      .map((tok) => {
        if (!/^[a-zA-Z]+$/.test(tok) || tok.length < 4) return tok;
        const lower = tok.toLowerCase();
        for (const [canonical, variants] of Object.entries(KEYWORDS)) {
          for (const target of variants) {
            const maxDist = target.length <= 5 ? 1 : 2;
            if (this.levenshteinDistance(lower, target) <= maxDist) {
              return canonical;
            }
          }
        }
        return tok;
      })
      .join('');
  }

  private processAiResponse(rawQuery: string): void {
    const query = this.normalizeFuzzyQuery(rawQuery);
    this.chatThinking.set(true);

    const comp = this.extractComparison(query);
    if (comp) {
      this.weatherService.getCurrentWeather(comp.city1).subscribe({
        next: (w1) => {
          this.weatherService.getCurrentWeather(comp.city2).subscribe({
            next: (w2) => {
              const diff = Math.round(Math.abs(w1.temperature - w2.temperature) * 10) / 10;
              let verdict = '';
              if (w1.temperature > w2.temperature) {
                verdict = `${w1.city} is warmer by ${diff}°C than ${w2.city}.`;
              } else if (w2.temperature > w1.temperature) {
                verdict = `${w2.city} is warmer by ${diff}°C than ${w1.city}.`;
              } else {
                verdict = `Both ${w1.city} and ${w2.city} are at the exact same temperature (${w1.temperature}°C).`;
              }

              const responseText = `Weather Comparison:\n• ${w1.city}, ${w1.country}: ${w1.temperature}°C (${w1.weatherCondition}, Wind: ${w1.windSpeed} km/h, Humidity: ${w1.humidity}%)\n• ${w2.city}, ${w2.country}: ${w2.temperature}°C (${w2.weatherCondition}, Wind: ${w2.windSpeed} km/h, Humidity: ${w2.humidity}%)\n\n${verdict}`;
              this.addBotResponse(responseText);
            },
            error: () => this.addBotResponse(`Could not find weather data for "${comp.city2}". Please check spelling.`)
          });
        },
        error: () => this.addBotResponse(`Could not find weather data for "${comp.city1}". Please check spelling.`)
      });
      return;
    }

    if (/\b(?:compare|comparison|versus|vs\.?)\b/i.test(query) || /\s+&\s+/.test(query)) {
      this.addBotResponse('To compare two cities, try: "Compare Madurai & Ramanathapuram" or "Madurai vs Ramanathapuram".');
      return;
    }

    const targetCity = this.extractCityFromQuery(query);

    if (!targetCity) {
      if (/\b(?:forecast|next\s+\d+\s+days|weekly|5\s*days?)\b/i.test(query)) {
        this.addBotResponse('Please specify a city name for the forecast (e.g. "Forecast for Bangalore for next 5 days" or "Forecast in Mumbai").');
      } else {
        this.addBotResponse('Please specify a city name (e.g. "Weather in Bangalore" or "Compare Bangalore & Chennai").');
      }
      return;
    }

    const isYesterday = /\b(?:yesterday|yesterday's|past\s+day)\b/i.test(query) || /\b(?:yesterday|yesterday's)\b/i.test(rawQuery);
    const isTomorrow = /\b(?:tomorrow|next\s+day)\b/i.test(query);
    const isForecast = /\b(?:forecast|upcoming|next\s+\d+\s+days|weekly|week|7\s*days?|5\s*days?)\b/i.test(query);

    if (isYesterday) {
      this.weatherService.getForecast(targetCity).subscribe({
        next: (f) => {
          const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const yest = f.daily?.find((d) => d.date === yesterdayDate) || (f.daily && f.daily.length > 0 ? f.daily[0] : null);
          if (!yest) {
            this.addBotResponse(`Could not retrieve yesterday's recorded weather for ${f.city}.`);
            return;
          }
          const text = `Yesterday's Weather in ${f.city}, ${f.country} (${yest.date}):\n` +
                       `• Condition: ${yest.weatherCondition}\n` +
                       `• High: ${yest.maxTemperature}°C | Low: ${yest.minTemperature}°C\n` +
                       `• Max Wind Speed: ${yest.maxWindSpeed} km/h`;
          this.addBotResponse(text);
        },
        error: () => {
          this.addBotResponse(`I couldn't locate weather information for "${targetCity}". Please check the spelling of the city.`);
        }
      });
      return;
    }

    if (isTomorrow) {
      this.weatherService.getForecast(targetCity).subscribe({
        next: (f) => {
          const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          const tom = f.daily?.find((d) => d.date === tomorrowDate) || (f.daily && f.daily.length > 1 ? f.daily[1] : null);
          if (!tom) {
            this.addBotResponse(`Could not retrieve tomorrow's forecast for ${f.city}.`);
            return;
          }
          const text = `Tomorrow's Forecast for ${f.city}, ${f.country} (${tom.date}):\n` +
                       `• Weather: ${tom.weatherCondition}\n` +
                       `• High: ${tom.maxTemperature}°C | Low: ${tom.minTemperature}°C\n` +
                       `• Max Wind Speed: ${tom.maxWindSpeed} km/h`;
          this.addBotResponse(text);
        },
        error: () => {
          this.addBotResponse(`I couldn't locate weather information for "${targetCity}". Please check the spelling of the city.`);
        }
      });
      return;
    }

    const daysMatch = query.match(/\b(\d+)\s*days?\b/i) || rawQuery.match(/\b(\d+)\s*days?\b/i);
    let requestedDays = 5;
    if (daysMatch && daysMatch[1]) {
      const parsed = parseInt(daysMatch[1], 10);
      if (parsed >= 1 && parsed <= 10) {
        requestedDays = parsed;
      }
    } else if (/\b(?:week|weekly|7\s*days?)\b/i.test(query) || /\b(?:week|weekly|7\s*days?)\b/i.test(rawQuery)) {
      requestedDays = 7;
    }

    if (isForecast) {
      this.weatherService.getForecast(targetCity).subscribe({
        next: (f) => {
          if (!f.daily || f.daily.length === 0) {
            this.addBotResponse(`Could not retrieve forecast for ${f.city}.`);
            return;
          }
          // Only show today and upcoming forecast dates (filter out past days)
          const todayDate = new Date().toISOString().split('T')[0];
          const upcomingDays = f.daily.filter((d) => d.date >= todayDate);
          const daysToShow = (upcomingDays.length > 0 ? upcomingDays : f.daily).slice(0, requestedDays);

          const daysText = daysToShow.map((d) =>
            `• ${d.date}: ${d.weatherCondition} (High: ${d.maxTemperature}°C, Low: ${d.minTemperature}°C, Wind: ${d.maxWindSpeed} km/h)`
          ).join('\n');
          const title = `${daysToShow.length}-Day Forecast for ${f.city}, ${f.country}:`;
          const text = `${title}\n${daysText}`;
          this.addBotResponse(text);
        },
        error: () => {
          this.addBotResponse(`I couldn't locate forecast information for "${targetCity}". Please check the spelling of the city.`);
        }
      });
      return;
    }

    this.weatherService.getCurrentWeather(targetCity).subscribe({
      next: (w) => {
        const text = `The current temperature in ${w.city}, ${w.country} is ${w.temperature}°C with ${w.weatherCondition}.\nWind speed is ${w.windSpeed} km/h and humidity is ${w.humidity}%. Feels like ${w.apparentTemperature}°C.`;
        this.addBotResponse(text);
      },
      error: () => {
        this.addBotResponse(`I couldn't locate weather information for "${targetCity}". Please check the spelling of the city.`);
      }
    });
  }

  private extractComparison(query: string): { city1: string; city2: string } | null {
    const isComparison = /\b(?:compare|comparison|versus|vs\.?)\b/i.test(query) || /&/.test(query);
    if (!isComparison) return null;

    let clean = query.trim().replace(/[?!.,]+$/g, '');

    // Strip comparison prefixes and filler phrases
    clean = clean.replace(/^(?:can\s+you\s+)?(?:please\s+)?(?:compare\s*(?:the\s*)?|comparison\s*(?:of|between\s*)?)/i, '');
    clean = clean.replace(/^(?:weather\s*(?:conditions?|details?)?\s*(?:of|in|between|for)?\s*)/i, '');
    clean = clean.replace(/^(?:the\s+)?(?:weather|temperature|climate|conditions?)\s*(?:of|in|between|for)?\s*/i, '');
    clean = clean.replace(/^(?:between\s+)/i, '');

    // Split on separators (and, vs, versus, to, with, or & with/without spaces)
    const parts = clean.split(/(?:\s+(?:and|vs\.?|versus|with|to)\s+|\s*&\s*)/i);
    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
      const cleanCity = (c: string) => c
        .replace(/^(?:weather\s*(?:conditions?|details?)?\s*(?:in|of|for|at)?\s*)/i, '')
        .replace(/^(?:the\s+city\s+of\s+|the\s+)/i, '')
        .replace(/\s+(?:weather|conditions?|today|tomorrow|now|right\s+now|currently|please)$/i, '')
        .trim();

      const city1 = cleanCity(parts[0]);
      const city2 = cleanCity(parts[1]);
      if (city1 && city2) {
        return { city1, city2 };
      }
    }
    return null;
  }

  private static readonly STOP_WORDS = new Set([
    'next', 'days', 'day', 'week', 'weeks', 'month', 'months', 'year',
    'today', 'tomorrow', 'yesterday', 'weekend', 'forecast', 'weather',
    'temperature', 'temp', 'condition', 'conditions', 'now', 'here',
    'there', 'current', 'update', 'report', 'me', 'it', 'please', 'city',
    'place', 'give', 'show', 'tell', 'check', 'all', 'any', 'the'
  ]);

  private extractCityFromQuery(query: string): string {
    let clean = query.trim().replace(/[?!.,;]+/g, '');

    // 1. Remove introductory conversational phrases
    clean = clean.replace(/^(?:can\s+you\s+)?(?:please\s+)?(?:tell|show|give|check|get|find)\s+(?:me\s+)?(?:the\s+)?/i, '');
    clean = clean.replace(/^(?:what\s+(?:will\s+be|was|is|'s)|how\s+(?:will\s+be|was|is|'s))\s+(?:the\s+)?/i, '');
    clean = clean.replace(/^(?:what\s+about|tell\s+me\s+about|about)\s+/i, '');
    clean = clean.replace(/^(?:is\s+it\s+raining\s+in)\s+/i, '');

    // 2. Check if there is an explicit location at the end (e.g. "forecast for next 5 days in Bangalore")
    const locationEndMatch = clean.match(/\b(?:in|at|of|for|about)\s+([a-zA-Z\s\-]+)$/i);
    if (locationEndMatch && locationEndMatch[1]) {
      let city = locationEndMatch[1].trim();
      city = city.replace(/^(?:the\s+city\s+of\s+|the\s+)/i, '');
      city = city.replace(/\b(?:weather|conditions?|climate|temperature|temp|forecast|next|\d+\s+days?|days?|week)\b/gi, '').trim();
      if (city && !App.STOP_WORDS.has(city.toLowerCase()) && city.length >= 2) {
        return city;
      }
    }

    // 3. Remove temporal phrases like "next 5 days", "next 7 days", "5 days", etc.
    clean = clean.replace(/\b(?:for\s+)?(?:the\s+)?next\s+\d+\s+days?\b/gi, '');
    clean = clean.replace(/\b\d+\s+days?\b/gi, '');
    clean = clean.replace(/\b(?:next|this)\s+(?:week|weekend|month|days?)\b/gi, '');
    clean = clean.replace(/\b(?:yesterday'?s?|today'?s?|tomorrow'?s?|tonight|now|right\s+now|currently|please|this\s+week|next\s+week|weekly|daily|forecast|upcoming|report|update)\b/gi, '');

    // 4. Match patterns like "weather condition of <City>", "weather in <City>", "forecast for <City>"
    const intentMatch = clean.match(/(?:weather\s*(?:conditions?|details?)?|conditions?|temperature|temp|climate|rain|forecast)\s*(?:in|of|at|for|about)?\s*([a-zA-Z\s\-]+)/i);
    if (intentMatch && intentMatch[1] && intentMatch[1].trim()) {
      let city = intentMatch[1].trim();
      city = city.replace(/^(?:in|of|at|for|about)\s+/i, '');
      city = city.replace(/^(?:the\s+city\s+of\s+|the\s+)/i, '');
      city = city.replace(/\b(?:weather|conditions?|climate|temperature|temp|forecast|next|days?)\b/gi, '');
      city = city.trim();
      if (city && !App.STOP_WORDS.has(city.toLowerCase()) && city.length >= 2) {
        return city;
      }
    }

    // 5. Fallback cleanup: strip any remaining weather nouns and prepositions
    clean = clean
      .replace(/\b(?:weather|temperature|temp|forecast|climate|conditions?|rain|next|days?)\b/gi, '')
      .replace(/^(?:in|at|of|for|about)\s+/i, '')
      .replace(/^(?:the\s+city\s+of\s+|the\s+)?/i, '')
      .trim();

    if (clean && !App.STOP_WORDS.has(clean.toLowerCase()) && clean.length >= 2) {
      return clean;
    }

    return '';
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
}

