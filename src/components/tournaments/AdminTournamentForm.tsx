import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trophy, Save } from "lucide-react";

interface TournamentFormData {
  name: string;
  description: string;
  turf_id: string;
  sport: string;
  city: string;
  start_datetime: string;
  end_datetime: string;
  entry_fee: number;
  allow_part_payment: boolean;
  advance_type: "percentage" | "flat" | null;
  advance_value: number | null;
  min_players_per_team: number;
  max_players_per_team: number;
  max_playing_players: number;
  max_subs: number;
  registration_open: boolean;
  registration_deadline: string;
  prize_details: string;
  rules: string;
  status: string;
}

interface AdminTournamentFormProps {
  tournamentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AdminTournamentForm({ tournamentId, onSuccess, onCancel }: AdminTournamentFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!tournamentId;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TournamentFormData>({
    defaultValues: {
      name: "",
      description: "",
      turf_id: "",
      sport: "Football",
      city: "",
      start_datetime: "",
      end_datetime: "",
      entry_fee: 0,
      allow_part_payment: false,
      advance_type: null,
      advance_value: null,
      min_players_per_team: 5,
      max_players_per_team: 11,
      max_playing_players: 7,
      max_subs: 4,
      registration_open: true,
      registration_deadline: "",
      prize_details: "",
      rules: "",
      status: "upcoming",
    },
  });

  const allowPartPayment = watch("allow_part_payment");
  const advanceType = watch("advance_type");

  // Fetch existing tournament if editing
  const { data: existingTournament } = useQuery({
    queryKey: ["tournament-edit", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .maybeSingle();
      return data;
    },
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingTournament) {
      reset({
        name: existingTournament.name,
        description: existingTournament.description || "",
        turf_id: existingTournament.turf_id || "",
        sport: existingTournament.sport || "Football",
        city: existingTournament.city,
        start_datetime: existingTournament.start_datetime?.slice(0, 16) || "",
        end_datetime: existingTournament.end_datetime?.slice(0, 16) || "",
        entry_fee: existingTournament.entry_fee || 0,
        allow_part_payment: existingTournament.allow_part_payment || false,
        advance_type: (existingTournament.advance_type as "percentage" | "flat") || null,
        advance_value: existingTournament.advance_value || null,
        min_players_per_team: existingTournament.min_players_per_team || 5,
        max_players_per_team: existingTournament.max_players_per_team || 11,
        max_playing_players: existingTournament.max_playing_players || 7,
        max_subs: existingTournament.max_subs || 4,
        registration_open: existingTournament.registration_open ?? true,
        registration_deadline: existingTournament.registration_deadline?.slice(0, 16) || "",
        prize_details: existingTournament.prize_details || "",
        rules: existingTournament.rules || "",
        status: existingTournament.status || "upcoming",
      });
    }
  }, [existingTournament, reset]);

