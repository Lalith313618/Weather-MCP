import { Router } from "express";
import { WeatherController } from "../controllers/weather.controller.js";

const router = Router();

router.get("/weather", WeatherController.getWeather);
router.get("/weather/forecast", WeatherController.getForecast);
router.get("/weather/history", WeatherController.getHistory);

export default router;
