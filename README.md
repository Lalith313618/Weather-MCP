# Weather MCP - Full-Stack Weather Intelligence Architecture

Weather-MCP is an end-to-end full-stack weather application built using the **MEAN stack** (MongoDB, Express.js, Angular 22, Node.js) and the official **Model Context Protocol (MCP) TypeScript SDK**. It provides real-time weather telemetries, 7-day forecasts, persistent search history in MongoDB, and exposes standardized MCP tools for AI agents and LLM clients.

---

## 1. Project Overview

The project bridges classical web application capabilities with modern AI agent workflows:
- **Web Users** can search any city in the world, view instant weather conditions, inspect 7-day forecasts, review MongoDB-backed recent search history, and interact with an embedded MCP AI Assistant.
- **AI Agents / LLMs** (e.g., Claude Desktop, Cursor, Antigravity) can connect directly to the `mcp-server` over standard I/O (stdio) to invoke tools for fetching weather, generating forecasts, comparing multiple cities, and retrieving search logs.

---

## 2. Features

- **Accurate Real-Time Weather**: Live temperature, apparent ("feels-like") temperature, humidity, wind speed, and WMO weather condition badges powered by Open-Meteo (no API key required).
- **7-Day Daily Forecast**: High/low temperatures, weather icons, condition descriptions, and maximum wind speeds.
- **MongoDB Search History**: Every searched location is automatically indexed and persisted in MongoDB.
- **Modular Angular 22 Frontend**: Built with standalone components, Angular Signals, reactive `HttpClient`, and separate component-scoped CSS files.
- **MCP Protocol Server**: Exposes 4 standardized MCP tools with Zod schema validation over JSON-RPC stdio.
- **Optional Conversational AI Assistant**: Allows natural language queries like *"Compare Chennai and Bangalore"* or *"What cities did I search recently?"*.
- **Attractive Glassmorphic Design**: Curated dark theme palette with cyan, sapphire, and amber highlights, smooth hover transitions, and responsive mobile-first layouts.

---

## 3. Architecture

```
+------------------------------------------------------------------+
|                            AI Client                             |
|          (Claude Desktop / Cursor / Antigravity Agent)           |
+---------------------------------+--------------------------------+
                                  |
                   JSON-RPC over stdio (MCP Protocol)
                                  |
                                  v
+------------------------------------------------------------------+
|                      MCP Server (mcp-server)                     |
|  - get_weather         - get_weather_forecast                   |
|  - get_weather_history - compare_weather                         |
+---------------------------------+--------------------------------+
                                  |
                            HTTP REST API
                                  |
                                  v
+------------------------------------------------------------------+
|                    Express Backend (backend)                     |
|  - GET /                                                         |
|  - GET /api/weather?city=...                                     |
|  - GET /api/weather/forecast?city=...                            |
|  - GET /api/weather/history                                      |
+-------------------+------------------------------+---------------+
                    |                              |
         Mongoose DB Persistence          External HTTP Telemetry
                    |                              |
                    v                              v
           +-----------------+           +--------------------+
           | MongoDB Server  |           |   Open-Meteo API   |
           |  (weather_mcp)  |           | (Geocoding & WMO)  |
           +-----------------+           +--------------------+
                    ^
                    | (Data displayed to web user)
                    |
+-------------------+----------------------------------------------+
|                    Angular Frontend (frontend)                   |
|  - Header Component            - Search Bar Component            |
|  - Current Weather Component   - Forecast Component              |
|  - Search History Component    - AI Chat Assistant               |
+------------------------------------------------------------------+
```

---

## 4. Technologies

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | Angular 22+, TypeScript, Angular Signals, Angular HttpClient, Vanilla CSS |
| **Backend** | Node.js, Express 5, TypeScript, Mongoose, CORS, dotenv |
| **Database** | MongoDB (`mongodb://127.0.0.1:27017/weather_mcp`) |
| **MCP** | Model Context Protocol TypeScript SDK (`@modelcontextprotocol/sdk`), Zod |
| **Weather API**| Open-Meteo Geocoding & Forecast APIs (No API key required) |

---

## 5. Folder Structure

