import dotenv from "dotenv";

dotenv.config();

export class WeatherApiClient {
  private static readonly BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001/api";

  public static async getCurrentWeather(city: string) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/weather?city=${encodeURIComponent(city.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (error: any) {
      return await this.fetchDirectWeather(city);
    }
  }

  public static async getForecast(city: string) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/weather/forecast?city=${encodeURIComponent(city.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (error: any) {
      return await this.fetchDirectForecast(city);
    }
  }

  public static async getHistory(limit = 10) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/weather/history?limit=${limit}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (error: any) {
      return {
        success: false,
        error: `Could not fetch history from backend: ${error.message}`
      };
    }
  }

  public static async compareWeather(cities: string[]) {
    if (!cities || cities.length < 2) {
      throw new Error("At least two cities must be provided for comparison");
    }

    const results = await Promise.all(
      cities.map(async (city) => {
        try {
          return await this.getCurrentWeather(city);
        } catch (err: any) {
          return { success: false, city, error: err.message };
        }
      })
    );

    const validResults = results.filter((r) => r.success);
    let analysis = "";

    if (validResults.length >= 2) {
      const sorted = [...validResults].sort((a, b) => b.temperature - a.temperature);
      const warmest = sorted[0];
      const coolest = sorted[sorted.length - 1];
      const diff = Math.round((warmest.temperature - coolest.temperature) * 10) / 10;
      analysis = `${warmest.city} is the warmest at ${warmest.temperature}°C, while ${coolest.city} is the coolest at ${coolest.temperature}°C (difference: ${diff}°C).`;
    }

    return {
      success: true,
      comparison: results,
      analysis
    };
  }
  private static async geocodeCity(city: string) {
    const trimmed = city.trim();
    if (!trimmed) throw new Error("City name cannot be empty");

    const query = trimmed.toLowerCase() === "bangalore" ? "Bengaluru" : trimmed;

    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
    const geoData = (await geoRes.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        latitude: number;
        longitude: number;
        population?: number;
      }>;
    };

    if (!geoData.results || geoData.results.length === 0 || !geoData.results[0]) {
      throw new Error(`City '${city}' not found`);
    }

    const sorted = [...geoData.results].sort((a, b) => (b.population || 0) - (a.population || 0));
    const loc = sorted[0]!;

    return {
      name: loc.name,
      country: loc.country || "Unknown",
      latitude: loc.latitude,
      longitude: loc.longitude
    };
  }

  private static async fetchDirectWeather(city: string) {
    const loc = await this.geocodeCity(city);
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`);
    const wData = await wRes.json();

    return {
      success: true,
      city: loc.name,
      country: loc.country,
      latitude: loc.latitude,
      longitude: loc.longitude,
      temperature: wData.current.temperature_2m,
      apparentTemperature: wData.current.apparent_temperature,
      humidity: wData.current.relative_humidity_2m,
      windSpeed: wData.current.wind_speed_10m,
      weatherCode: wData.current.weather_code
    };
  }

  private static async fetchDirectForecast(city: string) {
    const loc = await this.geocodeCity(city);
    const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&past_days=14&forecast_days=16&timezone=auto`);
    const fData = await fRes.json();

    const daily = fData.daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: fData.daily.weather_code[i],
      maxTemperature: fData.daily.temperature_2m_max[i],
      minTemperature: fData.daily.temperature_2m_min[i],
      maxWindSpeed: fData.daily.wind_speed_10m_max[i]
    }));

    return {
      success: true,
      city: loc.name,
      country: loc.country,
      latitude: loc.latitude,
      longitude: loc.longitude,
      daily
    };
  }

  public static async getYesterdayWeather(city: string) {
    const loc = await this.geocodeCity(city);
    const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum&past_days=3&forecast_days=1&timezone=auto`);
    const fData = (await fRes.json()) as any;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
    let targetIndex = fData.daily.time.indexOf(yesterday);
    if (targetIndex === -1 && fData.daily.time.length >= 2) {
      targetIndex = fData.daily.time.length - 2;
    } else if (targetIndex === -1) {
      targetIndex = 0;
    }

    return {
      success: true,
      city: loc.name,
      country: loc.country,
      date: fData.daily.time[targetIndex],
      maxTemperature: fData.daily.temperature_2m_max[targetIndex],
      minTemperature: fData.daily.temperature_2m_min[targetIndex],
      weatherCode: fData.daily.weather_code[targetIndex],
      maxWindSpeed: fData.daily.wind_speed_10m_max[targetIndex],
      precipitation: fData.daily.precipitation_sum ? fData.daily.precipitation_sum[targetIndex] : 0
    };
  }
}
