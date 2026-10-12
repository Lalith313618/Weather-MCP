import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WeatherApiClient } from "../services/weather.service.js";

export function registerCompareTool(server: McpServer): void {
  server.tool(
    "compare_weather",
    "Compare weather parameters (temperature, wind, condition) across two or more cities",
    {
      cities: z.array(z.string().min(1)).min(2).describe("List of city names to compare (e.g. ['Chennai', 'Bangalore'])")
    },
    async ({ cities }) => {
      try {
        const result = await WeatherApiClient.compareWeather(cities);
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
              text: `Error comparing weather for cities: ${error.message}`
            }
          ]
        };
      }
    }
  );
}
