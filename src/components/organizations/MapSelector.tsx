import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Locate } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGeocodingSearch } from "@/hooks/useGeocodingSearch";
import { parseCoordinates, parseCoord } from "@/lib/geocoding";
import { mapConfig } from "@/lib/mapConfig";
import { cn } from "@/lib/utils";

const DEFAULT_LAT = 31.9539;
const DEFAULT_LNG = 35.9106;
const DEFAULT_ZOOM = 11;

const createMarkerIcon = () =>
  L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>`,
    className: "custom-marker-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

interface MapSelectorProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  disabled?: boolean;
}

function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [map, center[0], center[1], zoom]);
  return null;
}

function MapClickHandler({
  onLocationChange,
  disabled,
}: {
  onLocationChange: (lat: string, lng: string) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      const { lat, lng } = e.latlng;
      onLocationChange(String(lat), String(lng));
      toast({ title: "تم تحديد الموقع", description: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    },
  });
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
  } = useGeocodingSearch({
    onLocationSelect: (latStr, lngStr) => onLocationChange(latStr, lngStr),
  });

  const latNum = parseCoord(lat);
  const lngNum = parseCoord(lng);
  const hasValidCoords = latNum !== null && lngNum !== null;
  const center: [number, number] = hasValidCoords ? [latNum, lngNum] : [DEFAULT_LAT, DEFAULT_LNG];
  const markerPosition: [number, number] = hasValidCoords ? [latNum, lngNum] : center;

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
        <div className="grid grid-cols-2 gap-4">
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

      <div className={cn("relative z-0 w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden")}>
        <div className="h-[280px] sm:h-[320px] md:h-[360px] lg:h-[420px] w-full rounded-xl overflow-hidden">
          <MapContainer
            center={center}
            zoom={hasValidCoords ? 13 : DEFAULT_ZOOM}
            className="h-full w-full rounded-xl"
            scrollWheelZoom={mapConfig.scrollWheelZoom}
          >
            <TileLayer attribution={mapConfig.attribution} url={mapConfig.tileUrl} />
            <MapViewUpdater center={center} zoom={hasValidCoords ? 13 : undefined} />
            <MapClickHandler onLocationChange={onLocationChange} disabled={disabled} />
            <Marker
              position={markerPosition}
              icon={createMarkerIcon()}
              draggable={!disabled}
              eventHandlers={{
                dragend(e) {
                  const pos = e.target.getLatLng();
                  onLocationChange(String(pos.lat), String(pos.lng));
                  toast({ title: "Location updated", description: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` });
                },
              }}
            >
              <Popup>Selected location</Popup>
            </Marker>
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
