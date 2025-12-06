import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Check } from "lucide-react";

interface PlaceResult {
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (place: PlaceResult) => void;
  onManualChange?: (value: string) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onManualChange,
  placeholder = "Search for a location...",
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // If no API key, allow manual input
    if (!apiKey) {
      console.warn("Google Maps API key not found - manual entry only");
      setIsLoading(false);
      setLoadError(true);
      return;
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // Load script with timeout
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setLoadError(true);
    }, 5000);

    script.onload = () => {
      clearTimeout(timeout);
      setIsLoaded(true);
      setIsLoading(false);
    };
    
    script.onerror = () => {
      clearTimeout(timeout);
      setIsLoading(false);
      setLoadError(true);
    };

    document.head.appendChild(script);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["establishment", "geocode"],
          componentRestrictions: { country: "in" },
          fields: ["name", "formatted_address", "geometry", "address_components"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        
        if (!place.geometry) return;

        let city = "";
        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes("locality")) {
              city = component.long_name;
              break;
            } else if (component.types.includes("administrative_area_level_2")) {
              city = component.long_name;
            }
          }
        }

        const result: PlaceResult = {
          name: place.name || "",
          address: place.formatted_address || "",
          city,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        };

        setInputValue(result.address);
        onChange(result);
      });
    } catch (error) {
      console.error("Failed to initialize Google Places:", error);
      setLoadError(true);
    }
  }, [isLoaded, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onManualChange?.(newValue);
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={loadError ? "Enter location manually..." : placeholder}
        className="pl-10 pr-10"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {isLoaded && !isLoading && (
        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
      )}
    </div>
  );
}
