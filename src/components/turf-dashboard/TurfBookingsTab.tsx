import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, parseISO, addDays, subDays } from "date-fns";
import { CalendarIcon, Plus, Eye, X, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface TurfBookingsTabProps {
  turfId: string;
  turf: any;
}

export function TurfBookingsTab({ turfId, turf }: TurfBookingsTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    date: new Date(),
    time: "18:00",
    duration: 60,
    contactName: "",
    contactPhone: "",
    amount: turf?.price_per_hour || 0,
  });

  // Fetch matches (bookings) for this turf
  const { data: matches, isLoading } = useQuery({
    queryKey: ["turf-bookings-list", turfId, dateRange, statusFilter],
    queryFn: async () => {
      if (!turfId) return [];
      let query = supabase
        .from("matches")
        .select("*, profiles!matches_host_id_fkey(name, email)")
        .eq("turf_id", turfId)
        .gte("match_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("match_date", format(dateRange.to, "yyyy-MM-dd"))
        .order("match_date", { ascending: true });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!turfId,
  });

  // Fetch payment status for matches
  const { data: paymentStatuses } = useQuery({
    queryKey: ["turf-booking-payments", turfId, matches?.map(m => m.id)],
    queryFn: async () => {
      if (!matches || matches.length === 0) return {};
      const matchIds = matches.map(m => m.id);
      const { data } = await supabase
        .from("payments")
        .select("match_id, status, amount_total")
        .in("match_id", matchIds);
      
      const statusMap: Record<string, { status: string; amount: number }> = {};
      data?.forEach(p => {
        statusMap[p.match_id] = { status: p.status, amount: Number(p.amount_total) };
      });
      return statusMap;
    },
    enabled: !!matches && matches.length > 0,
  });

  // Cancel match mutation
  const cancelMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .update({ status: "cancelled" as const })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turf-bookings-list"] });
      toast.success("Booking cancelled");
    },
  });

  // Add manual booking mutation
  const addBookingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Create match
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          match_name: `Walk-in: ${newBooking.contactName}`,
          match_date: format(newBooking.date, "yyyy-MM-dd"),
          match_time: newBooking.time,
          duration_minutes: newBooking.duration,
          turf_id: turfId,
          host_id: user.id,
          is_offline_booking: true,
          offline_contact_name: newBooking.contactName,
          offline_contact_phone: newBooking.contactPhone,
          status: "completed",
          total_slots: 1,
        })
        .select()
        .single();
      
      if (matchError) throw matchError;

      // Create payment record
      const platformFee = newBooking.amount * 0.1; // 10% platform fee
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          match_id: match.id,
          turf_id: turfId,
          payer_id: user.id,
          amount_total: newBooking.amount,
          platform_fee: platformFee,
          turf_amount: newBooking.amount - platformFee,
          payment_method: "cash",
          status: "paid",
          paid_at: new Date().toISOString(),
        });
      
      if (paymentError) throw paymentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turf-bookings-list"] });
      setAddBookingOpen(false);
      setNewBooking({
        date: new Date(),
        time: "18:00",
        duration: 60,
        contactName: "",
        contactPhone: "",
        amount: turf?.price_per_hour || 0,
      });
      toast.success("Manual booking added!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add booking");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      full: "secondary",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPaymentBadge = (matchId: string) => {
    const payment = paymentStatuses?.[matchId];
    if (!payment) return <Badge variant="outline">No payment</Badge>;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      failed: "destructive",
      refunded: "outline",
    };
    return (
      <Badge variant={variants[payment.status] || "outline"}>
        {payment.status} (₹{payment.amount})
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">Manage match bookings at your turf</p>
        </div>
        <Dialog open={addBookingOpen} onOpenChange={setAddBookingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Manual Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Manual Booking (Walk-in)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newBooking.date, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newBooking.date}
                        onSelect={(date) => date && setNewBooking({ ...newBooking, date })}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Select 
                    value={String(newBooking.duration)} 
                    onValueChange={(v) => setNewBooking({ ...newBooking, duration: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">120 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid (₹)</Label>
                  <Input
                    type="number"
                    value={newBooking.amount}
                    onChange={(e) => setNewBooking({ ...newBooking, amount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={newBooking.contactName}
                  onChange={(e) => setNewBooking({ ...newBooking, contactName: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={newBooking.contactPhone}
                  onChange={(e) => setNewBooking({ ...newBooking, contactPhone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => addBookingMutation.mutate()}
                disabled={addBookingMutation.isPending || !newBooking.contactName}
              >
                {addBookingMutation.isPending ? "Adding..." : "Add Booking"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : matches && matches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Match Name</TableHead>
                  <TableHead>Host/Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{format(parseISO(m.match_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{m.match_time?.slice(0, 5)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{m.match_name}</p>
                        {m.is_offline_booking && (
                          <Badge variant="outline" className="text-xs">Walk-in</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.is_offline_booking ? (
                        <div>
                          <p>{m.offline_contact_name}</p>
                          <p className="text-xs text-muted-foreground">{m.offline_contact_phone}</p>
                        </div>
                      ) : (
                        <p>{m.profiles?.name || m.profiles?.email || "-"}</p>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(m.status)}</TableCell>
                    <TableCell>{getPaymentBadge(m.id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link to={`/matches/${m.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {m.status !== "cancelled" && m.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Cancel this booking?")) {
                                cancelMutation.mutate(m.id);
                              }
                            }}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No bookings found for the selected date range
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
