import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { ScanLine, Search, DoorOpen, BarChart3, BadgeCheck, Users, ClipboardList } from "lucide-react";

const primaryTools = [
  {
    title: "Escanear QR",
    detail: "Ingreso y egreso automático con lector",
    href: "/checkin",
    icon: ScanLine,
    primary: true,
  },
  {
    title: "Ingreso manual",
    detail: "Buscar por nombre, apellido o legajo",
    href: "/manual",
    icon: Search,
  },
  {
    title: "Salidas temporales",
    detail: "Almuerzo, comisión y salidas autorizadas",
    href: "/temporary",
    icon: DoorOpen,
  },
  {
    title: "Dashboard",
    detail: "Presentes, tardanzas y ausencias por sector",
    href: "/dashboard",
    icon: BarChart3,
  },
];

const secondaryTools = [
  { title: "Visitas", detail: "6 credenciales QR reutilizables", href: "/visits", icon: BadgeCheck },
  { title: "Personas", detail: "Consulta de personal y visitantes", href: "/personnel", icon: Users },
  { title: "Registros", detail: "Alta de personas y datos", href: "/register", icon: ClipboardList },
];

export default function Operations() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2 border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Puesto de recepción</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Control de acceso</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Flujo operativo para reemplazar la marcación RFID y la carga manual en Excel.
          </p>
        </header>

        <section>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {primaryTools.map(({ title, detail, href, icon: Icon, primary }) => (
              <Link
                key={href}
                to={href}
                className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${
                  primary
                    ? "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/.08)]"
                    : "border-border bg-card hover:border-primary/35"
                }`}
              >
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] ${primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">{title}</h2>
                <p className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:block">{detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Otras herramientas</h2>
            <p className="text-xs text-muted-foreground">Accesos secundarios para tareas menos frecuentes.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {secondaryTools.map(({ title, detail, href, icon: Icon }) => (
              <Link key={href} to={href} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/30">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-600 dark:text-yellow-400">
          MODO DEMOSTRACIÓN · DATOS FICTICIOS. La lógica queda separada de Supabase hasta conectar los datos reales.
        </div>
      </div>
    </AppLayout>
  );
}
