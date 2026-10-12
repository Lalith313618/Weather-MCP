export interface CurrentWeather {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherCondition: string;
  weatherIcon: string;
  isDay?: number;
  time: string;
}

export interface WeatherResponse extends CurrentWeather {
  success: boolean;
}

export interface DailyForecastItem {
  date: string;
  weatherCode: number;
  weatherCondition: string;
  weatherIcon: string;
  maxTemperature: number;
  minTemperature: number;
  maxWindSpeed: number;
}

export interface ForecastResponse {
  success: boolean;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    weatherCode: number;
    weatherCondition: string;
    weatherIcon: string;
    windSpeed: number;
    humidity: number;
  };
  daily: DailyForecastItem[];
}

export interface WeatherHistoryItem {
  _id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  weatherCode: number;
  weatherCondition: string;
  windSpeed: number;
  searchedAt: string;
}

export interface HistoryResponse {
  success: boolean;
  count: number;
  history: WeatherHistoryItem[];
}

export interface ChatMessageItem {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  createdAt?: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  count: number;
  messages: ChatMessageItem[];
}
