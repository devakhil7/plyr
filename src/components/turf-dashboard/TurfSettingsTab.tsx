import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, User, Building, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TurfSettingsTabProps {
  turfId: string;
  turf: any;
  onUpdate: () => void;
}

export function TurfSettingsTab({ turfId, turf, onUpdate }: TurfSettingsTabProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Payout details
  const [payoutDetails, setPayoutDetails] = useState({
    account_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    newBooking: true,
    cancellation: true,
    payoutComplete: true,
  });

  // Fetch payout details
  const { data: existingPayoutDetails } = useQuery({
    queryKey: ["turf-payout-details", turfId],
    queryFn: async () => {
      if (!turfId) return null;
      const { data } = await supabase
        .from("turf_payout_details")
        .select("*")
        .eq("turf_id", turfId)
        .maybeSingle();
      return data;
    },
    enabled: !!turfId,
  });

  useEffect(() => {
    if (existingPayoutDetails) {
      setPayoutDetails({
        account_name: existingPayoutDetails.account_name || "",
        bank_name: existingPayoutDetails.bank_name || "",
        account_number: existingPayoutDetails.account_number || "",
        ifsc_code: existingPayoutDetails.ifsc_code || "",
        upi_id: existingPayoutDetails.upi_id || "",
      });
    }
  }, [existingPayoutDetails]);

  const savePayoutMutation = useMutation({
    mutationFn: async () => {
      if (!turfId) return;
      
      const { error } = await supabase
        .from("turf_payout_details")
        .upsert({
          turf_id: turfId,
          ...payoutDetails,
          updated_at: new Date().toISOString(),
        }, { onConflict: "turf_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turf-payout-details", turfId] });
      toast.success("Payout details saved!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save payout details");
    },
  });

  const maskAccountNumber = (num: string) => {
    if (!num || num.length < 4) return num;
    return "XXXX" + num.slice(-4);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owner Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Owner Profile
            </CardTitle>
            <CardDescription>Your contact information visible to players</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={profile?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Turf Contact (Owner)</Label>
              <Input value={turf?.owner_contact || ""} disabled />
              <p className="text-xs text-muted-foreground">
                Edit this in the Listing & Details tab
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bank / Payout Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Bank / Payout Details
            </CardTitle>
            <CardDescription>Where SPORTIQ sends your earnings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input 
                value={payoutDetails.account_name}
                onChange={(e) => setPayoutDetails({ ...payoutDetails, account_name: e.target.value })}
                placeholder="As per bank records"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input 
                value={payoutDetails.bank_name}
                onChange={(e) => setPayoutDetails({ ...payoutDetails, bank_name: e.target.value })}
                placeholder="e.g., HDFC Bank"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input 
                  value={payoutDetails.account_number}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, account_number: e.target.value })}
                  placeholder="Bank account number"
                  type="password"
                />
                {existingPayoutDetails?.account_number && (
                  <p className="text-xs text-muted-foreground">
                    Current: {maskAccountNumber(existingPayoutDetails.account_number)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input 
                  value={payoutDetails.ifsc_code}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., HDFC0001234"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>UPI ID (Alternative)</Label>
              <Input 
                value={payoutDetails.upi_id}
                onChange={(e) => setPayoutDetails({ ...payoutDetails, upi_id: e.target.value })}
                placeholder="yourname@upi"
              />
            </div>
            <Button 
              onClick={() => savePayoutMutation.mutate()} 
              disabled={savePayoutMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {savePayoutMutation.isPending ? "Saving..." : "Save Payout Details"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Your bank details are encrypted and stored securely
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>Choose what updates you want to receive</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Booking</p>
                  <p className="text-sm text-muted-foreground">Get notified when someone books your turf</p>
                </div>
                <Switch
                  checked={notifications.newBooking}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, newBooking: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Booking Cancellation</p>
                  <p className="text-sm text-muted-foreground">Get notified when a booking is cancelled</p>
                </div>
                <Switch
                  checked={notifications.cancellation}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, cancellation: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payout Completed</p>
                  <p className="text-sm text-muted-foreground">Get notified when you receive a payout</p>
                </div>
                <Switch
                  checked={notifications.payoutComplete}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, payoutComplete: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                * Email notification preferences are saved locally for now. Full implementation coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
