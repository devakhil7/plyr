import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users, Calendar, ArrowRight, Play, Trophy, Target, TrendingUp } from "lucide-react";

export default function Index() {
  const { user } = useAuth();

  const { data: featuredTurfs } = useQuery({
    queryKey: ["featured-turfs"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("*").eq("is_featured", true).limit(3);
      return data || [];
    },
  });

  const { data: upcomingMatches } = useQuery({
    queryKey: ["upcoming-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, turfs(name, city), profiles!matches_host_id_fkey(name)")
        .eq("visibility", "public")
        .eq("status", "open")
        .gte("match_date", new Date().toISOString().split("T")[0])
        .order("match_date", { ascending: true })
        .limit(3);
      return data || [];
    },
  });

  const steps = [
    { icon: Play, title: "Host", description: "Create a match at your favorite turf" },
    { icon: Users, title: "Join", description: "Find and join open matches near you" },
    { icon: Target, title: "Play", description: "Show up and compete with local players" },
    { icon: TrendingUp, title: "Improve", description: "Upload videos and track your stats" },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-hero-pattern opacity-30" />
        <div className="container-app relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
              India's #1 Amateur Sports Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Join India's fastest-growing{" "}
              <span className="opacity-90">athlete community.</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Find matches, upload game footage, and get AI-powered insights and highlights — instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Link to="/host-match">
                    <Button variant="hero-secondary" size="xl">Host a Match</Button>
                  </Link>
                  <Link to="/matches">
                    <Button variant="glass" size="xl">Browse Matches <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth?mode=signup">
                    <Button variant="hero-secondary" size="xl">Get Started</Button>
                  </Link>
                  <Link to="/matches">
                    <Button variant="glass" size="xl">Browse Matches <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="section-spacing bg-background">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How SPORTIQ Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From hosting to improving — your complete sports journey in four simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <Card className="text-center p-6 h-full card-hover border-border/50">
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Turfs */}
      {featuredTurfs && featuredTurfs.length > 0 && (
        <section className="section-spacing bg-muted/30">
          <div className="container-app">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Featured Turfs</h2>
                <p className="text-muted-foreground">Top-rated venues for your next game</p>
              </div>
              <Link to="/turfs">
                <Button variant="outline">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredTurfs.map((turf: any) => (
                <Link key={turf.id} to={`/turfs/${turf.id}`}>
                  <Card className="overflow-hidden card-hover h-full">
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Trophy className="h-12 w-12 text-primary/50" />
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{turf.name}</h3>
                        <Badge variant="sport">{turf.sport_type}</Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        {turf.location}
                      </div>
                      <p className="text-primary font-semibold">₹{turf.price_per_hour}/hour</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <section className="section-spacing bg-background">
          <div className="container-app">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Upcoming Matches</h2>
                <p className="text-muted-foreground">Join a game happening near you</p>
              </div>
              <Link to="/matches">
                <Button variant="outline">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingMatches.map((match: any) => (
                <Link key={match.id} to={`/matches/${match.id}`}>
                  <Card className="card-hover h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg">{match.match_name}</h3>
                        <Badge variant="open">Open</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {match.turfs?.name}, {match.turfs?.city}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(match.match_date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} at {match.match_time?.slice(0, 5)}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          {match.total_slots} slots
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Hosted by {match.profiles?.name || "Player"}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 hero-gradient">
        <div className="container-app text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Ready to play?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">Join thousands of amateur athletes building their sports identity on SPORTIQ.</p>
          <Link to={user ? "/host-match" : "/auth?mode=signup"}>
            <Button variant="hero-secondary" size="xl">{user ? "Host Your First Match" : "Create Free Account"}</Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
