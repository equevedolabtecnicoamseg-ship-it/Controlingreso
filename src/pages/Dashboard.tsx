import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useDashboardOverview,
  useSectorStats,
  useMostVisitedPersons,
  useWeeklyEntryChart,
  useEntryTypeDistribution,
  useAverageDurationByDay,
} from "@/hooks/useDashboardStats";
import { useAccessLogs, usePersonnelList } from "@/hooks/usePersonnel";
import { ReportsSection } from "@/components/dashboard/ReportsSection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Users,
  LogIn,
  UserCheck,
  TrendingUp,
  Building2,
  UserPlus,
  Timer,
  Eye,
  LogOut,
  CalendarDays,
  Activity,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PersonnelWithStats {
  id: string;
  first_name: string;
  last_name: string;
  dni_number: string;
  sectors?: { name: string } | null;
  totalVisits: number;
  avgDuration: number;
  totalDuration: number;
  visits: VisitDetail[];
}

interface VisitDetail {
  id: string;
  entry_time: string;
  exit_time: string | null;
  duration: number | null;
}

const chartConfig = {
  personnel: {
    label: "Personal",
    color: "hsl(217, 91%, 60%)",
  },
  visitors: {
    label: "Visitas",
    color: "hsl(160, 84%, 39%)",
  },
  avgMinutes: {
    label: "Duración Promedio",
    color: "hsl(45, 93%, 47%)",
  },
};

// Modern circular progress component
function CircularProgress({ value, max, size = 120, strokeWidth = 10, color = "primary" }: { 
  value: number; 
  max: number; 
  size?: number; 
  strokeWidth?: number;
  color?: "primary" | "success" | "warning" | "accent";
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    primary: "stroke-primary",
    success: "stroke-success",
    warning: "stroke-warning",
    accent: "stroke-accent",
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-muted fill-none"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${colorMap[color]} fill-none transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{percentage.toFixed(1)}%</span>
        <span className="text-xs text-muted-foreground">Ocupación</span>
      </div>
    </div>
  );
}

