// Synthetic upstream responses shaped to match what the adapters read.
// They are NOT recorded from the live APIs (the cloud dev environment can't
// reach them yet, see #20). Replace with recorded responses once access is
// enabled; #11 tracks verifying the real USFS/BLM schemas.

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

export const usfsStage2 = {
  features: [
    { attributes: { RESTRICTI1: "Stage 1", FORESTNAME: "White River NF", UNITNAME: null, STAGE: null } },
    { attributes: { RESTRICTI1: "Stage 2 Fire Restrictions", FORESTNAME: "Grand Mesa NF", UNITNAME: null, STAGE: null } },
  ],
};

export const usfsNone = { features: [] };

export const usfsUnparseable = {
  features: [
    { attributes: { RESTRICTI1: "Region 2 Order 2026-14", FORESTNAME: "White River NF", UNITNAME: null, STAGE: null } },
  ],
};

export const blmNone = { features: [] };

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
