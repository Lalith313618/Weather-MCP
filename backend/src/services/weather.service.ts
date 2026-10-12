import { getWeatherCondition } from "../utils/weatherCodes.js";
import { WeatherSearch } from "../models/weatherSearch.model.js";

export interface GeocodingResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CurrentWeatherResponse {
  success: true;
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
  isDay: number;
  time: string;
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
  success: true;
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

export class WeatherService {
  private static readonly GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1";
  private static readonly WEATHER_BASE_URL = "https://api.open-meteo.com/v1";

  private static readonly CITY_ALIASES: Record<string, string> = {
    bangalore: "Bengaluru",
    bombay: "Mumbai",
    calcutta: "Kolkata",
    madras: "Chennai",
    trivandrum: "Thiruvananthapuram",
    cochin: "Kochi",
    baroda: "Vadodara",
    banaras: "Varanasi",
    benares: "Varanasi",
    poona: "Pune",
    pondicherry: "Puducherry"
  };

  public static async geocodeCity(city: string): Promise<GeocodingResult> {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      throw new Error("City name cannot be empty");
    }

    const lower = trimmedCity.toLowerCase();
    const queryCity = this.CITY_ALIASES[lower] || trimmedCity;

    const url = `${this.GEOCODING_BASE_URL}/search?name=${encodeURIComponent(queryCity)}&count=5&language=en&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding service error (${response.status})`);
    }

    const data = (await response.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        latitude: number;
        longitude: number;
        population?: number;
      }>;
    };

    if (!data.results || data.results.length === 0 || !data.results[0]) {
      const notFoundError = new Error(`City '${trimmedCity}' not found`);
      (notFoundError as { statusCode?: number }).statusCode = 404;
      throw notFoundError;
    }

    const sorted = [...data.results].sort((a, b) => (b.population || 0) - (a.population || 0));
    const location = sorted[0];

    if (!location) {
      const notFoundError = new Error(`City '${trimmedCity}' not found`);
      (notFoundError as { statusCode?: number }).statusCode = 404;
      throw notFoundError;
    }

    return {
      name: location.name,
      country: location.country || "Unknown",
      latitude: location.latitude,
      longitude: location.longitude
    };
  }

  public static async getCurrentWeather(cityName: string): Promise<CurrentWeatherResponse> {
    const location = await this.geocodeCity(cityName);
    const url = `${this.WEATHER_BASE_URL}/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather service error (${response.status})`);
    }

    const data = (await response.json()) as {
      current: {
        time: string;
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
        is_day?: number;
      };
    };

    const condition = getWeatherCondition(data.current.weather_code);

    const result: CurrentWeatherResponse = {
      success: true,
      city: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      temperature: Math.round(data.current.temperature_2m * 10) / 10,
      apparentTemperature: Math.round(data.current.apparent_temperature * 10) / 10,
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
      weatherCode: data.current.weather_code,
      weatherCondition: condition.description,
      weatherIcon: condition.icon,
      isDay: data.current.is_day ?? 1,
      time: data.current.time
    };

    // Save to history asynchronously
    WeatherSearch.create({
      city: result.city,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      temperature: result.temperature,
      weatherCode: result.weatherCode,
      weatherCondition: result.weatherCondition,
      windSpeed: result.windSpeed,
      searchedAt: new Date()
    }).catch((err) => console.error("Failed to save weather search history:", err));

    return result;
  }

  public static async getDailyForecast(cityName: string): Promise<ForecastResponse> {
    const location = await this.geocodeCity(cityName);
    const url = `${this.WEATHER_BASE_URL}/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forecast service error (${response.status})`);
    }

    const data = (await response.json()) as {
      current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
      };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        wind_speed_10m_max: number[];
      };
    };

    const currentCondition = getWeatherCondition(data.current.weather_code);

    const dailyItems: DailyForecastItem[] = data.daily.time.map((date, index) => {
      const code = data.daily.weather_code[index] ?? 0;
      const condition = getWeatherCondition(code);
      return {
        date,
        weatherCode: code,
        weatherCondition: condition.description,
        weatherIcon: condition.icon,
        maxTemperature: Math.round((data.daily.temperature_2m_max[index] ?? 0) * 10) / 10,
        minTemperature: Math.round((data.daily.temperature_2m_min[index] ?? 0) * 10) / 10,
        maxWindSpeed: Math.round((data.daily.wind_speed_10m_max[index] ?? 0) * 10) / 10
      };
    });

    return {
      success: true,
      city: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      current: {
        temperature: Math.round(data.current.temperature_2m * 10) / 10,
        weatherCode: data.current.weather_code,
        weatherCondition: currentCondition.description,
        weatherIcon: currentCondition.icon,
        windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
        humidity: data.current.relative_humidity_2m
      },
      daily: dailyItems
    };
  }
}
