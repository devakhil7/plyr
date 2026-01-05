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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Settings2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InventoryItem {
  item_id: string;
  name: string;
  sku_code: string;
  unit: string;
  on_hand: number;
}

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turfId: string;
  item: InventoryItem | null;
  items: InventoryItem[];
  onSuccess: () => void;
}

const ADJUSTMENT_REASONS = [
  "Damage",
  "Expired",
  "Lost",
  "Correction",
  "Transfer",
  "Other",
];

export function AdjustStockDialog({
  open,
  onOpenChange,
  turfId,
  item,
  items,
  onSuccess,
}: AdjustStockDialogProps) {
  const { user } = useAuth();
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [direction, setDirection] = useState<"IN" | "OUT">("OUT");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Correction");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (item) {
      setSelectedItemId(item.item_id);
    }
  }, [item]);

  useEffect(() => {
    if (!open) {
      setSelectedItemId(item?.item_id || "");
      setDirection("OUT");
      setQuantity("");
      setReason("Correction");
      setNotes("");
    }
  }, [open, item]);

  const selectedItem = items.find((i) => i.item_id === selectedItemId);
  const qty = parseFloat(quantity) || 0;
  const insufficientStock =
    direction === "OUT" && selectedItem && qty > selectedItem.on_hand;

  const createMovement = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!selectedItemId) throw new Error("Please select an item");

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Please enter a valid quantity greater than 0");
      }

      // Check current stock for OUT adjustments
      if (direction === "OUT") {
        const currentItem = items.find((i) => i.item_id === selectedItemId);
        if (currentItem && qty > currentItem.on_hand) {
          throw new Error(
            `Insufficient stock. Available: ${currentItem.on_hand} ${currentItem.unit}`
          );
        }
      }

      const adjustmentNotes = `${reason}${notes.trim() ? `: ${notes.trim()}` : ""}`;

      const { error } = await supabase.from("inventory_movements").insert({
        turf_id: turfId,
        item_id: selectedItemId,
        movement_type: "ADJUSTMENT",
        quantity: qty,
        direction,
        reference_type: "adjustment",
        notes: adjustmentNotes,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock adjusted successfully");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to adjust stock");
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
            <Settings2 className="h-5 w-5" />
            Adjust Stock
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
              Current stock:{" "}
              <span className="font-medium">
                {selectedItem.on_hand} {selectedItem.unit}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Adjustment Type *</Label>
            <RadioGroup
              value={direction}
              onValueChange={(value) => setDirection(value as "IN" | "OUT")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="IN" id="in" />
                <Label htmlFor="in" className="font-normal cursor-pointer">
                  Add Stock (+)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="OUT" id="out" />
                <Label htmlFor="out" className="font-normal cursor-pointer">
                  Remove Stock (-)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
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
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add more details..."
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
              {createMovement.isPending ? "Saving..." : "Adjust Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
