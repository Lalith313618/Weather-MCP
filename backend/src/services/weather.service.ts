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

export interface HourlyForecastItem {
  time: string;
  temperature: number;
  weatherCode: number;
  weatherCondition: string;
  windSpeed: number;
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
  hourly?: HourlyForecastItem[];
}

export class WeatherService {
  private static readonly GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1";
  private static readonly WEATHER_BASE_URL = "https://api.open-meteo.com/v1";

  private static readonly KNOWN_COORDINATES: Record<string, GeocodingResult> = {
    // Kerala Districts & Tourist Destinations
    wayanad: { name: "Wayanad", country: "India", latitude: 11.6854, longitude: 76.1320 },
    kalpetta: { name: "Kalpetta", country: "India", latitude: 11.6103, longitude: 76.0828 },
    "sulthan bathery": { name: "Sulthan Bathery", country: "India", latitude: 11.6667, longitude: 76.2500 },
    "sultan bathery": { name: "Sulthan Bathery", country: "India", latitude: 11.6667, longitude: 76.2500 },
    mananthavady: { name: "Mananthavady", country: "India", latitude: 11.8032, longitude: 76.0045 },
    vythiri: { name: "Vythiri", country: "India", latitude: 11.5500, longitude: 76.0400 },
    munnar: { name: "Munnar", country: "India", latitude: 10.0882, longitude: 77.0624 },
    alleppey: { name: "Alappuzha", country: "India", latitude: 9.4981, longitude: 76.3388 },
    alappuzha: { name: "Alappuzha", country: "India", latitude: 9.4981, longitude: 76.3388 },
    athirappilly: { name: "Athirappilly", country: "India", latitude: 10.3167, longitude: 76.5167 },
    athirapally: { name: "Athirappilly", country: "India", latitude: 10.3167, longitude: 76.5167 },
    bekal: { name: "Bekal", country: "India", latitude: 12.3924, longitude: 75.0327 },
    kasargod: { name: "Kasaragod", country: "India", latitude: 12.5102, longitude: 74.9852 },
    kasaragod: { name: "Kasaragod", country: "India", latitude: 12.5102, longitude: 74.9852 },
    kannur: { name: "Kannur", country: "India", latitude: 11.8745, longitude: 75.3704 },
    kozhikode: { name: "Kozhikode", country: "India", latitude: 11.2588, longitude: 75.7804 },
    calicut: { name: "Kozhikode", country: "India", latitude: 11.2588, longitude: 75.7804 },
    malappuram: { name: "Malappuram", country: "India", latitude: 11.0510, longitude: 76.0711 },
    palakkad: { name: "Palakkad", country: "India", latitude: 10.7867, longitude: 76.6548 },
    palghat: { name: "Palakkad", country: "India", latitude: 10.7867, longitude: 76.6548 },
    thrissur: { name: "Thrissur", country: "India", latitude: 10.5276, longitude: 76.2144 },
    trichur: { name: "Thrissur", country: "India", latitude: 10.5276, longitude: 76.2144 },
    ernakulam: { name: "Ernakulam", country: "India", latitude: 9.9816, longitude: 76.2999 },
    kochi: { name: "Kochi", country: "India", latitude: 9.9312, longitude: 76.2673 },
    cochin: { name: "Kochi", country: "India", latitude: 9.9312, longitude: 76.2673 },
    idukki: { name: "Idukki", country: "India", latitude: 9.8500, longitude: 76.9700 },
    kottayam: { name: "Kottayam", country: "India", latitude: 9.5916, longitude: 76.5222 },
    pathanamthitta: { name: "Pathanamthitta", country: "India", latitude: 9.2648, longitude: 76.7870 },
    kollam: { name: "Kollam", country: "India", latitude: 8.8932, longitude: 76.6141 },
    quilon: { name: "Kollam", country: "India", latitude: 8.8932, longitude: 76.6141 },
    thiruvananthapuram: { name: "Thiruvananthapuram", country: "India", latitude: 8.5241, longitude: 76.9366 },
    trivandrum: { name: "Thiruvananthapuram", country: "India", latitude: 8.5241, longitude: 76.9366 },
    thekkady: { name: "Thekkady", country: "India", latitude: 9.6031, longitude: 77.1615 },
    kumily: { name: "Kumily", country: "India", latitude: 9.6031, longitude: 77.1615 },
    vagamon: { name: "Vagamon", country: "India", latitude: 9.6897, longitude: 76.9064 },
    varkala: { name: "Varkala", country: "India", latitude: 8.7379, longitude: 76.7163 },
    kovalam: { name: "Kovalam", country: "India", latitude: 8.4004, longitude: 76.9787 },
    kumarakom: { name: "Kumarakom", country: "India", latitude: 9.6175, longitude: 76.4301 },
    ponmudi: { name: "Ponmudi", country: "India", latitude: 8.7600, longitude: 77.1167 },
    guruvayur: { name: "Guruvayur", country: "India", latitude: 10.5946, longitude: 76.0422 },
    poovar: { name: "Poovar", country: "India", latitude: 8.3188, longitude: 77.0667 },
    marari: { name: "Marari", country: "India", latitude: 9.6000, longitude: 76.3000 },
    "silent valley": { name: "Silent Valley", country: "India", latitude: 11.1333, longitude: 76.4500 },

    // Tamil Nadu Hill Stations & Destinations
    ooty: { name: "Udhagamandalam", country: "India", latitude: 11.4102, longitude: 76.6950 },
    udhagamandalam: { name: "Udhagamandalam", country: "India", latitude: 11.4102, longitude: 76.6950 },
    kodaikanal: { name: "Kodaikanal", country: "India", latitude: 10.2381, longitude: 77.4892 },
    yercaud: { name: "Yercaud", country: "India", latitude: 11.7753, longitude: 78.2093 },
    valparai: { name: "Valparai", country: "India", latitude: 10.3262, longitude: 76.9554 },
    yelagiri: { name: "Yelagiri", country: "India", latitude: 12.5857, longitude: 78.6397 },
    "kolli hills": { name: "Kolli Hills", country: "India", latitude: 11.2485, longitude: 78.3389 },
    courtallam: { name: "Courtallam", country: "India", latitude: 8.9304, longitude: 77.2750 },
    kutralam: { name: "Courtallam", country: "India", latitude: 8.9304, longitude: 77.2750 },
    rameshwaram: { name: "Rameswaram", country: "India", latitude: 9.2876, longitude: 79.3129 },
    rameswaram: { name: "Rameswaram", country: "India", latitude: 9.2876, longitude: 79.3129 },
    kanyakumari: { name: "Kanniyakumari", country: "India", latitude: 8.0883, longitude: 77.5385 },
    kanniyakumari: { name: "Kanniyakumari", country: "India", latitude: 8.0883, longitude: 77.5385 },
    dhanushkodi: { name: "Dhanushkodi", country: "India", latitude: 9.1770, longitude: 79.4180 },
    mahabalipuram: { name: "Mamallapuram", country: "India", latitude: 12.6269, longitude: 80.1927 },
    mamallapuram: { name: "Mamallapuram", country: "India", latitude: 12.6269, longitude: 80.1927 },
    pondicherry: { name: "Puducherry", country: "India", latitude: 11.9416, longitude: 79.8083 },
    puducherry: { name: "Puducherry", country: "India", latitude: 11.9416, longitude: 79.8083 },

    // Karnataka Hill Stations & Destinations
    coorg: { name: "Madikeri", country: "India", latitude: 12.4244, longitude: 75.7382 },
    madikeri: { name: "Madikeri", country: "India", latitude: 12.4244, longitude: 75.7382 },
    chikmagalur: { name: "Chikkamagaluru", country: "India", latitude: 13.3161, longitude: 75.7720 },
    chikkamagaluru: { name: "Chikkamagaluru", country: "India", latitude: 13.3161, longitude: 75.7720 },
    hampi: { name: "Hampi", country: "India", latitude: 15.3350, longitude: 76.4600 },
    gokarna: { name: "Gokarna", country: "India", latitude: 14.5479, longitude: 74.3188 },
    agumbe: { name: "Agumbe", country: "India", latitude: 13.5025, longitude: 75.0938 },
    dandeli: { name: "Dandeli", country: "India", latitude: 15.2415, longitude: 74.6190 },

    // Maharashtra & North India Hill Stations
    lonavala: { name: "Lonavala", country: "India", latitude: 18.7557, longitude: 73.4091 },
    mahabaleshwar: { name: "Mahabaleshwar", country: "India", latitude: 17.9237, longitude: 73.6586 },
    matheran: { name: "Matheran", country: "India", latitude: 18.9866, longitude: 73.2676 },
    alibaug: { name: "Alibag", country: "India", latitude: 18.6414, longitude: 72.8722 },
    panchgani: { name: "Panchgani", country: "India", latitude: 17.9237, longitude: 73.8016 },
    manali: { name: "Manali", country: "India", latitude: 32.2432, longitude: 77.1892 },
    shimla: { name: "Shimla", country: "India", latitude: 31.1048, longitude: 77.1734 },
    rishikesh: { name: "Rishikesh", country: "India", latitude: 30.0869, longitude: 78.2676 },
    haridwar: { name: "Haridwar", country: "India", latitude: 29.9457, longitude: 78.1642 },
    nainital: { name: "Nainital", country: "India", latitude: 29.3919, longitude: 79.4542 },
    mussoorie: { name: "Mussoorie", country: "India", latitude: 30.4598, longitude: 78.0644 },
    darjeeling: { name: "Darjeeling", country: "India", latitude: 27.0410, longitude: 88.2663 },
    gangtok: { name: "Gangtok", country: "India", latitude: 27.3389, longitude: 88.6065 },
    shillong: { name: "Shillong", country: "India", latitude: 25.5788, longitude: 91.8933 }
  };

