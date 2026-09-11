import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ACCESS_UPDATED_EVENT,
  SECTORS,
  formatTime,
  getAccessState,
  getDelayInfo,
  getEmployeeStatus,
  movementsToday,
  statusLabel,
} from "@/lib/accessControl";
import { Building2, CalendarDays, Clock3, Coffee, RefreshCcw, UserCheck, UserMinus, Users } from "lucide-react";

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatDayMonth(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [version, setVersion] = useState(0);
  const state = useMemo(() => getAccessState(), [version]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const refresh = () => setVersion((value) => value + 1);
    window.addEventListener(ACCESS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ACCESS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const people = state.employees.map((employee) => {
    const status = getEmployeeStatus(state, employee.id);
    const entry = movementsToday(state, employee.id).find((movement) => movement.type === "INGRESO");
    const delay = getDelayInfo(state, employee.id);
    return { employee, status, entry, delay };
  });

  const physicallyInside = people.filter(({ status }) => status === "PRESENTE");
  const temporarilyOutside = people.filter(({ status }) => status === "ALMUERZO" || status === "COMISION");
  const notPresent = people.filter(({ status }) => status === "NO_INGRESO");
  const late = people.filter(({ delay }) => delay.level === "LEVE" || delay.level === "IMPORTANTE");

  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Estado operativo en vivo</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">Dashboard de personal</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2 capitalize"><CalendarDays className="h-4 w-4" />{formatLongDate(now)}</span>
                <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Semana: {formatDayMonth(weekStart)} al {formatDayMonth(weekEnd)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Hora actual</p>
                <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
                  {new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setVersion((value) => value + 1)} title="Actualizar">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            <p className="mt-3 text-3xl font-bold">{physicallyInside.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Dentro del edificio</p>
          </div>
          <div className="rounded-2xl border border-orange-500/35 bg-orange-500/10 p-4">
            <Clock3 className="h-5 w-5 text-orange-500" />
            <p className="mt-3 text-3xl font-bold">{late.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Ingresaron tarde</p>
          </div>
          <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4">
            <UserMinus className="h-5 w-5 text-red-500" />
            <p className="mt-3 text-3xl font-bold">{notPresent.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Aún no ingresaron</p>
          </div>
          <div className="rounded-2xl border border-sky-500/35 bg-sky-500/10 p-4">
            <Coffee className="h-5 w-5 text-sky-500" />
            <p className="mt-3 text-3xl font-bold">{temporarilyOutside.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Salida temporal</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-border bg-card p-4 lg:col-span-1">
            <Users className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-bold">{state.employees.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Personal cargado</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Personal actualmente dentro del edificio</h2>
              <p className="text-xs text-muted-foreground">Quién está físicamente presente y a qué hora ingresó hoy.</p>
            </div>
            <Badge className="w-fit bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">{physicallyInside.length} presentes</Badge>
          </div>

          {physicallyInside.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No hay personal marcado como presente en este momento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Persona</th>
                    <th className="px-5 py-3 font-medium">Sector</th>
                    <th className="px-5 py-3 font-medium">Ingreso</th>
                    <th className="px-5 py-3 font-medium">Puntualidad</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {physicallyInside
                    .sort((a, b) => (a.entry?.timestamp ?? "").localeCompare(b.entry?.timestamp ?? ""))
                    .map(({ employee, status, entry, delay }) => (
                      <tr key={employee.id} className="hover:bg-muted/20">
                        <td className="px-5 py-3.5">
                          <strong className="block font-medium text-foreground">{employee.name}</strong>
                          <span className="text-xs text-muted-foreground">Legajo {employee.legajo}</span>
                        </td>
                        <td className="px-5 py-3.5"><Badge variant="outline">{employee.sector}</Badge></td>
                        <td className="px-5 py-3.5 font-mono font-semibold tabular-nums">{formatTime(entry?.timestamp)}</td>
                        <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${delay.className}`}>{delay.label}</span></td>
                        <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5 text-emerald-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />{statusLabel(status)}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Resumen por sector</h2>
              <p className="text-xs text-muted-foreground">Vista rápida para saber qué dotación está realmente disponible.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SECTORS.map((sector) => {
              const sectorPeople = people.filter(({ employee }) => employee.sector === sector);
              const present = sectorPeople.filter(({ status }) => status === "PRESENTE").length;
              const delayed = sectorPeople.filter(({ delay }) => delay.level === "LEVE" || delay.level === "IMPORTANTE").length;
              const absent = sectorPeople.filter(({ status }) => status === "NO_INGRESO").length;
              const temporary = sectorPeople.filter(({ status }) => status === "ALMUERZO" || status === "COMISION").length;
              const jefe = sectorPeople[0]?.employee.jefe ?? "Jefe sin asignar";

              return (
                <div key={sector} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{sector}</h3>
                      <p className="text-xs text-muted-foreground">{jefe}</p>
                    </div>
                    <span className="text-2xl font-bold">{present}<span className="text-sm font-normal text-muted-foreground">/{sectorPeople.length}</span></span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-emerald-500/10 p-2"><strong className="block text-emerald-500">{present}</strong><span className="text-[10px] text-muted-foreground">Presentes</span></div>
                    <div className="rounded-xl bg-orange-500/10 p-2"><strong className="block text-orange-500">{delayed}</strong><span className="text-[10px] text-muted-foreground">Tarde</span></div>
                    <div className="rounded-xl bg-red-500/10 p-2"><strong className="block text-red-500">{absent}</strong><span className="text-[10px] text-muted-foreground">Ausentes</span></div>
                  </div>
                  {temporary > 0 && <p className="mt-3 text-xs text-sky-500">{temporary} persona(s) fuera temporalmente por almuerzo o comisión.</p>}
                </div>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-600 dark:text-yellow-400">
          MODO DEMOSTRACIÓN · DATOS FICTICIOS. En producción estos estados se alimentarán de las marcaciones reales.
        </div>
      </div>
    </AppLayout>
  );
}