  const { data: turfs = [] } = useQuery({
    queryKey: ["turfs-for-tournament"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turfs")
        .select("id, name, city")
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  const saveTournament = useMutation({
    mutationFn: async (data: TournamentFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        turf_id: data.turf_id || null,
        sport: data.sport,
        city: data.city,
        start_datetime: data.start_datetime,
        end_datetime: data.end_datetime,
        entry_fee: data.entry_fee || 0,
        allow_part_payment: data.allow_part_payment,
        advance_type: data.allow_part_payment ? data.advance_type : null,
        advance_value: data.allow_part_payment ? data.advance_value : null,
        min_players_per_team: data.min_players_per_team,
        max_players_per_team: data.max_players_per_team,
        max_playing_players: data.max_playing_players,
        max_subs: data.max_subs,
        registration_open: data.registration_open,
        registration_deadline: data.registration_deadline || null,
        prize_details: data.prize_details || null,
        rules: data.rules || null,
        status: data.status,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("tournaments")
          .update(payload)
          .eq("id", tournamentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tournaments").insert({
          ...payload,
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      toast.success(isEditing ? "Tournament updated!" : "Tournament created!");
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error saving tournament:", error);
      toast.error("Failed to save tournament");
    },
  });

  const onSubmit = (data: TournamentFormData) => {
    saveTournament.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="name">Tournament Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="e.g., Summer Football Championship 2024"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="sport">Sport</Label>
            <Select
              defaultValue={watch("sport")}
              onValueChange={(val) => setValue("sport", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Football">Football</SelectItem>
                <SelectItem value="Cricket">Cricket</SelectItem>
                <SelectItem value="Basketball">Basketball</SelectItem>
                <SelectItem value="Badminton">Badminton</SelectItem>
                <SelectItem value="Tennis">Tennis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="turf_id">Venue (Turf)</Label>
            <Select
              value={watch("turf_id")}
              onValueChange={(val) => {
                setValue("turf_id", val);
                const turf = turfs.find((t: any) => t.id === val);
                if (turf) {
                  setValue("city", turf.city);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a turf" />
              </SelectTrigger>
              <SelectContent>
                {turfs.map((turf: any) => (
                  <SelectItem key={turf.id} value={turf.id}>
                    {turf.name} - {turf.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              {...register("city", { required: "City is required" })}
              placeholder="e.g., Mumbai"
            />
            {errors.city && (
              <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(val) => setValue("status", val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start_datetime">Start Date & Time *</Label>
            <Input
              id="start_datetime"
              type="datetime-local"
              {...register("start_datetime", { required: "Start date is required" })}
            />
            {errors.start_datetime && (
              <p className="text-sm text-destructive mt-1">{errors.start_datetime.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="end_datetime">End Date & Time *</Label>
            <Input
              id="end_datetime"
              type="datetime-local"
              {...register("end_datetime", { required: "End date is required" })}
            />
            {errors.end_datetime && (
              <p className="text-sm text-destructive mt-1">{errors.end_datetime.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe your tournament..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Entry & Payment Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entry Fee & Payment Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_fee">Entry Fee per Team (₹)</Label>
              <Input
                id="entry_fee"
                type="number"
                min="0"
                {...register("entry_fee", { valueAsNumber: true })}
                placeholder="0 for free entry"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={allowPartPayment}
                onCheckedChange={(checked) => setValue("allow_part_payment", checked)}
              />
              <Label>Allow Part Payment (Advance)</Label>
            </div>
          </div>

          {allowPartPayment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="advance_type">Advance Type</Label>
                <Select
                  value={advanceType || "percentage"}
                  onValueChange={(val) => setValue("advance_type", val as "percentage" | "flat")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage of Entry Fee</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="advance_value">
                  {advanceType === "flat" ? "Advance Amount (₹)" : "Advance Percentage (%)"}
                </Label>
                <Input
                  id="advance_value"
                  type="number"
                  min="0"
                  max={advanceType === "percentage" ? 100 : undefined}
                  {...register("advance_value", { valueAsNumber: true })}
                  placeholder={advanceType === "flat" ? "e.g., 1000" : "e.g., 30"}
                />
              </div>

              <p className="text-sm text-muted-foreground md:col-span-2">
                {advanceType === "percentage"
                  ? "Teams can pay this percentage of the entry fee as advance, and complete the remaining later."
                  : "Teams can pay this fixed amount as advance, and complete the remaining later."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Size & Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Size & Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_players_per_team">Minimum Players per Team</Label>
              <Input
                id="min_players_per_team"
                type="number"
                min="1"
                {...register("min_players_per_team", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="max_players_per_team">Maximum Players per Team</Label>
              <Input
                id="max_players_per_team"
                type="number"
                min="1"
                {...register("max_players_per_team", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="max_playing_players">Max Playing Players (on field)</Label>
              <Input
                id="max_playing_players"
                type="number"
                min="1"
                {...register("max_playing_players", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground mt-1">Players allowed on the field at once</p>
            </div>

            <div>
              <Label htmlFor="max_subs">Max Substitutes</Label>
              <Input
                id="max_subs"
                type="number"
                min="0"
                {...register("max_subs", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground mt-1">Substitute players allowed per team</p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={watch("registration_open")}
                onCheckedChange={(checked) => setValue("registration_open", checked)}
              />
              <Label>Registration Open</Label>
            </div>

            <div>
              <Label htmlFor="registration_deadline">Registration Deadline (Optional)</Label>
              <Input
                id="registration_deadline"
                type="datetime-local"
                {...register("registration_deadline")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prize & Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prizes & Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prize_details">Prize Details</Label>
            <Input
              id="prize_details"
              {...register("prize_details")}
              placeholder="e.g., Winner: ₹50,000 | Runner-up: ₹25,000"
            />
          </div>

          <div>
            <Label htmlFor="rules">Rules & Format</Label>
            <Textarea
              id="rules"
              {...register("rules")}
              placeholder="Tournament rules, format (knockout/league), team size, etc."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saveTournament.isPending}>
          {saveTournament.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? "Update Tournament" : "Create Tournament"}
        </Button>
      </div>
    </form>
  );
}