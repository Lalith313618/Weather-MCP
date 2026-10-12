import { Component, input } from '@angular/core';
import { CurrentWeather } from '../../models/weather.model';

@Component({
  selector: 'app-current-weather',
  standalone: true,
  templateUrl: './current-weather.component.html',
  styleUrl: './current-weather.component.css'
})
export class CurrentWeatherComponent {
  data = input<CurrentWeather | null>(null);

  getWeatherImage(code: number): string {
    if (code === 0) return 'icons/clear-day.svg';
    if (code === 1 || code === 2) return 'icons/partly-cloudy.svg';
    if (code === 3) return 'icons/cloudy.svg';
    if (code === 45 || code === 48) return 'icons/fog.svg';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'icons/rain.svg';
    if (code >= 71 && code <= 77) return 'icons/snow.svg';
    if (code >= 95) return 'icons/thunderstorm.svg';
    return 'icons/partly-cloudy.svg';
  }

  formatTime(isoString: string): string {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return isNaN(date.getTime())
      ? isoString
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
