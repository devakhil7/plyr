import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, subDays } from "date-fns";
import { CalendarIcon, Download, DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";

interface TurfPaymentsTabProps {
  turfId: string;
  turf: any;
}

export function TurfPaymentsTab({ turfId, turf }: TurfPaymentsTabProps) {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ["turf-payments", turfId, dateRange, statusFilter, methodFilter],
    queryFn: async () => {
      if (!turfId) return [];
      let query = supabase
        .from("payments")
        .select("*, matches(match_name, match_date)")
        .eq("turf_id", turfId)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString())
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (methodFilter !== "all") {
        query = query.eq("payment_method", methodFilter);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!turfId,
  });

  // Fetch payouts
  const { data: payouts } = useQuery({
    queryKey: ["turf-payouts", turfId],
    queryFn: async () => {
      if (!turfId) return [];
      const { data } = await supabase
        .from("payouts")
        .select("*")
        .eq("turf_id", turfId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!turfId,
  });

  // Calculate summary
  const summary = {
    grossRevenue: payments?.reduce((acc, p) => p.status === "paid" ? acc + Number(p.amount_total) : acc, 0) || 0,
    platformFees: payments?.reduce((acc, p) => p.status === "paid" ? acc + Number(p.platform_fee) : acc, 0) || 0,
    netEarnings: payments?.reduce((acc, p) => p.status === "paid" ? acc + Number(p.turf_amount) : acc, 0) || 0,
    transactionCount: payments?.filter(p => p.status === "paid").length || 0,
  };

  // Reconciliation calculation
  const totalPayoutsPaid = payouts?.reduce((acc, p) => p.status === "paid" ? acc + Number(p.amount_net) : acc, 0) || 0;
  const pendingAmount = summary.netEarnings - totalPayoutsPaid;
  const reconciliation = {
    totalNetEarnings: summary.netEarnings,
    totalPayoutsPaid,
    pending: pendingAmount,
  };

  const exportToCSV = () => {
    if (!payments || payments.length === 0) return;
    
    const headers = ["Date", "Match", "Method", "Status", "Gross", "Fee", "Net"];
    const rows = payments.map(p => [
      p.paid_at ? format(parseISO(p.paid_at), "yyyy-MM-dd") : "-",
      p.matches?.match_name || "-",
      p.payment_method,
      p.status,
      p.amount_total,
      p.platform_fee,
      p.turf_amount,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      failed: "destructive",
      refunded: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments & Payouts</h1>
        <p className="text-muted-foreground">Track your revenue and settlements</p>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">₹{summary.grossRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Gross Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">₹{summary.platformFees.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Platform Fees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold">₹{summary.netEarnings.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Net Earnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {summary.transactionCount}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summary.transactionCount}</p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : payments && payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {p.paid_at ? format(parseISO(p.paid_at), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell>{p.matches?.match_name || "-"}</TableCell>
                        <TableCell>{p.profiles?.name || p.profiles?.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.payment_method}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-right">₹{Number(p.amount_total).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">₹{Number(p.turf_amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No transactions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Settlements from SPORTIQ to your bank account</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts && payouts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Fees</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payout Date</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {format(parseISO(p.period_start), "dd MMM")} - {format(parseISO(p.period_end), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>₹{Number(p.amount_gross).toLocaleString()}</TableCell>
                        <TableCell>₹{Number(p.amount_fees).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">₹{Number(p.amount_net).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell>
                          {p.payout_date ? format(parseISO(p.payout_date), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.payout_reference || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No payouts yet. Payouts are processed periodically.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Summary</CardTitle>
              <CardDescription>Match your expected earnings with received payouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Total Net Earnings</p>
                  <p className="text-2xl font-bold">₹{reconciliation.totalNetEarnings.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Total Payouts Received</p>
                  <p className="text-2xl font-bold">₹{reconciliation.totalPayoutsPaid.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-lg ${reconciliation.pending > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className="text-sm text-muted-foreground">Pending / Unsettled</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    ₹{reconciliation.pending.toLocaleString()}
                    {reconciliation.pending > 0 && <AlertCircle className="h-5 w-5 text-amber-500" />}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                * This is based on all-time data. Payouts are typically processed weekly/fortnightly.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
