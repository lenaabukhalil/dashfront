import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Locate } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGeocodingSearch } from "@/hooks/useGeocodingSearch";
import { parseCoordinates, parseCoord } from "@/lib/geocoding";
import { leafletMapDefaults } from "@/lib/mapConfig";
import { cn } from "@/lib/utils";

const DEFAULT_LAT = leafletMapDefaults.defaultCenter[0];
const DEFAULT_LNG = leafletMapDefaults.defaultCenter[1];
const DEFAULT_ZOOM = leafletMapDefaults.defaultZoom;

interface MapSelectorProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  disabled?: boolean;
}

interface FitBoundsProps {
  positions: [number, number][];
  padding?: [number, number];
}

function FitBounds({ positions, padding = [40, 40] }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding, animate: true, maxZoom: 15 });
  }, [map, positions, padding]);
  return null;
}

/** Brand-aligned teardrop pin (primary blue + cyan accent), draggable in location form. */
const LOCATION_PIN_HTML = `<svg class="map-selector-pin-svg" width="28" height="34" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="mapPinShadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#0f172a" flood-opacity="0.25"/>
    </filter>
    <linearGradient id="mapPinGrad" x1="20" y1="0" x2="20" y2="44" gradientUnits="userSpaceOnUse">
      <stop stop-color="#38bdf8"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <path filter="url(#mapPinShadow)" d="M20 0C10.059 0 2 8.059 2 18c0 12.5 18 30 18 30s18-17.5 18-30C38 8.059 29.941 0 20 0z" fill="url(#mapPinGrad)"/>
  <circle cx="20" cy="18" r="9" fill="#ffffff"/>
  <circle cx="20" cy="18" r="5" fill="#06b6d4"/>
  <circle cx="20" cy="18" r="2.5" fill="#2563eb"/>
</svg>`;

const locationPinIcon = L.divIcon({
  className: "map-selector-leaflet-pin",
  html: `<div class="map-selector-pin-wrap" role="img" aria-label="Location marker">${LOCATION_PIN_HTML}</div>`,
  iconSize: [28, 34],
  iconAnchor: [14, 34],
});

function MapFlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), zoom), { duration: 0.8 });
  }, [lat, lng, zoom, map]);
  return null;
}

function MapClickSelect({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapInvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/** OSM attribution without the default "Leaflet" prefix. */
function MapAttributionConfig() {
  const map = useMap();
  useEffect(() => {
    map.attributionControl.setPrefix(false);
  }, [map]);
  return null;
}

export const MapSelector = ({
  lat,
  lng,
  onLocationChange,
  disabled = false,
}: MapSelectorProps) => {
  const [inputValue, setInputValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    setQuery,
    search,
    suggestions,
    showDropdown,
    setShowDropdown,
    clearSuggestions,
    selectSuggestion,
    loading,
    error,
  } = useGeocodingSearch({
    onLocationSelect: (latStr, lngStr) => onLocationChange(latStr, lngStr),
  });

  const latNum = parseCoord(lat);
  const lngNum = parseCoord(lng);
  const hasValidCoords = latNum !== null && lngNum !== null;
  const centerLat = hasValidCoords ? latNum : DEFAULT_LAT;
  const centerLng = hasValidCoords ? lngNum : DEFAULT_LNG;
  const initialZoom = hasValidCoords ? Math.max(14, DEFAULT_ZOOM) : DEFAULT_ZOOM;

  const handleSearchInputChange = (value: string) => {
    setInputValue(value);
    setQuery(value);
    const coords = parseCoordinates(value);
    if (coords) {
      onLocationChange(String(coords[0]), String(coords[1]));
      clearSuggestions();
      return;
    }
    search(value, false);
  };

  const handleSearchSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      toast({ title: "Search query required", description: "Enter a location or coordinates.", variant: "destructive" });
      return;
    }
    if (parseCoordinates(trimmed)) return;
    search(trimmed, true);
  };

  useEffect(() => {
    if (suggestions.length === 0) return;
    const first = suggestions[0];
    const latN = Number(first.lat);
    const lngN = Number(first.lon);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return;
    selectSuggestion(first);
  }, [suggestions, selectSuggestion]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [setShowDropdown]);

  const handleMapClick = (nextLat: number, nextLng: number) => {
    onLocationChange(String(nextLat), String(nextLng));
    toast({ title: "Location selected", description: `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}` });
  };

  return (
    <div className="space-y-4">
      <Label>Location on Map</Label>
      <p className="text-xs text-muted-foreground mb-1">Search only within Jordan</p>

      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search"
              value={inputValue}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              className="pr-10"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleSearchSubmit} disabled={disabled || loading}>
            Search
          </Button>
        </div>

        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="text"
              value={lat}
              onChange={(e) => onLocationChange(e.target.value, lng)}
              placeholder="31.9539"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="text"
              value={lng}
              onChange={(e) => onLocationChange(lat, e.target.value)}
              placeholder="35.9106"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "map-selector-wrapper relative z-0 w-full overflow-hidden rounded-xl",
          "border border-border/80 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]",
        )}
      >
        <div className="h-[280px] sm:h-[320px] md:h-[360px] lg:h-[420px] w-full overflow-hidden rounded-xl">
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={initialZoom}
            className="map-selector-leaflet-map"
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              minZoom={3}
            />
            <MapAttributionConfig />
            <FitBounds positions={[[centerLat, centerLng]]} />
            <ZoomControl position="topleft" />
            <MapInvalidateOnResize />
            <MapFlyTo lat={centerLat} lng={centerLng} zoom={DEFAULT_ZOOM} />
            <MapClickSelect disabled={disabled} onSelect={handleMapClick} />
            <Marker
              position={[centerLat, centerLng]}
              icon={locationPinIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target;
                  const ll = m.getLatLng();
                  onLocationChange(String(ll.lat), String(ll.lng));
                  toast({ title: "Location updated", description: `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}` });
                },
              }}
            />
          </MapContainer>
        </div>
        {!disabled && (
          <LocateButton
            onLocationChange={onLocationChange}
            className="absolute bottom-3 right-3 z-[1000] rounded-lg border bg-background/90 shadow"
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: Drag the pin or click on the map to set the location. You can type coordinates (e.g. 31.95, 35.91) or search by address.
      </p>
    </div>
  );
};

function LocateButton({
  onLocationChange,
  className,
}: {
  onLocationChange: (lat: string, lng: string) => void;
  className?: string;
}) {
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not supported", description: "Geolocation is not supported.", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocationChange(String(lat), String(lng));
        toast({ title: "Location set", description: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        setLocating(false);
      },
      () => {
        toast({ title: "Location unavailable", description: "Could not get your position.", variant: "destructive" });
        setLocating(false);
      },
    );
  };

  return (
    <Button type="button" variant="outline" size="icon" onClick={handleLocate} disabled={locating} className={className}>
      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
    </Button>
  );
}
