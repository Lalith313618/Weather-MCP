import type { Request, Response, NextFunction } from "express";
import { WeatherService } from "../services/weather.service.js";
import { WeatherSearch } from "../models/weatherSearch.model.js";

export class WeatherController {
  public static async getWeather(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = req.query.city;

      if (!city || typeof city !== "string" || !city.trim()) {
        res.status(400).json({
          success: false,
          error: "City query parameter is required. Example: /api/weather?city=Chennai"
        });
        return;
      }

      const weather = await WeatherService.getCurrentWeather(city.trim());
      res.json(weather);
    } catch (error) {
      next(error);
    }
  }

  public static async getForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = req.query.city;

      if (!city || typeof city !== "string" || !city.trim()) {
        res.status(400).json({
          success: false,
          error: "City query parameter is required. Example: /api/weather/forecast?city=Chennai"
        });
        return;
      }

      const forecast = await WeatherService.getDailyForecast(city.trim());
      res.json(forecast);
    } catch (error) {
      next(error);
    }
  }

  public static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limitParam = req.query.limit;
      const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

      const history = await WeatherSearch.find()
        .sort({ searchedAt: -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        count: history.length,
        history
      });
    } catch (error) {
      next(error);
    }
  }
}
