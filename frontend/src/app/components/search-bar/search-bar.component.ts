import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {
  loading = input<boolean>(false);
  search = output<string>();

  cityName = signal('');
  popularCities = ['Chennai', 'Bengaluru', 'Mumbai', 'Delhi', 'London', 'Tokyo'];

  onSubmit(): void {
    const query = this.cityName().trim();
    if (query) {
      this.search.emit(query);
    }
  }

  selectCity(city: string): void {
    this.cityName.set(city);
    this.search.emit(city);
  }
}
