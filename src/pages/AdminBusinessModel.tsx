import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "lucide-react";

const DEFAULT_SLIDES = [
  {
    slide_number: 1,
    title: "Title",
    content: `**SPORTIQ**
The Social Network + Operating System for Amateur Athletes

The home for performance, identity, highlights, and community — powered by AI, video, wearables, and real-world matches.`,
  },
  {
    slide_number: 2,
    title: "The Problem",
    content: `Amateur athletes lack a single platform for:
- Tracking performance
- Showcasing highlights
- Building sports identity
- Affordable analytics
- Organizing matches
- Connecting fitness & match data

Existing platforms fall short:
- **Instagram** → entertainment, not athlete identity
- **Strava** → endurance only, not team sports
- **Huddl/Playo** → utility, not community
- **Veo/Hudl** → expensive, inaccessible

**Athletes deserve a single digital home.**`,
  },
  {
    slide_number: 3,
    title: "The Opportunity",
    content: `- **100M+** amateur athletes in India
- **5M+** turf bookings per month
- Rise of AI-driven video creation
- Athletes play **2–6 times/week** (high frequency)
- No global leader for amateur sports

**SPORTIQ can own this category.**`,
  },
  {
    slide_number: 4,
    title: "The Vision",
    content: `Create the world's first social-performance network for athletes.

**SPORTIQ =**
Strava + TikTok + Hudl + TeamSnap + Playo/Huddl + Fitbit
→ unified in one ecosystem.

Every athlete can:
**Play. Improve. Showcase. Connect. Build identity. Compete.**`,
  },
  {
    slide_number: 5,
    title: "Product Overview",
    content: `**1. Athlete Social Network**
Profiles, highlights, stats, ratings, followers, DMs.

**2. Match OS + TurfOS**
Host/join matches, auto start/end, payments, reconciliation, analytics.

**3. Creator Hub (AI Video Intelligence)**
Video upload → AI detects goals → Auto highlights → Reels.

**4. Wearables Integration**
Apple Health, Strava, Fitbit, Ultrahuman
Training load, readiness, sleep, HR, performance correlation.

**5. Tournaments Engine**
Team registration, payments, fixtures, results, highlights.`,
  },
  {
    slide_number: 6,
    title: "Why It Works",
    content: `- **High-frequency behavior** → weekly use
- **Content flywheel** → every match creates viral content
- **Social graph:** players ↔ teams ↔ turfs ↔ tournaments
- **AI makes elite analytics affordable**
- **Wearables deepen habit loops**
- **Massive whitespace + network effects**`,
  },
  {
    slide_number: 7,
    title: "Business Model",
    content: `**1. Marketplace Revenue**
- Turf booking commissions (5–15%)
- Convenience fees
- Tournament fees

**2. TurfOS SaaS**
₹999–₹2999/month — Full turf management suite.

**3. AI Video Tools**
Pay-per-match analysis, Creator subscription tiers.

**4. Premium Player Subscriptions**
₹149–₹499/month — Advanced analytics + unlimited highlights + verified badge.

**5. Athlete Commerce Marketplace**
Team jerseys, gear, coaching.

**6. Sponsorships & Ads**
Brands, tournaments, highlights.`,
  },
  {
    slide_number: 8,
    title: "Market Size (TAM)",
    content: `**India**
- 100M+ athletes
- 30M turf players
- 5M+ monthly paid matches

**Global**
- 500M+ amateur & semi-pro athletes.
- Huge untapped opportunity.`,
  },
  {
    slide_number: 9,
    title: "12-Month Roadmap",
    content: `**Q1 — Foundation**
Profiles, matches, payments, ratings, feed.

**Q2 — AI + Creator Hub + Social Graph**
Auto highlights, reels, follow system, DM.

**Q3 — Wearables + Performance Engine**
Apple Health, Strava, Fitbit, Ultrahuman.
Daily metrics + readiness + streaks.

**Q4 — Tournaments + Monetization**
Registration, fixtures, leaderboards,
Premium subscriptions, creator subscriptions, TurfOS SaaS.`,
  },
  {
    slide_number: 10,
    title: "Long-Term Vision",
    content: `**SPORTIQ becomes the global identity layer for athletes.**

- TikTok for highlights
- Strava for team sports
- LinkedIn for athletes
- HUDL/Veo for the masses
- Shopify for turfs

**Every stat, match, highlight, and fitness insight lives on SPORTIQ.**`,
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

  const getSlideContent = (slideNumber: number) => {
    const dbSection = dbSections?.find((s) => s.slide_number === slideNumber);
    if (dbSection) {
      return { title: dbSection.title, content: dbSection.content };
    }
    const defaultSlide = DEFAULT_SLIDES.find(
      (s) => s.slide_number === slideNumber
    );
    return defaultSlide || { title: "", content: "" };
  };

  const handleEdit = (slideNumber: number) => {
    const slide = getSlideContent(slideNumber);
    setEditTitle(slide.title);
    setEditContent(slide.content);
    setEditingSlide(slideNumber);
  };

  const handleSave = () => {
    if (editingSlide !== null) {
      saveSectionMutation.mutate({
        slide_number: editingSlide,
        title: editTitle,
        content: editContent,
      });
    }
  };

  const handleCancel = () => {
    setEditingSlide(null);
    setEditTitle("");
    setEditContent("");
  };

  const renderMarkdown = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="font-bold text-foreground mt-4 mb-2">
            {line.slice(2, -2)}
          </p>
        );
      }
      if (line.startsWith("- ")) {
        const text = line.slice(2);
        const boldMatch = text.match(/^\*\*(.+?)\*\*(.*)$/);
        if (boldMatch) {
          return (
            <li key={i} className="ml-4 text-muted-foreground">
              <span className="font-semibold text-foreground">
                {boldMatch[1]}
              </span>
              {boldMatch[2]}
            </li>
          );
        }
        return (
          <li key={i} className="ml-4 text-muted-foreground">
            {text}
          </li>
        );
      }
      if (line.trim() === "") {
        return <br key={i} />;
      }
      const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-muted-foreground">
          {boldParts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <span key={j} className="font-semibold text-foreground">
                {part.slice(2, -2)}
              </span>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Presentation className="h-5 w-5 text-primary" />
                Business Model & Pitch Deck
              </h1>
              <p className="text-sm text-muted-foreground">
                Internal documentation — visible only to SPORTIQ Admins
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="edit-mode" className="text-sm">
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Accordion type="multiple" defaultValue={["1"]} className="space-y-4">
          {DEFAULT_SLIDES.map((defaultSlide, index) => {
            const slideNumber = defaultSlide.slide_number;
            const slide = getSlideContent(slideNumber);
            const Icon = SLIDE_ICONS[index];
            const isEditing = editingSlide === slideNumber;

            return (
              <AccordionItem
                key={slideNumber}
                value={String(slideNumber)}
                className="border border-border rounded-xl overflow-hidden bg-card"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Slide {slideNumber}
                      </span>
                      <h3 className="font-semibold">{slide.title}</h3>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-title">Title</Label>
                        <Input
                          id="edit-title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-content">
                          Content (Markdown supported)
                        </Label>
                        <Textarea
                          id="edit-content"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="mt-1 min-h-[200px] font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          disabled={saveSectionMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="prose prose-sm max-w-none">
                        {renderMarkdown(slide.content)}
                      </div>
                      {editMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(slideNumber)}
                          className="mt-4"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Section
                        </Button>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </main>
    </div>
  );
}
