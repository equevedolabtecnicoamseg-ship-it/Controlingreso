-- Drop the check constraint that requires qr_number > 0
ALTER TABLE public.visitors DROP CONSTRAINT IF EXISTS visitors_qr_number_check;

-- Allow qr_number to be 0 or null (legacy field, now using visitor_qr_id)
ALTER TABLE public.visitors ALTER COLUMN qr_number SET DEFAULT 0;