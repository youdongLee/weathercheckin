export interface DayWeather {
  date: string;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  rainChance: number;
  windSpeed: number;
  conditions: string[];
  icon: string;
}
