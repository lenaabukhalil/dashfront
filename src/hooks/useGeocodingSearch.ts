import { useState, useRef, useCallback, useEffect } from "react";
import { normalizeArabic } from "@/lib/arabic";

// Jordan geographic center (not Amman-biased)
const JORDAN_CENTER_LAT = 31.24;
const JORDAN_CENTER_LON = 36.51;

// Jordan bounding box (loose — covers all of Jordan)
const JORDAN_BBOX_SOUTH = 29.18;
const JORDAN_BBOX_NORTH = 33.37;
const JORDAN_BBOX_WEST  = 34.96;
const JORDAN_BBOX_EAST  = 39.30;

// Nominatim viewbox string (lon_min,lat_max,lon_max,lat_min format)
const NOMINATIM_VIEWBOX = `${JORDAN_BBOX_WEST},${JORDAN_BBOX_NORTH},${JORDAN_BBOX_EAST},${JORDAN_BBOX_SOUTH}`;

const PHOTON_BASE     = "https://photon.komoot.io/api/";
const NOMINATIM_BASE  = "https://nominatim.openstreetmap.org/search";
const DEBOUNCE_MS     = 350;
const DISPLAY_LIMIT   = 8;
const NOMINATIM_UA    = "IONDashboard/1.0 (Location search)";
const FRIENDLY_ERROR  = "Service temporarily unavailable. Please try again.";

export type GeocodingPhase = "idle" | "JO_BIASED" | "GLOBAL_FALLBACK";

export interface GeocodingSuggestion {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export interface UseGeocodingSearchOptions {
  onLocationSelect: (lat: string, lng: string) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isInJordanBbox(lat: number, lon: number): boolean {
  return (
    lat >= JORDAN_BBOX_SOUTH &&
    lat <= JORDAN_BBOX_NORTH &&
    lon >= JORDAN_BBOX_WEST  &&
    lon <= JORDAN_BBOX_EAST
  );
}

function isJordanResult(s: GeocodingSuggestion): boolean {
  const code    = (s.address?.country_code ?? "").toLowerCase();
  const country = (s.address?.country ?? "").toLowerCase();
  if (code === "jo" || code === "jor") return true;
  if (country.includes("jordan") || /أردن|الاردن/.test(country)) return true;
  // Fallback: check if coordinates are inside Jordan bounding box
  const lat = Number(s.lat);
  const lon = Number(s.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return isInJordanBbox(lat, lon);
  }
  return false;
}

function dedupeByCoords(list: GeocodingSuggestion[]): GeocodingSuggestion[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const key = `${Number(s.lat).toFixed(4)},${Number(s.lon).toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePhoton(data: unknown): GeocodingSuggestion[] {
  const features = (data as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) return [];
  return features
    .map((f: any) => {
      const p      = f.properties || {};
      const coords = f.geometry?.coordinates;
      const lon    = Array.isArray(coords) ? coords[0] : null;
      const lat    = Array.isArray(coords) ? coords[1] : null;
      if (typeof lat !== "number" || typeof lon !== "number") return null;

      const name    = p.name || p.street || p.city || p.county || "";
      const street  = p.street || "";
      const city    = p.city || p.state || "";
      const country = p.country || "";
      const countryCode = (p.countrycode || "").toLowerCase();
      const display_name =
        [name, street, city, country].filter(Boolean).join(", ") ||
        `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

      return {
        lat: String(lat),
        lon: String(lon),
        display_name,
        address: {
          road:         street || undefined,
          city:         city   || undefined,
          state:        p.state || undefined,
          country:      country || undefined,
          country_code: countryCode || undefined,
          suburb:       p.district || p.suburb || undefined,
        },
      } as GeocodingSuggestion;
    })
    .filter((s): s is GeocodingSuggestion => s !== null);
}