```
Weather-MCP/
├── backend/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/               # Database connection (db.ts)
│   │   ├── controllers/          # WeatherController (weather.controller.ts)
│   │   ├── middleware/           # Error handler & 404 (errorHandler.ts)
│   │   ├── models/               # MongoDB schema (weatherSearch.model.ts)
│   │   ├── routes/               # Express routes (weather.routes.ts)
│   │   ├── services/             # Open-Meteo integration (weather.service.ts)
│   │   ├── utils/                # WMO weather code mapping (weatherCodes.ts)
│   │   └── server.ts             # Express entry point
│   ├── .env                      # PORT and MONGODB_URI
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # Angular 22 Client Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/       # Reusable components with dedicated CSS
│   │   │   │   ├── header/       # header.component.ts & .css
│   │   │   │   ├── search-bar/   # search-bar.component.ts & .css
│   │   │   │   ├── current-weather/ # current-weather.component.ts & .css
│   │   │   │   ├── forecast/     # forecast.component.ts & .css
│   │   │   │   ├── search-history/  # search-history.component.ts & .css
│   │   │   │   └── ai-chat/      # ai-chat.component.ts & .css
│   │   │   ├── models/           # TypeScript interfaces (weather.model.ts)
│   │   │   ├── services/         # Angular HttpClient (weather.service.ts)
│   │   │   ├── app.ts            # Root component logic
│   │   │   ├── app.html          # Root template
│   │   │   └── app.css           # Root styles
│   │   ├── index.html            # Web entry point
│   │   ├── main.ts               # Angular bootstrap
│   │   └── styles.css            # Global CSS variables & resets
│   ├── package.json
│   └── tsconfig.json
│
├── mcp-server/                   # Model Context Protocol Server
│   ├── src/
│   │   ├── services/             # WeatherApiClient (weather.service.ts)
│   │   ├── tools/                # MCP tool definitions
│   │   │   ├── weather.tool.ts   # get_weather tool
│   │   │   ├── forecast.tool.ts  # get_weather_forecast tool
│   │   │   ├── history.tool.ts   # get_weather_history tool
│   │   │   └── compare.tool.ts   # compare_weather tool
│   │   └── index.ts              # MCP stdio server bootstrap
│   ├── .env                      # BACKEND_URL
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore                    # Global git ignore
└── README.md                     # Documentation
```

---

## 6. Installation

Ensure you have **Node.js (v18+)** and **MongoDB** installed and running on your local machine.

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Install MCP Server Dependencies
```bash
cd ../mcp-server
npm install
```

---

## 7. Environment Variables

### Backend (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/weather_mcp
```

### MCP Server (`mcp-server/.env`):
```env
BACKEND_URL=http://localhost:5000/api
```

---

## 8. Running the Application

### Running the Backend
```bash
cd backend
npm run dev
```
Terminal output:
```
MongoDB connected successfully
Weather API running on port 5000
```

### Running the Angular Frontend
```bash
cd frontend
npm start
```
Open your browser at: `http://localhost:4200`

### Running the MCP Server
```bash
cd mcp-server
npm run build
npm start
```
The server connects via `stdio` and waits for JSON-RPC messages from MCP clients.

---

## 9. Backend API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check endpoint |
| `GET` | `/api/weather?city=Chennai` | Get current weather for a city |
| `GET` | `/api/weather/forecast?city=Chennai` | Get 7-day daily forecast |
| `GET` | `/api/weather/history?limit=10` | Get recent search history from MongoDB |

---

## 10. Model Context Protocol (MCP) Tools

### 1. `get_weather`
- **Description**: Get current real-time weather information for any city.
- **Input Parameters**:
  ```json
  {
    "city": "Chennai"
  }
  ```

### 2. `get_weather_forecast`
- **Description**: Get daily weather forecast up to 7 days for any city.
- **Input Parameters**:
  ```json
  {
    "city": "Chennai"
  }
  ```

### 3. `get_weather_history`
- **Description**: Get recent weather search history saved in the MongoDB database.
- **Input Parameters**:
  ```json
  {
    "limit": 10
  }
  ```

### 4. `compare_weather`
- **Description**: Compare temperature, conditions, and wind speed across two or more cities.
- **Input Parameters**:
  ```json
  {
    "cities": ["Chennai", "Bangalore"]
  }
  ```

---

## 11. Connecting to AI Clients (Claude Desktop / Cursor)

Add the Weather MCP server to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": [
        "C:\\Users\\gouda\\OneDrive\\Desktop\\Weather-MCP\\mcp-server\\dist\\index.js"
      ]
    }
  }
}
```

Now you can prompt your AI:
- *"What is the current weather in Chennai?"*
- *"Give me the weather forecast for Bangalore."*
- *"Compare the weather between Chennai and Bangalore."*
- *"What cities have been searched recently?"*

---

## 12. Verification & Build Commands

All three sub-projects build cleanly without TypeScript or compilation errors:

- **Backend**: `cd backend && npm run build`
- **Frontend**: `cd frontend && npx ng build`
- **MCP Server**: `cd mcp-server && npm run build`
