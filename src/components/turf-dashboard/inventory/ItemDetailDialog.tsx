import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings2,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface InventoryItem {
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
}

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  direction: string;
  notes: string | null;
  created_at: string;
  created_by: string;
}

interface ItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turfId: string;
  item: InventoryItem | null;
  onStockIn: () => void;
  onRecordSale: () => void;
  onAdjust: () => void;
  onRefresh: () => void;
}

export function ItemDetailDialog({
  open,
  onOpenChange,
  turfId,
  item,
  onStockIn,
  onRecordSale,
  onAdjust,
  onRefresh,
}: ItemDetailDialogProps) {
  const queryClient = useQueryClient();

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["item-movements", item?.item_id],
    queryFn: async () => {
      if (!item?.item_id) return [];

      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("item_id", item.item_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Movement[];
    },
    enabled: !!item?.item_id && open,
  });

  const deleteItem = useMutation({
    mutationFn: async () => {
      if (!item?.item_id) throw new Error("No item selected");

      const { error } = await supabase
        .from("inventory_items")
        .update({ is_active: false })
        .eq("id", item.item_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item archived successfully");
      onOpenChange(false);
      onRefresh();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to archive item");
    },
  });

  if (!item) return null;

  const isLowStock =
    item.reorder_level !== null && item.on_hand <= item.reorder_level;

  const getMovementIcon = (movement: Movement) => {
    if (movement.direction === "IN") {
      return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    }
    return <ArrowDownCircle className="h-4 w-4 text-orange-500" />;
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case "OPENING":
        return "Opening Stock";
      case "GRN":
        return "Stock In";
      case "SALE":
        return "Sale";
      case "ADJUSTMENT":
        return "Adjustment";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">SKU</p>
              <p className="font-medium">{item.sku_code}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <Badge variant="secondary">{item.category}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unit</p>
              <p className="font-medium">{item.unit}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Selling Price</p>
              <p className="font-medium">
                {item.selling_price ? `₹${item.selling_price}` : "-"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Stock Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs">Total In</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {item.total_in}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <span className="text-xs">Total Out</span>
              </div>
              <p className="text-2xl font-bold text-orange-500">
                {item.total_out}
              </p>
            </div>
            <div
              className={`rounded-lg p-4 text-center ${
                isLowStock
                  ? "bg-destructive/10"
                  : "bg-primary/10"
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs">On Hand</span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isLowStock ? "text-destructive" : "text-primary"
                }`}
              >
                {item.on_hand}
              </p>
              {isLowStock && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Low Stock
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onStockIn}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Stock In
            </Button>
            <Button size="sm" variant="outline" onClick={onRecordSale}>
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
            <Button size="sm" variant="outline" onClick={onAdjust}>
              <Settings2 className="h-4 w-4 mr-2" />
              Adjust
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to archive this item? It will be hidden but movement history will be preserved."
                  )
                ) {
                  deleteItem.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </div>

          <Separator />

          {/* Movement History */}
          <div>
            <h4 className="font-medium mb-3">Recent Movements</h4>
            {movementsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : movements && movements.length > 0 ? (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50"
                    >
                      {getMovementIcon(m)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {getMovementTypeLabel(m.movement_type)}
                          </span>
                          <Badge
                            variant={
                              m.direction === "IN" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {m.direction === "IN" ? "+" : "-"}
                            {m.quantity}
                          </Badge>
                        </div>
                        {m.notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            {m.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(m.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No movements recorded yet
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