function parseNominatim(data: unknown): GeocodingSuggestion[] {
  const list = Array.isArray(data) ? data : [];
  return list
    .map((item: any) => {
      const latN = Number(item.lat);
      const lonN = Number(item.lon);
      if (!Number.isFinite(latN) || !Number.isFinite(lonN)) return null;
      const addr        = item.address || {};
      const countryCode = (addr.country_code || "").toLowerCase();
      return {
        lat: String(latN),
        lon: String(lonN),
        display_name: item.display_name || `${latN.toFixed(4)}, ${lonN.toFixed(4)}`,
        address: {
          road:         addr.road || undefined,
          suburb:       addr.suburb || addr.neighbourhood || undefined,
          city:         addr.city || addr.town || addr.village || addr.state || undefined,
          state:        addr.state || undefined,
          country:      addr.country || undefined,
          country_code: countryCode || undefined,
        },
      } as GeocodingSuggestion;
    })
    .filter((s): s is GeocodingSuggestion => s !== null);
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchPhoton(q: string, signal: AbortSignal): Promise<GeocodingSuggestion[]> {
  const sp = new URLSearchParams();
  sp.set("q", q);
  sp.set("limit", String(DISPLAY_LIMIT + 5));
  // Bias toward geographic center of Jordan (not just Amman)
  sp.set("lat", String(JORDAN_CENTER_LAT));
  sp.set("lon", String(JORDAN_CENTER_LON));
  const res = await fetch(`${PHOTON_BASE}?${sp}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(res.status === 429 ? FRIENDLY_ERROR : FRIENDLY_ERROR);
  return parsePhoton(await res.json());
}

async function fetchNominatim(q: string, signal: AbortSignal, bounded = false): Promise<GeocodingSuggestion[]> {
  const sp = new URLSearchParams({
    q,
    format:         "json",
    limit:          String(DISPLAY_LIMIT),
    addressdetails: "1",
    viewbox:        NOMINATIM_VIEWBOX,
    // bounded=1 restricts strictly to bbox; bounded=0 prefers bbox but allows outside
    bounded:        bounded ? "1" : "0",
  });
  const res = await fetch(`${NOMINATIM_BASE}?${sp}`, {
    signal,
    headers: { Accept: "application/json", "User-Agent": NOMINATIM_UA },
  });
  if (!res.ok) return [];
  return parseNominatim(await res.json());
}

// ── Main search logic ─────────────────────────────────────────────────────────

async function searchJordan(
  query: string,
  signal: AbortSignal
): Promise<GeocodingSuggestion[]> {
  const normalized = normalizeArabic(query).trim();
  if (!normalized) return [];

  // Strategy 1: Photon with Jordan center bias
  let results = (await fetchPhoton(normalized, signal).catch(() => []))
    .filter(isJordanResult);

  // Strategy 2: If Photon gives < 2 results, try Nominatim (not bounded — just prefers Jordan)
  if (results.length < 2) {
    const nominatim = (await fetchNominatim(normalized, signal, false).catch(() => []))
      .filter(isJordanResult);
    results = dedupeByCoords([...results, ...nominatim]);
  }

  // Strategy 3: If still empty, try appending "الأردن" / "Jordan" to help geocoders
  if (results.length === 0) {
    const withJordan = normalizeArabic(`${normalized} الأردن`);
    const photon2 = (await fetchPhoton(withJordan, signal).catch(() => []))
      .filter(isJordanResult);
    const nominatim2 = (await fetchNominatim(`${normalized} Jordan`, signal, false).catch(() => []))
      .filter(isJordanResult);
    results = dedupeByCoords([...photon2, ...nominatim2]);
  }

  return dedupeByCoords(results).slice(0, DISPLAY_LIMIT);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGeocodingSearch({ onLocationSelect }: UseGeocodingSearchOptions) {
  const [query,          setQuery]          = useState("");
  const [suggestions,    setSuggestions]    = useState<GeocodingSuggestion[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [phase,          setPhase]          = useState<GeocodingPhase>("idle");
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [showIncludingJordanMessage, setShowIncludingJordanMessage] = useState(false);
  const [showGlobalFallbackMessage,  setShowGlobalFallbackMessage]  = useState(false);

  const abortRef    = useRef<AbortController | null>(null);
  const requestId   = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const normalized = normalizeArabic(q).trim();
    if (!normalized || normalized.length < 2) {
      setSuggestions([]);
      setError(null);
      setPhase("idle");
      setShowDropdown(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestId.current;

    setLoading(true);
    setError(null);
    setPhase("idle");
    setShowGlobalFallbackMessage(false);
    setShowIncludingJordanMessage(false);

    try {
      const results = await searchJordan(normalized, controller.signal);
      if (id !== requestId.current) return;

      if (results.length > 0) {
        setPhase("JO_BIASED");
        setSuggestions(results);
        setShowDropdown(true);
        setShowIncludingJordanMessage(true);
      } else {
        setSuggestions([]);
        setError(
          "No results found in Jordan. Try another search or enter coordinates (e.g. 31.95, 35.91)."
        );
        setShowDropdown(true);
      }
    } catch (e) {
      if (id !== requestId.current) return;
      if (e instanceof Error && e.name === "AbortError") return;
      setSuggestions([]);
      setError(FRIENDLY_ERROR);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const search = useCallback(
    (q: string, immediate = false) => {
      setQuery(q);
      if (immediate) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        runSearch(q);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
    },
    [runSearch]
  );

  const selectSuggestion = useCallback(
    (item: GeocodingSuggestion) => {
      setSuggestions([]);
      setShowDropdown(false);
      setError(null);
      setPhase("idle");
      setShowGlobalFallbackMessage(false);
      setShowIncludingJordanMessage(false);
      onLocationSelect(item.lat, item.lon);
    },
    [onLocationSelect]
  );

  const clearSuggestions = useCallback(() => {
    setShowDropdown(false);
    setSuggestions([]);
    setShowGlobalFallbackMessage(false);
    setShowIncludingJordanMessage(false);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    query,
    setQuery,
    search,
    suggestions,
    showDropdown,
    setShowDropdown,
    clearSuggestions,
    selectSuggestion,
    loading,
    error,
    phase,
    showGlobalFallbackMessage,
    showIncludingJordanMessage,
  };
}
