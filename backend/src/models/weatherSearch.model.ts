import { Schema, model, Document } from "mongoose";

export interface IWeatherSearch extends Document {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  weatherCode: number;
  weatherCondition: string;
  windSpeed: number;
  searchedAt: Date;
}

const weatherSearchSchema = new Schema<IWeatherSearch>(
  {
    city: { type: String, required: true, trim: true, index: true },
    country: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    temperature: { type: Number, required: true },
    weatherCode: { type: Number, required: true },
    weatherCondition: { type: String, required: true },
    windSpeed: { type: Number, required: true },
    searchedAt: { type: Date, default: Date.now, index: true }
  },
  {
    versionKey: false
  }
);

export const WeatherSearch = model<IWeatherSearch>("WeatherSearch", weatherSearchSchema);
