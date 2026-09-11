import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  addMovement,
  getAccessState,
  getDelayInfo,
  getEmployeeStatus,
  movementLabel,
  proposedMovement,
  statusLabel,
} from "@/lib/accessControl";
import { CheckCircle2, Search } from "lucide-react";

export default function ManualAccess() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(0);
  const state = useMemo(() => getAccessState(), [version]);

  const matches = state.employees.filter((employee) => {
    const haystack = `${employee.name} ${employee.legajo} ${employee.dni}`.toLowerCase();
    return query.trim().length > 0 && haystack.includes(query.toLowerCase());
  }).slice(0, 8);

  const selected = state.employees.find((employee) => employee.id === selectedId);
  const status = selected ? getEmployeeStatus(state, selected.id) : null;
  const action = status ? proposedMovement(status) : null;
  const delay = selected ? getDelayInfo(state, selected.id) : null;

  const confirm = () => {
    if (!selected || !action) return;
    try {
      addMovement(selected.id, action);
      setMessage(`${movementLabel(action)} registrado para ${selected.name}.`);
      setVersion((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el movimiento.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Alternativa al lector</p>
          <h1 className="mt-1 text-2xl font-bold">Ingreso / egreso manual</h1>
          <p className="mt-1 text-sm text-muted-foreground">Usar cuando la persona no tiene su documento o el lector no está disponible.</p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
              }}
              placeholder="Escribir nombre, apellido, legajo o DNI..."
              className="pl-9"
              autoFocus
            />
          </div>

          {matches.length > 0 && !selected && (
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
              {matches.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setSelectedId(employee.id)}
                  className="flex w-full items-center justify-between gap-3 bg-background px-4 py-3 text-left hover:bg-muted/60"
                >
                  <span>
                    <strong className="block text-sm">{employee.name}</strong>
                    <span className="text-xs text-muted-foreground">Legajo {employee.legajo} · {employee.sector}</span>
                  </span>
                  <Badge variant="outline">{statusLabel(getEmployeeStatus(state, employee.id))}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && status && action && (
          <div className="rounded-2xl border border-primary/35 bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Persona seleccionada</p>
                <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">Legajo {selected.legajo} · {selected.sector}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{statusLabel(status)}</Badge>
                {delay && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${delay.className}`}>{delay.label}</span>}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-muted/60 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Acción propuesta</p>
              <p className="mt-1 text-xl font-bold text-primary">{movementLabel(action)}</p>
            </div>

            <div className="mt-4 flex gap-3">
              <Button onClick={confirm} className="flex-1">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Aceptar
              </Button>
              <Button variant="outline" onClick={() => setSelectedId(null)}>Cambiar persona</Button>
            </div>
          </div>
        )}

        {message && <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">{message}</div>}
      </div>
    </AppLayout>
  );
}
