
-- Drop and recreate the view with SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS public.inventory_on_hand;

CREATE VIEW public.inventory_on_hand 
WITH (security_invoker = true)
AS
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
