import { FormEvent, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  addMovement,
  findEmployeeFromScan,
  getAccessState,
  getEmployeeStatus,
  movementLabel,
  proposedMovement,
  statusLabel,
} from "@/lib/accessControl";
import { CheckCircle2, ScanLine } from "lucide-react";

export default function CheckIn() {
  const [scan, setScan] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const state = useMemo(() => getAccessState(), [version]);
  const selected = state.employees.find((employee) => employee.id === selectedId);
  const status = selected ? getEmployeeStatus(state, selected.id) : null;
  const action = status ? proposedMovement(status) : null;

  const locate = (event?: FormEvent) => {
    event?.preventDefault();
    const employee = findEmployeeFromScan(scan, state);
    if (!employee) {
      setMessage("No se encontró una persona asociada al código leído.");
      setSelectedId(null);
      inputRef.current?.select();
      return;
    }
    setSelectedId(employee.id);
    setMessage("");
  };

  const confirm = () => {
    if (!selected || !action) return;
    try {
      addMovement(selected.id, action);
      setMessage(`${movementLabel(action)} registrado correctamente para ${selected.name}.`);
      setScan("");
      setSelectedId(null);
      setVersion((value) => value + 1);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el movimiento.");
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ScanLine className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">Escanear QR / DNI</h1>
          <p className="mt-1 text-sm text-muted-foreground">El lector debe quedar apuntando a este campo. Escanear, verificar y aceptar.</p>
        </header>

        <form onSubmit={locate} className="rounded-2xl border border-primary/35 bg-card p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lectura del dispositivo</label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={scan}
              onChange={(event) => setScan(event.target.value)}
              placeholder="Escanee el QR del DNI o escriba DNI/legajo..."
              className="h-12 font-mono"
              autoFocus
            />
            <Button type="submit" className="h-12 px-6">Buscar</Button>
          </div>
        </form>

        {selected && status && action && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Persona identificada</p>
                <h2 className="mt-1 text-2xl font-semibold">{selected.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Legajo {selected.legajo} · {selected.sector}</p>
              </div>
              <Badge variant="outline">{statusLabel(status)}</Badge>
            </div>

            <div className="mt-5 rounded-2xl bg-muted/60 p-5 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Acción detectada</p>
              <p className="mt-1 text-2xl font-bold text-primary">{movementLabel(action)}</p>
              <p className="mt-2 font-mono text-sm text-muted-foreground">{new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())}</p>
            </div>

            <Button onClick={confirm} className="mt-4 h-12 w-full text-base">
              <CheckCircle2 className="mr-2 h-5 w-5" /> Aceptar movimiento
            </Button>
          </section>
        )}

        {message && <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">{message}</div>}
      </div>
    </AppLayout>
  );
}
