// A tiny geohash encoder (standard base32) — pure, no deps. Used only to turn a
// trip's PUBLIC destination coordinates into a coarse area key for Nearby
// matching. We never encode a user's device location; precision is kept low so
// the stored value is a region, not a precise point.
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Encode (lat, lng) to a geohash of the given precision. precision 5 ≈ ±2.4 km,
// precision 3 ≈ ±78 km (region). Returns "" for non-finite input.
export function encodeGeohash(lat: number, lng: number, precision = 5): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";
  let latMin = -90,
    latMax = 90,
    lngMin = -180,
    lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lngMid = (lngMin + lngMax) / 2;
      if (lng >= lngMid) {
        idx = idx * 2 + 1;
        lngMin = lngMid;
      } else {
        idx = idx * 2;
        lngMax = lngMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}
