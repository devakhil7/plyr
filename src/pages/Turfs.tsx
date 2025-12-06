import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, IndianRupee, Star } from "lucide-react";

export default function Turfs() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");

  const { data: turfs, isLoading } = useQuery({
    queryKey: ["all-turfs"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").order("is_featured", { ascending: false });
      return data || [];
    },
  });

  const filteredTurfs = turfs?.filter((turf: any) => {
    const matchesSearch = turf.name.toLowerCase().includes(search.toLowerCase()) ||
      turf.location.toLowerCase().includes(search.toLowerCase());
    const matchesCity = cityFilter === "all" || turf.city === cityFilter;
    const matchesSport = sportFilter === "all" || turf.sport_type === sportFilter;
    return matchesSearch && matchesCity && matchesSport;
  });

  const cities = [...new Set(turfs?.map((t: any) => t.city).filter(Boolean))];
  const sports = [...new Set(turfs?.map((t: any) => t.sport_type).filter(Boolean))];

  return (
    <Layout>
      <div className="container-app py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Turfs</h1>
          <p className="text-muted-foreground">Discover the best sports venues near you</p>
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
        ) : filteredTurfs && filteredTurfs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTurfs.map((turf: any) => (
              <Link key={turf.id} to={`/turfs/${turf.id}`}>
                <Card className="h-full card-hover overflow-hidden">
                  <div className="h-40 bg-gradient-to-br from-primary/20 to-secondary/20 relative flex items-center justify-center">
                    {turf.is_featured && (
                      <Badge className="absolute top-3 right-3 bg-amber-500 text-white">
                        <Star className="h-3 w-3 mr-1" /> Featured
                      </Badge>
                    )}
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl">⚽</span>
                    </div>
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
    </Layout>
  );
}
