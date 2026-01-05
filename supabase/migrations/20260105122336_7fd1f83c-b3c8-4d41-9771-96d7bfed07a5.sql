
-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turf_id UUID NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  sku_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_price NUMERIC DEFAULT NULL,
  selling_price NUMERIC DEFAULT NULL,
  reorder_level NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(turf_id, sku_code)
);

-- Create inventory_movements table
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turf_id UUID NOT NULL REFERENCES public.turfs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('OPENING', 'GRN', 'SALE', 'ADJUSTMENT')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  reference_type TEXT DEFAULT NULL,
  reference_id TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_inventory_movements_lookup ON public.inventory_movements(turf_id, item_id, created_at DESC);
CREATE INDEX idx_inventory_items_turf ON public.inventory_items(turf_id, is_active);

-- Create view for on-hand calculation
CREATE OR REPLACE VIEW public.inventory_on_hand AS
SELECT 
  i.id as item_id,
  i.turf_id,
  i.sku_code,
  i.name,
  i.category,
  i.unit,
  i.cost_price,
  i.selling_price,
  i.reorder_level,
  i.is_active,
  COALESCE(SUM(CASE WHEN m.direction = 'IN' THEN m.quantity ELSE 0 END), 0) as total_in,
  COALESCE(SUM(CASE WHEN m.direction = 'OUT' THEN m.quantity ELSE 0 END), 0) as total_out,
  COALESCE(SUM(CASE WHEN m.direction = 'IN' THEN m.quantity ELSE -m.quantity END), 0) as on_hand,
  MAX(m.created_at) as last_movement_at
FROM public.inventory_items i
LEFT JOIN public.inventory_movements m ON i.id = m.item_id
GROUP BY i.id, i.turf_id, i.sku_code, i.name, i.category, i.unit, i.cost_price, i.selling_price, i.reorder_level, i.is_active;

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_items
CREATE POLICY "Turf owners can view their inventory items"
  ON public.inventory_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turf_owners
      WHERE turf_owners.turf_id = inventory_items.turf_id
      AND turf_owners.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Turf owners can create inventory items"
  ON public.inventory_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.turf_owners
      WHERE turf_owners.turf_id = inventory_items.turf_id
      AND turf_owners.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Turf owners can update their inventory items"
  ON public.inventory_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.turf_owners
      WHERE turf_owners.turf_id = inventory_items.turf_id
      AND turf_owners.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Turf owners can delete their inventory items"
  ON public.inventory_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.turf_owners
      WHERE turf_owners.turf_id = inventory_items.turf_id
      AND turf_owners.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS policies for inventory_movements
CREATE POLICY "Turf owners can view their inventory movements"
  ON public.inventory_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turf_owners
      WHERE turf_owners.turf_id = inventory_movements.turf_id
      AND turf_owners.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Turf owners can create inventory movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.turf_owners
      WHERE turf_owners.turf_id = inventory_movements.turf_id
      AND turf_owners.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
