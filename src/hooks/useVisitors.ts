import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VisitorQRCode {
  id: string;
  code: string;
  label: string;
  is_available: boolean;
  created_at: string;
}

export interface Visitor {
  id: string;
  name: string;
  dni_number: string | null;
  company: string | null;
  reason: string | null;
  qr_number: number;
  visitor_qr_id: string | null;
  sector_id: string | null;
  person_to_visit: string | null;
  dni_photo_url: string | null;
  webcam_photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sectors?: { name: string } | null;
  visitor_qr_codes?: VisitorQRCode | null;
}

export interface VisitorAccessLog {
  id: string;
  visitor_id: string;
  entry_time: string;
  exit_time: string | null;
  created_at: string;
  visitor?: Visitor;
}

// Get all visitor QR codes
export function useVisitorQRCodes() {
  return useQuery({
    queryKey: ["visitor_qr_codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitor_qr_codes")
        .select("*")
        .order("label");
      
      if (error) throw error;
      return data as VisitorQRCode[];
    },
  });
}

// Get available QR codes (not assigned to active visitors)
export function useAvailableVisitorQRs() {
  return useQuery({
    queryKey: ["visitor_qr_codes", "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitor_qr_codes")
        .select("*")
        .eq("is_available", true)
        .order("label");
      
      if (error) throw error;
      return data as VisitorQRCode[];
    },
  });
}

// Get all active visitors
export function useActiveVisitors() {
  return useQuery({
    queryKey: ["visitors", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitors")
        .select("*, sectors(name), visitor_qr_codes(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Visitor[];
    },
  });
}

// Get visitor by QR code (scanned code) - single query via join
export function useVisitorByQRCode(qrCode: string | null) {
  return useQuery({
    queryKey: ["visitors", "qr_code", qrCode],
    queryFn: async () => {
      if (!qrCode) return null;
      
      // Single query: find active visitor whose assigned QR code matches
      const { data, error } = await supabase
        .from("visitors")
        .select("*, sectors(name), visitor_qr_codes!inner(*)")
        .ilike("visitor_qr_codes.code", qrCode)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Visitor | null;
    },
    enabled: !!qrCode,
    staleTime: 0,
    gcTime: 0,
  });
}

// Check if a code is a visitor QR
export function useIsVisitorQR(code: string | null) {
  return useQuery({
    queryKey: ["visitor_qr_codes", "check", code],
    queryFn: async () => {
      if (!code) return false;
      
      const { data, error } = await supabase
        .from("visitor_qr_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!code,
  });
}

// Get visitor access logs
export function useVisitorAccessLogs() {
  return useQuery({
    queryKey: ["visitor_access_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitor_access_logs")
        .select("*, visitor:visitors(*, sectors(name), visitor_qr_codes(*))")
        .order("entry_time", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as VisitorAccessLog[];
    },
  });
}

// Create a new visitor and check them in
export function useCreateVisitor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (visitor: { 
      name: string; 
      dni_number?: string; 
      company?: string; 
      reason?: string; 
      visitor_qr_id: string;
      sector_id: string;
      person_to_visit?: string;
      dni_photo_url?: string;
      webcam_photo_url?: string;
    }) => {
      // Mark QR as unavailable
      const { error: qrError } = await supabase
        .from("visitor_qr_codes")
        .update({ is_available: false })
        .eq("id", visitor.visitor_qr_id);
      
      if (qrError) throw qrError;
      
      // Create visitor (need to add qr_number as 0 for legacy compatibility)
      const { data: newVisitor, error: visitorError } = await supabase
        .from("visitors")
        .insert({ 
          name: visitor.name,
          dni_number: visitor.dni_number,
          company: visitor.company,
          reason: visitor.reason,
          visitor_qr_id: visitor.visitor_qr_id,
          sector_id: visitor.sector_id,
          person_to_visit: visitor.person_to_visit,
          dni_photo_url: visitor.dni_photo_url,
          webcam_photo_url: visitor.webcam_photo_url,
          qr_number: 0 
        })
        .select()
        .single();
      
      if (visitorError) throw visitorError;
      
      // Create entry log
      const { error: logError } = await supabase
        .from("visitor_access_logs")
        .insert({ visitor_id: newVisitor.id });
      
      if (logError) throw logError;
      
      return newVisitor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor_access_logs"] });
      queryClient.invalidateQueries({ queryKey: ["visitor_qr_codes"] });
      toast.success("Visita registrada e ingresada");
    },
    onError: (error: Error) => {
      toast.error("Error al registrar visita: " + error.message);
    },
  });
}

// Check out visitor (mark exit time and deactivate, free up QR)
export function useCheckOutVisitor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ logId, visitorId, visitorQrId }: { logId: string; visitorId: string; visitorQrId: string }) => {
      // Update exit time
      const { error: logError } = await supabase
        .from("visitor_access_logs")
        .update({ exit_time: new Date().toISOString() })
        .eq("id", logId);
      
      if (logError) throw logError;
      
      // Deactivate visitor
      const { error: visitorError } = await supabase
        .from("visitors")
        .update({ is_active: false })
        .eq("id", visitorId);
      
      if (visitorError) throw visitorError;
      
      // Free up the QR code
      const { error: qrError } = await supabase
        .from("visitor_qr_codes")
        .update({ is_available: true })
        .eq("id", visitorQrId);
      
      if (qrError) throw qrError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor_access_logs"] });
      queryClient.invalidateQueries({ queryKey: ["visitor_qr_codes"] });
      toast.success("Salida de visita registrada");
    },
    onError: (error: Error) => {
      toast.error("Error al registrar salida: " + error.message);
    },
  });
}

// Add a new visitor QR code
export function useAddVisitorQRCode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ code, label }: { code: string; label: string }) => {
      const { data, error } = await supabase
        .from("visitor_qr_codes")
        .insert({ code, label })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor_qr_codes"] });
      toast.success("QR de visita agregado");
    },
    onError: (error: Error) => {
      toast.error("Error al agregar QR: " + error.message);
    },
  });
}

// Delete a visitor QR code
export function useDeleteVisitorQRCode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("visitor_qr_codes")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor_qr_codes"] });
      toast.success("QR eliminado");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar QR: " + error.message);
    },
  });
}
