import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, IndianRupee, Star, Navigation, Loader2 } from "lucide-react";
import { useGeolocation, calculateDistance, getCityCoordinates, formatDistance } from "@/hooks/useGeolocation";

export default function Turfs() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  
  const { latitude, longitude, loading: locationLoading, error: locationError } = useGeolocation();

  const { data: turfs, isLoading } = useQuery({
    queryKey: ["all-turfs"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").order("is_featured", { ascending: false });
      return data || [];
    },
  });

  // Calculate distances and sort turfs
  const turfsWithDistance = useMemo(() => {
    if (!turfs) return [];
    
    return turfs.map((turf: any) => {
      let distance: number | null = null;
      
      if (latitude && longitude) {
        const cityCoords = getCityCoordinates(turf.city);
        if (cityCoords) {
          distance = calculateDistance(latitude, longitude, cityCoords.lat, cityCoords.lng);
        }
      }
      
      return { ...turf, distance };
    });
  }, [turfs, latitude, longitude]);

  // Sort by distance if location available, otherwise by featured
  const sortedTurfs = useMemo(() => {
    const filtered = turfsWithDistance.filter((turf: any) => {
      const matchesSearch = turf.name.toLowerCase().includes(search.toLowerCase()) ||
        turf.location.toLowerCase().includes(search.toLowerCase());
      const matchesCity = cityFilter === "all" || turf.city === cityFilter;
      const matchesSport = sportFilter === "all" || turf.sport_type === sportFilter;
      return matchesSearch && matchesCity && matchesSport;
    });

    // Sort: featured first if no location, otherwise by distance
    if (latitude && longitude) {
      return filtered.sort((a: any, b: any) => {
        // Featured always first
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        // Then by distance
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }
    
    return filtered;
  }, [turfsWithDistance, search, cityFilter, sportFilter, latitude, longitude]);

  const cities = [...new Set(turfs?.map((t: any) => t.city).filter(Boolean))];
  const sports = [...new Set(turfs?.map((t: any) => t.sport_type).filter(Boolean))];


  return (
    <AppLayout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Turfs</h1>
          <p className="text-muted-foreground">Discover the best sports venues near you</p>
          
          {/* Location Status */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            {locationLoading ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Getting your location...
              </span>
            ) : latitude && longitude ? (
              <span className="flex items-center gap-1 text-primary">
                <Navigation className="h-3 w-3" />
                Sorted by distance from you
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                Enable location for distance-based sorting
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search turfs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city: any) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {sports.map((sport: any) => (
                <SelectItem key={sport} value={sport}>{sport}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Turfs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-40 bg-muted" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedTurfs && sortedTurfs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTurfs.map((turf: any) => (
              <Link key={turf.id} to={`/turfs/${turf.id}`}>
                <Card className="h-full card-hover overflow-hidden">
                  <div className="h-40 relative">
                    {/* Show first image if available, otherwise gradient placeholder */}
                    {turf.photos && turf.photos.length > 0 && !turf.photos[0].includes('video') ? (
                      <img 
                        src={turf.photos[0]} 
                        alt={turf.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-2xl">⚽</span>
                        </div>
                      </div>
                    )}
                    {turf.is_featured && (
                      <Badge className="absolute top-3 right-3 bg-amber-500 text-white">
                        <Star className="h-3 w-3 mr-1" /> Featured
                      </Badge>
                    )}
                    {turf.distance !== null && (
                      <Badge variant="secondary" className="absolute top-3 left-3">
                        <Navigation className="h-3 w-3 mr-1" />
                        {formatDistance(turf.distance)}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{turf.name}</h3>
                      <Badge variant="sport">{turf.sport_type}</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{turf.location}, {turf.city}</span>
                    </div>
                    {turf.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{turf.description}</p>
                    )}
                    <div className="flex items-center text-primary font-semibold">
                      <IndianRupee className="h-4 w-4" />
                      <span>{turf.price_per_hour}/hour</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No turfs found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
