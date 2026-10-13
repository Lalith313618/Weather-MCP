import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { WeatherService } from './weather.service';
import { ForecastResponse, DailyForecastItem } from '../models/weather.model';
import { REGIONAL_DESTINATIONS, HILL_STATIONS, HillStationInfo } from './regional-destinations.data';

export interface WeatherConditionEvaluation {
  score: number;
  rating: string;
  summary: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private readonly weatherService = inject(WeatherService);

  private static readonly TOMORROW_REGEX = /\b(?:tomorrow|tomorow|tommorow|tmrw|next\s+day)\b/i;

  private static readonly STOP_WORDS = new Set([
    'next', 'days', 'day', 'week', 'weeks', 'month', 'months', 'year', 'today', 'tomorrow', 'yesterday', 'weekend',
    'forecast', 'weather', 'temperature', 'temp', 'condition', 'conditions', 'now', 'here', 'there', 'current',
    'update', 'report', 'me', 'it', 'please', 'city', 'cities', 'place', 'give', 'show', 'tell', 'check', 'all',
    'any', 'the', 'outdoor', 'outdoors', 'trip', 'trips', 'travel', 'picnic', 'outing', 'visit', 'better', 'good',
    'best', 'which', 'choose', 'prefer', 'for', 'both', 'recommend', 'would', 'time', 'leave', 'start', 'suggest',
    'compare', 'comparison', 'versus', 'one', 'who', 'what', 'where', 'when', 'why', 'how', 'than', 'from',
    'between', 'into', 'onto', 'with', 'without', 'should', 'is', 'are', 'was', 'were', 'be', 'colder', 'warmer', 'hotter', 'cooler'
  ]);

  private static readonly FORBIDDEN_WORDS = new Set([
    'both', 'cities', 'city', 'recommend', 'suggest', 'travel', 'trip', 'better', 'best', 'good', 'district',
    'districts', 'state', 'states', 'country', 'india', 'world', 'south', 'north', 'east', 'west', 'station',
    'stations', 'hillstation', 'hillstations', 'hill', 'hills', 'spot', 'spots', 'tourist', 'tourism', 'trending',
    'vacation', 'holiday', 'destination', 'destinations', 'place', 'places', 'outing', 'outdoor', 'outdoors',
    'picnic', 'visit', 'time', 'would', 'should', 'want', 'when', 'which', 'check', 'leave', 'weather',
    'conditions', 'forecast', 'drive', 'driving', 'fly', 'flying', 'is', 'are', 'was', 'were', 'based', 'on', 'in', 'for'
  ]);

  private static readonly KEYWORDS: Record<string, string[]> = {
    compare: ['compare', 'comapre', 'compar', 'compair', 'comparison', 'versus'],
    weather: ['weather', 'wether', 'waether', 'climate'],
    forecast: ['forecast', 'forecat', 'upcoming', 'weekly'],
    temperature: ['temperature', 'temp'],
    tomorrow: ['tomorrow', 'tommorow', 'tomorow', 'tommorrow', 'tmrw'],
    yesterday: ['yesterday', 'yesterdays', 'yestarday'],
    between: ['between', 'betwen', 'betwean'],
    outdoor: ['outdoor', 'outdoors', 'outdor']
  };

  private static readonly HILL_CONFIGS: Array<[RegExp, (h: HillStationInfo) => boolean, string]> = [
    [/\b(?:south|southern)\b/i, (h) => h.region === 'south', 'Top Trending Hill Stations in South India'],
    [/\b(?:north|northern)\b/i, (h) => h.region === 'north', 'Top Trending Hill Stations in North India'],
    [/\b(?:west|western|maharashtra)\b/i, (h) => h.region === 'west', 'Top Trending Hill Stations in Western India'],
    [/\b(?:east|northeast|sikkim)\b/i, (h) => h.region === 'east', 'Top Trending Hill Stations in Eastern & Northeast India'],
    [/\bkerala\b/i, (h) => h.state === 'Kerala', 'Top Trending Hill Stations in Kerala'],
    [/\b(?:tamil\s*nadu|tn)\b/i, (h) => h.state === 'Tamil Nadu', 'Top Trending Hill Stations in Tamil Nadu'],
    [/\bkarnataka\b/i, (h) => h.state === 'Karnataka', 'Top Trending Hill Stations in Karnataka'],
    [/\bhimachal\b/i, (h) => h.state === 'Himachal Pradesh', 'Top Trending Hill Stations in Himachal Pradesh'],
    [/\buttarakhand\b/i, (h) => h.state === 'Uttarakhand', 'Top Trending Hill Stations in Uttarakhand']
  ];

  private static readonly REGIONAL_STATES: Array<[string, RegExp]> = [
    ['tamilnadu', /\b(?:tamil\s*nadu|tamilnadu|tn)\b/i],
    ['kerala', /\bkerala\b/i],
    ['karnataka', /\bkarnataka\b/i],
    ['maharashtra', /\bmaharashtra\b/i],
    ['goa', /\bgoa\b/i],
    ['rajasthan', /\brajasthan\b/i],
    ['himachal', /\b(?:himachal|himachal\s*pradesh)\b/i],
    ['uttarakhand', /\b(?:uttarakhand|uttaranchal)\b/i],
    ['andhra', /\b(?:andhra|andhra\s*pradesh|ap)\b/i],
    ['telangana', /\btelangana\b/i]
  ];

  private static readonly REGIONAL_SUBREGIONS: Array<[string, RegExp]> = [
    ['south', /\b(?:south|southern|south\s*(?:district|districts|region|zone|side))\b/i],
    ['north', /\b(?:north|northern|north\s*(?:district|districts|region|zone))\b/i],
    ['west', /\b(?:west|western|kongu|west\s*(?:district|region))\b/i],
    ['central', /\b(?:central|delta|central\s*(?:district|region))\b/i],
    ['coastal', /\b(?:coastal|coast|beach|beaches)\b/i]
  ];

