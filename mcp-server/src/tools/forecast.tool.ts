import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WeatherApiClient } from "../services/weather.service.js";

export function registerForecastTool(server: McpServer): void {
  server.tool(
    "get_weather_forecast",
    "Get daily weather forecast up to 7 days for any city",
    {
      city: z.string().min(1).describe("The name of the city (e.g. 'Chennai', 'Paris')")
    },
    async ({ city }) => {
      try {
        const result = await WeatherApiClient.getForecast(city);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error retrieving forecast for '${city}': ${error.message}`
            }
          ]
        };
      }
    }
  );
}
