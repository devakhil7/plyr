import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDownCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InventoryItem {
  item_id: string;
  name: string;
  sku_code: string;
  unit: string;
  on_hand: number;
  selling_price: number | null;
}

interface RecordSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turfId: string;
  item: InventoryItem | null;
  items: InventoryItem[];
  onSuccess: () => void;
}

export function RecordSaleDialog({
  open,
  onOpenChange,
  turfId,
  item,
  items,
  onSuccess,
}: RecordSaleDialogProps) {
  const { user } = useAuth();
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (item) {
      setSelectedItemId(item.item_id);
    }
  }, [item]);

  useEffect(() => {
    if (!open) {
      setSelectedItemId(item?.item_id || "");
      setQuantity("");
      setNotes("");
    }
  }, [open, item]);

  const selectedItem = items.find((i) => i.item_id === selectedItemId);
  const qty = parseFloat(quantity) || 0;
  const insufficientStock = selectedItem && qty > selectedItem.on_hand;

  const createMovement = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!selectedItemId) throw new Error("Please select an item");

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Please enter a valid quantity greater than 0");
      }

      // Check current stock
      const currentItem = items.find((i) => i.item_id === selectedItemId);
      if (currentItem && qty > currentItem.on_hand) {
        throw new Error(
          `Insufficient stock. Available: ${currentItem.on_hand} ${currentItem.unit}`
        );
      }

      const { error } = await supabase.from("inventory_movements").insert({
        turf_id: turfId,
        item_id: selectedItemId,
        movement_type: "SALE",
        quantity: qty,
        direction: "OUT",
        reference_type: "manual",
        notes: notes.trim() || null,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale recorded successfully");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record sale");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMovement.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-orange-500" />
            Record Sale
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item">Item *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.item_id} value={i.item_id}>
                    {i.name} ({i.sku_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
              <div>
                Available stock:{" "}
                <span className="font-medium">
                  {selectedItem.on_hand} {selectedItem.unit}
                </span>
              </div>
              {selectedItem.selling_price && (
                <div>
                  Selling price:{" "}
                  <span className="font-medium">₹{selectedItem.selling_price}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity Sold *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          {insufficientStock && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient stock. Available: {selectedItem?.on_hand}{" "}
                {selectedItem?.unit}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Customer name, booking reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

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
              disabled={createMovement.isPending || insufficientStock}
            >
              {createMovement.isPending ? "Saving..." : "Record Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
