-- Allow turf owners to update matches at their turfs
CREATE POLICY "Turf owners can update matches at their turfs"
ON public.matches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM turf_owners 
    WHERE turf_owners.turf_id = matches.turf_id 
    AND turf_owners.user_id = auth.uid()
  )
);