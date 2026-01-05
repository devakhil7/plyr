import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
} from "lucide-react";

interface InventoryItem {
  item_id: string;
  name: string;
  sku_code: string;
  category: string;
  unit: string;
  cost_price: number | null;
  selling_price: number | null;
  reorder_level: number | null;
  on_hand: number;
  total_in: number;
  total_out: number;
}

interface InventoryReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turfId: string;
  items: InventoryItem[];
}

type DateRange = "7" | "30" | "90";

export function InventoryReportsDialog({
  open,
  onOpenChange,
  turfId,
  items,
}: InventoryReportsDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange>("30");

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  // Fetch movements for date range
  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["inventory-movements-report", turfId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`
          id,
          item_id,
          movement_type,
          quantity,
          direction,
          notes,
          created_at
        `)
        .eq("turf_id", turfId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!turfId,
  });

  // Calculate low stock items
  const lowStockItems = items.filter(
    (item) => item.reorder_level !== null && item.on_hand <= item.reorder_level
  );

  // Calculate top selling items
  const salesByItem = (movements || [])
    .filter((m) => m.movement_type === "SALE")
    .reduce((acc, m) => {
      acc[m.item_id] = (acc[m.item_id] || 0) + m.quantity;
      return acc;
    }, {} as Record<string, number>);

  const topSellingItems = Object.entries(salesByItem)
    .map(([itemId, quantity]) => {
      const item = items.find((i) => i.item_id === itemId);
      return {
        item,
        quantity,
        revenue: (item?.selling_price || 0) * quantity,
      };
    })
    .filter((i) => i.item)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Calculate stock valuation
  const totalStockValue = items.reduce(
    (sum, item) => sum + item.on_hand * (item.cost_price || 0),
    0
  );
  const totalRetailValue = items.reduce(
    (sum, item) => sum + item.on_hand * (item.selling_price || 0),
    0
  );

  // Movement summary
  const totalStockIn = (movements || [])
    .filter((m) => m.direction === "IN")
    .reduce((sum, m) => sum + m.quantity, 0);
  const totalStockOut = (movements || [])
    .filter((m) => m.direction === "OUT")
    .reduce((sum, m) => sum + m.quantity, 0);

  // Group movements by date
  const movementsByDate = (movements || []).reduce((acc, m) => {
    const date = format(new Date(m.created_at), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {} as Record<string, typeof movements>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Inventory Reports
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
            <TabsTrigger value="topselling">Top Selling</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs">Total Items</span>
                  </div>
                  <p className="text-2xl font-bold">{items.length}</p>
                </CardContent>
              </Card>

              <Card className={lowStockItems.length > 0 ? "border-destructive/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertTriangle className={`h-4 w-4 ${lowStockItems.length > 0 ? "text-destructive" : ""}`} />
                    <span className="text-xs">Low Stock</span>
                  </div>
                  <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-destructive" : ""}`}>
                    {lowStockItems.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Stock Value (Cost)</span>
                  </div>
                  <p className="text-2xl font-bold">₹{totalStockValue.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs">Retail Value</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{totalRetailValue.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stock Valuation by Category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stock by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    items.reduce((acc, item) => {
                      if (!acc[item.category]) {
                        acc[item.category] = { count: 0, value: 0, units: 0 };
                      }
                      acc[item.category].count++;
                      acc[item.category].units += item.on_hand;
                      acc[item.category].value += item.on_hand * (item.cost_price || 0);
                      return acc;
                    }, {} as Record<string, { count: number; value: number; units: number }>)
                  ).map(([category, data]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {data.count} items • {data.units} units
                        </span>
                      </div>
                      <span className="font-medium">₹{data.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="lowstock" className="mt-4">
            {lowStockItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    All items are adequately stocked
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">On Hand</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                        <TableHead className="text-right">Shortfall</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.sku_code}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-destructive font-medium">
                            {item.on_hand} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.reorder_level} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            -{(item.reorder_level || 0) - item.on_hand}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          {/* Top Selling Tab */}
          <TabsContent value="topselling" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {movementsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : topSellingItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No sales recorded in this period
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSellingItems.map((entry, index) => (
                        <TableRow key={entry.item?.item_id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.item?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.item?.sku_code}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{entry.item?.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.quantity} {entry.item?.unit}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            ₹{entry.revenue.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    Stock In: <span className="font-medium">{totalStockIn}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">
                    Stock Out: <span className="font-medium">{totalStockOut}</span>
                  </span>
                </div>
              </div>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {movementsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : Object.keys(movementsByDate).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No movements recorded in this period
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {Object.entries(movementsByDate).map(([date, dayMovements]) => {
                    const dayIn = dayMovements?.filter((m) => m.direction === "IN")
                      .reduce((sum, m) => sum + m.quantity, 0) || 0;
                    const dayOut = dayMovements?.filter((m) => m.direction === "OUT")
                      .reduce((sum, m) => sum + m.quantity, 0) || 0;

                    return (
                      <Card key={date}>
                        <CardHeader className="py-3 px-4">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-medium">
                              {format(new Date(date), "EEEE, MMM d, yyyy")}
                            </CardTitle>
                            <div className="flex gap-3 text-xs">
                              <span className="text-green-600">+{dayIn}</span>
                              <span className="text-orange-500">-{dayOut}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                          <div className="space-y-2">
                            {dayMovements?.map((m) => {
                              const item = items.find((i) => i.item_id === m.item_id);
                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  {m.direction === "IN" ? (
                                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ArrowDownCircle className="h-4 w-4 text-orange-500" />
                                  )}
                                  <span className="flex-1 truncate">
                                    {item?.name || "Unknown item"}
                                  </span>
                                  <Badge
                                    variant={m.direction === "IN" ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {m.direction === "IN" ? "+" : "-"}
                                    {m.quantity}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {m.movement_type}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
