import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  UserPlus, 
  QrCode, 
  Users, 
  Shield,
  Printer,
  LogOut,
  UserCog,
  IdCard

} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Nuevo Registro", href: "/register", icon: UserPlus },
  { name: "Ingreso y Egreso", href: "/checkin", icon: QrCode },
  { name: "Personal por Objetivo", href: "/staff", icon: IdCard },
  { name: "Personal", href: "/personnel", icon: Users },
  { name: "Generador QR", href: "/qr-generator", icon: Printer },

];

const adminNavigation = [
  { name: "Gestión Usuarios", href: "/users", icon: UserCog },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
          <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-sidebar-foreground">AM Seguridad</h1>
          <p className="text-xs text-sidebar-foreground/60">Control de Acceso</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Admin</p>
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="px-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
        <p className="text-xs text-sidebar-foreground/40 text-center">
          © 2026 AM Seguridad
        </p>
      </div>
    </aside>
  );
}
