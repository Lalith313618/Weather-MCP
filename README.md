# Weather MCP

A full-stack weather application with an AI chat assistant and Model Context Protocol (MCP) support.

---

## 1. Current Working Status

The entire system is **up and running**:

| Component | URL / Port | Status | What It Does |
| :--- | :--- | :--- | :--- |
| **Frontend** | `http://localhost:4200` | **Working** | Angular web app with live weather dashboard & AI chat |
| **Backend** | `http://localhost:5001` | **Working** | Express API connecting to Open-Meteo & Gemini AI |
| **Database** | `mongodb://127.0.0.1:27017` | **Connected** | Saves searched cities and chat history |
| **AI Assistant** | Inside Web App & MCP | **Active** | Answers weather questions using Google Gemini Flash |
| **MCP Server** | `stdio` | **Ready** | Connects external AI agents (Claude, Cursor) to weather tools |

---

## 2. What Works Currently

• **Any City Worldwide:** Searches any city dynamically using Open-Meteo geocoding (no hardcoded cities or API limits).  
• **Current Weather:** Shows live temperature (°C), feels-like, humidity, wind speed, and weather condition badges.  
• **7-Day Forecast:** Displays daily high/low temperatures and conditions.  
• **Yesterday's Weather:** Can answer questions and fetch meteorological data for yesterday.  
• **Clean AI Chat:** Gemini automatically triggers weather tools. Chat answers are clean and structured (no `#` or `**` raw symbols).  
• **History & Persistence:** Searches and chat messages are saved in MongoDB. Includes a "Clear Chat" button.  

---

## 3. How to Run

### Step 1: Start Backend
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:5001`)*

### Step 2: Start Frontend
```bash
cd frontend
npm install
npm start
```
*(Runs on `http://localhost:4200`)*

### Step 3: (Optional) Run MCP Server for Claude / Cursor
```bash
cd mcp-server
npm install
npm run build
npm start
```

---

## 4. MCP Tools Available

If you connect Claude Desktop or Cursor to `mcp-server`, these 4 tools are available:

1. `get_weather`: Get live weather for any city.
2. `get_weather_forecast`: Get 7-day forecast for any city.
3. `get_weather_history`: Get recent searches from MongoDB.
4. `compare_weather`: Compare weather between two or more cities.

---

## 5. Environment Settings

* **Backend (`backend/.env`):**
  ```env
  PORT=5001
  MONGODB_URI=mongodb://127.0.0.1:27017/weather_mcp
  GEMINI_API_KEY=your_key_here
  ```
* **MCP Server (`mcp-server/.env`):**
  ```env
  BACKEND_URL=http://localhost:5001/api
  ```
