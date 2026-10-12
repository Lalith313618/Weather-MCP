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

  readonly activeTab = signal<'dashboard' | 'ai-chat'>('dashboard');
  readonly chatThinking = signal<boolean>(false);
  readonly chatMessages = signal<ChatMessage[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your Weather MCP Assistant. Ask me about real-time weather in any city, or compare conditions across cities.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  ngOnInit(): void {
    this.searchCity('Chennai');
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

    this.chatMessages.update((msgs) => [...msgs, { sender: 'user', text: query, time }]);
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
      this.addBotResponse('Please specify a city name (e.g. "Weather in Bangalore" or "Compare Bangalore & Chennai").');
      return;
    }

    const isTomorrow = /\b(?:tomorrow|next\s+day)\b/i.test(query);
    const isForecast = /\b(?:forecast|upcoming|next\s+\d+\s+days|weekly|week|7\s*days?|5\s*days?)\b/i.test(query);

    if (isTomorrow) {
      this.weatherService.getForecast(targetCity).subscribe({
        next: (f) => {
          const tom = f.daily && f.daily.length > 1 ? f.daily[1] : (f.daily && f.daily[0]);
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

    if (isForecast) {
      this.weatherService.getForecast(targetCity).subscribe({
        next: (f) => {
          if (!f.daily || f.daily.length === 0) {
            this.addBotResponse(`Could not retrieve forecast for ${f.city}.`);
            return;
          }
          const daysText = f.daily.slice(0, 5).map(d =>
            `• ${d.date}: ${d.weatherCondition} (High: ${d.maxTemperature}°C, Low: ${d.minTemperature}°C, Wind: ${d.maxWindSpeed} km/h)`
          ).join('\n');
          const text = `5-Day Forecast for ${f.city}, ${f.country}:\n${daysText}`;
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
    const isComparison = /\b(?:compare|comparison|versus|vs\.?)\b/i.test(query) || /\s+&\s+/.test(query);
    if (!isComparison) return null;

    let clean = query.trim().replace(/[?!.,]+$/g, '');
    clean = clean.replace(/^(?:can\s+you\s+)?(?:please\s+)?(?:compare\s+(?:between\s+)?|comparison\s+(?:between|of)\s+)/i, '');

    const parts = clean.split(/\s+(?:and|&|vs\.?|versus|with|to)\s+/i);
    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
      const cleanCity = (c: string) => c
        .replace(/^(?:weather\s+in|weather\s+of|weather\s+for|weather\s+at)\s+/i, '')
        .replace(/\s+(?:weather|today|tomorrow|now|right\s+now|currently|please)$/i, '')
        .trim();

      const city1 = cleanCity(parts[0]);
      const city2 = cleanCity(parts[1]);
      if (city1 && city2) {
        return { city1, city2 };
      }
    }
    return null;
  }

  private extractCityFromQuery(query: string): string {
    let clean = query.trim().replace(/[?!.,;]+/g, '');

    const inMatch = clean.match(/(?:weather|temperature|forecast|climate|rain)\s+(?:in|of|at|for|about)?\s*([a-zA-Z\s\-]+)/i);
    if (inMatch && inMatch[1] && inMatch[1].trim()) {
      const city = inMatch[1]
        .replace(/\b(?:today|tomorrow|tonight|now|right\s+now|currently|please|this\s+week|next\s+week|weekly|daily|forecast)\b/gi, '')
        .replace(/^(?:the\s+city\s+of\s+|the\s+)?/i, '')
        .trim();
      if (city) return city;
    }

    const endInMatch = clean.match(/\b(?:in|at|of|for)\s+([a-zA-Z\s\-]+)$/i);
    if (endInMatch && endInMatch[1] && endInMatch[1].trim()) {
      const city = endInMatch[1]
        .replace(/\b(?:today|tomorrow|tonight|now|right\s+now|currently|please|this\s+week|next\s+week|weekly|daily|forecast)\b/gi, '')
        .replace(/^(?:the\s+city\s+of\s+|the\s+)?/i, '')
        .trim();
      if (city) return city;
    }

    clean = clean
      .replace(/^(?:can\s+you\s+)?(?:please\s+)?(?:tell|show|give|check|get|find)\s+(?:me\s+)?(?:the\s+)?/i, '')
      .replace(/^(?:what\s+will\s+be|what\s+is|what's|how\s+will\s+be|how\s+is|how's)\s+(?:the\s+)?/i, '')
      .replace(/^(?:what\s+about|tell\s+me\s+about|about)\s+/i, '')
      .replace(/^(?:is\s+it\s+raining\s+in)\s+/i, '')
      .replace(/\b(?:weather|temperature|forecast|climate|conditions?|rain)\b/gi, '')
      .replace(/\b(?:today|tomorrow|tonight|now|right\s+now|currently|please|this\s+week|next\s+week|weekly|daily)\b/gi, '')
      .replace(/^(?:in|at|of|for|about)\s+/i, '')
      .replace(/^(?:the\s+city\s+of\s+|the\s+)?/i, '')
      .trim();

    return clean;
  }

  private addBotResponse(text: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.chatThinking.set(false);
    this.chatMessages.update((msgs) => [...msgs, { sender: 'assistant', text, time }]);
  }
}
