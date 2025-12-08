import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Shield,
  ChevronLeft,
  Edit,
  Save,
  X,
  Presentation,
  Target,
  Lightbulb,
  Telescope,
  Package,
  Zap,
  DollarSign,
  Globe,
  Map,
  Rocket,
  TrendingUp,
  Users,
  Video,
  Activity,
  Trophy,
  Smartphone,
  CheckCircle,
} from "lucide-react";

const DEFAULT_SLIDES = [
  {
    slide_number: 1,
    title: "SPORTIQ",
    subtitle: "The Social Network + Operating System for Amateur Athletes",
    content: `The home for performance, identity, highlights, and community — powered by AI, video, wearables, and real-world matches.`,
    color: "from-primary via-purple-500 to-pink-500",
  },
  {
    slide_number: 2,
    title: "The Problem",
    subtitle: "Athletes deserve a single digital home",
    content: `Amateur athletes lack a single platform for:
• Tracking performance
• Showcasing highlights
• Building sports identity
• Affordable analytics
• Organizing matches
• Connecting fitness & match data

Existing platforms fall short:
• **Instagram** → entertainment, not athlete identity
• **Strava** → endurance only, not team sports
• **Huddl/Playo** → utility, not community
• **Veo/Hudl** → expensive, inaccessible`,
    color: "from-red-500 via-orange-500 to-yellow-500",
  },
  {
    slide_number: 3,
    title: "The Opportunity",
    subtitle: "SPORTIQ can own this category",
    content: `• **100M+** amateur athletes in India
• **5M+** turf bookings per month
• Rise of AI-driven video creation
• Athletes play **2–6 times/week** (high frequency)
• No global leader for amateur sports`,
    color: "from-emerald-500 via-teal-500 to-cyan-500",
    stats: [
      { value: "100M+", label: "Athletes in India" },
      { value: "5M+", label: "Monthly Bookings" },
      { value: "2-6x", label: "Weekly Play" },
    ],
  },
  {
    slide_number: 4,
    title: "The Vision",
    subtitle: "The world's first social-performance network",
    content: `**SPORTIQ =**
Strava + TikTok + Hudl + TeamSnap + Playo/Huddl + Fitbit
→ unified in one ecosystem.

Every athlete can:
**Play. Improve. Showcase. Connect. Build identity. Compete.**`,
    color: "from-violet-500 via-purple-500 to-fuchsia-500",
  },
  {
    slide_number: 5,
    title: "Product Overview",
    subtitle: "Five pillars of the platform",
    features: [
      { icon: Users, title: "Athlete Social Network", desc: "Profiles, highlights, stats, ratings, followers, DMs" },
      { icon: Trophy, title: "Match OS + TurfOS", desc: "Host/join matches, payments, analytics" },
      { icon: Video, title: "Creator Hub (AI Video)", desc: "AI goal detection → Auto highlights → Reels" },
      { icon: Activity, title: "Wearables Integration", desc: "Apple Health, Strava, Fitbit, Ultrahuman" },
      { icon: Trophy, title: "Tournaments Engine", desc: "Registration, payments, fixtures, results" },
    ],
    color: "from-blue-500 via-indigo-500 to-violet-500",
  },
  {
    slide_number: 6,
    title: "Why It Works",
    subtitle: "Network effects + habit loops",
    bullets: [
      { icon: TrendingUp, text: "High-frequency behavior → weekly use" },
      { icon: Video, text: "Content flywheel → every match creates viral content" },
      { icon: Users, text: "Social graph: players ↔ teams ↔ turfs ↔ tournaments" },
      { icon: Zap, text: "AI makes elite analytics affordable" },
      { icon: Activity, text: "Wearables deepen habit loops" },
      { icon: Globe, text: "Massive whitespace + network effects" },
    ],
    color: "from-amber-500 via-orange-500 to-red-500",
  },
  {
    slide_number: 7,
    title: "Business Model",
    subtitle: "Multiple revenue streams",
    revenue: [
      { title: "Marketplace Revenue", desc: "Turf booking commissions (5–15%), convenience fees, tournament fees", icon: DollarSign },
      { title: "TurfOS SaaS", desc: "₹999–₹2999/month — Full turf management suite", icon: Smartphone },
      { title: "AI Video Tools", desc: "Pay-per-match analysis, Creator subscription tiers", icon: Video },
      { title: "Premium Subscriptions", desc: "₹149–₹499/month — Advanced analytics + verified badge", icon: Trophy },
      { title: "Athlete Commerce", desc: "Team jerseys, gear, coaching", icon: Package },
      { title: "Sponsorships & Ads", desc: "Brands, tournaments, highlights", icon: TrendingUp },
    ],
    color: "from-green-500 via-emerald-500 to-teal-500",
  },
  {
    slide_number: 8,
    title: "Market Size (TAM)",
    subtitle: "Huge untapped opportunity",
    markets: [
      { region: "India", stats: ["100M+ athletes", "30M turf players", "5M+ monthly paid matches"] },
      { region: "Global", stats: ["500M+ amateur & semi-pro athletes", "Massive untapped market"] },
    ],
    color: "from-cyan-500 via-blue-500 to-indigo-500",
  },
  {
    slide_number: 9,
    title: "12-Month Roadmap",
    subtitle: "From foundation to monetization",
    quarters: [
      { q: "Q1", title: "Foundation", items: ["Profiles", "Matches", "Payments", "Ratings", "Feed"] },
      { q: "Q2", title: "AI + Social", items: ["Auto highlights", "Reels", "Follow system", "DM"] },
      { q: "Q3", title: "Wearables", items: ["Apple Health", "Strava", "Fitbit", "Ultrahuman"] },
      { q: "Q4", title: "Monetization", items: ["Tournaments", "Subscriptions", "TurfOS SaaS"] },
    ],
    color: "from-pink-500 via-rose-500 to-red-500",
  },
  {
    slide_number: 10,
    title: "Long-Term Vision",
    subtitle: "The global identity layer for athletes",
    analogies: [
      { app: "TikTok", use: "for highlights" },
      { app: "Strava", use: "for team sports" },
      { app: "LinkedIn", use: "for athletes" },
      { app: "HUDL/Veo", use: "for the masses" },
      { app: "Shopify", use: "for turfs" },
    ],
    tagline: "Every stat, match, highlight, and fitness insight lives on SPORTIQ.",
    color: "from-violet-600 via-purple-600 to-primary",
  },
];

