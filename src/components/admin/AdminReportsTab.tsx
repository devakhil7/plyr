import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, parseISO } from "date-fns";
import { CalendarIcon, Download, TrendingUp, DollarSign, AlertCircle, Building } from "lucide-react";

export function AdminReportsTab() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch all payments for reports
  const { data: payments } = useQuery({
    queryKey: ["admin-reports-payments", dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, turfs(id, name, city)")
        .eq("status", "paid")
        .gte("paid_at", dateRange.from.toISOString())
        .lte("paid_at", dateRange.to.toISOString());
      return data || [];
    },
  });

  // Fetch all payouts
  const { data: payouts } = useQuery({
    queryKey: ["admin-reports-payouts", dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from("payouts")
        .select("*, turfs(id, name, city)")
        .eq("status", "paid")
        .gte("payout_date", dateRange.from.toISOString())
        .lte("payout_date", dateRange.to.toISOString());
      return data || [];
    },
  });

  // Platform-level metrics
  const platformMetrics = {
    gmv: payments?.reduce((acc, p) => acc + Number(p.amount_total), 0) || 0,
    platformFees: payments?.reduce((acc, p) => acc + Number(p.platform_fee), 0) || 0,
    turfPayables: payments?.reduce((acc, p) => acc + Number(p.turf_amount), 0) || 0,
    totalPayoutsPaid: payouts?.reduce((acc, p) => acc + Number(p.amount_net), 0) || 0,
    transactionCount: payments?.length || 0,
  };

  const outstandingLiability = platformMetrics.turfPayables - platformMetrics.totalPayoutsPaid;

  // Per-turf breakdown
  const turfBreakdown = payments?.reduce((acc: any[], p: any) => {
    const existing = acc.find(t => t.turf_id === p.turf_id);
    if (existing) {
      existing.gross += Number(p.amount_total);
      existing.fees += Number(p.platform_fee);
      existing.net += Number(p.turf_amount);
      existing.count += 1;
    } else {
      acc.push({
        turf_id: p.turf_id,
        name: p.turfs?.name || "Unknown",
        city: p.turfs?.city || "-",
        gross: Number(p.amount_total),
        fees: Number(p.platform_fee),
        net: Number(p.turf_amount),
        count: 1,
      });
    }
    return acc;
  }, []) || [];

  // Calculate outstanding per turf
  const turfOutstanding = turfBreakdown.map(turf => {
    const turfPayouts = payouts?.filter(p => p.turf_id === turf.turf_id) || [];
    const paidOut = turfPayouts.reduce((acc, p) => acc + Number(p.amount_net), 0);
    return {
      ...turf,
      paidOut,
      outstanding: turf.net - paidOut,
    };
  }).sort((a, b) => b.outstanding - a.outstanding);

  const exportReport = () => {
    const headers = ["Turf", "City", "Transactions", "GMV", "Platform Fees", "Turf Net", "Paid Out", "Outstanding"];
    const rows = turfOutstanding.map(t => [
      t.name,
      t.city,
      t.count,
      t.gross,
      t.fees,
      t.net,
      t.paidOut,
      t.outstanding,
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
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
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Platform Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xl font-bold">₹{platformMetrics.gmv.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">GMV</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xl font-bold">₹{platformMetrics.platformFees.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Platform Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">₹{platformMetrics.turfPayables.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Turf Payables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-xl font-bold">₹{platformMetrics.totalPayoutsPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={outstandingLiability > 0 ? "border-amber-500" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className={`h-8 w-8 ${outstandingLiability > 0 ? "text-amber-500" : "text-green-500"}`} />
              <div>
                <p className="text-xl font-bold">₹{outstandingLiability.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Turf Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Turf Breakdown</CardTitle>
          <CardDescription>Revenue and liability status for each turf</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {turfOutstanding.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turf</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                  <TableHead className="text-right">Platform Fees</TableHead>
                  <TableHead className="text-right">Turf Net</TableHead>
                  <TableHead className="text-right">Paid Out</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turfOutstanding.map((t: any) => (
                  <TableRow key={t.turf_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.city}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{t.count}</TableCell>
                    <TableCell className="text-right">₹{t.gross.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-primary">₹{t.fees.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{t.net.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">₹{t.paidOut.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-medium ${t.outstanding > 0 ? "text-amber-600" : "text-green-600"}`}>
                      ₹{t.outstanding.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No data for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
