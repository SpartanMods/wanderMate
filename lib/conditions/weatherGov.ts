import type { WeatherCondition } from "./types";

const BASE = "https://api.weather.gov";
const UA = "WanderMate/1.0 (contact@wandermate.app)";

export async function fetchWeatherForCoords(
  lat: number,
  lng: number
): Promise<WeatherCondition | null> {
  try {
    // Step 1: resolve grid point from coordinates
    const pointRes = await fetch(
      `${BASE}/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
      {
        headers: { "User-Agent": UA, Accept: "application/geo+json" },
        next: { revalidate: 3600 },
      }
    );
    if (!pointRes.ok) return null;
    const point = await pointRes.json();
    const forecastUrl: string | undefined = point?.properties?.forecast;
    if (!forecastUrl) return null;

    // Step 2: get the hourly or daily forecast
    const forecastRes = await fetch(forecastUrl, {
      headers: { "User-Agent": UA, Accept: "application/geo+json" },
      next: { revalidate: 3600 },
    });
    if (!forecastRes.ok) return null;
    const forecast = await forecastRes.json();
    const period = forecast?.properties?.periods?.[0];
    if (!period) return null;

    return {
      shortForecast: period.shortForecast as string,
      temperature: period.temperature as number,
      temperatureUnit: period.temperatureUnit as string,
      windSpeed: period.windSpeed as string,
      icon: (period.icon as string | null) ?? null,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
