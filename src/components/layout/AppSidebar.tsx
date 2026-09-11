import { Link, useLocation } from "react-router-dom";
import { BarChart3, DoorOpen, LogOut, ScanLine, Search, Shield, UserCog, Users, BadgeCheck, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Inicio", href: "/", icon: Shield },
  { name: "Escanear QR", href: "/checkin", icon: ScanLine },
  { name: "Ingreso manual", href: "/manual", icon: Search },
  { name: "Salidas", href: "/temporary", icon: DoorOpen },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Visitas", href: "/visits", icon: BadgeCheck },
  { name: "Personas", href: "/personnel", icon: Users },
  { name: "Registros", href: "/register", icon: ClipboardList },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary shadow-sm">
          <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-sidebar-foreground">AM Seguridad</h1>
          <p className="text-[11px] text-sidebar-foreground/60">Control de acceso</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.href} to={item.href} className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}>
              <item.icon className="h-4 w-4" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <Link to="/users" className={`sidebar-item ${location.pathname === "/users" ? "sidebar-item-active" : ""}`}>
              <UserCog className="h-4 w-4" />
              <span className="text-sm">Usuarios</span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {user && <p className="mb-2 truncate px-2 text-[11px] text-sidebar-foreground/55">{user.email}</p>}
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/65" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