// Stat card with gradient border
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  gradient = "primary" 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  gradient?: "primary" | "success" | "warning" | "accent";
}) {
  const gradientColors = {
    primary: "from-primary/20 to-info/20",
    success: "from-success/20 to-accent/20", 
    warning: "from-warning/20 to-warning/10",
    accent: "from-accent/20 to-success/20",
  };

  const iconBg = {
    primary: "bg-primary/20 text-primary",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    accent: "bg-accent/20 text-accent",
  };

  return (
    <div className={`stat-card-gradient bg-gradient-to-br ${gradientColors[gradient]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === "up" ? "text-success" : "text-destructive"}`}>
              {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-xl ${iconBg[gradient]} flex items-center justify-center`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// Mini stat for quick metrics
function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardOverview();
  const { data: sectorStats, isLoading: sectorsLoading } = useSectorStats();
  const { data: mostVisited, isLoading: visitedLoading } = useMostVisitedPersons();
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyEntryChart();
  const { data: entryDistribution, isLoading: distributionLoading } = useEntryTypeDistribution();
  const { data: durationData, isLoading: durationLoading } = useAverageDurationByDay();
  const { data: logs } = useAccessLogs();
  const { data: personnel } = usePersonnelList();
  const [selectedPerson, setSelectedPerson] = useState<PersonnelWithStats | null>(null);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "HH:mm:ss", { locale: es });
  };

  const personnelStats = useMemo(() => {
    if (!logs || !personnel) return [];

    return personnel.map((person) => {
      const personLogs = logs.filter((log) => log.personnel_id === person.id);

      const visits: VisitDetail[] = personLogs.map((log) => {
        let duration: number | null = null;
        if (log.exit_time) {
          const entry = new Date(log.entry_time);
          const exit = new Date(log.exit_time);
          duration = Math.round((exit.getTime() - entry.getTime()) / (1000 * 60));
        }
        return {
          id: log.id,
          entry_time: log.entry_time,
          exit_time: log.exit_time,
          duration,
        };
      });

      const completedVisits = visits.filter((v) => v.duration !== null);
      const totalDuration = completedVisits.reduce((acc, v) => acc + (v.duration || 0), 0);
      const avgDuration =
        completedVisits.length > 0
          ? Math.round(totalDuration / completedVisits.length)
          : 0;

      return {
        ...person,
        totalVisits: personLogs.length,
        avgDuration,
        totalDuration,
        visits: visits.sort(
          (a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()
        ),
      };
    }).sort((a, b) => b.totalVisits - a.totalVisits);
  }, [logs, personnel]);

  // Calculate occupancy percentage (currently inside vs total registered)
  const totalRegistered = (stats?.totalPersonnel || 0) + (stats?.totalVisitors || 0);
  const currentlyInside = (stats?.currentlyInsidePersonnel || 0) + (stats?.currentlyInsideVisitors || 0);
  
  // Prepare radial chart data
  const radialData = [
    {
      name: "Personal",
      value: stats?.currentlyInsidePersonnel || 0,
      fill: "hsl(217, 91%, 60%)",
    },
    {
      name: "Visitas",
      value: stats?.currentlyInsideVisitors || 0,
      fill: "hsl(160, 84%, 39%)",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Dashboard de Control</h1>
                <p className="text-sm text-muted-foreground">AM Seguridad - Panel en tiempo real</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-success/50 text-success">
              <Zap className="h-3 w-3" />
              En vivo
            </Badge>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          ) : (
            <>
              <StatCard
                title="Personal Registrado"
                value={stats?.totalPersonnel || 0}
                subtitle="Total en sistema"
                icon={Users}
                trend="up"
                trendValue="+12% este mes"
                gradient="primary"
              />
              <StatCard
                title="Visitas Hoy"
                value={(stats?.todayEntries || 0) + (stats?.todayVisitorEntries || 0)}
                subtitle={`${stats?.todayEntries || 0} personal, ${stats?.todayVisitorEntries || 0} visitas`}
                icon={LogIn}
                gradient="success"
              />
              <StatCard
                title="Actualmente Dentro"
                value={currentlyInside}
                subtitle={`${stats?.currentlyInsidePersonnel || 0} personal, ${stats?.currentlyInsideVisitors || 0} visitas`}
                icon={UserCheck}
                gradient="warning"
              />
              <StatCard
                title="Duración Promedio"
                value={formatDuration(stats?.avgDurationMinutes || 0)}
                subtitle="Por visita completada"
                icon={Timer}
                gradient="accent"
              />
            </>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Occupancy Ring */}
          <Card className="chart-card lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Ocupación Actual</CardTitle>
              <CardDescription>Personal y visitas dentro</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              {statsLoading ? (
                <Skeleton className="h-32 w-32 rounded-full" />
              ) : (
                <>
                  <CircularProgress 
                    value={currentlyInside} 
                    max={Math.max(totalRegistered, 1)} 
                    size={140}
                    strokeWidth={12}
                    color="primary"
                  />
                  <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                    <div className="text-center p-2 bg-primary/10 rounded-lg">
                      <p className="text-xl font-bold text-primary">{stats?.currentlyInsidePersonnel || 0}</p>
                      <p className="text-xs text-muted-foreground">Personal</p>
                    </div>
                    <div className="text-center p-2 bg-success/10 rounded-lg">
                      <p className="text-xl font-bold text-success">{stats?.currentlyInsideVisitors || 0}</p>
                      <p className="text-xs text-muted-foreground">Visitas</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Weekly Chart */}
          <Card className="chart-card lg:col-span-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Tendencia Semanal</CardTitle>
                  <CardDescription>Entradas de personal y visitas</CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono">
                  Últimos 7 días
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {weeklyLoading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : weeklyData && weeklyData.length > 0 ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="colorPersonnel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(222, 47%, 14%)",
                          border: "1px solid hsl(217, 33%, 25%)",
                          borderRadius: "12px",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                        }}
                        labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="personnel"
                        name="Personal"
                        stroke="hsl(217, 91%, 60%)"
                        strokeWidth={2}
                        fill="url(#colorPersonnel)"
                      />
                      <Area
                        type="monotone"
                        dataKey="visitors"
                        name="Visitas"
                        stroke="hsl(160, 84%, 39%)"
                        strokeWidth={2}
                        fill="url(#colorVisitors)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="chart-card lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Resumen Rápido</CardTitle>
              <CardDescription>Métricas clave del período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : (
                <>
                  <MiniStat label="Esta semana" value={stats?.weeklyEntries || 0} color="text-primary" />
                  <MiniStat label="Este mes" value={stats?.monthlyEntries || 0} color="text-success" />
                  <MiniStat label="Visitantes únicos" value={stats?.totalVisitors || 0} color="text-warning" />
                  <MiniStat label="Registros totales" value={(stats?.totalPersonnel || 0) + (stats?.totalVisitors || 0)} color="text-accent" />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Duration Chart */}
          <Card className="chart-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Tiempo de Permanencia</CardTitle>
              <CardDescription>Duración promedio diaria (min)</CardDescription>
            </CardHeader>
            <CardContent>
              {durationLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : durationData && durationData.some((d) => d.avgMinutes > 0) ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={durationData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(222, 47%, 14%)",
                          border: "1px solid hsl(217, 33%, 25%)",
                          borderRadius: "12px",
                        }}
                      />
                      <Bar
                        dataKey="avgMinutes"
                        name="Duración (min)"
                        fill="hsl(45, 93%, 47%)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No hay datos de duración
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sectors Stats */}
          <Card className="chart-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Sectores Más Activos</CardTitle>
              </div>
              <CardDescription>Por cantidad de entradas</CardDescription>
            </CardHeader>
            <CardContent>
              {sectorsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sectorStats && sectorStats.length > 0 ? (
                <div className="space-y-2">
                  {sectorStats.slice(0, 4).map((sector, index) => {
                    const maxEntries = Math.max(...sectorStats.map(s => s.totalEntries));
                    const percentage = maxEntries > 0 ? (sector.totalEntries / maxEntries) * 100 : 0;
                    
                    return (
                      <div key={sector.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                              index === 0
                                ? "bg-primary/20 text-primary"
                                : index === 1
                                ? "bg-success/20 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-medium">{sector.name}</span>
                          </div>
                          <span className="font-mono text-muted-foreground">{sector.totalEntries}</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className={`progress-bar-fill ${
                              index === 0 ? "bg-primary" : index === 1 ? "bg-success" : "bg-muted-foreground/50"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No hay sectores registrados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Visited Persons */}
          <Card className="chart-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Más Solicitados</CardTitle>
              </div>
              <CardDescription>Ranking por visitas recibidas</CardDescription>
            </CardHeader>
            <CardContent>
              {visitedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : mostVisited && mostVisited.length > 0 ? (
                <div className="space-y-2">
                  {mostVisited.slice(0, 5).map((person, index) => (
                    <div
                      key={person.name}
                      className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            index === 0
                              ? "bg-warning/20 text-warning"
                              : index === 1
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-medium text-sm truncate max-w-[120px]">{person.name}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {person.visitCount}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No hay datos de visitas
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reports Section */}
        <ReportsSection />

        {/* Personnel Stats Table */}
        <Card className="chart-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Estadísticas por Persona</CardTitle>
            </div>
            <CardDescription>
              Detalle de visitas, tiempos totales y promedios por cada persona registrada
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {personnelStats.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead className="text-right">Total Visitas</TableHead>
                    <TableHead className="text-right">Tiempo Total</TableHead>
                    <TableHead className="text-right">Duración Promedio</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnelStats.slice(0, 10).map((person) => (
                    <TableRow key={person.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {person.first_name} {person.last_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{person.dni_number}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {person.sectors?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/20 text-primary text-sm font-medium">
                          {person.totalVisits}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {person.totalDuration > 0 ? formatDuration(person.totalDuration) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {person.avgDuration > 0 ? formatDuration(person.avgDuration) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPerson(person)}
                          disabled={person.visits.length === 0}
                          className="hover:bg-primary/20 hover:text-primary"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No hay datos de estadísticas aún
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit Detail Dialog */}
        <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Historial de Visitas - {selectedPerson?.first_name} {selectedPerson?.last_name}
              </DialogTitle>
            </DialogHeader>

            {selectedPerson && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-primary/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total Visitas</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedPerson.totalVisits}
                    </p>
                  </div>
                  <div className="bg-success/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Tiempo Total</p>
                    <p className="text-2xl font-bold text-success">
                      {formatDuration(selectedPerson.totalDuration)}
                    </p>
                  </div>
                  <div className="bg-warning/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Promedio/Visita</p>
                    <p className="text-2xl font-bold text-warning">
                      {formatDuration(selectedPerson.avgDuration)}
                    </p>
                  </div>
                </div>

                {/* Visit List */}
                <div className="flex-1 overflow-auto border border-border/50 rounded-xl">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Salida</TableHead>
                        <TableHead className="text-right">Duración</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPerson.visits.map((visit, index) => (
                        <TableRow key={visit.id}>
                          <TableCell className="text-muted-foreground font-mono">
                            {selectedPerson.visits.length - index}
                          </TableCell>
                          <TableCell className="font-medium">
                            {format(new Date(visit.entry_time), "dd MMM yyyy", {
                              locale: es,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-success">
                              <LogIn className="h-3 w-3" />
                              {formatTime(visit.entry_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {visit.exit_time ? (
                              <div className="flex items-center gap-1 text-destructive">
                                <LogOut className="h-3 w-3" />
                                {formatTime(visit.exit_time)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {visit.duration !== null ? formatDuration(visit.duration) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {visit.exit_time ? (
                              <Badge variant="secondary">Completada</Badge>
                            ) : (
                              <Badge className="bg-success text-success-foreground">
                                En edificio
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
