import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { WeatherService } from "./weather.service.js";
import { WeatherSearch } from "../models/weatherSearch.model.js";

const currentWeatherTool: FunctionDeclaration = {
  name: "getCurrentWeather",
  description: "Get real-time live weather telemetries (temperature, feels-like, wind speed, humidity, weather condition) for a specified city or location.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      city: {
        type: SchemaType.STRING,
        description: "The name of the city, district, or place (e.g. 'London', 'Paris', 'Bengaluru', 'Munnar', 'Tokyo')"
      }
    },
    required: ["city"]
  }
};

const forecastTool: FunctionDeclaration = {
  name: "getWeatherForecast",
  description: "Get upcoming daily weather forecast (up to 7 days including high/low temperatures, rain/weather conditions, wind speed) for a specified city or location.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      city: {
        type: SchemaType.STRING,
        description: "The name of the city, district, or place"
      }
    },
    required: ["city"]
  }
};

const yesterdayWeatherTool: FunctionDeclaration = {
  name: "getYesterdayWeather",
  description: "Get recorded historical weather conditions for yesterday (high/low temperature, weather condition, rain precipitation, wind) for a specified city or location.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      city: {
        type: SchemaType.STRING,
        description: "The name of the city, district, or place"
      }
    },
    required: ["city"]
  }
};

