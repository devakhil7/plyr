import { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle, IndianRupee } from "lucide-react";

interface PayBalanceDialogProps {
  team: {
    id: string;
    team_name: string;
    total_fee: number;
    total_paid: number;
    tournament_id: string;
  };
  tournamentName: string;
  trigger?: React.ReactNode;
}

export function PayBalanceDialog({ team, tournamentName, trigger }: PayBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const remainingAmount = team.total_fee - team.total_paid;

  const processPayment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please login");

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        payer_id: user.id,
        tournament_id: team.tournament_id,
        tournament_team_id: team.id,
        amount_total: remainingAmount,
        currency: "INR",
        payment_method: "upi",
        payment_purpose: "tournament_entry_balance",
        is_advance: false,
        status: "paid",
        paid_at: new Date().toISOString(),
        turf_id: null as any,
        platform_fee: 0,
        turf_amount: 0,
      });

      if (paymentError) throw paymentError;

      // Update team payment status
      const { error: updateError } = await supabase
        .from("tournament_teams")
        .update({
          total_paid: team.total_fee,
          payment_status: "paid",
        })
        .eq("id", team.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["tournament"] });
      queryClient.invalidateQueries({ queryKey: ["my-tournament-teams"] });
      toast.success("Payment successful!");
    },
    onError: (error) => {
      console.error("Payment error:", error);
      toast.error("Payment failed");
    },
  });

  const handleClose = () => {
    setOpen(false);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Pay Balance
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Remaining Balance</DialogTitle>
        </DialogHeader>

        {!success ? (
          <div className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tournament</span>
                  <span className="font-medium">{tournamentName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team</span>
                  <span className="font-medium">{team.team_name}</span>
                </div>
                <hr />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Entry Fee</span>
                  <span>₹{team.total_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-green-600">₹{team.total_paid.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="font-medium">Remaining Amount</span>
                  <span className="text-lg font-bold text-primary">
                    ₹{remainingAmount.toLocaleString()}
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
              <IndianRupee className="h-4 w-4 mr-2" />
              Pay ₹{remainingAmount.toLocaleString()}
            </Button>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Payment Complete!</h3>
              <p className="text-muted-foreground mt-2">
                You've paid the remaining ₹{remainingAmount.toLocaleString()} for {team.team_name}.
              </p>
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}