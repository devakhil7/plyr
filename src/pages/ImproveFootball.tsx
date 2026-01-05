import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Target, Shield, ShieldCheck, ArrowLeftRight, Anchor, Settings, 
  Sparkles, Zap, Send, Crosshair, Wind, Hand, ArrowUp, HeartPulse, 
  Brain, ChevronRight, CheckCircle2, AlertTriangle, Dumbbell, Play,
  GraduationCap
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import type { Json } from "@/integrations/supabase/types";

type TrainingCategory = {
  id: string;
  name: string;
  type: "position" | "skill";
  sport: string;
  description: string | null;
  icon: string | null;
  display_order: number;
};

type Drill = { name: string; description: string; duration: string };

type TrainingLesson = {
  id: string;
  category_id: string;
  title: string;
  overview: string | null;
  key_responsibilities: string[] | null;
  common_mistakes: string[] | null;
  drills: Json;
  video_url: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  display_order: number;
};

// Helper to parse drills from Json
const parseDrills = (drills: Json): Drill[] => {
  if (!drills || !Array.isArray(drills)) return [];
  return drills.filter((d): d is Drill => 
    typeof d === 'object' && d !== null && 'name' in d && 'description' in d && 'duration' in d
  );
};

const iconMap: Record<string, React.ReactNode> = {
  shield: <Shield className="w-6 h-6" />,
  "shield-check": <ShieldCheck className="w-6 h-6" />,
  "arrow-left-right": <ArrowLeftRight className="w-6 h-6" />,
  anchor: <Anchor className="w-6 h-6" />,
  settings: <Settings className="w-6 h-6" />,
  sparkles: <Sparkles className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  target: <Target className="w-6 h-6" />,
  send: <Send className="w-6 h-6" />,
  crosshair: <Crosshair className="w-6 h-6" />,
  wind: <Wind className="w-6 h-6" />,
  hand: <Hand className="w-6 h-6" />,
  "arrow-up": <ArrowUp className="w-6 h-6" />,
  "heart-pulse": <HeartPulse className="w-6 h-6" />,
  brain: <Brain className="w-6 h-6" />,
};

const difficultyColors = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ImproveFootball() {
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"position" | "skill">("position");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["training-categories", "Football"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_categories")
        .select("*")
        .eq("sport", "Football")
        .order("display_order");
      if (error) throw error;
      return data as TrainingCategory[];
    },
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["training-lessons", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from("training_lessons")
        .select("*")
        .eq("category_id", selectedCategory)
        .order("display_order");
      if (error) throw error;
      return data as TrainingLesson[];
    },
    enabled: !!selectedCategory,
  });

  const positionCategories = categories.filter((c) => c.type === "position");
  const skillCategories = categories.filter((c) => c.type === "skill");

  const currentCategories = activeTab === "position" ? positionCategories : skillCategories;
  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);

  return (
    <AppLayout>
      <Helmet>
        <title>Improve Your Football Skills | AthleteX</title>
        <meta name="description" content="Master football with position guides, skill tutorials, and training drills. Learn from goalkeeper to striker, passing to shooting." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-accent/10 py-16">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">
                Football Training
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Improve as a <span className="text-primary">Player</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Master every aspect of football with comprehensive guides, drills, and expert tips. 
              Whether you want to excel in your position or develop specific skills, we've got you covered.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Tabs 
            value={activeTab} 
            onValueChange={(v) => {
              setActiveTab(v as "position" | "skill");
              setSelectedCategory(null);
            }}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
              <TabsTrigger value="position" className="gap-2">
                <Target className="w-4 h-4" />
                By Position
              </TabsTrigger>
              <TabsTrigger value="skill" className="gap-2">
                <Dumbbell className="w-4 h-4" />
                By Skill
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {!selectedCategory ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categoriesLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-3">
                          <div className="w-12 h-12 rounded-xl bg-muted" />
                          <div className="h-5 bg-muted rounded w-3/4 mt-3" />
                          <div className="h-4 bg-muted rounded w-full mt-2" />
                        </CardHeader>
                      </Card>
                    ))
                  ) : (
                    currentCategories.map((category) => (
                      <Card 
                        key={category.id}
                        className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {iconMap[category.icon || "target"] || <Target className="w-6 h-6" />}
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <CardTitle className="text-lg mt-3">{category.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {category.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Back button and category header */}
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCategory(null)}
                      className="gap-2"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Back
                    </Button>
                    {selectedCategoryData && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                          {iconMap[selectedCategoryData.icon || "target"] || <Target className="w-5 h-5" />}
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">{selectedCategoryData.name}</h2>
                          <p className="text-sm text-muted-foreground">{selectedCategoryData.description}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lessons */}
                  {lessonsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader>
                            <div className="h-6 bg-muted rounded w-1/3" />
                            <div className="h-4 bg-muted rounded w-full mt-2" />
                          </CardHeader>
                          <CardContent>
                            <div className="h-20 bg-muted rounded" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : lessons.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
                        <p className="text-muted-foreground">
                          Training content for this {activeTab} is coming soon.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    lessons.map((lesson) => (
                      <Card key={lesson.id} className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-xl">{lesson.title}</CardTitle>
                              <Badge 
                                variant="outline" 
                                className={`mt-2 ${difficultyColors[lesson.difficulty]}`}
                              >
                                {lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)}
                              </Badge>
                            </div>
                            {lesson.video_url && (
                              <Button variant="outline" size="sm" className="gap-2">
                                <Play className="w-4 h-4" />
                                Watch Video
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          {/* Overview */}
                          {lesson.overview && (
                            <div className="mb-6">
                              <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-primary" />
                                Overview
                              </h4>
                              <p className="text-muted-foreground leading-relaxed">
                                {lesson.overview}
                              </p>
                            </div>
                          )}

                          <Accordion type="multiple" className="w-full">
                            {/* Key Responsibilities */}
                            {lesson.key_responsibilities && lesson.key_responsibilities.length > 0 && (
                              <AccordionItem value="responsibilities">
                                <AccordionTrigger className="hover:no-underline">
                                  <span className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    Key Responsibilities
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <ul className="space-y-3">
                                    {lesson.key_responsibilities.map((item, i) => (
                                      <li key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <span className="text-xs font-medium text-green-500">{i + 1}</span>
                                        </div>
                                        <span className="text-muted-foreground">{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            )}

                            {/* Common Mistakes */}
                            {lesson.common_mistakes && lesson.common_mistakes.length > 0 && (
                              <AccordionItem value="mistakes">
                                <AccordionTrigger className="hover:no-underline">
                                  <span className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                    Common Mistakes to Avoid
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <ul className="space-y-3">
                                    {lesson.common_mistakes.map((item, i) => (
                                      <li key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                        </div>
                                        <span className="text-muted-foreground">{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            )}

                            {/* Training Drills */}
                            {parseDrills(lesson.drills).length > 0 && (
                              <AccordionItem value="drills">
                                <AccordionTrigger className="hover:no-underline">
                                  <span className="flex items-center gap-2">
                                    <Dumbbell className="w-5 h-5 text-primary" />
                                    Training Drills
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="grid gap-4">
                                    {parseDrills(lesson.drills).map((drill, i) => (
                                      <div 
                                        key={i} 
                                        className="p-4 rounded-lg bg-primary/5 border border-primary/10"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <h5 className="font-medium">{drill.name}</h5>
                                          <Badge variant="secondary" className="text-xs">
                                            {drill.duration}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {drill.description}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            )}
                          </Accordion>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
