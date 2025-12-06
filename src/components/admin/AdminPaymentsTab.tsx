import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { format, parseISO, subDays } from "date-fns";
import { CalendarIcon, Download, DollarSign, TrendingUp, CreditCard, Search } from "lucide-react";

export function AdminPaymentsTab() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTurf, setSearchTurf] = useState("");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-all-payments", dateRange, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*, turfs(name, city), matches(match_name)")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString())
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const filteredPayments = payments?.filter((p: any) =>
    p.turfs?.name?.toLowerCase().includes(searchTurf.toLowerCase()) ||
    p.turfs?.city?.toLowerCase().includes(searchTurf.toLowerCase())
  );

  const summary = {
    totalGross: payments?.reduce((acc, p) => p.status === "paid" ? acc + Number(p.amount_total) : acc, 0) || 0,
    totalFees: payments?.reduce((acc, p) => p.status === "paid" ? acc + Number(p.platform_fee) : acc, 0) || 0,
    totalNet: payments?.reduce((acc, p) => p.status === "paid" ? acc + Number(p.turf_amount) : acc, 0) || 0,
    count: payments?.filter(p => p.status === "paid").length || 0,
  };

  const exportToCSV = () => {
    if (!filteredPayments || filteredPayments.length === 0) return;
    
    const headers = ["Date", "Turf", "Match", "Status", "Gross", "Commission Type", "Commission Value", "Platform Fee", "Turf Amount", "Payout ID"];
    const rows = filteredPayments.map((p: any) => [
      p.paid_at ? format(parseISO(p.paid_at), "yyyy-MM-dd") : "-",
      p.turfs?.name || "-",
      p.matches?.match_name || "-",
      p.status,
      p.amount_total,
      p.commission_type_used || "-",
      p.commission_value_used || "-",
      p.platform_fee,
      p.turf_amount,
      p.payout_id || "-",
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform_payments_${format(new Date(), "yyyy-MM-dd")}.csv`;
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
      <h1 className="text-2xl font-bold">Platform Payments</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">₹{summary.totalGross.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Gross Revenue (GMV)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">₹{summary.totalFees.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Platform Fees Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">₹{summary.totalNet.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Turf Payables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                #
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.count}</p>
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
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search turf..."
                value={searchTurf}
                onChange={(e) => setSearchTurf(e.target.value)}
                className="pl-10"
              />
            </div>
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
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredPayments && filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Turf</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Turf Amount</TableHead>
                  <TableHead>Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.paid_at ? format(parseISO(p.paid_at), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.turfs?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{p.turfs?.city}</p>
                      </div>
                    </TableCell>
                    <TableCell>{p.matches?.match_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">₹{Number(p.amount_total).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">
                      {p.commission_type_used ? (
                        <span>
                          {p.commission_value_used}
                          {p.commission_type_used === "percentage" ? "%" : " flat"}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-primary">₹{Number(p.platform_fee).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(p.turf_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      {p.payout_id ? (
                        <Badge variant="secondary" className="text-xs">Linked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No payments found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
