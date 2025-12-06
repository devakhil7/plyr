import { useRef, useEffect, useState, useCallback } from "react";
import { Loader2, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onManualChange,
  placeholder = "Search for a location...",
  className,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current || !window.google?.maps?.places) return;

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

      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to initialize Google Places:", error);
    }
  }, [onChange]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API key not configured");
      return;
    }

    // Already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', initAutocomplete);
      return;
    }

    setIsLoading(true);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoading(false);
      initAutocomplete();
    };
    
    script.onerror = () => {
      setIsLoading(false);
      console.error("Failed to load Google Maps script");
    };

    document.head.appendChild(script);
  }, [initAutocomplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onManualChange?.(newValue);
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "pl-10 pr-10",
          className
        )}
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
