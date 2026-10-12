import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WeatherApiClient } from "../services/weather.service.js";

export function registerHistoryTool(server: McpServer): void {
  server.tool(
    "get_weather_history",
    "Get recent weather search history saved in the MongoDB database",
    {
      limit: z.number().int().min(1).max(50).optional().default(10).describe("Number of history items to retrieve (default: 10)")
    },
    async ({ limit }) => {
      try {
        const result = await WeatherApiClient.getHistory(limit);
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
              text: `Error retrieving search history: ${error.message}`
            }
          ]
        };
      }
    }
  );
}
