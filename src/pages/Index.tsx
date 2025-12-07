import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, Users, Calendar, ArrowRight, Play, Trophy, Target, TrendingUp,
  Zap, Video, BarChart3, Star, CircleDot, Sparkles
} from "lucide-react";

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
    { icon: Play, title: "Host", description: "Create a match at your favorite turf", color: "from-emerald-500 to-teal-500" },
    { icon: Users, title: "Join", description: "Find and join open matches near you", color: "from-blue-500 to-cyan-500" },
    { icon: Target, title: "Play", description: "Show up and compete with local players", color: "from-orange-500 to-amber-500" },
    { icon: TrendingUp, title: "Improve", description: "Upload videos and track your stats", color: "from-purple-500 to-pink-500" },
  ];

  const features = [
    { icon: Video, title: "Upload Game Footage", description: "Capture and share your best moments" },
    { icon: Zap, title: "AI-Powered Insights", description: "Get instant performance analytics" },
    { icon: BarChart3, title: "Track Your Stats", description: "Build your player profile over time" },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient min-h-[90vh] flex items-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float delay-300" />
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float delay-500" />
          
          {/* Floating sport icons */}
          <div className="absolute top-20 left-[10%] opacity-20 animate-float delay-100">
            <CircleDot className="h-12 w-12 text-white" />
          </div>
          <div className="absolute top-40 right-[15%] opacity-15 animate-float delay-200">
            <Trophy className="h-16 w-16 text-white" />
          </div>
          <div className="absolute bottom-32 left-[20%] opacity-10 animate-float delay-400">
            <Target className="h-14 w-14 text-white" />
          </div>
          <div className="absolute bottom-20 right-[25%] opacity-15 animate-float delay-300">
            <Star className="h-10 w-10 text-white" />
          </div>
          <div className="absolute top-1/3 right-[8%] opacity-10 animate-float delay-500">
            <Zap className="h-12 w-12 text-white" />
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="container-app relative py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-1.5 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" />
              India's #1 Grassroots Sports Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight animate-slide-up">
              Join India's fastest-growing{" "}
              <span className="relative">
                <span className="relative z-10">athlete community.</span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-accent/30 -skew-x-3 rounded" />
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto animate-slide-up delay-100">
              Find matches, upload game footage, and get AI-powered insights and highlights — instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
              {user ? (
                <>
                  <Link to="/host-match">
                    <Button variant="hero-secondary" size="xl" className="group">
                      <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                      Host a Match
                    </Button>
                  </Link>
                  <Link to="/matches">
                    <Button variant="glass" size="xl">Browse Matches <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth?mode=signup">
                    <Button variant="hero-secondary" size="xl" className="group">
                      <Zap className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                      Get Started Free
                    </Button>
                  </Link>
                  <Link to="/matches">
                    <Button variant="glass" size="xl">Browse Matches <ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </Link>
                </>
              )}
            </div>

            {/* Stats row */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in delay-300">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">10K+</div>
                <div className="text-sm text-white/60">Active Players</div>
              </div>
              <div className="text-center border-x border-white/10">
                <div className="text-3xl md:text-4xl font-bold text-white">500+</div>
                <div className="text-sm text-white/60">Partner Turfs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">50+</div>
                <div className="text-sm text-white/60">Cities</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-12 bg-background relative -mt-1">
        <div className="container-app">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/5 to-transparent border border-border/50 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="section-spacing bg-background">
        <div className="container-app">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your journey in four steps</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From hosting to improving — your complete sports journey simplified.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="relative group">
                <Card className="text-center p-6 h-full card-hover border-border/50 overflow-hidden">
                  <CardContent className="pt-6 relative z-10">
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <step.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-xl mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
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
                <Badge variant="outline" className="mb-3">Venues</Badge>
                <h2 className="text-3xl font-bold mb-2">Featured Turfs</h2>
                <p className="text-muted-foreground">Top-rated venues for your next game</p>
              </div>
              <Link to="/turfs">
                <Button variant="outline" className="group">
                  View All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredTurfs.map((turf: any, index: number) => (
                <Link key={turf.id} to={`/turfs/${turf.id}`}>
                  <Card className="overflow-hidden card-hover h-full group">
                    <div className="h-44 bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/10 flex items-center justify-center relative overflow-hidden">
                      <Trophy className="h-16 w-16 text-primary/30 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white/90 text-primary border-0 shadow-sm">
                          <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                          Featured
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{turf.name}</h3>
                        <Badge variant="sport">{turf.sport_type}</Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        {turf.location}
                      </div>
                      <p className="text-primary font-semibold text-lg">₹{turf.price_per_hour}<span className="text-sm text-muted-foreground font-normal">/hour</span></p>
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
                <Badge variant="outline" className="mb-3">Live & Upcoming</Badge>
                <h2 className="text-3xl font-bold mb-2">Upcoming Matches</h2>
                <p className="text-muted-foreground">Join a game happening near you</p>
              </div>
              <Link to="/matches">
                <Button variant="outline" className="group">
                  View All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingMatches.map((match: any) => (
                <Link key={match.id} to={`/matches/${match.id}`}>
                  <Card className="card-hover h-full group border-l-4 border-l-accent">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{match.match_name}</h3>
                        <Badge variant="open" className="animate-pulse">Open</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-primary/60" />
                          {match.turfs?.name}, {match.turfs?.city}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-primary/60" />
                          {new Date(match.match_date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} at {match.match_time?.slice(0, 5)}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-primary/60" />
                          {match.total_slots} slots available
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">Hosted by <span className="font-medium text-foreground">{match.profiles?.name || "Player"}</span></p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 hero-gradient relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-[10%] opacity-10 animate-float">
            <Trophy className="h-20 w-20 text-white" />
          </div>
          <div className="absolute bottom-10 right-[10%] opacity-10 animate-float delay-200">
            <Target className="h-16 w-16 text-white" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)]" />
        </div>
        
        <div className="container-app text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm text-white/80">Join 10,000+ athletes</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Ready to play?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto text-lg">
            Build your sports identity and connect with athletes across India.
          </p>
          <Link to={user ? "/host-match" : "/auth?mode=signup"}>
            <Button variant="hero-secondary" size="xl" className="group shadow-2xl">
              {user ? (
                <>
                  <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Host Your First Match
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Create Free Account
                </>
              )}
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