  private static readonly CITY_ALIASES: Record<string, string> = {
    // Bengaluru
    bangalore: "Bengaluru",
    banglore: "Bengaluru",
    bangaluru: "Bengaluru",
    bengaluru: "Bengaluru",
    bengalooru: "Bengaluru",
    bangalor: "Bengaluru",
    bengluru: "Bengaluru",
    // Mumbai
    bombay: "Mumbai",
    mumbai: "Mumbai",
    mumbay: "Mumbai",
    // Kolkata
    calcutta: "Kolkata",
    kolkata: "Kolkata",
    kolkatta: "Kolkata",
    // Chennai
    madras: "Chennai",
    chennai: "Chennai",
    chenai: "Chennai",
    chenna: "Chennai",
    // Delhi
    delhi: "Delhi",
    delh: "Delhi",
    dilli: "Delhi",
    newdelhi: "Delhi",
    // Kerala typos & variations
    munnar: "Munnar",
    munrar: "Munnar",
    muner: "Munnar",
    munner: "Munnar",
    munar: "Munnar",
    wayanad: "Wayanad",
    waynad: "Wayanad",
    wayanaad: "Wayanad",
    vainad: "Wayanad",
    trivandrum: "Thiruvananthapuram",
    thiruvananthapuram: "Thiruvananthapuram",
    trivandram: "Thiruvananthapuram",
    cochin: "Kochi",
    kochi: "Kochi",
    kochhi: "Kochi",
    alappuzha: "Alappuzha",
    alleppey: "Alappuzha",
    aleppey: "Alappuzha",
    alappuzha_district: "Alappuzha",
    calicut: "Kozhikode",
    kozhikode: "Kozhikode",
    kozhicode: "Kozhikode",
    thrissur: "Thrissur",
    trichur: "Thrissur",
    trissur: "Thrissur",
    palakkad: "Palakkad",
    palghat: "Palakkad",
    palakad: "Palakkad",
    kollam: "Kollam",
    quilon: "Kollam",
    kannur: "Kannur",
    cannanore: "Kannur",
    kanur: "Kannur",
    kasaragod: "Kasaragod",
    kasargod: "Kasaragod",
    athirapally: "Athirappilly",
    athirappilly: "Athirappilly",
    thekkadi: "Thekkady",
    thekkady: "Thekkady",
    kumily: "Kumily",
    vagamon: "Vagamon",
    varkala: "Varkala",
    varkla: "Varkala",
    kovalam: "Kovalam",
    // Tamil Nadu & Karnataka
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
    ramnad: "Ramanathapuram",
    kanyakumari: "Kanniyakumari",
    kanniyakumari: "Kanniyakumari",
    kanykumari: "Kanniyakumari",
    rameshwaram: "Rameswaram",
    rameshvaram: "Rameswaram",
    rameswaram: "Rameswaram",
    ooty: "Udhagamandalam",
    ooti: "Udhagamandalam",
    oti: "Udhagamandalam",
    udhagamandalam: "Udhagamandalam",
    trichy: "Tiruchirappalli",
    tiruchy: "Tiruchirappalli",
    tiruchirappalli: "Tiruchirappalli",
    tuticorin: "Thoothukudi",
    thoothukudi: "Thoothukudi",
    kodaikanal: "Kodaikanal",
    kodai: "Kodaikanal",
    courtallam: "Courtallam",
    kutralam: "Courtallam",
    coorg: "Madikeri",
    madikeri: "Madikeri",
    mysore: "Mysuru",
    mysuru: "Mysuru",
    mangalore: "Mangaluru",
    mangaluru: "Mangaluru",
    vizag: "Visakhapatnam",
    visakhapatnam: "Visakhapatnam",
    chikmagalur: "Chikkamagaluru",
    chikkamagaluru: "Chikkamagaluru",
    chikamagalur: "Chikkamagaluru",
    lonavala: "Lonavala",
    mahabaleshwar: "Mahabaleshwar"
  };

