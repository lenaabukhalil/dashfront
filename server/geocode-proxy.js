/**
 * Geocoding proxy: /api/autocomplete and /api/geocode.
 * Calls Photon (Komoot) server-side with proper User-Agent to avoid CORS/rate limits.
 * Caches responses 10 min; rate limits per IP.
 */
const PHOTON_BASE = "https://photon.komoot.io/api/";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window per IP

const cache = new Map();
const rateLimit = new Map(); // IP -> { count, resetAt }

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimit.get(ip);
  if (!entry) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimit.set(ip, entry);
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

function photonToSuggestion(feature) {
  const [lon, lat] = feature.geometry?.coordinates ?? [0, 0];
  const p = feature.properties || {};
  const name = p.name || "";
  const street = p.street || "";
  const city = p.city || p.state || "";
  const country = p.country || "";
  const countrycode = (p.countrycode || "").toLowerCase();
  const display_name = [name, street, city, country].filter(Boolean).join(", ") || `${lat},${lon}`;
  return {
    lat: String(lat),
    lon: String(lon),
    display_name,
    address: {
      road: street || undefined,
      city: city || undefined,
      state: p.state || undefined,
      country: country || undefined,
      country_code: countrycode || undefined,
    },
  };
}

function cacheKey(params) {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

async function fetchPhoton(params) {
  const url = `${PHOTON_BASE}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ION-EV-Charging-Dashboard-Geocode/1.0",
    },
  });
  if (!res.ok) throw new Error(`Photon responded with ${res.status}`);
  const data = await res.json();
  const features = data?.features ?? [];
  return features.map(photonToSuggestion);
}

function handleAutocomplete(req, res) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const q = (req.query.q ?? "").trim();
  const limit = Math.min(10, Math.max(1, parseInt(req.query.limit, 10) || 8));
  const lat = req.query.lat !== undefined ? parseFloat(req.query.lat) : undefined;
  const lon = req.query.lon !== undefined ? parseFloat(req.query.lon) : undefined;
  const lang = req.query.lang || "ar,en";

  const params = { q, limit: String(limit) };
  if (lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon)) {
    params.lat = String(lat);
    params.lon = String(lon);
  }
  if (lang) params.lang = lang.split(",")[0] || "en";

  const key = `autocomplete:${cacheKey(params)}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(cached.data));
  }

  fetchPhoton(params)
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    })
    .catch((err) => {
      console.error("Photon autocomplete error:", err.message);
      res.status(502).json({ error: "Service temporarily unavailable. Please try again." });
    });
}

function handleGeocode(req, res) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const q = (req.query.q ?? "").trim();
  const limit = Math.min(5, Math.max(1, parseInt(req.query.limit, 10) || 1));
  const params = { q, limit: String(limit), lang: "en" };

  const key = `geocode:${cacheKey(params)}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(cached.data));
  }

  fetchPhoton(params)
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    })
    .catch((err) => {
      console.error("Photon geocode error:", err.message);
      res.status(502).json({ error: "Service temporarily unavailable. Please try again." });
    });
}

export { handleAutocomplete, handleGeocode };
