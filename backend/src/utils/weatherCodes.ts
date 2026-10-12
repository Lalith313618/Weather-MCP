export interface WeatherCodeInfo {
  description: string;
  icon: string;
}

export const weatherCodeMap: Record<number, WeatherCodeInfo> = {
  0: { description: "Clear Sky", icon: "sunny" },
  1: { description: "Mainly Clear", icon: "partly_cloudy_day" },
  2: { description: "Partly Cloudy", icon: "partly_cloudy_day" },
  3: { description: "Overcast", icon: "cloud" },
  45: { description: "Foggy", icon: "foggy" },
  48: { description: "Depositing Rime Fog", icon: "foggy" },
  51: { description: "Light Drizzle", icon: "rainy" },
  53: { description: "Moderate Drizzle", icon: "rainy" },
  55: { description: "Dense Drizzle", icon: "rainy" },
  61: { description: "Slight Rain", icon: "rainy" },
  63: { description: "Moderate Rain", icon: "rainy" },
  65: { description: "Heavy Rain", icon: "rainy_heavy" },
  71: { description: "Slight Snow", icon: "weather_snowy" },
  73: { description: "Moderate Snow", icon: "weather_snowy" },
  75: { description: "Heavy Snow", icon: "weather_snowy" },
  80: { description: "Slight Rain Showers", icon: "rainy" },
  81: { description: "Moderate Rain Showers", icon: "rainy" },
  82: { description: "Violent Rain Showers", icon: "thunderstorm" },
  95: { description: "Thunderstorm", icon: "thunderstorm" },
  96: { description: "Thunderstorm with Slight Hail", icon: "thunderstorm" },
  99: { description: "Thunderstorm with Heavy Hail", icon: "thunderstorm" }
};

export function getWeatherCondition(code: number): WeatherCodeInfo {
  return weatherCodeMap[code] ?? { description: "Cloudy", icon: "cloud" };
}