  private static levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i]![0] = i;
    for (let j = 0; j <= n; j++) dp[0]![j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i]![j] = a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
    return dp[m]![n]!;
  }

  private static findFuzzyMatch(city: string): string | null {
    const clean = city.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.length < 3) return null;

    let bestMatch: string | null = null;
    let minDistance = Infinity;

    const allKeys = new Set([
      ...Object.keys(this.KNOWN_COORDINATES),
      ...Object.keys(this.CITY_ALIASES)
    ]);

    for (const key of allKeys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const dist = this.levenshteinDistance(clean, normalizedKey);
      const maxAllowed = normalizedKey.length <= 4 ? 1 : (normalizedKey.length <= 7 ? 2 : 3);

      if (dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        bestMatch = key;
      }
    }

    return bestMatch;
  }

  public static async geocodeCity(city: string): Promise<GeocodingResult> {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      throw new Error("City name cannot be empty");
    }

    const lower = trimmedCity.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();

    // 1. Direct match in KNOWN_COORDINATES
    const directKnown = this.KNOWN_COORDINATES[lower];
    if (directKnown) {
      return directKnown;
    }

    // 2. Direct match in CITY_ALIASES
    let queryCity = this.CITY_ALIASES[lower] || trimmedCity;
    const aliasKnown = this.KNOWN_COORDINATES[queryCity.toLowerCase()];
    if (aliasKnown) {
      return aliasKnown;
    }

    // 3. Fuzzy match for typos (e.g. 'munrar' -> 'munnar', 'waynad' -> 'wayanad')
    const fuzzyKey = this.findFuzzyMatch(lower);
    if (fuzzyKey) {
      const fuzzyKnown = this.KNOWN_COORDINATES[fuzzyKey];
      if (fuzzyKnown) {
        return fuzzyKnown;
      }
      const aliasTarget = this.CITY_ALIASES[fuzzyKey];
      if (aliasTarget) {
        const targetKnown = this.KNOWN_COORDINATES[aliasTarget.toLowerCase()];
        if (targetKnown) {
          return targetKnown;
        }
        queryCity = aliasTarget;
      }
    }

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
      // Fallback: Check if city is recognized as a district center
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
    const url = `${this.WEATHER_BASE_URL}/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&hourly=temperature_2m,weather_code,wind_speed_10m&past_days=14&forecast_days=16&timezone=auto`;

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
      hourly?: {
        time: string[];
        temperature_2m: number[];
        weather_code: number[];
        wind_speed_10m: number[];
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

    const hourlyItems: HourlyForecastItem[] = data.hourly
      ? data.hourly.time.map((time, index) => {
          const code = data.hourly!.weather_code[index] ?? 0;
          return {
            time,
            temperature: Math.round((data.hourly!.temperature_2m[index] ?? 0) * 10) / 10,
            weatherCode: code,
            weatherCondition: getWeatherCondition(code).description,
            windSpeed: Math.round((data.hourly!.wind_speed_10m[index] ?? 0) * 10) / 10
          };
        })
      : [];

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
      daily: dailyItems,
      hourly: hourlyItems
    };
  }
}
