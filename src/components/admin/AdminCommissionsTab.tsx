import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Edit, Search, Percent, DollarSign } from "lucide-react";

export function AdminCommissionsTab() {
  const queryClient = useQueryClient();
  const [searchTurf, setSearchTurf] = useState("");

  const { data: turfs, isLoading } = useQuery({
    queryKey: ["admin-turfs-commissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("turfs")
        .select("id, name, city, active, commission_type, commission_value, payout_frequency")
        .order("name");
      return data || [];
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      const settings: any = {};
      data?.forEach((s: any) => {
        settings[s.setting_key] = JSON.parse(s.setting_value);
      });
      return settings;
    },
  });

  const filteredTurfs = turfs?.filter((t: any) =>
    t.name?.toLowerCase().includes(searchTurf.toLowerCase()) ||
    t.city?.toLowerCase().includes(searchTurf.toLowerCase())
  );

  const getEffectiveCommission = (turf: any) => {
    if (turf.commission_type && turf.commission_value !== null) {
      return {
        type: turf.commission_type,
        value: turf.commission_value,
        isOverride: true,
      };
    }
    return {
      type: platformSettings?.default_commission_type || "percentage",
      value: platformSettings?.default_commission_value || 10,
      isOverride: false,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Turfs & Commissions</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search turfs..."
            value={searchTurf}
            onChange={(e) => setSearchTurf(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Default</Badge>
              <span className="text-sm">
                {platformSettings?.default_commission_type === "percentage" ? (
                  <>{platformSettings?.default_commission_value}%</>
                ) : (
                  <>₹{platformSettings?.default_commission_value} flat</>
                )}
              </span>
            </div>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">
              Turfs with overrides are highlighted. Click Edit to customize.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Turfs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredTurfs && filteredTurfs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turf</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Payout Frequency</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTurfs.map((t: any) => {
                  const commission = getEffectiveCommission(t);
                  return (
                    <TableRow key={t.id} className={commission.isOverride ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.city}</TableCell>
                      <TableCell>
                        <Badge variant={t.active ? "default" : "secondary"}>
                          {t.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {commission.type === "percentage" ? (
                            <Percent className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>
                            {commission.type === "percentage" 
                              ? `${commission.value}%` 
                              : `₹${commission.value}`}
                          </span>
                          {commission.isOverride && (
                            <Badge variant="outline" className="text-xs">Override</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.payout_frequency || platformSettings?.default_payout_frequency || "weekly"}
                      </TableCell>
                      <TableCell>
                        <EditCommissionDialog 
                          turf={t} 
                          platformSettings={platformSettings}
                          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-turfs-commissions"] })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No turfs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditCommissionDialog({ 
  turf, 
  platformSettings,
  onSuccess 
}: { 
  turf: any; 
  platformSettings: any;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [useOverride, setUseOverride] = useState(turf.commission_type !== null);
  const [commissionType, setCommissionType] = useState(turf.commission_type || platformSettings?.default_commission_type || "percentage");
  const [commissionValue, setCommissionValue] = useState(String(turf.commission_value ?? platformSettings?.default_commission_value ?? 10));
  const [payoutFrequency, setPayoutFrequency] = useState(turf.payout_frequency || "default");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = useOverride 
        ? { 
            commission_type: commissionType, 
            commission_value: Number(commissionValue),
            payout_frequency: payoutFrequency === "default" ? null : payoutFrequency,
          }
        : { 
            commission_type: null, 
            commission_value: null,
            payout_frequency: payoutFrequency === "default" ? null : payoutFrequency,
          };

      const { error } = await supabase.from("turfs").update(updateData).eq("id", turf.id);
      if (error) throw error;

      toast.success("Commission settings updated");
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Commission: {turf.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Override Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <Label>Use Custom Commission</Label>
              <p className="text-xs text-muted-foreground">Override platform defaults for this turf</p>
            </div>
            <Switch checked={useOverride} onCheckedChange={setUseOverride} />
          </div>

          {/* Commission Fields */}
          <div className={`space-y-4 ${!useOverride ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
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
              </div>
            </div>
          </div>

          {/* Payout Frequency */}
          <div className="space-y-2">
            <Label>Payout Frequency</Label>
            <Select value={payoutFrequency} onValueChange={setPayoutFrequency}>
              <SelectTrigger>
                <SelectValue placeholder="Use platform default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Use platform default</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {useOverride && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview for ₹1,000 booking:</p>
              <div className="grid grid-cols-2 gap-4">
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
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
