import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignVisit, getAccessState, releaseVisit, SECTORS } from "@/lib/accessControl";
import { BadgeCheck, LogOut } from "lucide-react";

export default function Visits() {
  const [version, setVersion] = useState(0);
  const [code, setCode] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [dni, setDni] = useState("");
  const [company, setCompany] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const state = useMemo(() => getAccessState(), [version]);
  const available = state.visits.filter((item) => !item.occupied);

  const register = () => {
    if (!code || !visitorName || !dni || !destination || !reason) {
      setMessage("Completá credencial, nombre, DNI, destino y motivo.");
      return;
    }
    assignVisit(code, { visitorName, dni, company, destination, reason });
    setCode("");
    setVisitorName("");
    setDni("");
    setCompany("");
    setDestination("");
    setReason("");
    setMessage("Visita registrada y credencial marcada como ocupada.");
    setVersion((value) => value + 1);
  };

  const checkout = (visitCode: string) => {
    releaseVisit(visitCode);
    setMessage(`${visitCode} liberada y disponible nuevamente.`);
    setVersion((value) => value + 1);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Visitantes</p>
          <h1 className="mt-1 text-2xl font-bold">Credenciales QR de visita</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seis credenciales reutilizables. Una credencial ocupada no puede asignarse a otra persona.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Registrar ingreso de visita</h2>
            <div className="mt-4 space-y-3">
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger><SelectValue placeholder="Credencial disponible" /></SelectTrigger>
                <SelectContent>
                  {available.map((item) => <SelectItem key={item.code} value={item.code}>{item.code}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={visitorName} onChange={(event) => setVisitorName(event.target.value)} placeholder="Nombre y apellido" />
              <Input value={dni} onChange={(event) => setDni(event.target.value)} placeholder="DNI" />
              <Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Empresa / organización (opcional)" />
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger><SelectValue placeholder="Sector visitado" /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map((sector) => <SelectItem key={sector} value={sector}>{sector}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo de la visita" />
              <Button onClick={register} className="w-full"><BadgeCheck className="mr-2 h-4 w-4" />Asignar credencial</Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Estado de credenciales</h2>
                <p className="text-xs text-muted-foreground">{state.visits.filter((item) => item.occupied).length} ocupadas · {available.length} disponibles</p>
              </div>
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {state.visits.map((item) => (
                <div key={item.code} className={`rounded-xl border p-4 ${item.occupied ? "border-orange-500/35 bg-orange-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <strong>{item.code}</strong>
                    <span className={`text-xs font-semibold ${item.occupied ? "text-orange-500" : "text-emerald-500"}`}>{item.occupied ? "OCUPADA" : "DISPONIBLE"}</span>
                  </div>
                  {item.occupied && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <p className="text-sm font-medium text-foreground">{item.visitorName}</p>
                      <p>DNI {item.dni}</p>
                      <p>{item.destination} · {item.reason}</p>
                      <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => checkout(item.code)}><LogOut className="mr-2 h-3.5 w-3.5" />Registrar egreso</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {message && <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">{message}</div>}
      </div>
    </AppLayout>
  );
}
