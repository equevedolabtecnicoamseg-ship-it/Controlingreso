import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addMovement,
  getAccessState,
  getEmployeeStatus,
  getLunchElapsedMinutes,
  movementLabel,
  statusLabel,
} from "@/lib/accessControl";
import { Clock3, RotateCcw } from "lucide-react";

export default function TemporaryExits() {
  const [version, setVersion] = useState(0);
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<"ALMUERZO_SALIDA" | "COMISION_SALIDA" | "OTRA_SALIDA">("ALMUERZO_SALIDA");
  const [reason, setReason] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [message, setMessage] = useState("");
  const state = useMemo(() => getAccessState(), [version]);

  const presentEmployees = state.employees.filter((employee) => getEmployeeStatus(state, employee.id) === "PRESENTE");
  const outsideEmployees = state.employees.filter((employee) => {
    const status = getEmployeeStatus(state, employee.id);
    return status === "ALMUERZO" || status === "COMISION";
  });

  const registerExit = () => {
    if (!employeeId) return;
    try {
      addMovement(employeeId, type, {
        reason: type === "ALMUERZO_SALIDA" ? "Almuerzo" : reason || "Salida autorizada",
        authorizedBy,
      });
      setMessage("Salida temporal registrada.");
      setEmployeeId("");
      setReason("");
      setAuthorizedBy("");
      setVersion((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la salida.");
    }
  };

  const registerReturn = (id: string) => {
    const status = getEmployeeStatus(state, id);
    const returnType = status === "ALMUERZO" ? "ALMUERZO_REGRESO" : "COMISION_REGRESO";
    try {
      addMovement(id, returnType);
      setMessage(`${movementLabel(returnType)} registrado.`);
      setVersion((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el regreso.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Movimientos intermedios</p>
          <h1 className="mt-1 text-2xl font-bold">Salidas temporales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Almuerzo, comisión u otra salida autorizada sin cerrar la jornada.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Registrar salida</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Empleado presente</label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
                  <SelectContent>
                    {presentEmployees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name} · {employee.sector}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tipo</label>
                <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALMUERZO_SALIDA">Almuerzo</SelectItem>
                    <SelectItem value="COMISION_SALIDA">Comisión / trámite laboral</SelectItem>
                    <SelectItem value="OTRA_SALIDA">Otra salida autorizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type !== "ALMUERZO_SALIDA" && (
                <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo de la salida" />
              )}

              <Input value={authorizedBy} onChange={(event) => setAuthorizedBy(event.target.value)} placeholder="Jefe / responsable que autoriza" />

              <Button onClick={registerExit} disabled={!employeeId} className="w-full">Registrar salida</Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Personas fuera temporalmente</h2>
                <p className="text-xs text-muted-foreground">Registrar el regreso sin cerrar ni reabrir la jornada.</p>
              </div>
              <Clock3 className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 space-y-3">
              {outsideEmployees.length === 0 && <p className="rounded-xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">No hay salidas temporales activas.</p>}
              {outsideEmployees.map((employee) => {
                const status = getEmployeeStatus(state, employee.id);
                const lunchMinutes = status === "ALMUERZO" ? getLunchElapsedMinutes(state, employee.id) : 0;
                return (
                  <div key={employee.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <strong className="block text-sm">{employee.name}</strong>
                      <span className="text-xs text-muted-foreground">{employee.sector} · {statusLabel(status)}</span>
                      {status === "ALMUERZO" && (
                        <p className={`mt-1 text-xs ${lunchMinutes > 60 ? "text-red-500" : "text-sky-500"}`}>{lunchMinutes} min transcurridos · autorizado 60 min</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => registerReturn(employee.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Registrar regreso
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {message && <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">{message}</div>}
      </div>
    </AppLayout>
  );
}
