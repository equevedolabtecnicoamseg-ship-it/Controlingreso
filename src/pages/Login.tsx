import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVisualTheme } from "@/contexts/ThemeContext";
import { VisualSettings } from "@/components/layout/VisualSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, LogIn, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { config, backgroundForPath } = useVisualTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const bg = backgroundForPath("/login");

  const backgroundStyle =
    bg.mode === "image"
      ? {
          backgroundImage: bg.value ? `url("${bg.value}")` : undefined,
          backgroundSize: "cover",
          backgroundPosition: bg.position,
        }
      : { background: bg.value };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Error de autenticación",
        description: "Email o contraseña incorrectos",
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 scale-105" style={{ ...backgroundStyle, filter: `blur(${bg.blur}px)` }} />
      {bg.overlay > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: bg.overlay / 100 }} />}

      <div className="absolute right-4 top-4 z-20">
        <VisualSettings />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-2 text-center">
            <div className="mx-auto flex min-h-16 min-w-16 items-center justify-center">
              {config.logos.full ? (
                <img src={config.logos.full} alt="AM Seguridad" className="max-h-20 max-w-[240px] object-contain" />
              ) : config.logos.mark ? (
                <img src={config.logos.mark} alt="AM Seguridad" className="h-16 w-16 object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                  <Shield className="h-9 w-9 text-primary-foreground" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">AM Seguridad</CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                Control de Acceso — Iniciar Sesión
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="usuario@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
