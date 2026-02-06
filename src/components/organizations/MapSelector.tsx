import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MapSelectorProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  disabled?: boolean;
}

export const MapSelector = ({
  lat,
  lng,
  onLocationChange,
  disabled = false,
}: MapSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapUrl, setMapUrl] = useState("");

  useEffect(() => {
    if (lat && lng) {
      // Generate Google Maps embed URL
      const url = `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
      setMapUrl(url);
    }
  }, [lat, lng]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a location to search.",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, you would use a geocoding API
    // For now, this is a placeholder
    toast({
      title: "Search functionality",
      description: "Location search will be integrated with a geocoding API.",
    });
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    // In a real implementation, you would convert click coordinates to lat/lng
    // This is a placeholder for map click handling
    toast({
      title: "Map interaction",
      description: "Click on the map to set location coordinates.",
    });
  };

  return (
    <div className="space-y-4">
      <Label>Location on Map</Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Search for a location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleSearch}
          disabled={disabled}
        >
          <Search className="w-4 h-4" />
        </Button>
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

      {mapUrl ? (
        <div className="relative w-full h-64 rounded-lg border border-border overflow-hidden">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location Map"
          />
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={handleMapClick}
            style={{ pointerEvents: disabled ? "none" : "auto" }}
          />
        </div>
      ) : (
        <div className="w-full h-64 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Enter coordinates or search for a location
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Enter coordinates manually or search for a location. Click on the map to set coordinates.
      </p>
    </div>
  );
};
