import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, UserPlus, Trash2, Loader2, CreditCard, CheckCircle, IndianRupee, Clock, Calendar, ClipboardCheck, AlertCircle } from "lucide-react";

interface Player {
  name: string;
  contact: string;
}

interface Tournament {
  id: string;
  name: string;
  entry_fee: number;
  allow_part_payment: boolean;
  advance_type: string | null;
  advance_value: number | null;
  min_players_per_team: number;
  max_players_per_team: number;
  registration_open: boolean;
  registration_deadline: string | null;
}

interface TournamentRegistrationDialogProps {
  tournament: Tournament;
  trigger?: React.ReactNode;
}

type Step = "team" | "players" | "payment" | "success";

export function TournamentRegistrationDialog({ tournament, trigger }: TournamentRegistrationDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("team");
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState<Player[]>([{ name: "", contact: "" }]);
  const [paymentOption, setPaymentOption] = useState<"full" | "advance">("full");
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [teamNameError, setTeamNameError] = useState<string | null>(null);

  // Check for duplicate team name
  const checkDuplicateTeamName = async (name: string) => {
    if (!name.trim()) {
      setTeamNameError(null);
      return;
    }
    
    const { data: existingTeams } = await supabase
      .from("tournament_teams")
      .select("id, team_name")
      .eq("tournament_id", tournament.id)
      .ilike("team_name", name.trim());
    
    if (existingTeams && existingTeams.length > 0) {
      setTeamNameError("A team with this name already exists in this tournament");
    } else {
      setTeamNameError(null);
    }
  };

  // Debounced team name check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkDuplicateTeamName(teamName);
    }, 500);
    return () => clearTimeout(timer);
  }, [teamName, tournament.id]);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Calculate advance amount
  const calculateAdvanceAmount = (): number => {
    if (!tournament.allow_part_payment || !tournament.advance_value) {
      return tournament.entry_fee;
    }
    if (tournament.advance_type === "percentage") {
      return Math.round((tournament.entry_fee * tournament.advance_value) / 100);
    }
    return tournament.advance_value;
  };

  const advanceAmount = calculateAdvanceAmount();
  const amountToPay = paymentOption === "advance" ? advanceAmount : tournament.entry_fee;

  const resetForm = () => {
    setStep("team");
    setTeamName("");
    setPlayers([{ name: "", contact: "" }]);
    setPaymentOption("full");
    setCreatedTeamId(null);
    setPaymentStatus(null);
    setTeamNameError(null);
  };

  const addPlayer = () => {
    if (players.length < tournament.max_players_per_team) {
      setPlayers([...players, { name: "", contact: "" }]);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > tournament.min_players_per_team) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, field: keyof Player, value: string) => {
    const updated = [...players];
    updated[index][field] = value;
    setPlayers(updated);
  };

  // Step 1: Validate team name
  const isTeamValid = teamName.trim().length > 0 && !teamNameError;

  // Step 2: Validate players
  const isPlayersValid = 
    players.length >= tournament.min_players_per_team &&
    players.length <= tournament.max_players_per_team &&
    players.every((p) => p.name.trim().length > 0);

  // Register team mutation
  const registerTeam = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please login to register");

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("tournament_teams")
        .insert({
          tournament_id: tournament.id,
          team_name: teamName.trim(),
          captain_user_id: user.id,
          total_fee: tournament.entry_fee,
          total_paid: 0,
          payment_status: "unpaid",
          registration_status: "pending",
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Create players
      const playerRecords = players.map((p) => ({
        tournament_team_id: team.id,
        player_name: p.name.trim(),
        player_contact: p.contact.trim() || null,
      }));

      const { error: playersError } = await supabase
        .from("tournament_team_players")
        .insert(playerRecords);

      if (playersError) throw playersError;

      return team;
    },
    onSuccess: (team) => {
      setCreatedTeamId(team.id);
      setStep("payment");
    },
    onError: (error) => {
      console.error("Registration error:", error);
      toast.error("Failed to register team");
    },
  });

  // Process payment mutation
  const processPayment = useMutation({
    mutationFn: async () => {
      if (!user || !createdTeamId) throw new Error("Invalid state");

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        payer_id: user.id,
        tournament_id: tournament.id,
        tournament_team_id: createdTeamId,
        amount_total: amountToPay,
        currency: "INR",
        payment_method: "upi", // Simulated
        payment_purpose: paymentOption === "advance" ? "tournament_entry_advance" : "tournament_entry_full",
        is_advance: paymentOption === "advance",
        status: "paid",
        paid_at: new Date().toISOString(),
        turf_id: null as any, // Required field but not applicable for tournament
        platform_fee: 0,
        turf_amount: 0,
      });

      if (paymentError) throw paymentError;

      // Update team payment status
      const newTotalPaid = amountToPay;
      const newPaymentStatus = newTotalPaid >= tournament.entry_fee ? "paid" : "partial";

      const { error: updateError } = await supabase
        .from("tournament_teams")
        .update({
          total_paid: newTotalPaid,
          payment_status: newPaymentStatus,
          registration_status: "confirmed",
        })
        .eq("id", createdTeamId);

      if (updateError) throw updateError;

      return { paymentStatus: newPaymentStatus, amountPaid: amountToPay };
    },
    onSuccess: (result) => {
      setPaymentStatus(result.paymentStatus);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournament.id] });
      queryClient.invalidateQueries({ queryKey: ["my-tournament-teams"] });
    },
    onError: (error) => {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    },
  });

  const getStepNumber = () => {
    switch (step) {
      case "team": return 1;
      case "players": return 2;
      case "payment": return 3;
      case "success": return 4;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Register Your Team
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {tournament.name}</DialogTitle>
        </DialogHeader>

        {/* Progress */}
        {step !== "success" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {getStepNumber()} of 3</span>
              <span>
                {step === "team" && "Team Details"}
                {step === "players" && "Player Details"}
                {step === "payment" && "Payment"}
              </span>
            </div>
            <Progress value={(getStepNumber() / 3) * 100} />
          </div>
        )}

        {/* Step 1: Team Name */}
        {step === "team" && (
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team name"
                className={teamNameError ? "border-destructive" : ""}
              />
              {teamNameError && (
                <p className="text-sm text-destructive mt-1">{teamNameError}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep("players")} disabled={!isTeamValid}>
                Next: Add Players
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Players */}
        {step === "players" && (
          <div className="space-y-4 mt-4">
            {/* Player count indicator */}
            <Card className={`border-2 ${
              players.length >= tournament.min_players_per_team 
                ? "border-green-500/50 bg-green-50/50" 
                : "border-orange-500/50 bg-orange-50/50"
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className={`h-5 w-5 ${
                      players.length >= tournament.min_players_per_team ? "text-green-600" : "text-orange-600"
                    }`} />
                    <div>
                      <p className="font-semibold text-sm">
                        {players.length} / {tournament.max_players_per_team} Players
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {players.length < tournament.min_players_per_team ? (
                          <span className="text-orange-600">
                            Need {tournament.min_players_per_team - players.length} more (min {tournament.min_players_per_team} required)
                          </span>
                        ) : (
                          <span className="text-green-600">
                            ✓ Minimum requirement met ({tournament.min_players_per_team}+ players)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPlayer}
                    disabled={players.length >= tournament.max_players_per_team}
                    className="shrink-0"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {/* Progress bar */}
                <div className="mt-2">
                  <Progress 
                    value={(players.length / tournament.max_players_per_team) * 100} 
                    className={`h-2 ${
                      players.length >= tournament.min_players_per_team ? "[&>div]:bg-green-500" : "[&>div]:bg-orange-500"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {players.map((player, index) => (
                <Card key={index}>
                  <CardContent className="p-3 flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder={`Player ${index + 1} name *`}
                        value={player.name}
                        onChange={(e) => updatePlayer(index, "name", e.target.value)}
                      />
                      <Input
                        placeholder="Contact (optional)"
                        value={player.contact}
                        onChange={(e) => updatePlayer(index, "contact", e.target.value)}
                      />
                    </div>
                    {players.length > tournament.min_players_per_team && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlayer(index)}
                        className="text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("team")}>
                Back
              </Button>
              <Button 
                onClick={() => registerTeam.mutate()} 
                disabled={!isPlayersValid || registerTeam.isPending}
              >
                {registerTeam.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save & Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === "payment" && (
          <div className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span className="font-semibold">₹{tournament.entry_fee.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <RadioGroup
              value={paymentOption}
              onValueChange={(v) => setPaymentOption(v as "full" | "advance")}
              className="space-y-3"
            >
              <label
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentOption === "full" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="full" />
                <div className="flex-1">
                  <p className="font-medium">Pay Full Amount</p>
                  <p className="text-sm text-muted-foreground">
                    Pay ₹{tournament.entry_fee.toLocaleString()} now
                  </p>
                </div>
                <IndianRupee className="h-5 w-5 text-muted-foreground" />
              </label>

              {tournament.allow_part_payment && (
                <label
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentOption === "advance" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="advance" />
                  <div className="flex-1">
                    <p className="font-medium">Pay Advance Only</p>
                    <p className="text-sm text-muted-foreground">
                      Pay ₹{advanceAmount.toLocaleString()} now
                      {tournament.advance_type === "percentage" && ` (${tournament.advance_value}%)`}
                      , remaining ₹{(tournament.entry_fee - advanceAmount).toLocaleString()} later
                    </p>
                  </div>
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </label>
              )}
            </RadioGroup>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Amount to Pay</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{amountToPay.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={() => processPayment.mutate()}
              disabled={processPayment.isPending}
            >
              {processPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ₹{amountToPay.toLocaleString()}
            </Button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="py-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Registration Submitted!</h3>
                <p className="text-muted-foreground mt-1">
                  Your team <strong>{teamName}</strong> has been registered.
                </p>
              </div>
            </div>

            {/* Payment Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-medium">₹{amountToPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className={`font-medium ${paymentStatus === "paid" ? "text-green-600" : "text-orange-600"}`}>
                    {paymentStatus === "paid" ? "Fully Paid" : "Partial (Advance)"}
                  </span>
                </div>
                {paymentStatus === "partial" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Balance</span>
                    <span className="font-medium text-orange-600">
                      ₹{(tournament.entry_fee - amountToPay).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Steps */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                What happens next?
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <ClipboardCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-blue-900">1. Organizer Review</p>
                    <p className="text-xs text-blue-700">
                      The tournament organizer will review and approve your team registration.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <Calendar className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-purple-900">2. Match Schedule</p>
                    <p className="text-xs text-purple-700">
                      Once approved, you'll receive your match fixtures and schedule.
                    </p>
                  </div>
                </div>
                {paymentStatus === "partial" && (
                  <div className="flex gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-orange-900">3. Complete Payment</p>
                      <p className="text-xs text-orange-700">
                        Pay the remaining ₹{(tournament.entry_fee - amountToPay).toLocaleString()} before the tournament starts.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              You can view your team details and track status on the tournament page.
            </p>

            <Button className="w-full" onClick={() => {
              setOpen(false);
              resetForm();
            }}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}