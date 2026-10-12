import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { registerWeatherTool } from "./tools/weather.tool.js";
import { registerForecastTool } from "./tools/forecast.tool.js";
import { registerHistoryTool } from "./tools/history.tool.js";
import { registerCompareTool } from "./tools/compare.tool.js";

dotenv.config();

const server = new McpServer({
  name: "weather-mcp-server",
  version: "1.0.0"
});

registerWeatherTool(server);
registerForecastTool(server);
registerHistoryTool(server);
registerCompareTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running via stdio");
}

main().catch((error) => {
  console.error("Fatal error in Weather MCP Server:", error);
  process.exit(1);
});