const searchHistoryTool: FunctionDeclaration = {
  name: "getRecentSearchHistory",
  description: "Get the user's recently searched cities and their recorded weather from the database.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      limit: {
        type: SchemaType.NUMBER,
        description: "Maximum number of recent records to retrieve (default is 5)"
      }
    }
  }
};

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  public static cleanFormatting(text: string): string {
    if (!text) return "";
    return text
      // 1. Remove leaked tool execution strings like forturn:defaultapi:getWeatherForecast{...}result:[...]表现 or similar
      .replace(/(?:for\s*turn|forturn|call)?[:\s]*(?:default_?api:)?\w+\s*\{[\s\S]*?\}\s*result:\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\})\s*[\u4e00-\u9fa5]*\s*/gi, "")
      // 2. Catch any generic forturn/defaultapi or result traces
      .replace(/(?:for\s*turn|forturn|default_?api)[\s\S]*?(?:[\u4e00-\u9fa5]|result:[\s\S]*?\]|result:[\s\S]*?\})\s*/gi, "")
      // 3. Catch raw json arrays/objects emitted before answer if any
      .replace(/^(?:\[[\s\S]*?\]|\{[\s\S]*?\})\s*[\u4e00-\u9fa5]*\s*/g, "")
      // 4. Strip any leftover Chinese/Asian internal tokens like 表现
      .replace(/^[\s\u4e00-\u9fa5:]+/g, "")
      // 5. Clean markdown headers and symbols
      .replace(/^#{1,6}\s*(.*?)$/gm, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^\s*[\*\-]\s+/gm, "• ")
      .replace(/\*\*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private getGenAI(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in backend/.env. Please configure your Gemini API key.");
    }
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  public async chat(message: string, history: Array<{ sender: "user" | "assistant"; text: string }> = []): Promise<string> {
    const ai = this.getGenAI();

    const geminiHistory = history
      .filter((m) => m && m.text && typeof m.text === "string" && m.text.trim().length > 0)
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.text }]
      }));

    while (geminiHistory.length > 0 && geminiHistory[0]?.role !== "user") {
      geminiHistory.shift();
    }

    const candidateModels = ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-3.6-flash"];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const todayDateStr = new Date().toISOString().split("T")[0];

          const model = ai.getGenerativeModel({
            model: modelName,
            tools: [
              {
                functionDeclarations: [currentWeatherTool, forecastTool, yesterdayWeatherTool, searchHistoryTool]
              }
            ],
            systemInstruction: `You are the Weather Assistant. Today is ${todayDateStr}. Always display temperatures in Celsius (°C). Never output internal function execution traces, turn prefixes (such as "forturn:", "defaultapi:", "result:"), or raw JSON objects in your final text. Always provide only a natural, polished, user-facing summary of the weather data.`
          });

          const chatSession = model.startChat({
            history: geminiHistory
          });

          let response = await chatSession.sendMessage(message);
          let functionCalls = response.response.functionCalls();

          let loopCount = 0;
          while (functionCalls && functionCalls.length > 0 && loopCount < 5) {
            loopCount++;
            const toolResponses = [];

            for (const call of functionCalls) {
              let functionResult: any;
              try {
                if (call.name === "getCurrentWeather") {
                  const city = (call.args as any)?.city || "";
                  functionResult = await WeatherService.getCurrentWeather(city);
                } else if (call.name === "getWeatherForecast") {
                  const city = (call.args as any)?.city || "";
                  functionResult = await WeatherService.getDailyForecast(city);
                } else if (call.name === "getYesterdayWeather") {
                  const city = (call.args as any)?.city || "";
                  functionResult = await WeatherService.getYesterdayWeather(city);
                } else if (call.name === "getRecentSearchHistory") {
                  const limit = Number((call.args as any)?.limit) || 5;
                  try {
                    const historyDocs = await WeatherSearch.find().sort({ searchedAt: -1 }).limit(limit).lean();
                    functionResult = { history: historyDocs };
                  } catch {
                    functionResult = { history: [] };
                  }
                } else {
                  functionResult = { error: `Unknown tool: ${call.name}` };
                }
              } catch (err: any) {
                functionResult = { error: err?.message || "Failed to retrieve weather data" };
              }

              toolResponses.push({
                functionResponse: {
                  name: call.name,
                  response: functionResult
                }
              });
            }

            response = await chatSession.sendMessage(toolResponses);
            functionCalls = response.response.functionCalls();
          }

          let rawOutput = "";
          try {
            rawOutput = response.response.text();
          } catch {
            const parts = response.response.candidates?.[0]?.content?.parts;
            if (parts && Array.isArray(parts)) {
              rawOutput = parts.map((p) => p.text || "").filter(Boolean).join("\n");
            }
          }

          return GeminiService.cleanFormatting(rawOutput);
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} (attempt ${attempt + 1}) encountered:`, err?.message || err);
          if (!err?.message?.includes("503") && !err?.message?.includes("429")) {
            break; 
          }
        }
      }
    }

    return GeminiService.cleanFormatting(await this.generateEmergencyFallback(message, lastError));
  }

  private async generateEmergencyFallback(message: string, originalError: any): Promise<string> {
    console.warn("Activating emergency weather fallback due to Google API demand spike:", originalError?.message);

    try {
      const lower = message.toLowerCase();
      const STOP_WORDS = new Set([
        "give", "me", "show", "tell", "check", "what", "is", "the", "weather", "forecast", "for", "in", "at", "around",
        "next", "days", "day", "week", "tomorrow", "today", "now", "here", "there", "and", "between", "versus", "vs",
        "compare", "temperature", "temp", "conditions", "how", "will", "it", "rain", "please", "can", "you"
      ]);

      const inPattern = /(?:in|for|at|around|of)\s+([a-zA-Z\s]+)/i.exec(message);
      const candidates: string[] = [];

      if (inPattern && inPattern[1]) {
        const potential = inPattern[1].trim().split(/\s+/)[0];
        if (potential && potential.length >= 3 && !STOP_WORDS.has(potential.toLowerCase())) {
          candidates.push(potential);
        }
      }

      const tokens = message.replace(/[^a-zA-Z\s]/g, " ").split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const tLower = token.toLowerCase();
        if (tLower.length >= 3 && !STOP_WORDS.has(tLower) && !candidates.includes(token)) {
          try {
            const loc = await WeatherService.geocodeCity(token);
            if (loc && !candidates.includes(loc.name)) {
              candidates.push(loc.name);
            }
          } catch {
          }
        }
      }

      const isForecastQuery = /\b(?:forecast|next\s+\d+|days?|tomorrow|weekly|upcoming)\b/i.test(lower);

      if (candidates.length >= 2) {
        const results = await Promise.all(candidates.slice(0, 3).map((c) => WeatherService.getCurrentWeather(c)));
        const cards = results
          .map((w) => `• 📍 **${w.city}, ${w.country}**: **${w.temperature}°C** (Feels like: ${w.apparentTemperature}°C), ${w.weatherCondition} — Humidity: ${w.humidity}%, Wind: ${w.windSpeed} km/h`)
          .join("\n");

        return (
          `🌤️ **Weather Comparison** *(Direct Open-Meteo Telemetry)*:\n\n` +
          `${cards}\n\n` +
          `💡 **Note:** Displaying live meteorological readings directly from your Weather engine.`
        );
      }

      if (candidates.length === 1) {
        const targetCity = candidates[0]!;

        if (isForecastQuery) {
          const f = await WeatherService.getDailyForecast(targetCity);
          const daysToShow = (f.daily || []).slice(0, 5);
          const forecastLines = daysToShow.map((d) => {
            const dayName = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });
            return `• **${d.date} (${dayName}):** ${d.weatherCondition} | High: **${d.maxTemperature}°C** / Low: **${d.minTemperature}°C** (Wind: ${d.maxWindSpeed} km/h)`;
          }).join("\n");

          return (
            `📅 **5-Day Weather Forecast for ${f.city}, ${f.country}**:\n\n` +
            `${forecastLines}\n\n` +
            `💡 Real-time meteorological telemetry provided directly by your Weather engine.`
          );
        }

        const isYesterdayQuery = /\b(?:yesterday|past|previous\s+day)\b/i.test(lower);
        if (isYesterdayQuery) {
          const y = await WeatherService.getYesterdayWeather(targetCity);
          return (
            `🌤️ **Yesterday's Weather in ${y.city}, ${y.country} (${y.date})**:\n\n` +
            `• **Condition:** ${y.weatherCondition} ${y.weatherIcon || "⛅"}\n` +
            `• **High Temperature:** **${y.maxTemperature}°C**\n` +
            `• **Low Temperature:** **${y.minTemperature}°C**\n` +
            `• **Max Wind Speed:** ${y.maxWindSpeed} km/h\n` +
            `• **Precipitation:** ${y.precipitation} mm\n\n` +
            `💡 Verified historical meteorological record from Open-Meteo.`
          );
        }

        const w = await WeatherService.getCurrentWeather(targetCity);
        return (
          `🌤️ **Weather in ${w.city}, ${w.country}** *(Direct Telemetry)*:\n\n` +
          `• **Temperature:** **${w.temperature}°C** (Feels like: ${w.apparentTemperature}°C)\n` +
          `• **Condition:** ${w.weatherCondition} ${w.weatherIcon || "☀️"}\n` +
          `• **Humidity:** ${w.humidity}%\n` +
          `• **Wind Speed:** ${w.windSpeed} km/h`
        );
      }
    } catch (e) {
      console.warn("Emergency fallback error:", e);
    }

    return "⚠️ Google's AI servers were briefly busy. Please ask your weather question again (for example: *\"Forecast for Bangalore for next 5 days\"* or *\"Weather in Mumbai\"*).";
  }
}
