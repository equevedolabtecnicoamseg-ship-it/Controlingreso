-- Create table for pre-printed visitor QR codes
CREATE TABLE public.visitor_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on visitor_qr_codes" ON public.visitor_qr_codes FOR ALL USING (true) WITH CHECK (true);

-- Add reference to visitor_qr_codes in visitors table
ALTER TABLE public.visitors 
ADD COLUMN visitor_qr_id UUID REFERENCES public.visitor_qr_codes(id);

-- Insert the first QR code
INSERT INTO public.visitor_qr_codes (code, label) VALUES ('e33d0865QUEVEDO', 'QR #1');