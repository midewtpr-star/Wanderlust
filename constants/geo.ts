// Trippl — curated geography for the Travel Passport (B2). Countries + continents
// are DERIVED, not invented: a trip contributes to the country/continent counters
// only when its destination matches a curated place (by name, or by proximity to
// the curated coordinates). Unknown destinations simply don't count — nothing is
// estimated. (Reverse-geocoding every arbitrary destination is a documented future
// enhancement; this covers the common cases + the LA example honestly.)

export type Continent =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Asia"
  | "Oceania";

// ISO-3166 alpha-2 → continent (covers the curated destinations + landmark set).
export const CONTINENT_BY_COUNTRY: Record<string, Continent> = {
  US: "North America", CA: "North America", MX: "North America",
  BR: "South America", PE: "South America", AR: "South America", CO: "South America", CL: "South America",
  GB: "Europe", FR: "Europe", ES: "Europe", IT: "Europe", DE: "Europe", NL: "Europe",
  GR: "Europe", PT: "Europe", IE: "Europe", IS: "Europe", CZ: "Europe", HR: "Europe", TR: "Europe",
  AE: "Asia", IN: "Asia", CN: "Asia", JP: "Asia", SG: "Asia", MY: "Asia", TH: "Asia", ID: "Asia", KH: "Asia", VN: "Asia",
  ZA: "Africa", EG: "Africa", MA: "Africa", KE: "Africa", TZ: "Africa",
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania",
};

export type CuratedPlace = {
  names: string[]; // lower-case name variants to match a destination against
  lat: number;
  lng: number;
  countryCode: string;
  countryName: string;
};

