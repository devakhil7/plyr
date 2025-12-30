import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

export function AdminSettingsTab() {
  const queryClient = useQueryClient();
  
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionValue, setCommissionValue] = useState("10");
  const [payoutFrequency, setPayoutFrequency] = useState("weekly");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      return data || [];
    },
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const ct = settings.find((s: any) => s.setting_key === "default_commission_type");
      const cv = settings.find((s: any) => s.setting_key === "default_commission_value");
      const pf = settings.find((s: any) => s.setting_key === "default_payout_frequency");
      
      // Handle both JSON string and raw value formats
      const parseValue = (val: any) => {
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      };
      
      if (ct?.setting_value) setCommissionType(parseValue(ct.setting_value));
      if (cv?.setting_value) setCommissionValue(String(parseValue(cv.setting_value)));
      if (pf?.setting_value) setPayoutFrequency(parseValue(pf.setting_value));
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ 
          setting_key: key, 
          setting_value: JSON.stringify(value) 
        }, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
  });

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSettingMutation.mutateAsync({ key: "default_commission_type", value: commissionType }),
        updateSettingMutation.mutateAsync({ key: "default_commission_value", value: Number(commissionValue) }),
        updateSettingMutation.mutateAsync({ key: "default_payout_frequency", value: payoutFrequency }),
      ]);
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Settings</h1>

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Default Commission Settings
          </CardTitle>
          <CardDescription>
            These defaults apply to all turfs unless overridden at the turf level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Commission Type</Label>
              <Select value={commissionType} onValueChange={setCommissionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {commissionType === "percentage" 
                  ? "Platform takes a percentage of each transaction" 
                  : "Platform takes a fixed amount per transaction"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Commission Value</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {commissionType === "percentage" ? "%" : "₹"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {commissionType === "percentage"
                  ? `Platform will take ${commissionValue}% of each booking`
                  : `Platform will take ₹${commissionValue} per booking`}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default Payout Frequency</Label>
              <Select value={payoutFrequency} onValueChange={setPayoutFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often payouts are generated for turfs
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={updateSettingMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateSettingMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Box */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Preview</CardTitle>
          <CardDescription>How the commission will be calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm">
              For a <strong>₹1,000</strong> booking:
            </p>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Gross Amount</p>
                <p className="font-medium">₹1,000</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Platform Fee</p>
                <p className="font-medium text-primary">
                  ₹{commissionType === "percentage" 
                    ? (1000 * Number(commissionValue) / 100).toFixed(0) 
                    : commissionValue}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Turf Receives</p>
                <p className="font-medium text-emerald-600">
                  ₹{commissionType === "percentage" 
                    ? (1000 - (1000 * Number(commissionValue) / 100)).toFixed(0) 
                    : (1000 - Number(commissionValue)).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
