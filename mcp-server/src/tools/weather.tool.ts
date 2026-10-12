import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WeatherApiClient } from "../services/weather.service.js";

export function registerWeatherTool(server: McpServer): void {
  server.tool(
    "get_weather",
    "Get the current real-time weather information for any city",
    {
      city: z.string().min(1).describe("The name of the city (e.g. 'Chennai', 'Tokyo', 'London')")
    },
    async ({ city }) => {
      try {
        const result = await WeatherApiClient.getCurrentWeather(city);
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
              text: `Error retrieving weather for '${city}': ${error.message}`
            }
          ]
        };
      }
    }
  );
}
