import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./AppSidebar";
import { VisualSettings } from "./VisualSettings";
import { useVisualTheme } from "@/contexts/ThemeContext";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { backgroundForPath } = useVisualTheme();
  const bg = backgroundForPath(location.pathname);

  const backgroundStyle =
    bg.mode === "image"
      ? {
          backgroundImage: bg.value ? `url("${bg.value}")` : undefined,
          backgroundSize: "cover",
          backgroundPosition: bg.position,
        }
      : { background: bg.value };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="relative min-h-screen overflow-hidden pl-64">
        <div
          className="pointer-events-none absolute inset-0 scale-105"
          style={{ ...backgroundStyle, filter: `blur(${bg.blur}px)` }}
        />
        {bg.overlay > 0 && (
          <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: bg.overlay / 100 }} />
        )}

        <div className="relative z-10">
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-card/80" title="Atrás">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-9 w-9 rounded-xl bg-card/80" title="Adelante">
                <ArrowRight className="h-4 w-4" />
              </Button>
              <span className="ml-2 hidden text-xs font-medium text-muted-foreground sm:inline">Navegación</span>
            </div>
            <VisualSettings />
          </div>

          <div className="p-5 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
