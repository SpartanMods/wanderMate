import type { WeatherCondition } from "./types";

const BASE = "https://api.weather.gov";
/** NWS requires a reachable contact in the User-Agent; this is the project inbox. */
const DEFAULT_NWS_CONTACT = "wandermate@gmail.com";

function userAgent(): string {
  const contact = process.env.NWS_USER_AGENT_CONTACT || DEFAULT_NWS_CONTACT;
  return `WanderMate/1.0 (${contact})`;
}

export async function fetchWeatherForCoords(
  lat: number,
  lng: number
): Promise<WeatherCondition | null> {
  try {
    const pointRes = await fetch(
      `${BASE}/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
      {
        headers: { "User-Agent": userAgent(), Accept: "application/geo+json" },
        next: { revalidate: 3600 },
      }
    );
    if (!pointRes.ok) return null;
    const point = await pointRes.json();
    const forecastUrl: string | undefined = point?.properties?.forecast;
    if (!forecastUrl) return null;

    const forecastRes = await fetch(forecastUrl, {
      headers: { "User-Agent": userAgent(), Accept: "application/geo+json" },
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
