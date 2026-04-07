import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { leafletMapDefaults } from "@/lib/mapConfig";

export type MonitoringMapConnectorStatus =
  | "available"
  | "busy"
  | "error"
  | "unavailable"
  | "preparing"
  | "other";

/** One map marker per charger; pass coordinates from your API when available. */
export interface MonitoringMapCharger {
  id: string;
  name: string;
  lat: number;
  lng: number;
  listStatus: "online" | "offline";
  connectors: Array<{ status: MonitoringMapConnectorStatus }>;
}

const STATUS_COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  gray: "#9ca3af",
} as const;

function markerHue(c: MonitoringMapCharger): keyof typeof STATUS_COLORS {
  if (c.listStatus === "offline") return "gray";
  const conns = c.connectors;
  if (conns.some((x) => x.status === "error" || x.status === "unavailable")) return "red";
  if (conns.some((x) => x.status === "busy")) return "amber";
  if (conns.some((x) => x.status === "available")) return "green";
  return "gray";
}

function circleDivIcon(color: string) {
  return L.divIcon({
    className: "monitoring-status-marker",
    html: `<div class="monitoring-status-marker-dot" style="background:${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
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

function FitBounds({ chargers }: { chargers: MonitoringMapCharger[] }) {
  const map = useMap();
  useEffect(() => {
    if (chargers.length === 0) return;
    if (chargers.length === 1) {
      const { lat, lng } = chargers[0];
      map.setView([lat, lng], Math.min(16, leafletMapDefaults.defaultZoom + 2));
      return;
    }
    const bounds = L.latLngBounds(chargers.map((c) => [c.lat, c.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [map, chargers]);
  return null;
}

export interface MapViewProps {
  chargers: MonitoringMapCharger[];
  className?: string;
}

/**
 * Read-only monitoring map: OSM tiles, status-colored circle markers, popups.
 * Parent supplies `lat` / `lng` per charger when the API provides them.
 */
export function MapView({ chargers, className }: MapViewProps) {
  const defaultCenter = leafletMapDefaults.defaultCenter;
  const defaultZoom = leafletMapDefaults.defaultZoom;

  const iconsByHue = useMemo(
    () => ({
      green: circleDivIcon(STATUS_COLORS.green),
      amber: circleDivIcon(STATUS_COLORS.amber),
      red: circleDivIcon(STATUS_COLORS.red),
      gray: circleDivIcon(STATUS_COLORS.gray),
    }),
    []
  );

  return (
    <div className={className} style={{ width: "100%", height: "100%", minHeight: 280 }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: "100%", height: "100%", borderRadius: "0.75rem" }}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInvalidateOnResize />
        {chargers.length > 0 ? <FitBounds chargers={chargers} /> : null}
        {chargers.map((c) => {
          const hue = markerHue(c);
          return (
            <Marker key={c.id} position={[c.lat, c.lng]} icon={iconsByHue[hue]}>
              <Popup>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">ID: {c.id}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