  private static isPrecipitation(code: number, condition: string): boolean {
    const c = (condition || '').toLowerCase();
    return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code) ||
      /rain|drizzle|shower|thunder|storm/.test(c);
  }

  private static readonly NATURAL_INTENTS: Array<{ pattern: RegExp; example: string; type: string }> = [
    {
      pattern: /\b(?:umbrella|raincoat|rain\s*gear|will\s+it\s+rain|chance\s+of\s+rain|is\s+it\s+raining|need\s+an\s+umbrella|carry\s+an\s+umbrella)\b/i,
      example: 'Which city are you asking about? For example: "Should I carry an umbrella in London today?"',
      type: 'umbrella'
    },
    {
      pattern: /\b(?:what\s+(?:should|to)\s+(?:i\s+)?wear|do\s+i\s+need\s+(?:a\s+)?(?:jacket|sweater|coat|hoodie|warm\s+clothes|sunglasses)|clothing|attire)\b/i,
      example: 'Which city are you asking about? For example: "What should I wear in New York tomorrow?"',
      type: 'clothing'
    },
    {
      pattern: /\b(?:run|running|jog|jogging|cycl(?:e|ing)|workout|exercise|swim|swimming|cricket|football|play\s+outside|outdoor\s+sports)\b/i,
      example: 'Which city are you asking about? For example: "Can I go for a run in Bangalore this evening?"',
      type: 'exercise'
    },
    {
      pattern: /\b(?:wash\s+my\s+car|car\s+wash|dry\s+clothes|drying\s+clothes|laundry|wash\s+clothes)\b/i,
      example: 'Which city are you asking about? For example: "Can I wash my car today in Pune?"',
      type: 'car_wash'
    },
    {
      pattern: /\b(?:safe\s+to\s+drive|drive|driving|road\s+conditions?|fog|foggy|visibility)\b/i,
      example: 'Which city are you asking about? For example: "Is it safe to drive in Delhi this morning?"',
      type: 'driving'
    },
    {
      pattern: /\b(?:too\s+hot|too\s+cold|freezing|hot\s+outside|cold\s+outside|humid|humidity|elderly|comfortable\s+climate|how\s+hot|how\s+cold)\b/i,
      example: 'Which city are you asking about? For example: "Is it very humid in Chennai right now?"',
      type: 'comfort'
    }
  ];

  public respond(rawQuery: string, activeCity?: string | null): Observable<string> {
    const query = this.normalizeFuzzyQuery(rawQuery);
    const combined = `${rawQuery} ${query}`.toLowerCase();

    if (/^(?:hi|hello|hey|greetings|good\s+(?:morning|afternoon|evening)|help|what\s+can\s+you\s+do|who\s+are\s+you)\b/i.test(rawQuery.trim())) {
      return of(this.getGreetingResponse());
    }

    if (/\b(?:search\s+history|history|recent\s+searches|recent\s+cities|past\s+searches|(?:what\s+)?cities\s+(?:did\s+i|have\s+i)?\s*search(?:ed)?|what\s+did\s+i\s+(?:search|look\s+up)|searched\s+recently)\b/i.test(combined)) {
      return this.handleSearchHistoryQuery();
    }

    const multiQuery = this.extractMultiCityQuery(query, rawQuery);
    if (multiQuery) {
      if (multiQuery.type === 'travel_route') return this.handleTravelRouteQuery(multiQuery);
      if (multiQuery.type === 'both_cities') return this.handleBothCitiesQuery(multiQuery);
      return this.handleComparisonQuery(multiQuery);
    }

    const hillStationQuery = this.extractHillStationQuery(query, rawQuery);
    if (hillStationQuery) return this.handleHillStationQuery(hillStationQuery);

    const regionalOuting = this.extractRegionalOutingQuery(query, rawQuery);
    if (regionalOuting) return this.handleRegionalOutingQuery(regionalOuting);

    const isTomorrow = AssistantService.TOMORROW_REGEX.test(combined);

    for (const intent of AssistantService.NATURAL_INTENTS) {
      if (intent.pattern.test(combined)) {
        const target = this.extractNaturalCity(query, rawQuery, activeCity);
        if (!target) return of(intent.example);
        return intent.type === 'comfort'
          ? this.handleNaturalComfortQuery(target.city, isTomorrow, combined, target.isContextual)
          : this.handleNaturalForecastQuery(intent.type, target.city, isTomorrow, target.isContextual);
      }
    }

    if (/\b(?:compare|comparison|versus|vs\.?)\b/i.test(query) || /\s+&\s+/.test(query)) {
      return of('To compare two cities, try: "Compare Chennai & Bengaluru for outdoor trip tomorrow" or "Mumbai vs Delhi".');
    }

    const targetCity = this.extractCityFromQuery(query);
    if (!targetCity) {
      if (/\b(?:forecast|next\s+\d+\s+days|weekly|5\s*days?)\b/i.test(query)) {
        return of('Please specify a city name for the forecast (e.g. "Forecast for Bangalore for next 5 days" or "Forecast in Mumbai").');
      }
      return of('Please specify a city name (e.g. "Weather in Bangalore" or "Compare Bangalore & Chennai" or "Travel from Chennai to Bangalore tomorrow").');
    }

    return this.handleSingleCityQuery(targetCity, query, rawQuery);
  }

  // ── Helper functions for dates, days, and city forecasts ──

  private getDateString(offsetMs = 0): string {
    return new Date(Date.now() + offsetMs).toISOString().split('T')[0];
  }

  private getTimeframeInfo(isTomorrow: boolean): { dateStr: string; label: string } {
    const dateStr = this.getDateString(isTomorrow ? 86400000 : 0);
    return { dateStr, label: isTomorrow ? `Tomorrow (${dateStr})` : `Today (${dateStr})` };
  }

  private getForecastDay(f: ForecastResponse, isTomorrow: boolean, nullIfMissing = false): DailyForecastItem | null {
    if (!f.daily || f.daily.length === 0) return null;
    const targetDate = this.getDateString(isTomorrow ? 86400000 : 0);
    const matched = f.daily.find((d) => d.date === targetDate);
    if (matched) return matched;
    if (isTomorrow) return f.daily.length > 1 ? f.daily[1] : (nullIfMissing ? null : f.daily[0]);
    return nullIfMissing ? null : f.daily[0];
  }

  private fetchValidForecasts(cities: string[]): Observable<ForecastResponse[]> {
    return forkJoin(cities.map(c => this.weatherService.getForecast(c).pipe(catchError(() => of(null))))).pipe(
      map(list => (list.filter(f => f && f.success && Array.isArray(f.daily) && f.daily.length > 0) as ForecastResponse[]))
    );
  }

  private withNaturalForecast(
    city: string,
    isTomorrow: boolean,
    isContextual: boolean,
    formatter: (f: ForecastResponse, day: DailyForecastItem, prefix: string, timeframeLabel: string) => string
  ): Observable<string> {
    return this.weatherService.getForecast(city).pipe(
      map((f) => {
        const day = this.getForecastDay(f, isTomorrow);
        if (!day) return `Could not find forecast for ${f.city}.`;
        const prefix = isContextual ? `*(Based on your currently active city: **${f.city}**)*\n\n` : '';
        const timeframeLabel = isTomorrow ? `Tomorrow (${day.date})` : `Today (${day.date})`;
        return formatter(f, day, prefix, timeframeLabel);
      }),
      catchError(() => of(`I couldn't locate weather information for "${city}". Please check the spelling.`))
    );
  }

  private withTwoCityForecasts(
    city1: string,
    city2: string,
    isTomorrow: boolean,
    errorMsg: string,
    formatter: (f1: ForecastResponse, f2: ForecastResponse, d1: DailyForecastItem, d2: DailyForecastItem) => string,
    customMissingMsg?: (f1: ForecastResponse, f2: ForecastResponse) => string
  ): Observable<string> {
    return forkJoin({
      f1: this.weatherService.getForecast(city1),
      f2: this.weatherService.getForecast(city2)
    }).pipe(
      map(({ f1, f2 }) => {
        const d1 = this.getForecastDay(f1, isTomorrow, true);
        const d2 = this.getForecastDay(f2, isTomorrow, true);
        if (!d1 || !d2) {
          return customMissingMsg ? customMissingMsg(f1, f2) : `Could not retrieve forecast for ${f1.city} and ${f2.city}.`;
        }
        return formatter(f1, f2, d1, d2);
      }),
      catchError(() => of(errorMsg))
    );
  }

  private formatTempDifference(city1: string, temp1: number, city2: string, temp2: number, noun = 'temperatures'): string {
    const diff = Math.round(Math.abs(temp1 - temp2) * 10) / 10;
    if (temp1 > temp2) return `${city1} is warmer by ${diff}°C than ${city2}.`;
    if (temp2 > temp1) return `${city2} is warmer by ${diff}°C than ${city1}.`;
    return `Both cities have identical ${noun} (${temp1}°C).`;
  }

  private formatDaysList(days: DailyForecastItem[]): string {
    return days.map((d) => {
      const dayName = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
      return `• **${d.date} (${dayName}):** ${d.weatherCondition} — High: **${d.maxTemperature}°C** | Low: **${d.minTemperature}°C** (Wind: ${d.maxWindSpeed} km/h)`;
    }).join('\n');
  }

  private formatOutdoorAdvisory(condition: string, weatherCode: number, temp: number, wind: number, humidity?: number): string {
    const suit = this.evaluateWeatherConditions({ condition, weatherCode, temp, wind, humidity, isOutdoor: true });
    const indicator = (suit.rating === 'Excellent' || suit.rating === 'Favorable') ? '✅ Great' : '⚠️ Note';
    return `\n\nOutdoor Trip Advisory:\n${indicator}: ${suit.rating} conditions for outdoor activities (${suit.summary}).`;
  }
  private getGreetingResponse(): string {
    return (
      `👋 **Hello! I am your Weather MCP Assistant.**\n\n` +
      `You can ask me ordinary everyday questions in natural English based on live weather data! For example:\n\n` +
      `• ☔ *"Should I carry an umbrella in London today?"*\n` +
      `• 👕 *"What should I wear in New York tomorrow?"*\n` +
      `• 🏃 *"Can I go for a run in Bangalore this evening?"*\n` +
      `• 🚗 *"Can I wash my car today in Pune?"*\n` +
      `• 🛣️ *"Is it safe to drive in Delhi this morning?"*\n` +
      `• 🌤️ *"Compare Bangalore & Chennai for outdoor trip tomorrow"*\n` +
      `• 🌴 *"Which city in Tamil Nadu is best for outing in south district tomorrow?"*\n` +
      `• 📜 *"What cities did I search recently?"*\n\n` +
      `What would you like to know?`
    );
  }

  private handleSearchHistoryQuery(): Observable<string> {
    return this.weatherService.getHistory(6).pipe(
      map((res) => {
        if (!res.history || res.history.length === 0) {
          return '📜 You haven\'t searched for any cities yet. Search a city on the dashboard or ask me about any city!';
        }
        const items = res.history.map((h, i) => {
          const time = h.searchedAt ? new Date(h.searchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          return `${i + 1}. 📍 **${h.city}, ${h.country}** — ${h.temperature}°C, ${h.weatherCondition} *(Wind: ${h.windSpeed} km/h${time ? `, ${time}` : ''})*`;
        }).join('\n');

        return `📜 **Recent Weather Search History (MCP History Tool):**\n\nHere are your recently searched cities:\n\n${items}\n\n💡 You can ask me to compare any of these cities or check their upcoming forecasts!`;
      }),
      catchError(() => of('Could not retrieve recent search history at the moment.'))
    );
  }

  private handleNaturalForecastQuery(type: string, city: string, isTomorrow: boolean, isContextual: boolean): Observable<string> {
    return this.withNaturalForecast(city, isTomorrow, isContextual, (f, day, prefix, timeframeLabel) => {
      const maxT = day.maxTemperature;
      const minT = day.minTemperature;
      const cond = day.weatherCondition;
      const condLower = cond.toLowerCase();
      const code = day.weatherCode;
      const wind = day.maxWindSpeed;
      const isRain = AssistantService.isPrecipitation(code, cond);

      if (type === 'umbrella') {
        return isRain
          ? `${prefix}☔ **Yes, you should carry an umbrella in ${f.city}!**\n\n• **Timeframe:** ${timeframeLabel}\n• **Expected Weather:** ${cond}\n• **Temperature:** High ${maxT}°C | Low ${minT}°C\n• **Max Wind Speed:** ${wind} km/h\n\n💡 **Advisory:** Rain or showers are expected. Keep an umbrella or raincoat handy before heading out!`
          : `${prefix}☀️ **No, you don't need an umbrella in ${f.city}!**\n\n• **Timeframe:** ${timeframeLabel}\n• **Expected Weather:** ${cond} (Dry conditions)\n• **Temperature:** High ${maxT}°C | Low ${minT}°C\n• **Max Wind Speed:** ${wind} km/h\n\n💡 **Advisory:** Skies are expected to remain dry without precipitation. You can comfortably leave your rain gear at home!`;
      }

      if (type === 'clothing') {
        let attire = maxT < 10
          ? '🧥 **Heavy Winter Wear**: Thick winter coat, warm thermal inner layers, wool sweater, and gloves.'
          : maxT < 18
          ? `🧥 **Layered Clothing**: A light jacket, fleece, or hoodie over a shirt. In the morning/evening when it dips to ${minT}°C, an extra layer is ideal.`
          : maxT <= 27
          ? '👕 **Comfortable Casuals**: Breathable cotton t-shirt, casual shirts, or light trousers.'
          : `🩳 **Light & Breathable**: Loose cotton/linen clothing, sunglasses, and sun hat. Stay hydrated in the ~${maxT}°C daytime heat.`;
        if (condLower.includes('rain') || condLower.includes('drizzle') || condLower.includes('shower')) {
          attire += '\n• ☔ **Rain Gear**: Waterproof footwear and a water-resistant jacket or umbrella.';
        }
        return `${prefix}👕 **Clothing & Outfit Advisory for ${f.city} (${timeframeLabel}):**\n\n• **Forecast:** ${cond} | High: ${maxT}°C | Low: ${minT}°C\n• **Wind:** ${wind} km/h\n\n💡 **What to Wear:**\n• ${attire}`;
      }

      if (type === 'exercise') {
        const [verdict, timing] = (condLower.includes('rain') || condLower.includes('storm') || condLower.includes('shower'))
          ? ['⚠️ **Not Recommended Outdoors**: Wet roads and precipitation are expected. An indoor gym session is safer.', 'If you run outside, watch for slippery tracks and wear water-repellent athletic gear.']
          : maxT > 32
          ? [`☀️ **Favorable during Cooler Hours**: Daytime highs reach ~${maxT}°C.`, '🏃 **Recommended Window**: Early morning (6:00 AM – 8:00 AM) or late evening (after 5:30 PM). Stay hydrated.']
          : maxT >= 16 && maxT <= 27
          ? [`✅ **Excellent for Outdoor Running / Cycling**: Comfortable temperatures (~${maxT}°C) and dry conditions.`, 'Great conditions throughout morning and late afternoon!']
          : [`🧤 **Chilly but Favorable**: Cool temperatures (~${maxT}°C). Warm up thoroughly.`, 'Mid-morning (8:30 AM – 11:00 AM) offers the most pleasant sunlight.'];
        return `${prefix}🏃 **Running & Outdoor Workout Guide for ${f.city} (${timeframeLabel}):**\n\n• **Weather:** ${cond} | High: ${maxT}°C | Low: ${minT}°C\n• **Wind Speed:** ${wind} km/h\n\n💡 **Verdict & Best Timing:**\n• ${verdict}\n• ${timing}`;
      }

      if (type === 'car_wash') {
        const advice = isRain
          ? `❌ **Hold Off on Washing Your Car / Drying Laundry:**\n\nShowers or rain (${cond}) are forecasted in **${f.city}** for ${timeframeLabel}. Raindrops and road splash will dirty a freshly washed car, and outdoor clothes drying is disrupted.`
          : `✅ **Great Day for a Car Wash & Laundry Drying!**\n\nSkies in **${f.city}** are expected to be dry (${cond}, High: ${maxT}°C, Wind: ${wind} km/h). Your car will stay spotless, and laundry hung outside will dry quickly!`;
        return `${prefix}🚗 **Car Wash & Laundry Outlook for ${f.city} (${timeframeLabel}):**\n\n${advice}`;
      }

      const isFog = [45, 48].includes(code) || condLower.includes('fog') || condLower.includes('mist');
      const isStorm = [95, 96, 99].includes(code) || condLower.includes('thunderstorm') || condLower.includes('storm');
      const notes = isStorm
        ? '⚠️ **Severe Weather Caution**: Thunderstorms and heavy showers expected. Reduce speed and maintain generous braking distance.'
        : isFog
        ? '⚠️ **Low Visibility Alert**: Foggy/misty conditions can reduce highway visibility. Use low-beam fog lights.'
        : condLower.includes('rain') || condLower.includes('shower')
        ? '⚠️ **Wet Roads**: Rain showers likely. Drive cautiously on wet tarmac and check wipers.'
        : wind > 35
        ? `⚠️ **Gusty Crosswinds**: Strong winds (${wind} km/h). Keep a firm grip on the steering wheel.`
        : `✅ **Clear & Safe Driving Conditions**: Dry weather (${cond}) and good visibility. Enjoy a smooth drive!`;

      return `${prefix}🛣️ **Driving & Road Conditions for ${f.city} (${timeframeLabel}):**\n\n• **Weather:** ${cond} | High: ${maxT}°C | Low: ${minT}°C\n• **Wind Speed:** ${wind} km/h\n\n💡 **Road Safety Advisory:**\n• ${notes}`;
    });
  }

  private handleNaturalComfortQuery(city: string, isTomorrow: boolean, query: string, isContextual: boolean): Observable<string> {
    return this.weatherService.getCurrentWeather(city).pipe(
      map((w) => {
        const prefix = isContextual ? `*(Based on your currently active city: **${w.city}**)*\n\n` : '';
        const temp = w.temperature;
        const feelsLike = w.apparentTemperature;
        const humidity = w.humidity;
        const isElderly = /\b(?:elderly|seniors?|parents?|grandparents?|aged)\b/i.test(query);

        const comfortRating = temp >= 19 && temp <= 27 && humidity <= 65
          ? '🌟 **Extremely Pleasant & Comfortable**: Ideal temperature with mild humidity. Very gentle on the body.'
          : temp > 32 || (temp > 29 && humidity > 75)
          ? `🔥 **Hot & Muggy**: High heat index (feels like ${feelsLike}°C, humidity ${humidity}%).`
          : temp < 15
          ? `❄️ **Chilly / Cool**: Brisk climate (${temp}°C). Warm layers required.`
          : '🌤️ **Moderate & Normal Seasonal Climate**: Generally agreeable conditions.';

        let elderlyNote = '';
        if (isElderly) {
          elderlyNote = temp >= 19 && temp <= 27 && humidity <= 65
            ? `\n\n👴👵 **For Elderly Individuals:**\n**Highly Suitable!** ${w.city}'s current weather (${temp}°C, humidity ${humidity}%) is mild and soothing, great for light walks and relaxation.`
            : temp > 32 || humidity > 75
            ? `\n\n👴👵 **For Elderly Individuals:**\n**Caution Advised:** Midday heat (${temp}°C) and humidity (${humidity}%) can cause dehydration and fatigue. Keep seniors in well-ventilated spaces and encourage fluids.`
            : `\n\n👴👵 **For Elderly Individuals:**\nEnsure light warm clothing in morning/evening when temperatures drop, and maintain hydration.`;
        }

        return `${prefix}🌡️ **Climate & Comfort Assessment for ${w.city}, ${w.country}:**\n\n• **Current Temperature:** ${temp}°C (Feels like: ${feelsLike}°C)\n• **Weather Condition:** ${w.weatherCondition}\n• **Humidity:** ${humidity}%\n• **Wind Speed:** ${w.windSpeed} km/h\n\n💡 **Comfort Evaluation:**\n• ${comfortRating}${elderlyNote}`;
      }),
      catchError(() => of(`I couldn't locate weather information for "${city}". Please check the spelling.`))
    );
  }

  private evaluateHillStationWeather(day: DailyForecastItem): { score: number; rating: string; summary: string } {
    const temp = day.maxTemperature;
    const cond = (day.weatherCondition || '').toLowerCase();
    const code = day.weatherCode;
    const wind = day.maxWindSpeed;

    const [tScore, summaryBase] =
      temp >= 16 && temp <= 24 ? [30, `Crisp mountain air & pleasant temperature (${temp}°C)`] :
      temp >= 12 && temp < 16 ? [25, `Chilly & scenic mountain climate (${temp}°C)`] :
      temp > 24 && temp <= 28 ? [15, `Mild and pleasant (${temp}°C)`] :
      temp < 12 ? [10, `Cold alpine climate (${temp}°C)`] : [-10, `Warm daytime weather (${temp}°C)`];

    let score = 50 + tScore;
    let summary = summaryBase;

    const skyRules: Array<[boolean, number, string]> = [
      [[95, 96, 99].includes(code) || /thunder|storm/.test(cond), -50, '; Thunderstorms likely (exercise caution on ghats)'],
      [[65, 67, 75, 82, 85, 86].includes(code) || cond.includes('heavy rain'), -40, '; Heavy rainfall expected (slippery roads)'],
      [[53, 55, 61, 63, 80, 81].includes(code) || /rain|shower/.test(cond), -20, '; Rain showers expected (carry umbrella)'],
      [[0, 1].includes(code) || /clear|sunny/.test(cond), 25, '; Clear panoramic peak views'],
      [[2, 3].includes(code) || cond.includes('cloud'), 20, '; Scenic floating mountain mist']
    ];

    for (const [matched, delta, note] of skyRules) {
      if (matched) { score += delta; summary += note; break; }
    }

    if (wind <= 15) score += 10;
    else if (wind > 28) { score -= 10; summary += '; Gusty hill winds'; }

    score = Math.max(10, Math.min(99, score));
    const rating = score >= 85 ? '🌟 Outstanding Hill Climate' : score >= 70 ? '✅ Great Sightseeing Weather' : score >= 50 ? '⛅ Moderate / Cool' : '⚠️ Rainy / Exercise Caution';
    return { score, rating, summary };
  }

  private handleHillStationQuery(req: {
    title: string;
    stations: HillStationInfo[];
    isTomorrow: boolean;
    timeframeLabel: string;
  }): Observable<string> {
    return this.fetchValidForecasts(req.stations.map((st) => st.city)).pipe(
      map((forecasts) => {
        const evaluated = req.stations.flatMap((st) => {
          const f = forecasts.find((fc) => fc.city.toLowerCase() === st.city.toLowerCase());
          const day = f ? this.getForecastDay(f, req.isTomorrow) : null;
          if (!f || !day) return [];
          const { score, rating, summary } = this.evaluateHillStationWeather(day);
          return [{ station: st, forecast: f, day, score, rating, summary }];
        });

        if (evaluated.length === 0) {
          return `Could not retrieve live forecasts for hill stations in this region. Please try again.`;
        }

        evaluated.sort((a, b) => b.score - a.score);

        const top = evaluated[0]!;
        const medals = ['🥇', '🥈', '🥉'];
        const spotsFormatted = top.station.topTouristSpots.map(s => `  • 📍 **${s}**`).join('\n');

        const topCard = (
          `🏆 **#1 Top Recommendation: ${top.station.city}, ${top.station.state}**\n` +
          `*${top.station.tagline}*\n\n` +
          `• **Suitability Score:** **${top.score}/100** (${top.rating})\n` +
          `• **Forecast:** ${top.day.weatherCondition} | High: ${top.day.maxTemperature}°C | Low: ${top.day.minTemperature}°C\n` +
          `• **Wind:** ${top.day.maxWindSpeed} km/h | **Climate Note:** ${top.summary}\n\n` +
          `🌟 **Trending Tourist Spots to Visit in ${top.station.city}:**\n` +
          `${spotsFormatted}\n\n` +
          `💡 **Why it's trending ${req.timeframeLabel.toLowerCase()}:**\n` +
          `${top.station.city} has the finest weather balance in the mountains — pleasant daytime temperatures, safe dry roads, and ideal atmospheric conditions for viewpoints, lake boating, and nature walks!`
        );

        const runnersUp = evaluated.slice(1, 5).map((item, idx) => {
          const medal = medals[idx + 1] || '•';
          const spotHighlights = item.station.topTouristSpots.slice(0, 2).join(', ');
          return (
            `${medal} **${item.station.city}, ${item.station.state}** — **${item.score}/100** (${item.day.maxTemperature}°C, ${item.day.weatherCondition})\n` +
            `   *Rating:* ${item.rating}\n` +
            `   *Must-visit spots:* ${spotHighlights}`
          );
        }).join('\n\n');

        return (
          `🏔️ **${req.title} (${req.timeframeLabel}):**\n\n` +
          `${topCard}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📊 **Live Weather Leaderboard across Other Top Hill Stations:**\n\n` +
          `${runnersUp}\n\n` +
          `🎒 **Hill Station Travel & Sightseeing Advice:**\n` +
          `• **Attire:** Layered clothing with a light cardigan or fleece jacket for breezy mountain evenings.\n` +
          `• **Best Sightseeing Timing:** Viewpoints and peaks are clearest between 8:00 AM – 11:30 AM before afternoon mist sets in.\n` +
          `• **Ghat Driving:** Safe scenic drives; keep headlights on in misty curves and enjoy the scenic vistas!`
        );
      }),
      catchError(() => of(`Could not evaluate hill stations at the moment. Please try again.`))
    );
  }

  private handleRegionalOutingQuery(req: {
    regionTitle: string;
    subRegion?: string;
    stateName?: string;
    cities: string[];
    isTomorrow: boolean;
    timeframeLabel: string;
  }): Observable<string> {
    return this.fetchValidForecasts(req.cities).pipe(
      map((validForecasts) => {
        if (validForecasts.length === 0) {
          return `I couldn't retrieve forecast data for cities in ${req.regionTitle}. Please try again.`;
        }

        const assessments = validForecasts.flatMap((f) => {
          const day = this.getForecastDay(f, req.isTomorrow);
          if (!day) return [];
          const suit = this.evaluateWeatherConditions({
            condition: day.weatherCondition,
            weatherCode: day.weatherCode,
            temp: day.maxTemperature,
            wind: day.maxWindSpeed,
            isOutdoor: true
          });
          return [{
            city: f.city,
            country: f.country,
            condition: day.weatherCondition,
            weatherCode: day.weatherCode,
            maxTemp: day.maxTemperature,
            minTemp: day.minTemperature,
            wind: day.maxWindSpeed,
            score: suit.score,
            rating: suit.rating,
            summary: suit.summary
          }];
        });

        if (assessments.length === 0) {
          return `Could not find weather data for ${req.regionTitle} on ${req.timeframeLabel}.`;
        }

        assessments.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return Math.abs(a.maxTemp - 24) - Math.abs(b.maxTemp - 24);
        });

        const top = assessments[0]!;
        const medals = ['🥇', '🥈', '🥉'];

        const rankingsText = assessments.map((c, index) => {
          const medal = index < 3 ? medals[index] : '•';
          const indicator = (c.rating === 'Excellent' || c.rating === 'Favorable') ? '✅' : '⚠️';
          return `${medal} **${c.city}** — ${c.maxTemp}°C (${c.condition})\n` +
                 `   ${indicator} *Outdoor Suitability:* **${c.rating}** (${c.summary}, Wind: ${c.wind} km/h)`;
        }).join('\n\n');

        const outingTip = top.maxTemp <= 22
          ? `Enjoy the cool, scenic hill climate in **${top.city}**! Bring a light jacket or cardigan for breezy morning and evening walks.`
          : top.maxTemp >= 32
          ? `Daytime temperatures in **${top.city}** reach ~${top.maxTemp}°C. Schedule outdoor outings during morning hours (7:00 AM – 10:30 AM) or after 4:30 PM, stay hydrated, and carry sun protection.`
          : `Delightful daytime temperatures (~${top.maxTemp}°C) in **${top.city}** provide comfortable conditions for full-day sightseeing and outdoor activities!`;

        return (
          `🌟 **Best Outing Destination in ${req.regionTitle} (${req.timeframeLabel}):**\n\n` +
          `🏆 **Top Recommendation: ${top.city}** (${top.rating} — Suitability Score: ${top.score}/100)\n` +
          `• **Forecast:** ${top.condition} | High: ${top.maxTemp}°C | Low: ${top.minTemp}°C\n` +
          `• **Wind Speed:** ${top.wind} km/h\n` +
          `• **Why it's best:** ${top.city} has the most favorable weather conditions in this region for an outing (${top.summary}).\n\n` +
          `📍 **Weather Rankings for Candidate Cities:**\n\n` +
          `${rankingsText}\n\n` +
          `💡 **Outing Advisory & Tips:**\n` +
          `${outingTip}`
        );
      }),
      catchError(() => of(`Could not fetch weather data for ${req.regionTitle}. Please try again.`))
    );
  }

  private handleTravelRouteQuery(comp: { city1: string; city2: string; isTomorrow: boolean }): Observable<string> {
    const errorMsg = `Could not retrieve forecast comparison for ${comp.city1} and ${comp.city2}.`;
    return this.withTwoCityForecasts(comp.city1, comp.city2, comp.isTomorrow, errorMsg, (f1, f2, d1, d2) => {
      const timeframeLabel = comp.isTomorrow ? `Tomorrow, ${d1.date}` : `Today, ${d1.date}`;
      return (
        `🚗 **Travel Route Weather: ${f1.city} ➔ ${f2.city} (${timeframeLabel})**\n\n` +
        `📍 **Origin — ${f1.city}, ${f1.country}:**\n` +
        `• Weather: ${d1.weatherCondition} | High ${d1.maxTemperature}°C | Low ${d1.minTemperature}°C\n` +
        `• Wind: ${d1.maxWindSpeed} km/h\n\n` +
        `📍 **Destination — ${f2.city}, ${f2.country}:**\n` +
        `• Weather: ${d2.weatherCondition} | High ${d2.maxTemperature}°C | Low ${d2.minTemperature}°C\n` +
        `• Wind: ${d2.maxWindSpeed} km/h\n\n` +
        `💡 **Travel Recommendation:**\n` +
        `Plan your drive early morning or late afternoon for the smoothest commute.`
      );
    });
  }

  private handleBothCitiesQuery(comp: { city1: string; city2: string; isTomorrow: boolean }): Observable<string> {
    const errorMsg = `Could not retrieve weather for ${comp.city1} and ${comp.city2}.`;
    return this.withTwoCityForecasts(comp.city1, comp.city2, comp.isTomorrow, errorMsg, (f1, f2, d1, d2) => {
      const timeframe = comp.isTomorrow ? `Tomorrow (${d1.date})` : `Today (${d1.date})`;
      const tempDiff = this.formatTempDifference(f1.city, d1.maxTemperature, f2.city, d2.maxTemperature, 'high temperatures');

      return (
        `🌤️ **Weather in Both Cities (${timeframe}):**\n\n` +
        `• 📍 **${f1.city}, ${f1.country}:** ${d1.weatherCondition}, High ${d1.maxTemperature}°C | Low ${d1.minTemperature}°C (Wind: ${d1.maxWindSpeed} km/h)\n` +
        `• 📍 **${f2.city}, ${f2.country}:** ${d2.weatherCondition}, High ${d2.maxTemperature}°C | Low ${d2.minTemperature}°C (Wind: ${d2.maxWindSpeed} km/h)\n\n` +
        `💡 **Summary:**\n${tempDiff}`
      );
    });
  }

  private handleComparisonQuery(comp: { city1: string; city2: string; isTomorrow: boolean; isOutdoor: boolean; isComparisonQuestion: boolean }): Observable<string> {
    const errorMsg = `Could not compare weather between "${comp.city1}" and "${comp.city2}".`;
    if (comp.isTomorrow) {
      return this.withTwoCityForecasts(
        comp.city1, comp.city2, true, errorMsg,
        (f1, f2, d1, d2) => {
          const eval1 = this.evaluateWeatherConditions({ condition: d1.weatherCondition, weatherCode: d1.weatherCode, temp: d1.maxTemperature, wind: d1.maxWindSpeed, isOutdoor: comp.isOutdoor });
          const eval2 = this.evaluateWeatherConditions({ condition: d2.weatherCondition, weatherCode: d2.weatherCode, temp: d2.maxTemperature, wind: d2.maxWindSpeed, isOutdoor: comp.isOutdoor });
          const verdict = this.buildComparisonVerdict({ city1: f1.city, city2: f2.city, eval1, eval2, temp1: d1.maxTemperature, temp2: d2.maxTemperature, cond1: d1.weatherCondition, cond2: d2.weatherCondition, timeframe: `Tomorrow (${d1.date})`, isOutdoor: comp.isOutdoor });

          return `🌤️ **Weather Comparison for Tomorrow (${d1.date}):**\n\n• **${f1.city}, ${f1.country}:** ${d1.weatherCondition}, High ${d1.maxTemperature}°C | Low ${d1.minTemperature}°C (Wind: ${d1.maxWindSpeed} km/h)\n• **${f2.city}, ${f2.country}:** ${d2.weatherCondition}, High ${d2.maxTemperature}°C | Low ${d2.minTemperature}°C (Wind: ${d2.maxWindSpeed} km/h)\n\n💡 **Recommendation:**\n${verdict}`;
        },
        (f1, f2) => `Could not retrieve tomorrow's forecast for comparison between ${f1.city} and ${f2.city}.`
      );
    }

    return forkJoin({
      w1: this.weatherService.getCurrentWeather(comp.city1),
      w2: this.weatherService.getCurrentWeather(comp.city2)
    }).pipe(
      map(({ w1, w2 }) => {
        const eval1 = this.evaluateWeatherConditions({ condition: w1.weatherCondition, weatherCode: w1.weatherCode, temp: w1.temperature, wind: w1.windSpeed, humidity: w1.humidity, isOutdoor: comp.isOutdoor });
        const eval2 = this.evaluateWeatherConditions({ condition: w2.weatherCondition, weatherCode: w2.weatherCode, temp: w2.temperature, wind: w2.windSpeed, humidity: w2.humidity, isOutdoor: comp.isOutdoor });
        const verdict = this.buildComparisonVerdict({ city1: w1.city, city2: w2.city, eval1, eval2, temp1: w1.temperature, temp2: w2.temperature, cond1: w1.weatherCondition, cond2: w2.weatherCondition, timeframe: 'Current / Today', isOutdoor: comp.isOutdoor });

        return `🌤️ **Weather Comparison:**\n\n• **${w1.city}, ${w1.country}:** ${w1.temperature}°C, ${w1.weatherCondition} (Wind: ${w1.windSpeed} km/h, Humidity: ${w1.humidity}%)\n• **${w2.city}, ${w2.country}:** ${w2.temperature}°C, ${w2.weatherCondition} (Wind: ${w2.windSpeed} km/h, Humidity: ${w2.humidity}%)\n\n💡 **Recommendation:**\n${verdict}`;
      }),
      catchError(() => of(errorMsg))
    );
  }

  private handleSingleCityQuery(targetCity: string, query: string, rawQuery: string): Observable<string> {
    const combined = `${rawQuery} ${query}`.toLowerCase();
    const isYesterday = /\b(?:yesterday|yesterday's|past\s+day|previous\s+day)\b/i.test(combined);
    const isTomorrow = /\b(?:tomorrow|next\s+day)\b/i.test(combined);
    const isPastDays = /\b(?:previous|past|last|completed|prior|earlier|recorded)\s+(?:\d{1,2}\s+days?|week|days?)\b/i.test(combined) ||
                       /\b(?:\d{1,2}\s+)?(?:previous|past|last|completed|prior)\s+days?\b/i.test(combined);
    const isForecast = !isPastDays && /\b(?:forecast|upcoming|next\s+\d+\s+days?|\d+\s*days?|weekly|week|report\s+of|weather\s+report)\b/i.test(combined);
    const isOutdoor = /\b(?:outdoor|outdoors|outing|trip|travel|tour|picnic|visit|vacation|sightseeing|walk|activities|activity)\b/i.test(combined);

    const parseRequestedDays = (regex: RegExp, defaultDays: number, max: number): number => {
      const match = combined.match(regex);
      let days = match && match[1] ? parseInt(match[1], 10) : 0;
      if (/\b(?:weekly|this\s+week|next\s+week|previous\s+week|past\s+week|last\s+week)\b/i.test(combined) && days === 0) days = 7;
      if (days <= 0) days = defaultDays;
      return Math.min(Math.max(days, 1), max);
    };

    if (isYesterday || isPastDays || isTomorrow || isForecast) {
      return this.weatherService.getForecast(targetCity).pipe(
        map((f) => {
          if (isYesterday) {
            const yest = f.daily?.find((d) => d.date === this.getDateString(-86400000)) || (f.daily && f.daily.length > 0 ? f.daily[0] : null);
            if (!yest) return `Could not retrieve yesterday's recorded weather for ${f.city}.`;
            return `Yesterday's Weather in ${f.city}, ${f.country} (${yest.date}):\n• Condition: ${yest.weatherCondition}\n• High: ${yest.maxTemperature}°C | Low: ${yest.minTemperature}°C\n• Max Wind Speed: ${yest.maxWindSpeed} km/h`;
          }

          if (isPastDays) {
            if (!f.daily || f.daily.length === 0) return `Could not retrieve past weather records for ${f.city}.`;
            const pastDays = f.daily.filter((d) => d.date < this.getDateString());
            if (pastDays.length === 0) return `No completed previous days recorded yet for ${f.city}.`;
            const requested = parseRequestedDays(/\b(?:previous|past|last|completed|prior|earlier)\s+(\d{1,2})\s*days?\b/i, 5, 14);
            const daysToShow = pastDays.slice(-requested);
            return `📜 **Previous ${daysToShow.length} Days Recorded Weather for ${f.city}, ${f.country}:**\n\n${this.formatDaysList(daysToShow)}\n\n💡 **Historical Summary:** Actual recorded meteorological observations for the completed ${daysToShow.length} days preceding today.`;
          }

          if (isTomorrow) {
            const tom = f.daily?.find((d) => d.date === this.getDateString(86400000)) || (f.daily && f.daily.length > 1 ? f.daily[1] : null);
            if (!tom) return `Could not retrieve tomorrow's forecast for ${f.city}.`;
            let text = `Tomorrow's Forecast for ${f.city}, ${f.country} (${tom.date}):\n• Weather: ${tom.weatherCondition}\n• High: ${tom.maxTemperature}°C | Low: ${tom.minTemperature}°C\n• Max Wind Speed: ${tom.maxWindSpeed} km/h`;
            if (isOutdoor) text += this.formatOutdoorAdvisory(tom.weatherCondition, tom.weatherCode, tom.maxTemperature, tom.maxWindSpeed);
            return text;
          }

          if (!f.daily || f.daily.length === 0) return `Could not retrieve forecast for ${f.city}.`;
          const futureDays = f.daily.filter((d) => d.date >= this.getDateString());
          const requested = parseRequestedDays(/\b(?:next\s+)?(\d{1,2})\s*days?\b/i, 5, 16);
          const daysToShow = (futureDays.length >= requested ? futureDays : f.daily).slice(0, requested);
          return `📅 **${daysToShow.length}-Day Forecast for ${f.city}, ${f.country}:**\n\n${this.formatDaysList(daysToShow)}\n\n💡 **Outlook:** Displaying ${daysToShow.length} consecutive days of forecasted meteorological telemetry.`;
        }),
        catchError(() => of(`I couldn't locate ${isForecast ? 'forecast' : 'weather'} information for "${targetCity}". Please check the spelling of the city.`))
      );
    }

    return this.weatherService.getCurrentWeather(targetCity).pipe(
      map((w) => {
        let text = `The current temperature in ${w.city}, ${w.country} is ${w.temperature}°C with ${w.weatherCondition}.\nWind speed is ${w.windSpeed} km/h and humidity is ${w.humidity}%. Feels like ${w.apparentTemperature}°C.`;
        if (isOutdoor) text += this.formatOutdoorAdvisory(w.weatherCondition, w.weatherCode, w.temperature, w.windSpeed, w.humidity);
        return text;
      }),
      catchError(() => of(`I couldn't locate weather information for "${targetCity}". Please check the spelling of the city.`))
    );
  }

  public evaluateWeatherConditions(params: {
    condition: string;
    weatherCode: number;
    temp: number;
    wind: number;
    humidity?: number;
    isOutdoor?: boolean;
  }): WeatherConditionEvaluation {
    let score = 50;
    const cond = (params.condition || '').toLowerCase();
    const code = params.weatherCode;
    const reasons: string[] = [];

    const weatherRules: Array<[boolean, number, string]> = [
      [[95, 96, 99].includes(code) || /thunder|storm/.test(cond), -55, 'Thunderstorms / stormy weather expected'],
      [[65, 67, 75, 82, 85, 86].includes(code) || cond.includes('heavy rain'), -40, 'Heavy rain likely; outdoor activities disrupted'],
      [[53, 55, 61, 63, 80, 81].includes(code) || /rain|shower/.test(cond), -25, 'Rain showers expected; umbrella required'],
      [[51, 56, 57, 45, 48].includes(code) || /drizzle|fog/.test(cond), -10, 'Damp drizzle or mist'],
      [[0, 1].includes(code) || /clear|sunny/.test(cond), 25, 'Clear sunny skies with dry weather'],
      [[2, 3].includes(code) || /cloud|overcast/.test(cond), 15, 'Comfortable cloud cover without rain']
    ];

    for (const [matched, delta, text] of weatherRules) {
      if (matched) { score += delta; reasons.push(text); break; }
    }

    const t = params.temp;
    const [tScore, tReason] =
      t >= 19 && t <= 28 ? [20, `pleasant comfortable temperature (${t}°C)`] :
      t > 28 && t <= 33 ? [5, `warm (${t}°C)`] :
      t > 33 && t <= 38 ? [-15, `hot daytime conditions (${t}°C)`] :
      t > 38 ? [-30, `extreme heat (${t}°C)`] :
      t >= 14 && t < 19 ? [10, `cool and mild (${t}°C)`] : [-10, `chilly temperatures (${t}°C)`];
    score += tScore;
    reasons.push(tReason);

    if (params.wind > 35) { score -= 15; reasons.push(`strong gusty winds (${params.wind} km/h)`); }
    else if (params.wind <= 20) { score += 5; }

    if (params.humidity && params.humidity > 80 && params.temp > 30) {
      score -= 10;
      reasons.push(`high humidity (${params.humidity}%)`);
    }

    const rating = score >= 70 ? 'Excellent' : score >= 50 ? 'Favorable' : score >= 35 ? 'Moderate' : score >= 20 ? 'Unfavorable' : 'Poor';
    return { score, rating, summary: reasons.join(', ') || 'Normal seasonal conditions' };
  }

  private buildComparisonVerdict(params: {
    city1: string;
    city2: string;
    eval1: WeatherConditionEvaluation;
    eval2: WeatherConditionEvaluation;
    temp1: number;
    temp2: number;
    cond1: string;
    cond2: string;
    timeframe: string;
    isOutdoor?: boolean;
  }): string {
    const tempText = this.formatTempDifference(params.city1, params.temp1, params.city2, params.temp2, 'temperatures');

    if (params.isOutdoor) {
      if (params.eval1.score >= params.eval2.score + 10) {
        return `**${params.city1} is the better choice for an outdoor trip.** It offers ${params.eval1.rating.toLowerCase()} conditions (${params.temp1}°C), whereas ${params.city2} is less favorable (${params.eval2.summary}).`;
      } else if (params.eval2.score >= params.eval1.score + 10) {
        return `**${params.city2} is the better choice for an outdoor trip.** It offers ${params.eval2.rating.toLowerCase()} conditions (${params.temp2}°C), whereas ${params.city1} is less favorable (${params.eval1.summary}).`;
      }
      const preferred = params.temp1 <= 28 ? params.city1 : params.city2;
      return `Both ${params.city1} and ${params.city2} have favorable weather! ${preferred} is slightly preferable. (${tempText})`;
    }

    const conditionComp = params.cond1.toLowerCase() === params.cond2.toLowerCase()
      ? `Both cities share similar weather (${params.cond1}).`
      : `${params.city1} has ${params.cond1}, while ${params.city2} has ${params.cond2}.`;

    return `${conditionComp} ${tempText}`;
  }

  private extractNaturalCity(query: string, rawQuery: string, activeCity?: string | null): { city: string; isContextual: boolean } | null {
    const combined = `${rawQuery} ${query}`;
    const prepMatch = combined.match(/\b(?:in|at|for|around|near|of|to)\s+([a-zA-Z\s\-]+?)(?:\s+(?:today|tomorrow|tonight|this\s+morning|this\s+evening|this\s+afternoon|this\s+weekend|next\s+day|right\s+now|now|please|\?|$))/i) ||
                      combined.match(/\b(?:in|at|for|around|near|of|to)\s+([a-zA-Z\s\-]+?)(?:\s*[?!.]|$)/i);

    if (prepMatch?.[1]) {
      const candidate = this.cleanCityToken(prepMatch[1]);
      if (candidate && this.isValidSingleCity(candidate)) {
        return { city: candidate, isContextual: false };
      }
    }

    const extracted = this.extractCityFromQuery(query);
    if (extracted && this.isValidSingleCity(extracted)) {
      return { city: extracted, isContextual: false };
    }

    if (activeCity && this.isValidSingleCity(activeCity)) {
      return { city: activeCity, isContextual: true };
    }

    return null;
  }

  private extractHillStationQuery(query: string, rawQuery: string): {
    title: string;
    stations: HillStationInfo[];
    isTomorrow: boolean;
    timeframeLabel: string;
  } | null {
    const combined = `${rawQuery} ${query}`.toLowerCase();
    const isHillStation = /\b(?:hill\s*stations?|hillstations?|mountain\s*stations?|hills?|tourist\s*spots?|tourist\s*places?|sightseeing\s*spots?|vacation\s*spots?|trending\s*spots?)\b/i.test(combined);
    const isRecommendation = /\b(?:best|better|good|prefer|top|trending|recommend|suggest|ideal|where|which|popular|famous)\b/i.test(combined);

    if (!isHillStation && !(/\b(?:hill\s*station|hillstations?)\b/i.test(combined))) return null;
    if (!isRecommendation && !(/\b(?:hill\s*station|hillstations?)\b/i.test(combined))) return null;

    const isTomorrow = AssistantService.TOMORROW_REGEX.test(combined);
    const { label: timeframeLabel } = this.getTimeframeInfo(isTomorrow);

    for (const [pattern, filter, title] of AssistantService.HILL_CONFIGS) {
      if (pattern.test(combined)) {
        return { title, stations: HILL_STATIONS.filter(filter), isTomorrow, timeframeLabel };
      }
    }

    const topPremierCities = new Set(['Munnar', 'Ooty', 'Kodaikanal', 'Manali', 'Shimla', 'Coorg', 'Wayanad', 'Mahabaleshwar', 'Mussoorie', 'Darjeeling']);
    return {
      title: 'Best & Trending Hill Stations in India',
      stations: HILL_STATIONS.filter(h => topPremierCities.has(h.city)),
      isTomorrow,
      timeframeLabel
    };
  }

  private extractRegionalOutingQuery(query: string, rawQuery: string): {
    regionTitle: string;
    subRegion?: string;
    stateName?: string;
    cities: string[];
    isTomorrow: boolean;
    timeframeLabel: string;
  } | null {
    const combined = `${rawQuery} ${query}`.toLowerCase();
    const isOutingOrTrip = /\b(?:outing|outdoor|outdoors|trip|travel|tour|picnic|visit|sightseeing|vacation|holiday|activities|activity|spot|spots)\b/i.test(combined);
    const isRecommendation = /\b(?:best|better|good|prefer|preferable|ideal|recommend|suggest|top|which\s+(?:city|cities|place|places|town|towns|district|districts|destination|spot)|where\s+(?:should|can|to)\s*(?:i|we)?\s*(?:go|visit))\b/i.test(combined);

    if (!isOutingOrTrip && !isRecommendation) return null;

    const isTomorrow = AssistantService.TOMORROW_REGEX.test(combined);
    const { label: timeframeLabel } = this.getTimeframeInfo(isTomorrow);

    let stateKey = AssistantService.REGIONAL_STATES.find(([, reg]) => reg.test(combined))?.[0] || '';
    const subRegionKey = AssistantService.REGIONAL_SUBREGIONS.find(([, reg]) => reg.test(combined))?.[0] || '';

    if (!stateKey && subRegionKey === 'south') stateKey = 'tamilnadu';

    if (stateKey && REGIONAL_DESTINATIONS[stateKey]) {
      const stateObj = REGIONAL_DESTINATIONS[stateKey];
      if (subRegionKey && stateObj.subRegions && stateObj.subRegions[subRegionKey]) {
        const sub = stateObj.subRegions[subRegionKey];
        return {
          regionTitle: sub.name,
          subRegion: subRegionKey,
          stateName: stateObj.name,
          cities: sub.cities,
          isTomorrow,
          timeframeLabel
        };
      }
      return {
        regionTitle: stateObj.name,
        stateName: stateObj.name,
        cities: stateObj.defaultCities,
        isTomorrow,
        timeframeLabel
      };
    }

    if (isOutingOrTrip && isRecommendation && /\b(?:city|place|destination|where)\b/i.test(combined)) {
      return {
        regionTitle: 'Popular Outing Destinations',
        cities: ['Kodaikanal', 'Ooty', 'Munnar', 'Madikeri', 'Mysuru', 'Udaipur', 'Lonavala'],
        isTomorrow,
        timeframeLabel
      };
    }

    return null;
  }

  private validateCityPair(raw1: string, raw2: string): { city1: string; city2: string } | null {
    const city1 = this.cleanCityToken(raw1);
    const city2 = this.cleanCityToken(raw2);
    if (city1 && city2 && city1.toLowerCase() !== city2.toLowerCase() && this.isValidSingleCity(city1) && this.isValidSingleCity(city2)) {
      return { city1, city2 };
    }
    return null;
  }

  private extractMultiCityQuery(query: string, rawQuery: string): {
    type: 'travel_route' | 'comparison' | 'both_cities';
    city1: string;
    city2: string;
    isTomorrow: boolean;
    isOutdoor: boolean;
    isTimeRecommendation: boolean;
    isComparisonQuestion: boolean;
  } | null {
    const combined = `${rawQuery} ${query}`.toLowerCase();
    const isTomorrow = AssistantService.TOMORROW_REGEX.test(combined);
    const isOutdoor = /\b(?:outdoor|outdoors|outing|trip|travel|tour|picnic|visit|vacation|sightseeing|walk|sports|activity|activities|drive|driving|journey)\b/.test(combined);
    const isTimeRecommendation = /\b(?:which\s+time|what\s+time|best\s+time|good\s+time|when\s+(?:should|would|is|to)|time\s+(?:would|is)\s+better|recommend.*time|time.*travel|time.*leave)\b/.test(combined);
    const isComparisonQuestion = /\b(?:better|best|prefer|preferable|ideal|recommended|good|suitable|favorable|choose|colder|warmer|hotter|cooler|which\s+is|which\s+one|which\s+cit(?:y|ies)|suggest)\b/.test(combined);

    const q = query.replace(/([a-zA-Z]),([a-zA-Z])/g, '$1 , $2').trim();
    const stripTrailing = (s: string) => s.replace(/\s+(?:tomorrow|today|tonight|next\s+day|check|recommend|suggest|what|which|when|how|and|in\s+both|for|is|with|please|both\s+cities|weather|time)\b.*$/i, '').trim();

    const fromToMatch = q.match(/(?:i\s+want\s+to\s+travel\s+|traveling\s+|travelling\s+|travel\s+|trip\s+|drive\s+|driving\s+|journey\s+|going\s+|fly\s+|flying\s+)?(?:from\s+)?([a-zA-Z\s\-]+?)\s+(?:to|towards)\s+([a-zA-Z\s\-]+)/i);
    if (fromToMatch?.[1] && fromToMatch[2]) {
      const raw1 = fromToMatch[1].replace(/^(?:i\s+want\s+to\s+travel\s+|traveling\s+|travelling\s+|travel\s+|trip\s+|drive\s+|driving\s+|journey\s+|going\s+|fly\s+|flying\s+)/i, '').replace(/^(?:from\s+)/i, '');
      const pair = this.validateCityPair(raw1, stripTrailing(fromToMatch[2]));
      if (pair) return { type: 'travel_route', city1: pair.city1, city2: pair.city2, isTomorrow, isOutdoor: true, isTimeRecommendation, isComparisonQuestion };
    }

    const bothMatch = q.match(/(?:both\s+cities|both\s+places|both)\s+(?:of\s+|in\s+)?([a-zA-Z\s\-]+?)\s*(?:,|&|\band\b)\s*([a-zA-Z\s\-]+)/i);
    if (bothMatch?.[1] && bothMatch[2]) {
      const pair = this.validateCityPair(bothMatch[1], stripTrailing(bothMatch[2]));
      if (pair) return { type: 'both_cities', city1: pair.city1, city2: pair.city2, isTomorrow, isOutdoor, isTimeRecommendation, isComparisonQuestion };
    }

    const tailPrepMatch = q.match(/\b(?:from|between|among|of|in|out\s+of)\s+([a-zA-Z\s\-]+?)\s*(?:,|\/|&|\band\b|\bor\b|\bvs\.?\b|\bversus\b)\s*([a-zA-Z\s\-]+?)(?:\s+(?:which|is|tomorrow|today|for|please).*)?$/i);
    if (tailPrepMatch) {
      const raw2 = tailPrepMatch[2].replace(/\b(?:tomorrow|today|tonight|please)\b/gi, '').trim();
      const pair = this.validateCityPair(tailPrepMatch[1], raw2);
      if (pair) return { type: 'comparison', city1: pair.city1, city2: pair.city2, isTomorrow, isOutdoor, isTimeRecommendation, isComparisonQuestion: true };
    }

    const pairRegex = /\b([a-zA-Z]{2,20}(?:\s+[a-zA-Z]{2,20})?)\s*(?:,|\/|&|\band\b|\bor\b|\bvs\.?\b|\bversus\b)\s*([a-zA-Z]{2,20}(?:\s+[a-zA-Z]{2,20})?)\b/gi;
    let match: RegExpExecArray | null;
    while ((match = pairRegex.exec(q)) !== null) {
      const w1List = match[1].trim().split(/\s+/).filter(w => !AssistantService.STOP_WORDS.has(w.toLowerCase()));
      const w2List = match[2].trim().split(/\s+/).filter(w => !AssistantService.STOP_WORDS.has(w.toLowerCase()));
      if (w1List.length > 0 && w2List.length > 0) {
        const pair = this.validateCityPair(w1List.join(' '), w2List.join(' '));
        if (pair) return { type: 'comparison', city1: pair.city1, city2: pair.city2, isTomorrow, isOutdoor, isTimeRecommendation, isComparisonQuestion: isComparisonQuestion || isOutdoor };
      }
    }

    return null;
  }

  public isValidSingleCity(city: string): boolean {
    if (!city || city.length < 2) return false;
    const lower = city.toLowerCase().trim();
    if (AssistantService.STOP_WORDS.has(lower)) return false;
    const words = lower.split(/\s+/).filter(Boolean);
    if (words.length > 3) return false;
    if (words.some((w) => AssistantService.FORBIDDEN_WORDS.has(w) || AssistantService.STOP_WORDS.has(w))) return false;
    return true;
  }

  private cleanCityToken(raw: string): string {
    const city = raw.trim()
      .replace(/^(?:weather\s*(?:conditions?|details?)?\s*(?:in|of|for|at)?\s*)/i, '')
      .replace(/^(?:the\s+city\s+of\s+|the\s+)/i, '')
      .replace(/^(?:between|in|at|for|of|from|to|compare|comparison|versus|vs)\s+/i, '')
      .replace(/\s+(?:weather|conditions?|climate|forecast|today|tomorrow|now|right\s+now|currently|please|city)$/i, '')
      .replace(/[^a-zA-Z\s\-]/g, '')
      .trim();

    return (city.length >= 2 && !AssistantService.STOP_WORDS.has(city.toLowerCase())) ? city : '';
  }

  private extractCityFromQuery(query: string): string {
    let clean = query.trim()
      .replace(/([a-zA-Z]),([a-zA-Z])/g, '$1 , $2')
      .replace(/[?!.,;]+/g, ' ')
      .replace(/^(?:can\s+you\s+)?(?:please\s+)?(?:tell|show|give|check|get|find|suggest|recommend)\s+(?:me\s+)?(?:the\s+)?/i, '')
      .replace(/^(?:what|how)\s+(?:will\s+be|was|is|'s)\s+(?:the\s+)?/i, '')
      .replace(/^(?:what\s+about|tell\s+me\s+about|about|is\s+it\s+raining\s+in)\s+/i, '')
      .replace(/\b(?:check\s+(?:the\s+)?weather\s+in\s+both\s+cities.*|in\s+both\s+cities.*|both\s+cities.*)/i, '')
      .replace(/\b(?:hill\s*stations?|hillstations?|tourist\s*spots?|sightseeing\s*spots?)\b/gi, '')
      .replace(/\b(?:recommend|suggest)\s+(?:which|what|best|me).*/i, '')
      .replace(/\bwhich\s+(?:city|cities|time)\s+(?:would|is|are)\s+be\s+better.*/i, '')
      .replace(/\bwhich\s+(?:city|cities|place|places)\s+(?:is|are|would\s+be)\s+(?:best|better|good|preferable).*/i, '')
      .replace(/\b(?:based\s+on\s+weather.*|for\s+(?:an?\s+)?(?:outdoor|trip|travel|picnic|outing|visit).*)/i, '');

    const sanitize = (s: string) => s
      .replace(/^(?:in|of|at|for|about)\s+/i, '')
      .replace(/^(?:the\s+city\s+of\s+|the\s+)/i, '')
      .replace(/\b(?:weather|conditions?|climate|temperature|temp|forecast|next|\d+\s+days?|days?|week|rain|outdoor|outdoors|trip|travel|visit|picnic|outing)\b/gi, '')
      .trim();

    const locationEndMatch = clean.match(/\b(?:in|at|of|about)\s+([a-zA-Z\s\-]+)$/i);
    if (locationEndMatch?.[1]) {
      const city = sanitize(locationEndMatch[1]);
      if (this.isValidSingleCity(city)) return city;
    }

    clean = clean.replace(/\b(?:for\s+)?(?:the\s+)?next\s+\d+\s+days?\b/gi, '')
      .replace(/\b\d+\s+days?\b/gi, '')
      .replace(/\b(?:next|this)\s+(?:week|weekend|month|days?)\b/gi, '')
      .replace(/\b(?:yesterday'?s?|today'?s?|tomorrow'?s?|tonight|now|right\s+now|currently|please|this\s+week|next\s+week|weekly|daily|forecast|upcoming|report|update)\b/gi, '');

    const intentMatch = clean.match(/(?:weather\s*(?:conditions?|details?)?|conditions?|temperature|temp|climate|rain|forecast)\s*(?:in|of|at|for|about)?\s*([a-zA-Z\s\-]+)/i);
    if (intentMatch?.[1]?.trim()) {
      const city = sanitize(intentMatch[1]);
      if (this.isValidSingleCity(city)) return city;
    }

    clean = sanitize(clean);
    return this.isValidSingleCity(clean) ? clean : '';
  }

  private normalizeFuzzyQuery(rawQuery: string): string {
    const spaced = rawQuery
      .replace(/([a-zA-Z]),([a-zA-Z])/g, '$1 , $2')
      .replace(/([a-zA-Z])\/([a-zA-Z])/g, '$1 / $2')
      .replace(/([a-zA-Z])&([a-zA-Z])/g, '$1 & $2');

    return spaced.split(/(\s+|[^\w\s])/)
      .map((tok) => {
        if (!/^[a-zA-Z]+$/.test(tok) || tok.length < 4) return tok;
        const lower = tok.toLowerCase();
        for (const [canonical, variants] of Object.entries(AssistantService.KEYWORDS)) {
          for (const target of variants) {
            const maxDist = target.length <= 5 ? 1 : 2;
            if (this.levenshteinDistance(lower, target) <= maxDist) return canonical;
          }
        }
        return tok;
      })
      .join('');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  }
}
