import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, subDays, startOfWeek, endOfWeek } from "date-fns";
import { CalendarIcon, Plus, DollarSign, CheckCircle, Clock, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";

export function AdminPayoutsTab() {
  const queryClient = useQueryClient();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["admin-all-payouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payouts")
        .select("*, turfs(name, city)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: turfs } = useQuery({
    queryKey: ["admin-turfs-for-payout"],
    queryFn: async () => {
      const { data } = await supabase.from("turfs").select("id, name, city").eq("active", true);
      return data || [];
    },
  });

  const summary = {
    totalPaid: payouts?.filter(p => p.status === "paid").reduce((acc, p) => acc + Number(p.amount_net), 0) || 0,
    totalScheduled: payouts?.filter(p => p.status === "scheduled").reduce((acc, p) => acc + Number(p.amount_net), 0) || 0,
    totalPending: payouts?.filter(p => p.status === "pending").reduce((acc, p) => acc + Number(p.amount_net), 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline"; icon: any }> = {
      paid: { variant: "default", icon: CheckCircle },
      scheduled: { variant: "secondary", icon: Clock },
      pending: { variant: "outline", icon: AlertCircle },
    };
    const { variant, icon: Icon } = config[status] || { variant: "outline", icon: AlertCircle };
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payouts Management</h1>
        <GeneratePayoutDialog turfs={turfs || []} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-all-payouts"] })} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">₹{summary.totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">₹{summary.totalScheduled.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">₹{summary.totalPending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payouts</CardTitle>
          <CardDescription>Track and manage turf owner settlements</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : payouts && payouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turf</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.turfs?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{p.turfs?.city}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(p.period_start), "dd MMM")} - {format(parseISO(p.period_end), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">₹{Number(p.amount_gross).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-primary">₹{Number(p.amount_fees).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(p.amount_net).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell>
                      {p.payout_date ? format(parseISO(p.payout_date), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.payout_reference || "-"}</TableCell>
                    <TableCell>
                      <PayoutActionsDialog payout={p} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-all-payouts"] })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No payouts created yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GeneratePayoutDialog({ turfs, onSuccess }: { turfs: any[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedTurf, setSelectedTurf] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: startOfWeek(subDays(new Date(), 7)),
    to: endOfWeek(subDays(new Date(), 7)),
  });
  const [preview, setPreview] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const fetchPreview = async () => {
    if (!selectedTurf) return;
    
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("turf_id", selectedTurf)
      .eq("status", "paid")
      .is("payout_id", null)
      .gte("paid_at", dateRange.from.toISOString())
      .lte("paid_at", dateRange.to.toISOString());

    if (payments && payments.length > 0) {
      const gross = payments.reduce((acc, p) => acc + Number(p.amount_total), 0);
      const fees = payments.reduce((acc, p) => acc + Number(p.platform_fee), 0);
      const net = payments.reduce((acc, p) => acc + Number(p.turf_amount), 0);
      setPreview({ count: payments.length, gross, fees, net, payments });
    } else {
      setPreview({ count: 0, gross: 0, fees: 0, net: 0, payments: [] });
    }
  };

  const handleGenerate = async () => {
    if (!selectedTurf || !preview || preview.count === 0) return;
    
    setGenerating(true);
    try {
      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from("payouts")
        .insert({
          turf_id: selectedTurf,
          period_start: dateRange.from.toISOString().split("T")[0],
          period_end: dateRange.to.toISOString().split("T")[0],
          amount_gross: preview.gross,
          amount_fees: preview.fees,
          amount_net: preview.net,
          status: "scheduled",
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Update payments with payout_id
      const paymentIds = preview.payments.map((p: any) => p.id);
      const { error: updateError } = await supabase
        .from("payments")
        .update({ payout_id: payout.id })
        .in("id", paymentIds);

      if (updateError) throw updateError;

      toast.success(`Payout generated for ${preview.count} payments`);
      setOpen(false);
      setPreview(null);
      setSelectedTurf("");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate payout");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Generate Payout</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Payout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Turf</Label>
            <Select value={selectedTurf} onValueChange={setSelectedTurf}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a turf" />
              </SelectTrigger>
              <SelectContent>
                {turfs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.city})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "dd MMM yyyy")} - {format(dateRange.to, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setPreview(null);
                    }
                  }}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" onClick={fetchPreview} disabled={!selectedTurf} className="w-full">
            Preview Payout
          </Button>

          {preview && (
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payments to include:</span>
                <span className="font-medium">{preview.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Amount:</span>
                <span>₹{preview.gross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fees:</span>
                <span className="text-primary">₹{preview.fees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Net Payout:</span>
                <span className="font-bold text-lg">₹{preview.net.toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleGenerate} 
            disabled={!preview || preview.count === 0 || generating} 
            className="w-full"
          >
            {generating ? "Generating..." : "Generate Payout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayoutActionsDialog({ payout, onSuccess }: { payout: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(payout.status);
  const [reference, setReference] = useState(payout.payout_reference || "");
  const [saving, setSaving] = useState(false);

  const { data: linkedPayments } = useQuery({
    queryKey: ["payout-payments", payout.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, matches(match_name)")
        .eq("payout_id", payout.id);
      return data || [];
    },
    enabled: open,
  });

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updateData: any = { status, payout_reference: reference };
      if (status === "paid" && !payout.payout_date) {
        updateData.payout_date = new Date().toISOString();
      }
      
      const { error } = await supabase.from("payouts").update(updateData).eq("id", payout.id);
      if (error) throw error;
      
      toast.success("Payout updated");
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
        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference / UTR</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction reference" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Gross</p>
              <p className="font-medium">₹{Number(payout.amount_gross).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fees</p>
              <p className="font-medium text-primary">₹{Number(payout.amount_fees).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="font-bold">₹{Number(payout.amount_net).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Linked Payments ({linkedPayments?.length || 0})</h4>
            {linkedPayments && linkedPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedPayments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.matches?.match_name || "-"}</TableCell>
                      <TableCell className="text-right">₹{Number(p.amount_total).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{Number(p.platform_fee).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{Number(p.turf_amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No linked payments</p>
            )}
          </div>

          <Button onClick={handleUpdate} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Update Payout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
