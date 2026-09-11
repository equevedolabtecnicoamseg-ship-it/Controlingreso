import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StaffMember {
  id: string;
  dni_number: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  sector_id: string | null;
  qr_code: string | null;
  created_at: string;
  sectors?: { name: string } | null;
}

export interface NewStaffInput {
  dni_number: string;
  first_name: string;
  last_name: string;
  sector_id: string;
  birth_date?: string | null;
  address?: string | null;
  gender?: string | null;
}

/** Genera un código QR único e irrepetible para el personal fijo. */
export function generateStaffQrCode(dni: string) {
  const clean = dni.replace(/\D/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PER-${clean}-${suffix}`;
}

export function useStaffList() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personnel")
        .select("*, sectors(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StaffMember[];
    },
    staleTime: 0,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewStaffInput) => {
      const dni = input.dni_number.trim();

      const { data: existing, error: existingError } = await supabase
        .from("personnel")
        .select("id")
        .eq("dni_number", dni)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) throw new Error("Ya existe una persona registrada con ese DNI");

      const { data, error } = await supabase
        .from("personnel")
        .insert({
          dni_number: dni,
          first_name: input.first_name.trim(),
          last_name: input.last_name.trim(),
          sector_id: input.sector_id,
          birth_date: input.birth_date || null,
          address: input.address?.trim() || null,
          gender: input.gender || null,
          qr_code: generateStaffQrCode(dni),
        })
        .select("*, sectors(name)")
        .single();

      if (error) throw error;
      return data as StaffMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Persona registrada y QR generado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error: logsError } = await supabase
        .from("access_logs")
        .delete()
        .eq("personnel_id", id);
      if (logsError) throw logsError;

      const { error } = await supabase.from("personnel").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Persona eliminada");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });
}

export function useCreateSector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("sectors")
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Objetivo creado");
    },
    onError: (error: Error) => {
      toast.error("Error al crear objetivo: " + error.message);
    },
  });
}

/** Busca personal fijo por su código QR (insensible a mayúsculas/espacios). */
export function useStaffByQR(qrCode: string | null) {
  return useQuery({
    queryKey: ["staff", "qr", qrCode],
    queryFn: async () => {
      if (!qrCode) return null;
      const { data, error } = await supabase
        .from("personnel")
        .select("*, sectors(name)")
        .ilike("qr_code", qrCode)
        .maybeSingle();

      if (error) throw error;
      return (data as StaffMember | null) ?? null;
    },
    enabled: !!qrCode,
    staleTime: 0,
  });
}
