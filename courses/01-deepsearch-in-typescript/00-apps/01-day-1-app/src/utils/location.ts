import { geolocation } from "@vercel/functions";

export interface UserLocation {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
}

export function getUserLocation(request: Request): UserLocation {
  // Mock location data for development
  if (process.env.NODE_ENV === "development") {
    // Add mock headers for development
    const mockRequest = new Request(request.url, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        "x-vercel-ip-country": "BR",
        "x-vercel-ip-country-region": "PE",
        "x-vercel-ip-city": "Recife",
        "x-vercel-ip-latitude": "-8.0476",
        "x-vercel-ip-longitude": "-34.8770",
      },
    });
    
    const { longitude, latitude, city, country } = geolocation(mockRequest);
    return { longitude, latitude, city, country };
  }

  // Use real geolocation in production
  const { longitude, latitude, city, country } = geolocation(request);
  return { longitude, latitude, city, country };
}

export function formatLocationContext(location: UserLocation): string {
  if (!location.city && !location.country) {
    return "";
  }

  const locationParts = [];
  if (location.city) locationParts.push(location.city);
  if (location.country) locationParts.push(location.country);

  return `USER LOCATION: ${locationParts.join(", ")}`;
} 