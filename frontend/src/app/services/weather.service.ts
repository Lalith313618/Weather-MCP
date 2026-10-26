import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeatherResponse, ForecastResponse, HistoryResponse, ChatHistoryResponse, ChatMessageItem } from '../models/weather.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://weather-mcp-9wg8.onrender.com';

  getCurrentWeather(city: string): Observable<WeatherResponse> {
    const params = new HttpParams().set('city', city.trim());
    return this.http.get<WeatherResponse>(`${this.baseUrl}/weather`, { params });
  }

  getForecast(city: string): Observable<ForecastResponse> {
    const params = new HttpParams().set('city', city.trim());
    return this.http.get<ForecastResponse>(`${this.baseUrl}/weather/forecast`, { params });
  }

  getHistory(limit = 10): Observable<HistoryResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<HistoryResponse>(`${this.baseUrl}/weather/history`, { params });
  }

  getChatMessages(userEmail?: string, sessionId?: string): Observable<ChatHistoryResponse> {
    let params = new HttpParams();
    if (userEmail) {
      params = params.set('user', userEmail.trim().toLowerCase());
    }
    if (sessionId) {
      params = params.set('sessionId', sessionId);
    }
    return this.http.get<ChatHistoryResponse>(`${this.baseUrl}/chat/messages`, { params });
  }

  saveChatMessage(message: { sender: 'user' | 'assistant'; text: string; time: string }, userEmail?: string, sessionId?: string): Observable<any> {
    const payload = {
      ...message,
      user: userEmail ? userEmail.trim().toLowerCase() : undefined,
      sessionId: sessionId || undefined
    };
    return this.http.post<any>(`${this.baseUrl}/chat/messages`, payload);
  }

  clearChatMessages(userEmail?: string, sessionId?: string): Observable<any> {
    let params = new HttpParams();
    if (userEmail) {
      params = params.set('user', userEmail.trim().toLowerCase());
    }
    if (sessionId) {
      params = params.set('sessionId', sessionId);
    }
    return this.http.delete<any>(`${this.baseUrl}/chat/messages`, { params });
  }

  sendAiChat(message: string, history: Array<{ sender: 'user' | 'assistant'; text: string }> = []): Observable<{ success: boolean; reply: string; error?: string }> {
    return this.http.post<{ success: boolean; reply: string; error?: string }>(`${this.baseUrl}/chat`, {
      message,
      history
    });
  }
}


