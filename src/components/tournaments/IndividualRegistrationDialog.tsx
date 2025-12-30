import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Loader2, CreditCard, CheckCircle, IndianRupee, AlertCircle } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  entry_fee: number;
  allow_part_payment: boolean;
  advance_type: string | null;
  advance_value: number | null;
  registration_open: boolean;
}

interface IndividualRegistrationDialogProps {
  tournament: Tournament;
  trigger?: React.ReactNode;
}

const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
  "Any Position",
];

type Step = "details" | "payment" | "success";

export function IndividualRegistrationDialog({ tournament, trigger }: IndividualRegistrationDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [preferredPosition, setPreferredPosition] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentOption, setPaymentOption] = useState<"full" | "advance">("full");

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is already registered (as individual or team member)
  const { data: existingRegistration, isLoading: checkingRegistration } = useQuery({
    queryKey: ["individual-registration-check", tournament.id, user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Check individual registration
      const { data: individual } = await supabase
        .from("tournament_individual_registrations")
        .select("id, registration_status, assigned_team_id")
        .eq("tournament_id", tournament.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (individual) {
        return { type: "individual" as const, data: individual };
      }

      // Check team registration (as captain)
      const { data: teamCaptain } = await supabase
        .from("tournament_teams")
        .select("id, team_name")
        .eq("tournament_id", tournament.id)
        .eq("captain_user_id", user.id)
        .maybeSingle();

      if (teamCaptain) {
        return { type: "team_captain" as const, data: teamCaptain };
      }

      // Check team registration (as player)
      const { data: teamPlayer } = await supabase
        .from("tournament_team_players")
        .select(`
          id,
          tournament_team_id,
          tournament_teams!inner (id, team_name, tournament_id)
        `)
        .eq("user_id", user.id)
        .eq("tournament_teams.tournament_id", tournament.id)
        .maybeSingle();

      if (teamPlayer) {
        return { type: "team_player" as const, data: teamPlayer };
      }

      return null;
    },
    enabled: !!user && open,
  });

  // Calculate advance amount (for individual, could be proportional)
  const calculateAdvanceAmount = (): number => {
    // For individuals, we might charge a fraction of the team fee or a fixed amount
    // For now, assuming individuals pay the same as team entry fee per person
    const individualFee = tournament.entry_fee; // Could be customized
    if (!tournament.allow_part_payment || !tournament.advance_value) {
      return individualFee;
    }
    if (tournament.advance_type === "percentage") {
      return Math.round((individualFee * tournament.advance_value) / 100);
    }
    return tournament.advance_value;
  };

  const individualFee = tournament.entry_fee;
  const advanceAmount = calculateAdvanceAmount();
  const amountToPay = paymentOption === "advance" ? advanceAmount : individualFee;

  const resetForm = () => {
    setStep("details");
    setPreferredPosition("");
    setNotes("");
    setPaymentOption("full");
  };

  // Register as individual mutation
  const registerIndividual = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please login to register");

      // Double-check for existing registration
      const { data: existing } = await supabase
        .from("tournament_individual_registrations")
        .select("id")
        .eq("tournament_id", tournament.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        throw new Error("You are already registered for this tournament");
      }

      // Create individual registration
      const { data: registration, error } = await supabase
        .from("tournament_individual_registrations")
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          preferred_position: preferredPosition || null,
          notes: notes.trim() || null,
          payment_status: "unpaid",
          registration_status: "pending",
          amount_paid: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return registration;
    },
    onSuccess: () => {
      if (tournament.entry_fee > 0) {
        setStep("payment");
      } else {
        // Free tournament - mark as paid
        processPayment.mutate();
      }
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register");
    },
  });

  // Process payment mutation
  const processPayment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Invalid state");

      // Update registration with payment
      const { error } = await supabase
        .from("tournament_individual_registrations")
        .update({
          amount_paid: amountToPay,
          payment_status: amountToPay >= individualFee ? "paid" : "partial",
          registration_status: "confirmed",
        })
        .eq("tournament_id", tournament.id)
        .eq("user_id", user.id);

      if (error) throw error;

      return { amountPaid: amountToPay };
    },
    onSuccess: () => {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournament.id] });
      queryClient.invalidateQueries({ queryKey: ["individual-registration-check"] });
      queryClient.invalidateQueries({ queryKey: ["tournament-individual-registrations"] });
    },
    onError: (error: any) => {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    },
  });

  const isAlreadyRegistered = existingRegistration != null;

  const getRegistrationMessage = () => {
    if (!existingRegistration) return "";
    
    if (existingRegistration.type === "individual") {
      return existingRegistration.data?.assigned_team_id
        ? "You've been assigned to a team."
        : "Your individual registration is pending team assignment.";
    }
    if (existingRegistration.type === "team_captain") {
      return `You are the captain of team "${existingRegistration.data?.team_name || 'Unknown'}".`;
    }
    if (existingRegistration.type === "team_player") {
      return "You are already registered as a team member.";
    }
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <User className="h-4 w-4 mr-2" />
            Join as Individual
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Join as Individual Player</DialogTitle>
        </DialogHeader>

        {checkingRegistration ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isAlreadyRegistered ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">Already Registered</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  {getRegistrationMessage()}
                </p>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Step 1: Details */}
            {step === "details" && (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Register as an individual player. The tournament organizer will assign you to a team.
                </p>

                <div>
                  <Label>Preferred Position (Optional)</Label>
                  <Select value={preferredPosition} onValueChange={setPreferredPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information for the organizer..."
                    className="h-20"
                  />
                </div>

                {tournament.entry_fee > 0 && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Registration Fee</span>
                        <span className="font-semibold">₹{tournament.entry_fee.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  className="w-full"
                  onClick={() => registerIndividual.mutate()}
                  disabled={registerIndividual.isPending}
                >
                  {registerIndividual.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {tournament.entry_fee > 0 ? "Continue to Payment" : "Register"}
                </Button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === "payment" && (
              <div className="space-y-4 mt-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registration Fee</span>
                      <span className="font-semibold">₹{individualFee.toLocaleString()}</span>
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
                        Pay ₹{individualFee.toLocaleString()} now
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

            {/* Step 3: Success */}
            {step === "success" && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Registration Complete!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've registered as an individual player. The tournament organizer will assign you to a team soon.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <p className="text-sm font-medium">What's Next?</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Wait for team assignment from the organizer</li>
                    <li>• You'll be notified when assigned to a team</li>
                    <li>• Check back on the tournament page for updates</li>
                  </ul>
                </div>

                <Button className="w-full" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