// A curated set of common trip destinations (name + coords + country).
export const CURATED_PLACES: CuratedPlace[] = [
  { names: ["los angeles", "la", "l.a."], lat: 34.0522, lng: -118.2437, countryCode: "US", countryName: "United States" },
  { names: ["new york", "nyc", "new york city"], lat: 40.7128, lng: -74.006, countryCode: "US", countryName: "United States" },
  { names: ["san francisco", "sf"], lat: 37.7749, lng: -122.4194, countryCode: "US", countryName: "United States" },
  { names: ["chicago"], lat: 41.8781, lng: -87.6298, countryCode: "US", countryName: "United States" },
  { names: ["miami"], lat: 25.7617, lng: -80.1918, countryCode: "US", countryName: "United States" },
  { names: ["las vegas", "vegas"], lat: 36.1699, lng: -115.1398, countryCode: "US", countryName: "United States" },
  { names: ["seattle"], lat: 47.6062, lng: -122.3321, countryCode: "US", countryName: "United States" },
  { names: ["austin"], lat: 30.2672, lng: -97.7431, countryCode: "US", countryName: "United States" },
  { names: ["denver"], lat: 39.7392, lng: -104.9903, countryCode: "US", countryName: "United States" },
  { names: ["new orleans", "nola"], lat: 29.9511, lng: -90.0715, countryCode: "US", countryName: "United States" },
  { names: ["honolulu", "hawaii", "maui"], lat: 21.3069, lng: -157.8583, countryCode: "US", countryName: "United States" },
  { names: ["toronto"], lat: 43.6532, lng: -79.3832, countryCode: "CA", countryName: "Canada" },
  { names: ["vancouver"], lat: 49.2827, lng: -123.1207, countryCode: "CA", countryName: "Canada" },
  { names: ["mexico city", "cdmx", "mexico"], lat: 19.4326, lng: -99.1332, countryCode: "MX", countryName: "Mexico" },
  { names: ["cancun", "cancún", "tulum"], lat: 21.1619, lng: -86.8515, countryCode: "MX", countryName: "Mexico" },
  { names: ["rio de janeiro", "rio"], lat: -22.9068, lng: -43.1729, countryCode: "BR", countryName: "Brazil" },
  { names: ["buenos aires"], lat: -34.6037, lng: -58.3816, countryCode: "AR", countryName: "Argentina" },
  { names: ["lima"], lat: -12.0464, lng: -77.0428, countryCode: "PE", countryName: "Peru" },
  { names: ["london"], lat: 51.5072, lng: -0.1276, countryCode: "GB", countryName: "United Kingdom" },
  { names: ["paris"], lat: 48.8566, lng: 2.3522, countryCode: "FR", countryName: "France" },
  { names: ["barcelona"], lat: 41.3874, lng: 2.1686, countryCode: "ES", countryName: "Spain" },
  { names: ["madrid"], lat: 40.4168, lng: -3.7038, countryCode: "ES", countryName: "Spain" },
  { names: ["rome", "roma"], lat: 41.9028, lng: 12.4964, countryCode: "IT", countryName: "Italy" },
  { names: ["milan", "milano"], lat: 45.4642, lng: 9.19, countryCode: "IT", countryName: "Italy" },
  { names: ["amsterdam"], lat: 52.3676, lng: 4.9041, countryCode: "NL", countryName: "Netherlands" },
  { names: ["berlin"], lat: 52.52, lng: 13.405, countryCode: "DE", countryName: "Germany" },
  { names: ["lisbon", "lisboa"], lat: 38.7223, lng: -9.1393, countryCode: "PT", countryName: "Portugal" },
  { names: ["athens"], lat: 37.9838, lng: 23.7275, countryCode: "GR", countryName: "Greece" },
  { names: ["santorini", "oia"], lat: 36.3932, lng: 25.4615, countryCode: "GR", countryName: "Greece" },
  { names: ["dublin"], lat: 53.3498, lng: -6.2603, countryCode: "IE", countryName: "Ireland" },
  { names: ["reykjavik", "reykjavík", "iceland"], lat: 64.1466, lng: -21.9426, countryCode: "IS", countryName: "Iceland" },
  { names: ["istanbul"], lat: 41.0082, lng: 28.9784, countryCode: "TR", countryName: "Turkey" },
  { names: ["dubai"], lat: 25.2048, lng: 55.2708, countryCode: "AE", countryName: "United Arab Emirates" },
  { names: ["tokyo"], lat: 35.6762, lng: 139.6503, countryCode: "JP", countryName: "Japan" },
  { names: ["kyoto"], lat: 35.0116, lng: 135.7681, countryCode: "JP", countryName: "Japan" },
  { names: ["bangkok"], lat: 13.7563, lng: 100.5018, countryCode: "TH", countryName: "Thailand" },
  { names: ["singapore"], lat: 1.3521, lng: 103.8198, countryCode: "SG", countryName: "Singapore" },
  { names: ["bali", "ubud", "canggu"], lat: -8.3405, lng: 115.092, countryCode: "ID", countryName: "Indonesia" },
  { names: ["sydney"], lat: -33.8688, lng: 151.2093, countryCode: "AU", countryName: "Australia" },
  { names: ["melbourne"], lat: -37.8136, lng: 144.9631, countryCode: "AU", countryName: "Australia" },
  { names: ["cape town"], lat: -33.9249, lng: 18.4241, countryCode: "ZA", countryName: "South Africa" },
  { names: ["cairo"], lat: 30.0444, lng: 31.2357, countryCode: "EG", countryName: "Egypt" },
  { names: ["marrakech", "marrakesh"], lat: 31.6295, lng: -7.9811, countryCode: "MA", countryName: "Morocco" },
];

export type ResolvedGeo = { countryCode: string; countryName: string; continent: Continent };

function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Haversine-ish squared degree distance (good enough for a ~1.5° proximity match).
function near(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = aLat - bLat;
  const dLng = (aLng - bLng) * Math.cos((aLat * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

// Resolve a destination to a country + continent, or null when unknown (uncounted).
export function resolveGeo(
  city: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): ResolvedGeo | null {
  const c = city ? norm(city) : "";
  // 1) name match (city contains a curated name, or vice-versa)
  if (c) {
    for (const p of CURATED_PLACES) {
      if (p.names.some((n) => c === n || c.includes(n) || n.includes(c))) {
        return { countryCode: p.countryCode, countryName: p.countryName, continent: CONTINENT_BY_COUNTRY[p.countryCode] };
      }
    }
  }
  // 2) proximity match (within ~1.5°)
  if (typeof lat === "number" && typeof lng === "number") {
    let best: CuratedPlace | null = null;
    let bestD = 1.5 * 1.5;
    for (const p of CURATED_PLACES) {
      const d = near(lat, lng, p.lat, p.lng);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) return { countryCode: best.countryCode, countryName: best.countryName, continent: CONTINENT_BY_COUNTRY[best.countryCode] };
  }
  return null;
}

// --- Equirectangular projection for the passport world map. ---
// lng -180..180 → x 0..1 ; lat 90..-90 → y 0..1.
export function project(lat: number, lng: number): { x: number; y: number } {
  return { x: (lng + 180) / 360, y: (90 - lat) / 180 };
}
