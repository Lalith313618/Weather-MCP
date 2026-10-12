import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./config/db.js";
import weatherRoutes from "./routes/weather.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Weather API is running"
  });
});

app.use("/api", weatherRoutes);
app.use("/api", chatRoutes);
console.log("Weather and Chat routes active");

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Weather API running on port ${PORT} (http://localhost:${PORT})`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();