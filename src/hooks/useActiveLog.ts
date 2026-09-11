import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Get active access log for a specific personnel (entry without exit)
export function useActivePersonnelLog(personnelId: string | null) {
  return useQuery({
    queryKey: ["access_logs", "active", personnelId],
    queryFn: async () => {
      if (!personnelId) return null;
      
      const { data, error } = await supabase
        .from("access_logs")
        .select("id")
        .eq("personnel_id", personnelId)
        .is("exit_time", null)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!personnelId,
  });
}

// Get active access log for a specific visitor (entry without exit)
export function useActiveVisitorLog(visitorId: string | null) {
  return useQuery({
    queryKey: ["visitor_access_logs", "active", visitorId],
    queryFn: async () => {
      if (!visitorId) return null;
      
      const { data, error } = await supabase
        .from("visitor_access_logs")
        .select("id")
        .eq("visitor_id", visitorId)
        .is("exit_time", null)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!visitorId,
  });
}
