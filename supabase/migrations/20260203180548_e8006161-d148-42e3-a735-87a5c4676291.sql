-- Tabla de sectores/áreas del edificio
CREATE TABLE public.sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de personal/visitantes registrados
CREATE TABLE public.personnel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dni_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  address TEXT,
  dni_front_url TEXT,
  dni_back_url TEXT,
  sector_id UUID REFERENCES public.sectors(id),
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de registros de entrada/salida
CREATE TABLE public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exit_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para recepcionistas (sin autenticación por ahora, app interna)
CREATE POLICY "Allow all access to sectors" ON public.sectors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to personnel" ON public.personnel FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to access_logs" ON public.access_logs FOR ALL USING (true) WITH CHECK (true);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para personnel
CREATE TRIGGER update_personnel_updated_at
BEFORE UPDATE ON public.personnel
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar sectores iniciales
INSERT INTO public.sectors (name, description) VALUES 
  ('Administración', 'Oficinas administrativas'),
  ('Operaciones', 'Área de operaciones'),
  ('Recursos Humanos', 'Departamento de RRHH'),
  ('Tecnología', 'Área de sistemas y TI'),
  ('Seguridad', 'Centro de monitoreo'),
  ('Mantenimiento', 'Servicios generales');

-- Crear bucket para DNI images
INSERT INTO storage.buckets (id, name, public) VALUES ('dni-images', 'dni-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para DNI images
CREATE POLICY "Public read access for DNI images" ON storage.objects FOR SELECT USING (bucket_id = 'dni-images');
CREATE POLICY "Allow upload DNI images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dni-images');
CREATE POLICY "Allow update DNI images" ON storage.objects FOR UPDATE USING (bucket_id = 'dni-images');
CREATE POLICY "Allow delete DNI images" ON storage.objects FOR DELETE USING (bucket_id = 'dni-images');