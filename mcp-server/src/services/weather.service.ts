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

  private static readonly CITY_ALIASES: Record<string, string> = {
    bangalore: "Bengaluru",
    banglore: "Bengaluru",
    bengaluru: "Bengaluru",
    bombay: "Mumbai",
    mumbai: "Mumbai",
    mumbay: "Mumbai",
    calcutta: "Kolkata",
    kolkata: "Kolkata",
    kolkatta: "Kolkata",
    madras: "Chennai",
    chennai: "Chennai",
    chenai: "Chennai",
    chenna: "Chennai",
    delhi: "Delhi",
    delh: "Delhi",
    dilli: "Delhi",
    trivandrum: "Thiruvananthapuram",
    thiruvananthapuram: "Thiruvananthapuram",
    cochin: "Kochi",
    kochi: "Kochi",
    baroda: "Vadodara",
    vadodara: "Vadodara",
    banaras: "Varanasi",
    benares: "Varanasi",
    varanasi: "Varanasi",
    poona: "Pune",
    pune: "Pune",
    pondicherry: "Puducherry",
    puducherry: "Puducherry",
    hyderabad: "Hyderabad",
    hydrabad: "Hyderabad",
    ramanathapuram: "Ramanathapuram",
    ramnad: "Ramanathapuram"
  };

  private static async fetchDirectWeather(city: string) {
    const queryCity = this.CITY_ALIASES[city.trim().toLowerCase()] || city.trim();
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=5&language=en&format=json`);
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`City '${city}' not found`);
    }
    const sorted = [...geoData.results].sort((a: any, b: any) => (b.population || 0) - (a.population || 0));
    const loc = sorted[0];
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`);
    const wData = await wRes.json();

    return {
      success: true,
      city: loc.name,
      country: loc.country || "Unknown",
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
    const queryCity = this.CITY_ALIASES[city.trim().toLowerCase()] || city.trim();
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=5&language=en&format=json`);
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`City '${city}' not found`);
    }
    const sorted = [...geoData.results].sort((a: any, b: any) => (b.population || 0) - (a.population || 0));
    const loc = sorted[0];
    const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&past_days=2&forecast_days=10&timezone=auto`);
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
      country: loc.country || "Unknown",
      latitude: loc.latitude,
      longitude: loc.longitude,
      daily
    };
  }
}
