import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Package } from "lucide-react";

interface InventoryItem {
  item_id: string;
  name: string;
  sku_code: string;
  unit: string;
  on_hand: number;
}

interface OpeningStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turfId: string;
  items: InventoryItem[];
  onSuccess: () => void;
}

export function OpeningStockDialog({
  open,
  onOpenChange,
  turfId,
  items,
  onSuccess,
}: OpeningStockDialogProps) {
  const { user } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const saveOpeningStock = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const movements = Object.entries(quantities)
        .filter(([_, qty]) => {
          const num = parseFloat(qty);
          return !isNaN(num) && num > 0;
        })
        .map(([itemId, qty]) => ({
          turf_id: turfId,
          item_id: itemId,
          movement_type: "OPENING",
          quantity: parseFloat(qty),
          direction: "IN",
          reference_type: "opening_stock",
          notes: "Initial opening stock",
          created_by: user.id,
        }));

      if (movements.length === 0) {
        throw new Error("Please enter at least one opening stock quantity");
      }

      const { error } = await supabase
        .from("inventory_movements")
        .insert(movements);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opening stock saved successfully");
      setQuantities({});
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save opening stock");
    },
  });

  const handleQuantityChange = (itemId: string, value: string) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveOpeningStock.mutate();
  };

  // Filter items that don't have stock yet
  const itemsWithoutStock = items.filter((item) => item.on_hand === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Set Opening Stock
          </DialogTitle>
          <DialogDescription>
            Enter the current stock quantities for your inventory items. This
            creates the initial stock baseline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {itemsWithoutStock.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              All items already have stock movements recorded.
            </p>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {itemsWithoutStock.map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku_code} • {item.unit}
                      </p>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={quantities[item.item_id] || ""}
                        onChange={(e) =>
                          handleQuantityChange(item.item_id, e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saveOpeningStock.isPending || itemsWithoutStock.length === 0
              }
            >
              {saveOpeningStock.isPending ? "Saving..." : "Save Opening Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
