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
import { ArrowUpCircle } from "lucide-react";

interface InventoryItem {
  item_id: string;
  name: string;
  sku_code: string;
  unit: string;
  on_hand: number;
}

interface StockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turfId: string;
  item: InventoryItem | null;
  items: InventoryItem[];
  onSuccess: () => void;
}

export function StockInDialog({
  open,
  onOpenChange,
  turfId,
  item,
  items,
  onSuccess,
}: StockInDialogProps) {
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

  const createMovement = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!selectedItemId) throw new Error("Please select an item");

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Please enter a valid quantity greater than 0");
      }

      const { error } = await supabase.from("inventory_movements").insert({
        turf_id: turfId,
        item_id: selectedItemId,
        movement_type: "GRN",
        quantity: qty,
        direction: "IN",
        reference_type: "manual",
        notes: notes.trim() || null,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock added successfully");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add stock");
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
            <ArrowUpCircle className="h-5 w-5 text-green-600" />
            Stock In (GRN)
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
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Current stock: <span className="font-medium">{selectedItem.on_hand} {selectedItem.unit}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity Received *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Supplier name, invoice number..."
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
            <Button type="submit" disabled={createMovement.isPending}>
              {createMovement.isPending ? "Saving..." : "Add Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
