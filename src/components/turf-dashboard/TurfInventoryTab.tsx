import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BarChart3,
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings2,
} from "lucide-react";
import { AddItemDialog } from "./inventory/AddItemDialog";
import { StockInDialog } from "./inventory/StockInDialog";
import { RecordSaleDialog } from "./inventory/RecordSaleDialog";
import { AdjustStockDialog } from "./inventory/AdjustStockDialog";
import { ItemDetailDialog } from "./inventory/ItemDetailDialog";
import { OpeningStockDialog } from "./inventory/OpeningStockDialog";
import { InventoryReportsDialog } from "./inventory/InventoryReportsDialog";

interface TurfInventoryTabProps {
  turfId: string;
  turf: any;
}

type InventoryItem = {
  item_id: string;
  turf_id: string;
  sku_code: string;
  name: string;
  category: string;
  unit: string;
  cost_price: number | null;
  selling_price: number | null;
  reorder_level: number | null;
  is_active: boolean;
  total_in: number;
  total_out: number;
  on_hand: number;
  last_movement_at: string | null;
};

const CATEGORIES = ["All", "Beverages", "Equipment", "Apparel", "Snacks", "Other"];

export function TurfInventoryTab({ turfId, turf }: TurfInventoryTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showRecordSale, setShowRecordSale] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [showOpeningStock, setShowOpeningStock] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Fetch inventory with on-hand calculations
  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ["inventory-on-hand", turfId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_on_hand")
        .select("*")
        .eq("turf_id", turfId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
    enabled: !!turfId,
  });

  // Check if any items have opening stock
  const { data: hasOpeningStock } = useQuery({
    queryKey: ["has-opening-stock", turfId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("id")
        .eq("turf_id", turfId)
        .eq("movement_type", "OPENING")
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    },
    enabled: !!turfId,
  });

  // Filter items
  const filteredItems = (inventoryItems || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;
    const matchesLowStock =
      !showLowStock ||
      (item.reorder_level !== null && item.on_hand <= item.reorder_level);

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Stats
  const totalItems = inventoryItems?.length || 0;
  const lowStockItems =
    inventoryItems?.filter(
      (item) =>
        item.reorder_level !== null && item.on_hand <= item.reorder_level
    ).length || 0;
  const totalValue =
    inventoryItems?.reduce(
      (sum, item) =>
        sum + (item.on_hand * (item.cost_price || 0)),
      0
    ) || 0;

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowItemDetail(true);
  };

  const handleQuickAction = (
    action: "stockIn" | "sale" | "adjust",
    item: InventoryItem
  ) => {
    setSelectedItem(item);
    if (action === "stockIn") setShowStockIn(true);
    else if (action === "sale") setShowRecordSale(true);
    else if (action === "adjust") setShowAdjustStock(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory-on-hand", turfId] });
    queryClient.invalidateQueries({ queryKey: ["has-opening-stock", turfId] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage stock for {turf?.name}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {totalItems > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowReports(true)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
          )}
          {totalItems > 0 && !hasOpeningStock && (
            <Button
              variant="outline"
              onClick={() => setShowOpeningStock(true)}
            >
              <Package className="h-4 w-4 mr-2" />
              Set Opening Stock
            </Button>
          )}
          <Button onClick={() => setShowAddItem(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={lowStockItems > 0 ? "border-destructive/50" : ""}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div
              className={`p-3 rounded-lg ${
                lowStockItems > 0
                  ? "bg-destructive/10"
                  : "bg-muted"
              }`}
            >
              <AlertTriangle
                className={`h-6 w-6 ${
                  lowStockItems > 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <p className="text-2xl font-bold">{lowStockItems}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock Value</p>
              <p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? "default" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className="whitespace-nowrap"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Low Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {totalItems === 0
                ? "No inventory items yet"
                : "No items match your filters"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {totalItems === 0
                ? "Add your first item to start tracking inventory."
                : "Try adjusting your search or filters."}
            </p>
            {totalItems === 0 && (
              <Button onClick={() => setShowAddItem(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const isLowStock =
                    item.reorder_level !== null &&
                    item.on_hand <= item.reorder_level;

                  return (
                    <TableRow
                      key={item.item_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleItemClick(item)}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.sku_code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.on_hand} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.selling_price
                          ? `₹${item.selling_price}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : item.on_hand === 0 ? (
                          <Badge variant="outline">Out of Stock</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Stock In"
                            onClick={() => handleQuickAction("stockIn", item)}
                          >
                            <ArrowUpCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Record Sale"
                            onClick={() => handleQuickAction("sale", item)}
                          >
                            <ArrowDownCircle className="h-4 w-4 text-orange-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Adjust Stock"
                            onClick={() => handleQuickAction("adjust", item)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <AddItemDialog
        open={showAddItem}
        onOpenChange={setShowAddItem}
        turfId={turfId}
        onSuccess={handleRefresh}
      />

      <StockInDialog
        open={showStockIn}
        onOpenChange={setShowStockIn}
        turfId={turfId}
        item={selectedItem}
        items={inventoryItems || []}
        onSuccess={handleRefresh}
      />

      <RecordSaleDialog
        open={showRecordSale}
        onOpenChange={setShowRecordSale}
        turfId={turfId}
        item={selectedItem}
        items={inventoryItems || []}
        onSuccess={handleRefresh}
      />

      <AdjustStockDialog
        open={showAdjustStock}
        onOpenChange={setShowAdjustStock}
        turfId={turfId}
        item={selectedItem}
        items={inventoryItems || []}
        onSuccess={handleRefresh}
      />

      <ItemDetailDialog
        open={showItemDetail}
        onOpenChange={setShowItemDetail}
        turfId={turfId}
        item={selectedItem}
        onStockIn={() => {
          setShowItemDetail(false);
          setShowStockIn(true);
        }}
        onRecordSale={() => {
          setShowItemDetail(false);
          setShowRecordSale(true);
        }}
        onAdjust={() => {
          setShowItemDetail(false);
          setShowAdjustStock(true);
        }}
        onRefresh={handleRefresh}
      />

      <OpeningStockDialog
        open={showOpeningStock}
        onOpenChange={setShowOpeningStock}
        turfId={turfId}
        items={inventoryItems || []}
        onSuccess={handleRefresh}
      />

      <InventoryReportsDialog
        open={showReports}
        onOpenChange={setShowReports}
        turfId={turfId}
        items={inventoryItems || []}
      />
    </div>
  );
}
