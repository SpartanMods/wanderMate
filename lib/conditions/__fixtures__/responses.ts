// Synthetic weather.gov and RIDB responses shaped to match what the adapters
// read. They are NOT recorded from the live APIs; #28 tracks replacing them.
// Fire-restriction fixtures are real recorded responses: see ./fire/ and
// scripts/record-fire-fixtures.mjs.

export const FORECAST_URL = "https://api.weather.gov/gridpoints/GJT/100,50/forecast";

export const weatherPoints = {
  properties: { forecast: FORECAST_URL },
};

export const weatherForecast = {
  properties: {
    periods: [
      {
        shortForecast: "Mostly Sunny",
        temperature: 68,
        temperatureUnit: "F",
        windSpeed: "5 to 10 mph",
        icon: "https://api.weather.gov/icons/land/day/few",
      },
    ],
  },
};

export const weatherForecastNoPeriods = { properties: { periods: [] } };

export const ridbFacilities = {
  RECDATA: [
    {
      FacilityID: 233512,
      FacilityName: "Example Campground",
      FacilityTypeDescription: "Campground",
      Reservable: true,
      FacilityAdaAccess: "Open",
    },
  ],
};
