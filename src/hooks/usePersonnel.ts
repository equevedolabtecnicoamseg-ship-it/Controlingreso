import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Personnel {
  id: string;
  dni_number: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  dni_front_url: string | null;
  dni_back_url: string | null;
  sector_id: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  sectors?: { name: string } | null;
}

export interface Sector {
  id: string;
  name: string;
  description: string | null;
}

export interface AccessLog {
  id: string;
  personnel_id: string;
  entry_time: string;
  exit_time: string | null;
  created_at: string;
  personnel?: Personnel;
}

export function usePersonnelList() {
  return useQuery({
    queryKey: ["personnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personnel")
        .select("*, sectors(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Personnel[];
    },
  });
}

export function usePersonnelByQR(qrCode: string | null) {
  return useQuery({
    queryKey: ["personnel", "qr", qrCode],
    queryFn: async () => {
      if (!qrCode) return null;
      const { data, error } = await supabase
        .from("personnel")
        .select("*, sectors(name)")
        .eq("qr_code", qrCode)
        .single();
      
      if (error) throw error;
      return data as Personnel;
    },
    enabled: !!qrCode,
  });
}

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sectors")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Sector[];
    },
  });
}

export function useAccessLogs() {
  return useQuery({
    queryKey: ["access_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*, personnel(*, sectors(name))")
        .order("entry_time", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AccessLog[];
    },
  });
}

export function useCreatePersonnel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (personnel: Omit<Personnel, "id" | "created_at" | "updated_at" | "sectors">) => {
      const { data, error } = await supabase
        .from("personnel")
        .insert(personnel)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
      toast.success("Personal registrado exitosamente");
    },
    onError: (error: Error) => {
      toast.error("Error al registrar: " + error.message);
    },
  });
}

export function useDeletePersonnel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (personnelId: string) => {
      // First delete related access logs
      const { error: logsError } = await supabase
        .from("access_logs")
        .delete()
        .eq("personnel_id", personnelId);
      
      if (logsError) throw logsError;
      
      // Then delete the personnel record
      const { error } = await supabase
        .from("personnel")
        .delete()
        .eq("id", personnelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
      queryClient.invalidateQueries({ queryKey: ["access_logs"] });
      toast.success("Registro eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (personnelId: string) => {
      const { data, error } = await supabase
        .from("access_logs")
        .insert({ personnel_id: personnelId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access_logs"] });
      toast.success("Entrada registrada");
    },
    onError: (error: Error) => {
      toast.error("Error al registrar entrada: " + error.message);
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (logId: string) => {
      const { data, error } = await supabase
        .from("access_logs")
        .update({ exit_time: new Date().toISOString() })
        .eq("id", logId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access_logs"] });
      toast.success("Salida registrada");
    },
    onError: (error: Error) => {
      toast.error("Error al registrar salida: " + error.message);
    },
  });
}

export function usePersonnelStats(personnelId: string | null) {
  return useQuery({
    queryKey: ["personnel_stats", personnelId],
    queryFn: async () => {
      if (!personnelId) return null;
      
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("personnel_id", personnelId);
      
      if (error) throw error;
      
      const totalVisits = data.length;
      const completedVisits = data.filter(log => log.exit_time);
      
      let avgDuration = 0;
      if (completedVisits.length > 0) {
        const totalMinutes = completedVisits.reduce((acc, log) => {
          const entry = new Date(log.entry_time);
          const exit = new Date(log.exit_time!);
          return acc + (exit.getTime() - entry.getTime()) / (1000 * 60);
        }, 0);
        avgDuration = totalMinutes / completedVisits.length;
      }
      
      return {
        totalVisits,
        avgDurationMinutes: Math.round(avgDuration),
      };
    },
    enabled: !!personnelId,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: personnel } = await supabase
        .from("personnel")
        .select("id");
      
      const { data: todayLogs } = await supabase
        .from("access_logs")
        .select("*")
        .gte("entry_time", today.toISOString());
      
      const { data: activeNow } = await supabase
        .from("access_logs")
        .select("*")
        .is("exit_time", null);
      
      return {
        totalPersonnel: personnel?.length || 0,
        todayEntries: todayLogs?.length || 0,
        currentlyInside: activeNow?.length || 0,
      };
    },
  });
}