const SLIDE_ICONS = [
  Presentation,
  Target,
  Lightbulb,
  Telescope,
  Package,
  Zap,
  DollarSign,
  Globe,
  Map,
  Rocket,
];

export default function AdminBusinessModel() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!loading && !rolesLoading && (!user || !isAdmin)) {
      navigate("/");
      toast.error("Access denied. Admin only.");
    }
  }, [user, isAdmin, loading, rolesLoading, navigate]);

  const { data: dbSections } = useQuery({
    queryKey: ["business-model-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_model_sections")
        .select("*")
        .order("slide_number");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const saveSectionMutation = useMutation({
    mutationFn: async ({
      slide_number,
      title,
      content,
    }: {
      slide_number: number;
      title: string;
      content: string;
    }) => {
      const existing = dbSections?.find((s) => s.slide_number === slide_number);
      if (existing) {
        const { error } = await supabase
          .from("business_model_sections")
          .update({ title, content, updated_by: user?.id })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_model_sections")
          .insert({ slide_number, title, content, updated_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-model-sections"] });
      toast.success("Section saved");
      setEditingSlide(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save");
    },
  });

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Shield className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">
              This page is only accessible to SPORTIQ administrators.
            </p>
            <Link to="/">
              <Button>Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-purple-600">
                  <Presentation className="h-5 w-5 text-white" />
                </div>
                Business Model & Pitch Deck
              </h1>
              <p className="text-sm text-muted-foreground">
                Internal documentation — visible only to SPORTIQ Admins
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
            <Label htmlFor="edit-mode" className="text-sm font-medium">
              Edit Mode
            </Label>
            <Switch
              id="edit-mode"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Hero Slide */}
        <section className="mb-16">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-purple-600 to-pink-600 text-white shadow-2xl shadow-primary/20">
            <CardContent className="p-12 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyMGgydjRoLTJ2LTR6bTQgMTRoMnYtNGgtMnY0em0wLTZ2LTRoMnY0aC0yem0tOCA2aDJ2LTRoLTJ2NHptMC02di00aDJ2NGgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
              <Badge className="bg-white/20 text-white border-0 mb-6">Slide 1 of 10</Badge>
              <h1 className="text-5xl md:text-7xl font-bold mb-4 font-display tracking-tight">SPORTIQ</h1>
              <p className="text-xl md:text-2xl font-medium opacity-90 mb-6">
                The Social Network + Operating System for Amateur Athletes
              </p>
              <p className="text-lg opacity-80 max-w-2xl mx-auto">
                The home for performance, identity, highlights, and community — powered by AI, video, wearables, and real-world matches.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Problem Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[1]}
          index={1}
          icon={Target}
          editMode={editMode}
        >
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-foreground mb-4">Athletes lack a platform for:</h4>
              <ul className="space-y-3">
                {["Tracking performance", "Showcasing highlights", "Building sports identity", "Affordable analytics", "Organizing matches", "Connecting fitness & match data"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Existing platforms fall short:</h4>
              <div className="space-y-3">
                {[
                  { name: "Instagram", issue: "entertainment, not athlete identity" },
                  { name: "Strava", issue: "endurance only, not team sports" },
                  { name: "Huddl/Playo", issue: "utility, not community" },
                  { name: "Veo/Hudl", issue: "expensive, inaccessible" },
                ].map((platform) => (
                  <div key={platform.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <X className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{platform.name}</span>
                    <span className="text-muted-foreground">→ {platform.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideSection>

        {/* Opportunity Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[2]}
          index={2}
          icon={Lightbulb}
          editMode={editMode}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { value: "100M+", label: "Athletes in India", color: "from-emerald-500 to-teal-500" },
              { value: "5M+", label: "Monthly Turf Bookings", color: "from-teal-500 to-cyan-500" },
              { value: "2-6x", label: "Weekly Play Frequency", color: "from-cyan-500 to-blue-500" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                <p className={cn("text-4xl md:text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent", stat.color)}>
                  {stat.value}
                </p>
                <p className="text-muted-foreground mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="text-center p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <p className="text-xl font-semibold text-foreground">No global leader for amateur sports.</p>
            <p className="text-lg text-primary font-medium mt-2">SPORTIQ can own this category.</p>
          </div>
        </SlideSection>

        {/* Vision Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[3]}
          index={3}
          icon={Telescope}
          editMode={editMode}
        >
          <div className="text-center space-y-8">
            <div className="inline-flex flex-wrap justify-center gap-3">
              {["Strava", "TikTok", "Hudl", "TeamSnap", "Playo", "Fitbit"].map((app) => (
                <Badge key={app} variant="secondary" className="text-base px-4 py-2">
                  {app}
                </Badge>
              ))}
            </div>
            <p className="text-2xl text-muted-foreground">→ unified in one ecosystem.</p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              {["Play", "Improve", "Showcase", "Connect", "Build identity", "Compete"].map((action) => (
                <div key={action} className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </SlideSection>

        {/* Product Overview Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[4]}
          index={4}
          icon={Package}
          editMode={editMode}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: "Athlete Social Network", desc: "Profiles, highlights, stats, ratings, followers, DMs", color: "from-blue-500 to-indigo-500" },
              { icon: Trophy, title: "Match OS + TurfOS", desc: "Host/join matches, auto start/end, payments, analytics", color: "from-amber-500 to-orange-500" },
              { icon: Video, title: "Creator Hub (AI Video)", desc: "Video upload → AI detects goals → Auto highlights → Reels", color: "from-pink-500 to-rose-500" },
              { icon: Activity, title: "Wearables Integration", desc: "Apple Health, Strava, Fitbit, Ultrahuman tracking", color: "from-emerald-500 to-teal-500" },
              { icon: Trophy, title: "Tournaments Engine", desc: "Team registration, payments, fixtures, results, highlights", color: "from-purple-500 to-violet-500" },
            ].map((feature) => (
              <Card key={feature.title} className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", feature.color)}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SlideSection>

        {/* Why It Works Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[5]}
          index={5}
          icon={Zap}
          editMode={editMode}
        >
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: TrendingUp, text: "High-frequency behavior → weekly use" },
              { icon: Video, text: "Content flywheel → every match creates viral content" },
              { icon: Users, text: "Social graph: players ↔ teams ↔ turfs ↔ tournaments" },
              { icon: Zap, text: "AI makes elite analytics affordable" },
              { icon: Activity, text: "Wearables deepen habit loops" },
              { icon: Globe, text: "Massive whitespace + network effects" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10 hover:border-amber-500/30 transition-colors">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <p className="font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </SlideSection>

        {/* Business Model Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[6]}
          index={6}
          icon={DollarSign}
          editMode={editMode}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Marketplace Revenue", desc: "Turf booking commissions (5–15%), convenience fees, tournament fees", icon: DollarSign, color: "from-green-500 to-emerald-500" },
              { title: "TurfOS SaaS", desc: "₹999–₹2999/month — Full turf management suite", icon: Smartphone, color: "from-blue-500 to-cyan-500" },
              { title: "AI Video Tools", desc: "Pay-per-match analysis, Creator subscription tiers", icon: Video, color: "from-purple-500 to-pink-500" },
              { title: "Premium Subscriptions", desc: "₹149–₹499/month — Advanced analytics + verified badge", icon: Trophy, color: "from-amber-500 to-yellow-500" },
              { title: "Athlete Commerce", desc: "Team jerseys, gear, coaching", icon: Package, color: "from-rose-500 to-red-500" },
              { title: "Sponsorships & Ads", desc: "Brands, tournaments, highlights", icon: TrendingUp, color: "from-indigo-500 to-violet-500" },
            ].map((revenue) => (
              <Card key={revenue.title} className="border-border/50 hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/5">
                <CardContent className="p-5">
                  <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3", revenue.color)}>
                    <revenue.icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold mb-1">{revenue.title}</h4>
                  <p className="text-sm text-muted-foreground">{revenue.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SlideSection>

        {/* Market Size Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[7]}
          index={7}
          icon={Globe}
          editMode={editMode}
        >
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 bg-gradient-to-br from-cyan-500 to-blue-600 text-white overflow-hidden">
              <CardContent className="p-8 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <h3 className="text-2xl font-bold mb-6">🇮🇳 India</h3>
                <ul className="space-y-3 text-lg">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5" />
                    100M+ athletes
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5" />
                    30M turf players
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5" />
                    5M+ monthly paid matches
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden">
              <CardContent className="p-8 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <h3 className="text-2xl font-bold mb-6">🌍 Global</h3>
                <ul className="space-y-3 text-lg">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5" />
                    500M+ amateur & semi-pro athletes
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5" />
                    Massive untapped market
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </SlideSection>

        {/* Roadmap Slide */}
        <SlideSection
          slide={DEFAULT_SLIDES[8]}
          index={8}
          icon={Map}
          editMode={editMode}
        >
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { q: "Q1", title: "Foundation", items: ["Profiles", "Matches", "Payments", "Ratings", "Feed"], color: "from-blue-500 to-indigo-500" },
              { q: "Q2", title: "AI + Social", items: ["Auto highlights", "Reels", "Follow system", "DM"], color: "from-indigo-500 to-purple-500" },
              { q: "Q3", title: "Wearables", items: ["Apple Health", "Strava", "Fitbit", "Ultrahuman"], color: "from-purple-500 to-pink-500" },
              { q: "Q4", title: "Monetization", items: ["Tournaments", "Subscriptions", "TurfOS SaaS"], color: "from-pink-500 to-rose-500" },
            ].map((quarter, i) => (
              <div key={quarter.q} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-border to-transparent z-0" />}
                <Card className="relative z-10 border-border/50 h-full">
                  <CardContent className="p-5">
                    <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br text-white font-bold mb-4", quarter.color)}>
                      {quarter.q}
                    </div>
                    <h4 className="font-semibold text-lg mb-3">{quarter.title}</h4>
                    <ul className="space-y-2">
                      {quarter.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </SlideSection>

        {/* Long-Term Vision Slide */}
        <section className="mb-16">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-primary text-white shadow-2xl shadow-primary/20">
            <CardContent className="p-12 relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyMGgydjRoLTJ2LTR6bTQgMTRoMnYtNGgtMnY0em0wLTZ2LTRoMnY0aC0yem0tOCA2aDJ2LTRoLTJ2NHptMC02di00aDJ2NGgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
              <Badge className="bg-white/20 text-white border-0 mb-6">Slide 10 of 10</Badge>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-white/20">
                  <Rocket className="h-8 w-8" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">Long-Term Vision</h2>
              </div>
              <p className="text-xl opacity-90 mb-8">The global identity layer for athletes</p>
              <div className="flex flex-wrap gap-4 mb-8">
                {[
                  { app: "TikTok", use: "for highlights" },
                  { app: "Strava", use: "for team sports" },
                  { app: "LinkedIn", use: "for athletes" },
                  { app: "HUDL/Veo", use: "for the masses" },
                  { app: "Shopify", use: "for turfs" },
                ].map((item) => (
                  <div key={item.app} className="px-5 py-3 rounded-full bg-white/10 backdrop-blur border border-white/20">
                    <span className="font-semibold">{item.app}</span>
                    <span className="opacity-75"> {item.use}</span>
                  </div>
                ))}
              </div>
              <div className="p-6 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-center">
                <p className="text-xl md:text-2xl font-semibold">
                  Every stat, match, highlight, and fitness insight lives on SPORTIQ.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

interface SlideSectionProps {
  slide: typeof DEFAULT_SLIDES[0];
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  editMode: boolean;
  children: React.ReactNode;
}

function SlideSection({ slide, index, icon: Icon, editMode, children }: SlideSectionProps) {
  return (
    <section className="mb-12">
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl bg-gradient-to-br", slide.color)}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <Badge variant="outline" className="mb-2">Slide {index + 1}</Badge>
                <h2 className="text-2xl font-bold">{slide.title}</h2>
                {slide.subtitle && (
                  <p className="text-muted-foreground">{slide.subtitle}</p>
                )}
              </div>
            </div>
            {editMode && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}
