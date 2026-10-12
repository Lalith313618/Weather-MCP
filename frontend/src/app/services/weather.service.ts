import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeatherResponse, ForecastResponse, HistoryResponse, ChatHistoryResponse, ChatMessageItem } from '../models/weather.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5001/api';

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

  getChatMessages(): Observable<ChatHistoryResponse> {
    return this.http.get<ChatHistoryResponse>(`${this.baseUrl}/chat/messages`);
  }

  saveChatMessage(message: { sender: 'user' | 'assistant'; text: string; time: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/chat/messages`, message);
  }

  clearChatMessages(): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/chat/messages`);
  }
}

