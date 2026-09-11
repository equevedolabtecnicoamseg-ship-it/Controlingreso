-- Add sector and person to visit fields to visitors table
ALTER TABLE public.visitors 
ADD COLUMN sector_id UUID REFERENCES public.sectors(id),
ADD COLUMN person_to_visit TEXT;