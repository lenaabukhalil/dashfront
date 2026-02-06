import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Activity, CheckCircle2, XCircle, AlertCircle, Clock, Search, Info } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { fetchChargersStatus, fetchLocationsByOrg, fetchLocationDetails } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MapLocation {
  location_id: string;
  name: string;
  lat: number;
  lng: number;
  chargers: Array<{
    charger_id: string;
    name: string;
    status: string;
  }>;
  total_chargers: number;
  available_chargers: number;
}

export const ChargerMapView = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!canRead("charger.chargerStatus")) {
      setLoading(false);
      return;
    }

    const loadMapData = async () => {
      try {
        setLoading(true);
        const status = await fetchChargersStatus();
        // Transform data to MapLocation format
        // This is a placeholder - in real implementation, you'd fetch location coordinates
        const mapLocations: MapLocation[] = [];
        setLocations(mapLocations);
      } catch (error) {
        console.error("Error loading map data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
    const interval = setInterval(loadMapData, 30000);
    return () => clearInterval(interval);
  }, [canRead]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
      case "available":
        return "bg-green-500";
      case "busy":
      case "charging":
        return "bg-yellow-500";
      case "offline":
      case "unavailable":
        return "bg-gray-500";
      case "error":
      case "faulted":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
      case "available":
        return <CheckCircle2 className="w-3 h-3" />;
      case "busy":
      case "charging":
        return <Clock className="w-3 h-3" />;
      case "error":
      case "faulted":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <XCircle className="w-3 h-3" />;
    }
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateMapUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
  };

  return (
    <PermissionGuard
      role={role}
      permission="charger.chargerStatus"
      action="read"
      fallback={
        <Card>
          <CardContent className="py-8">
            <EmptyState
              title="Access Denied"
              description="You don't have permission to view the map."
            />
          </CardContent>
        </Card>
      }
    >
      <TooltipProvider>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Locations List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Charging Stations
              </CardTitle>
              <CardDescription>
                Click a station to view its location and charger status on the map
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p>Loading stations...</p>
                </div>
              ) : locations.length === 0 ? (
                <EmptyState
                  title="No Charging Stations"
                  description="No charging stations with active chargers found. Stations will appear here once they are added and have chargers configured."
                  action={
                    <Button variant="outline" onClick={() => window.location.href = "/locations"}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Go to Locations
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredLocations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No stations match your search</p>
                      </div>
                    ) : (
                      filteredLocations.map((location) => {
                        const availabilityPercent =
                          location.total_chargers > 0
                            ? Math.round(
                                (location.available_chargers / location.total_chargers) * 100
                              )
                            : 0;
                        return (
                          <Tooltip key={location.location_id}>
                            <TooltipTrigger asChild>
                              <div
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                  selectedLocation === location.location_id
                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                    : "hover:bg-muted hover:border-primary/50"
                                }`}
                                onClick={() => setSelectedLocation(location.location_id)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{location.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex items-center gap-1 text-xs opacity-80">
                                        <Activity className="w-3 h-3" />
                                        <span>
                                          {location.available_chargers}/{location.total_chargers} available
                                        </span>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                          availabilityPercent >= 50
                                            ? "border-green-500 text-green-600"
                                            : availabilityPercent >= 25
                                            ? "border-yellow-500 text-yellow-600"
                                            : "border-red-500 text-red-600"
                                        }`}
                                      >
                                        {availabilityPercent}%
                                      </Badge>
                                    </div>
                                  </div>
                                  <MapPin
                                    className={`w-4 h-4 flex-shrink-0 ${
                                      selectedLocation === location.location_id
                                        ? "text-primary-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">
                                {location.available_chargers} of {location.total_chargers} chargers available
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Click to view on map
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map View */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Map View
                  </CardTitle>
                  <CardDescription>
                    Interactive map with status-based color coding. Click stations to view details.
                  </CardDescription>
                </div>
                {selectedLocation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLocation(null)}
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedLocation ? (
                (() => {
                  const location = locations.find((l) => l.location_id === selectedLocation);
                  if (!location) return null;
                  return (
                    <div className="space-y-4">
                      <div className="relative w-full h-96 rounded-lg border border-border overflow-hidden bg-muted">
                        <iframe
                          src={generateMapUrl(location.lat, location.lng)}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`Charger Map - ${location.name}`}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm p-2 rounded-lg border shadow-sm">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Map shows station location. Charger status is color-coded below.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Chargers at {location.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {location.chargers.length} charger{location.chargers.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        {location.chargers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border rounded-lg">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No chargers configured for this station</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {location.chargers.map((charger) => (
                              <Tooltip key={charger.charger_id}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className={`w-2 h-2 rounded-full ${getStatusColor(charger.status)}`}
                                      />
                                      <span className="text-sm font-medium truncate">{charger.name}</span>
                                    </div>
                                    <Badge
                                      variant={
                                        charger.status === "online" || charger.status === "available"
                                          ? "default"
                                          : charger.status === "busy" || charger.status === "charging"
                                          ? "secondary"
                                          : "outline"
                                      }
                                      className="ml-2"
                                    >
                                      {getStatusIcon(charger.status)}
                                      <span className="ml-1 capitalize">{charger.status}</span>
                                    </Badge>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">
                                    <strong>{charger.name}</strong>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Status: {charger.status}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="w-full h-96 rounded-lg border border-dashed border-border flex flex-col items-center justify-center bg-muted/30">
                  <MapPin className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      No station selected
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Select a charging station from the list to view its location on the map and see charger status details
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Legend */}
          {selectedLocation && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm">Status Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Online / Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-xs text-muted-foreground">Busy / Charging</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span className="text-xs text-muted-foreground">Offline / Unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">Error / Faulted</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>
    </PermissionGuard>
  );
};
