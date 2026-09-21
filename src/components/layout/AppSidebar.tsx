import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, UserPlus, QrCode, Users, Shield, Printer, LogOut, UserCog, IdCard, Search, DoorOpen, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useVisualTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Inicio", href: "/", icon: LayoutDashboard },
  { name: "Escanear QR", href: "/checkin", icon: QrCode },
  { name: "Ingreso manual", href: "/manual", icon: Search },
  { name: "Salidas temporales", href: "/temporary", icon: DoorOpen },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Visitas", href: "/visits", icon: BadgeCheck },
  { name: "Nuevo Registro", href: "/register", icon: UserPlus },
  { name: "Personal", href: "/personnel", icon: Users },
  { name: "Personal por Objetivo", href: "/staff", icon: IdCard },
  { name: "Generador QR", href: "/qr-generator", icon: Printer },
];

const adminNavigation = [
  { name: "Gestión Usuarios", href: "/users", icon: UserCog },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { config } = useVisualTheme();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sidebar-primary">
          {config.logos.mark ? (
            <img src={config.logos.mark} alt="AM" className="h-full w-full object-contain p-1" />
          ) : (
            <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
          )}
        </div>
        <div className="min-w-0">
          {config.logos.full ? (
            <img src={config.logos.full} alt="AM Seguridad" className="max-h-9 max-w-[145px] object-contain object-left" />
          ) : (
            <>
              <h1 className="truncate text-base font-bold text-sidebar-foreground">AM Seguridad</h1>
              <p className="text-xs text-sidebar-foreground/60">Control de Acceso</p>
            </>
          )}
        </div>
      </div>

      <nav className="mt-4 max-h-[calc(100vh-190px)] space-y-1 overflow-y-auto px-3 pb-3">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.name} to={item.href} className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}>
              <item.icon className="h-4 w-4" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">Admin</p>
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href} className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}>
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 space-y-3 border-t border-sidebar-border bg-sidebar p-4">
        {user && <p className="truncate px-2 text-xs text-sidebar-foreground/60">{user.email}</p>}
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}
