import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turfId: string;
  onSuccess: () => void;
}

const CATEGORIES = ["Beverages", "Equipment", "Apparel", "Snacks", "Other"];
const UNITS = ["pcs", "bottles", "cans", "kg", "liters", "pairs", "sets"];

export function AddItemDialog({
  open,
  onOpenChange,
  turfId,
  onSuccess,
}: AddItemDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    sku_code: "",
    name: "",
    category: "Beverages",
    unit: "pcs",
    cost_price: "",
    selling_price: "",
    reorder_level: "",
  });

  const createItem = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("inventory_items").insert({
        turf_id: turfId,
        created_by: user.id,
        sku_code: formData.sku_code.toUpperCase(),
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        selling_price: formData.selling_price
          ? parseFloat(formData.selling_price)
          : null,
        reorder_level: formData.reorder_level
          ? parseFloat(formData.reorder_level)
          : 0,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("An item with this SKU code already exists");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Item added successfully");
      setFormData({
        sku_code: "",
        name: "",
        category: "Beverages",
        unit: "pcs",
        cost_price: "",
        selling_price: "",
        reorder_level: "",
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add item");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku_code.trim() || !formData.name.trim()) {
      toast.error("SKU code and name are required");
      return;
    }
    createItem.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku_code">SKU Code *</Label>
              <Input
                id="sku_code"
                placeholder="e.g., BEV001"
                value={formData.sku_code}
                onChange={(e) =>
                  setFormData({ ...formData, sku_code: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Gatorade Energy Drink"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price (₹)</Label>
              <Input
                id="cost_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.cost_price}
                onChange={(e) =>
                  setFormData({ ...formData, cost_price: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price (₹)</Label>
              <Input
                id="selling_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.selling_price}
                onChange={(e) =>
                  setFormData({ ...formData, selling_price: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorder_level">
              Reorder Level (Low stock alert)
            </Label>
            <Input
              id="reorder_level"
              type="number"
              min="0"
              placeholder="e.g., 10"
              value={formData.reorder_level}
              onChange={(e) =>
                setFormData({ ...formData, reorder_level: e.target.value })
              }
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
            <Button type="submit" disabled={createItem.isPending}>
              {createItem.isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
