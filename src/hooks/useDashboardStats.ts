import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from "date-fns";
import { es } from "date-fns/locale";

export interface DashboardStats {
  totalPersonnel: number;
  totalVisitors: number;
  todayEntries: number;
  todayVisitorEntries: number;
  currentlyInsidePersonnel: number;
  currentlyInsideVisitors: number;
  weeklyEntries: number;
  monthlyEntries: number;
  avgDurationMinutes: number;
}

export interface SectorStats {
  name: string;
  personnelCount: number;
  visitorCount: number;
  totalEntries: number;
}

export interface MostVisitedPerson {
  name: string;
  visitCount: number;
}

export interface DailyEntryData {
  date: string;
  label: string;
  personnel: number;
  visitors: number;
}

export interface EntryTypeDistribution {
  name: string;
  value: number;
  fill: string;
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard_overview"],
    queryFn: async (): Promise<DashboardStats> => {
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const monthStart = startOfMonth(new Date());

      // Parallel queries for performance
      const [
        personnelResult,
        visitorsResult,
        todayPersonnelLogs,
        todayVisitorLogs,
        activePersonnel,
        activeVisitors,
        weeklyLogs,
        monthlyLogs,
        completedLogs,
      ] = await Promise.all([
        supabase.from("personnel").select("id", { count: "exact", head: true }),
        supabase.from("visitors").select("id", { count: "exact", head: true }),
        supabase
          .from("access_logs")
          .select("id", { count: "exact", head: true })
          .gte("entry_time", today.toISOString()),
        supabase
          .from("visitor_access_logs")
          .select("id", { count: "exact", head: true })
          .gte("entry_time", today.toISOString()),
        supabase
          .from("access_logs")
          .select("id", { count: "exact", head: true })
          .is("exit_time", null),
        supabase
          .from("visitor_access_logs")
          .select("id", { count: "exact", head: true })
          .is("exit_time", null),
        supabase
          .from("access_logs")
          .select("id", { count: "exact", head: true })
          .gte("entry_time", weekStart.toISOString()),
        supabase
          .from("access_logs")
          .select("id", { count: "exact", head: true })
          .gte("entry_time", monthStart.toISOString()),
        supabase
          .from("access_logs")
          .select("entry_time, exit_time")
          .not("exit_time", "is", null)
          .limit(500),
      ]);

      // Calculate average duration
      let avgDuration = 0;
      if (completedLogs.data && completedLogs.data.length > 0) {
        const totalMinutes = completedLogs.data.reduce((acc, log) => {
          const entry = new Date(log.entry_time);
          const exit = new Date(log.exit_time!);
          return acc + (exit.getTime() - entry.getTime()) / (1000 * 60);
        }, 0);
        avgDuration = Math.round(totalMinutes / completedLogs.data.length);
      }

      return {
        totalPersonnel: personnelResult.count || 0,
        totalVisitors: visitorsResult.count || 0,
        todayEntries: todayPersonnelLogs.count || 0,
        todayVisitorEntries: todayVisitorLogs.count || 0,
        currentlyInsidePersonnel: activePersonnel.count || 0,
        currentlyInsideVisitors: activeVisitors.count || 0,
        weeklyEntries: weeklyLogs.count || 0,
        monthlyEntries: monthlyLogs.count || 0,
        avgDurationMinutes: avgDuration,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useSectorStats() {
  return useQuery({
    queryKey: ["sector_stats"],
    queryFn: async (): Promise<SectorStats[]> => {
      // Get all sectors with personnel and visitor counts
      const { data: sectors, error: sectorsError } = await supabase
        .from("sectors")
        .select("id, name");

      if (sectorsError) throw sectorsError;
      if (!sectors) return [];

      // Get personnel count per sector
      const { data: personnelData } = await supabase
        .from("personnel")
        .select("sector_id");

      // Get visitor count per sector  
      const { data: visitorData } = await supabase
        .from("visitors")
        .select("sector_id");

      // Get access logs per sector (through personnel)
      const { data: accessLogs } = await supabase
        .from("access_logs")
        .select("personnel_id, personnel(sector_id)");

      const sectorStats: SectorStats[] = sectors.map((sector) => {
        const personnelCount = personnelData?.filter(
          (p) => p.sector_id === sector.id
        ).length || 0;

        const visitorCount = visitorData?.filter(
          (v) => v.sector_id === sector.id
        ).length || 0;

        const totalEntries = accessLogs?.filter(
          (log) => log.personnel?.sector_id === sector.id
        ).length || 0;

        return {
          name: sector.name,
          personnelCount,
          visitorCount,
          totalEntries,
        };
      });

      return sectorStats.sort((a, b) => b.totalEntries - a.totalEntries);
    },
  });
}

export function useMostVisitedPersons() {
  return useQuery({
    queryKey: ["most_visited_persons"],
    queryFn: async (): Promise<MostVisitedPerson[]> => {
      const { data, error } = await supabase
        .from("visitors")
        .select("person_to_visit")
        .not("person_to_visit", "is", null);

      if (error) throw error;
      if (!data) return [];

      // Count visits per person
      const visitCounts: Record<string, number> = {};
      data.forEach((visitor) => {
        const person = visitor.person_to_visit?.trim();
        if (person) {
          visitCounts[person] = (visitCounts[person] || 0) + 1;
        }
      });

      return Object.entries(visitCounts)
        .map(([name, visitCount]) => ({ name, visitCount }))
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 10);
    },
  });
}

export function useWeeklyEntryChart() {
  return useQuery({
    queryKey: ["weekly_entry_chart"],
    queryFn: async (): Promise<DailyEntryData[]> => {
      const days: DailyEntryData[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const [personnelLogs, visitorLogs] = await Promise.all([
          supabase
            .from("access_logs")
            .select("id", { count: "exact", head: true })
            .gte("entry_time", dayStart.toISOString())
            .lte("entry_time", dayEnd.toISOString()),
          supabase
            .from("visitor_access_logs")
            .select("id", { count: "exact", head: true })
            .gte("entry_time", dayStart.toISOString())
            .lte("entry_time", dayEnd.toISOString()),
        ]);

        days.push({
          date: dayStart.toISOString(),
          label: format(date, "EEE", { locale: es }),
          personnel: personnelLogs.count || 0,
          visitors: visitorLogs.count || 0,
        });
      }

      return days;
    },
  });
}

export function useEntryTypeDistribution() {
  return useQuery({
    queryKey: ["entry_type_distribution"],
    queryFn: async (): Promise<EntryTypeDistribution[]> => {
      const [personnelResult, visitorResult] = await Promise.all([
        supabase
          .from("access_logs")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("visitor_access_logs")
          .select("id", { count: "exact", head: true }),
      ]);

      return [
        {
          name: "Personal",
          value: personnelResult.count || 0,
          fill: "hsl(var(--primary))",
        },
        {
          name: "Visitas",
          value: visitorResult.count || 0,
          fill: "hsl(var(--accent))",
        },
      ];
    },
  });
}

export function useAverageDurationByDay() {
  return useQuery({
    queryKey: ["avg_duration_by_day"],
    queryFn: async () => {
      const days = [];

      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: logs } = await supabase
          .from("access_logs")
          .select("entry_time, exit_time")
          .gte("entry_time", dayStart.toISOString())
          .lte("entry_time", dayEnd.toISOString())
          .not("exit_time", "is", null);

        let avgMinutes = 0;
        if (logs && logs.length > 0) {
          const totalMinutes = logs.reduce((acc, log) => {
            const entry = new Date(log.entry_time);
            const exit = new Date(log.exit_time!);
            return acc + (exit.getTime() - entry.getTime()) / (1000 * 60);
          }, 0);
          avgMinutes = Math.round(totalMinutes / logs.length);
        }

        days.push({
          label: format(date, "EEE", { locale: es }),
          avgMinutes,
        });
      }

      return days;
    },
  });
}
