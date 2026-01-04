import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Plus, Trash2, Clock, Calendar } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface OpeningHours {
  [key: string]: {
    open: boolean;
    start: string;
    end: string;
  };
}

interface PricingRule {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  pricePerHour: number;
}

interface TurfAvailabilityTabProps {
  turfId: string;
  turf: any;
  onUpdate: () => void;
}

export function TurfAvailabilityTab({ turfId, turf, onUpdate }: TurfAvailabilityTabProps) {
  const queryClient = useQueryClient();
  
  const [openingHours, setOpeningHours] = useState<OpeningHours>(() => {
    const defaults: OpeningHours = {};
    DAYS.forEach(day => {
      defaults[day] = { open: true, start: "06:00", end: "22:00" };
    });
    return defaults;
  });
  
  const [slotDuration, setSlotDuration] = useState(60);
  const [basePricePerHour, setBasePricePerHour] = useState(0);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  useEffect(() => {
    if (turf) {
      if (turf.opening_hours && Object.keys(turf.opening_hours).length > 0) {
        setOpeningHours(turf.opening_hours);
      }
      setSlotDuration(turf.slot_duration_minutes || 60);
      setBasePricePerHour(turf.price_per_hour || 0);
      if (turf.pricing_rules?.rules) {
        setPricingRules(turf.pricing_rules.rules);
      }
    }
  }, [turf]);

  // Fetch upcoming bookings for preview (only approved ones block slots)
  const { data: upcomingBookings } = useQuery({
    queryKey: ["turf-availability-bookings", turfId],
    queryFn: async () => {
      if (!turfId) return [];
      const today = new Date().toISOString().split("T")[0];
      const weekLater = addDays(new Date(), 7).toISOString().split("T")[0];
      const { data } = await supabase
        .from("turf_bookings")
        .select("booking_date, start_time, end_time, duration_minutes, booking_status")
        .eq("turf_id", turfId)
        .gte("booking_date", today)
        .lte("booking_date", weekLater)
        .order("booking_date", { ascending: true });
      return data || [];
    },
    enabled: !!turfId,
  });

  // Fetch upcoming matches for preview
  const { data: upcomingMatches } = useQuery({
    queryKey: ["turf-availability-preview", turfId],
    queryFn: async () => {
      if (!turfId) return [];
      const today = new Date().toISOString().split("T")[0];
      const weekLater = addDays(new Date(), 7).toISOString().split("T")[0];
      const { data } = await supabase
        .from("matches")
        .select("match_date, match_time, duration_minutes, match_name")
        .eq("turf_id", turfId)
        .gte("match_date", today)
        .lte("match_date", weekLater)
        .order("match_date", { ascending: true });
      return data || [];
    },
    enabled: !!turfId,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("turfs")
        .update({
          opening_hours: openingHours as any,
          slot_duration_minutes: slotDuration,
          price_per_hour: basePricePerHour,
          pricing_rules: { rules: pricingRules } as any,
        })
        .eq("id", turfId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turf-details", turfId] });
      onUpdate();
      toast.success("Availability & pricing saved!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save");
    },
  });

  const updateDayHours = (day: string, field: string, value: any) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const addPricingRule = () => {
    setPricingRules(prev => [...prev, {
      id: crypto.randomUUID(),
      days: ["saturday", "sunday"],
      startTime: "18:00",
      endTime: "21:00",
      pricePerHour: basePricePerHour * 1.5,
    }]);
  };

  const removePricingRule = (id: string) => {
    setPricingRules(prev => prev.filter(r => r.id !== id));
  };

  const updatePricingRule = (id: string, field: string, value: any) => {
    setPricingRules(prev => prev.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Availability & Pricing</h1>
          <p className="text-muted-foreground">Configure when your turf is open and how much it costs</p>
        </div>
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opening Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Opening Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4">
                <div className="w-24">
                  <Switch
                    checked={openingHours[day]?.open}
                    onCheckedChange={(checked) => updateDayHours(day, "open", checked)}
                  />
                </div>
                <span className="w-24 capitalize font-medium">{day}</span>
                {openingHours[day]?.open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={openingHours[day]?.start}
                      onChange={(e) => updateDayHours(day, "start", e.target.value)}
                      className="w-28"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={openingHours[day]?.end}
                      onChange={(e) => updateDayHours(day, "end", e.target.value)}
                      className="w-28"
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Slot Duration & Base Price */}
        <Card>
          <CardHeader>
            <CardTitle>Slot Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Slot Duration</Label>
              <Select value={String(slotDuration)} onValueChange={(v) => setSlotDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Base Price per Hour (₹)</Label>
              <Input
                type="number"
                value={basePricePerHour}
                onChange={(e) => setBasePricePerHour(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Peak Pricing Rules */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Peak/Off-Peak Pricing</CardTitle>
                <CardDescription>Set different prices for specific days and time ranges</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addPricingRule}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pricingRules.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No special pricing rules. Base price of ₹{basePricePerHour}/hour applies to all slots.
              </p>
            ) : (
              <div className="space-y-4">
                {pricingRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Days</Label>
                        <div className="flex flex-wrap gap-1">
                          {DAYS.map((day) => (
                            <Badge
                              key={day}
                              variant={rule.days.includes(day) ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                              onClick={() => {
                                const newDays = rule.days.includes(day)
                                  ? rule.days.filter(d => d !== day)
                                  : [...rule.days, day];
                                updatePricingRule(rule.id, "days", newDays);
                              }}
                            >
                              {day.slice(0, 3)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={rule.startTime}
                          onChange={(e) => updatePricingRule(rule.id, "startTime", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={rule.endTime}
                          onChange={(e) => updatePricingRule(rule.id, "endTime", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price/Hour (₹)</Label>
                        <Input
                          type="number"
                          value={rule.pricePerHour}
                          onChange={(e) => updatePricingRule(rule.id, "pricePerHour", Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removePricingRule(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Next 7 Days Preview
            </CardTitle>
            <CardDescription>Scheduled matches and availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = addDays(new Date(), i);
                const dateStr = format(date, "yyyy-MM-dd");
                const dayName = format(date, "EEEE").toLowerCase();
                const isOpen = openingHours[dayName]?.open;
                const dayMatches = upcomingMatches?.filter(m => m.match_date === dateStr) || [];
                const dayBookings = upcomingBookings?.filter(b => b.booking_date === dateStr) || [];
                const approvedBookings = dayBookings.filter(b => b.booking_status === "approved");
                const pendingBookings = dayBookings.filter(b => b.booking_status === "pending_approval");

                return (
                  <div key={i} className={`p-3 rounded-lg border ${isOpen ? 'bg-background' : 'bg-muted'}`}>
                    <p className="text-sm font-medium">{format(date, "EEE")}</p>
                    <p className="text-xs text-muted-foreground">{format(date, "dd MMM")}</p>
                    {isOpen ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {openingHours[dayName]?.start} - {openingHours[dayName]?.end}
                        </p>
                        {approvedBookings.length > 0 && (
                          <div className="space-y-1">
                            {approvedBookings.map((b: any, j: number) => (
                              <div key={`b-${j}`} className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5">
                                {b.start_time?.slice(0, 5)} - Booked
                              </div>
                            ))}
                          </div>
                        )}
                        {pendingBookings.length > 0 && (
                          <div className="space-y-1">
                            {pendingBookings.map((b: any, j: number) => (
                              <div key={`p-${j}`} className="text-xs bg-yellow-500/10 text-yellow-600 rounded px-1 py-0.5">
                                {b.start_time?.slice(0, 5)} - Pending
                              </div>
                            ))}
                          </div>
                        )}
                        {dayMatches.length > 0 && (
                          <div className="space-y-1">
                            {dayMatches.map((m: any, j: number) => (
                              <div key={`m-${j}`} className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5">
                                {m.match_time?.slice(0, 5)} - {m.match_name?.slice(0, 10)}...
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">Closed</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
