import { useRef, useState } from "react";
import { Settings, Upload, RotateCcw, Save, Image as ImageIcon, Palette, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_VISUAL_THEME, type PanelBackground, useVisualTheme } from "@/contexts/ThemeContext";

const colorFields = [
  ["primary", "Principal / institucional"],
  ["secondary", "Secundario"],
  ["border", "Contornos y bordes"],
  ["background", "Fondo general"],
  ["card", "Tarjetas"],
  ["foreground", "Texto principal"],
  ["success", "Éxito / presente"],
  ["warning", "Advertencia / tardanza"],
  ["destructive", "Error / alerta roja"],
  ["info", "Información"],
] as const;

const panelOptions = [
  ["login", "Login"],
  ["home", "Inicio"],
  ["checkin", "Escanear QR"],
  ["manual", "Ingreso manual"],
  ["temporary", "Salidas temporales"],
  ["dashboard", "Dashboard"],
  ["personnel", "Personal"],
  ["visits", "Visitas"],
] as const;

export function VisualSettings() {
  const { config, setConfig, save, reset } = useVisualTheme();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [panelKey, setPanelKey] = useState("home");
  const snapshot = useRef(config);

  const openPanel = (next: boolean) => {
    if (next) snapshot.current = JSON.parse(JSON.stringify(config));
    setOpen(next);
  };

  const updateColor = (key: keyof typeof config.colors, value: string) => {
    setConfig((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const updateBackground = (patch: Partial<PanelBackground>) => {
    setConfig((prev) => ({
      ...prev,
      backgrounds: {
        ...prev.backgrounds,
        [panelKey]: { ...prev.backgrounds[panelKey], ...patch },
      },
    }));
  };

  const readImage = (file: File | undefined, target: "full" | "mark" | "background") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      if (target === "background") {
        updateBackground({ mode: "image", value: data });
      } else {
        setConfig((prev) => ({ ...prev, logos: { ...prev.logos, [target]: data } }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    save();
    snapshot.current = JSON.parse(JSON.stringify(config));
    toast({ title: "Personalización guardada", description: "Los cambios quedarán aplicados al volver a abrir la aplicación." });
    setOpen(false);
  };

  const handleCancel = () => {
    setConfig(snapshot.current);
    setOpen(false);
  };

  const handleReset = () => {
    reset();
    toast({ title: "Tema restaurado", description: "Se recuperó la apariencia predeterminada de AM Seguridad." });
  };

  const bg = config.backgrounds[panelKey] || DEFAULT_VISUAL_THEME.backgrounds.default;

  return (
    <Sheet open={open} onOpenChange={openPanel}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl border-border/70 bg-card/80 shadow-sm backdrop-blur hover:border-primary/50"
          aria-label="Abrir personalización visual"
          title="Personalización visual"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto border-l-border/70 bg-background/95 p-0 backdrop-blur-xl sm:max-w-[460px]">
        <SheetHeader className="border-b border-border/70 px-6 py-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Personalización
          </SheetTitle>
          <SheetDescription>
            Cambiá marca, colores y fondos sin tocar el código.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="brand" className="px-6 py-5">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="brand" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Marca</TabsTrigger>
            <TabsTrigger value="colors" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Colores</TabsTrigger>
            <TabsTrigger value="backgrounds" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Fondos</TabsTrigger>
          </TabsList>

          <TabsContent value="brand" className="mt-5 space-y-5">
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <Label>Logo principal</Label>
              <p className="mt-1 text-xs text-muted-foreground">Se usa en login y zonas de marca donde haya espacio.</p>
              <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-3">
                {config.logos.full ? <img src={config.logos.full} alt="Logo principal" className="max-h-20 max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Sin logo personalizado</span>}
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/50">
                <Upload className="h-4 w-4" /> Subir logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], "full")} />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <Label>Escudo / isotipo</Label>
              <p className="mt-1 text-xs text-muted-foreground">Se usa en espacios compactos, sidebar e iconos de marca.</p>
              <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-3">
                {config.logos.mark ? <img src={config.logos.mark} alt="Isotipo" className="max-h-20 max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Sin isotipo personalizado</span>}
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/50">
                <Upload className="h-4 w-4" /> Subir escudo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], "mark")} />
              </label>
            </div>
          </TabsContent>

          <TabsContent value="colors" className="mt-5 space-y-3">
            {colorFields.map(([key, label]) => (
              <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
                <div>
                  <Label htmlFor={"color-" + key} className="text-sm">{label}</Label>
                  <Input
                    id={"color-" + key}
                    value={config.colors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="mt-2 h-8 font-mono text-xs"
                  />
                </div>
                <input
                  type="color"
                  value={config.colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="h-11 w-11 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  aria-label={"Elegir " + label}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="backgrounds" className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label>Panel a personalizar</Label>
              <Select value={panelKey} onValueChange={setPanelKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {panelOptions.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de fondo</Label>
              <Select value={bg.mode} onValueChange={(mode: "solid" | "gradient" | "image") => updateBackground({ mode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Color sólido</SelectItem>
                  <SelectItem value="gradient">Gradiente CSS</SelectItem>
                  <SelectItem value="image">Imagen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bg.mode === "solid" && (
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={bg.value} onChange={(e) => updateBackground({ value: e.target.value })} />
                </div>
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(bg.value) ? bg.value : "#0f172a"} onChange={(e) => updateBackground({ value: e.target.value })} className="h-10 w-11 rounded-lg border border-border bg-transparent p-1" />
              </div>
            )}

            {bg.mode === "gradient" && (
              <div className="space-y-2">
                <Label>Gradiente CSS</Label>
                <Input value={bg.value} onChange={(e) => updateBackground({ value: e.target.value })} placeholder="linear-gradient(135deg, #0f172a, #12351f)" />
              </div>
            )}

            {bg.mode === "image" && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {bg.value ? <img src={bg.value} alt="Fondo" className="h-28 w-full object-cover" /> : <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">Sin imagen</div>}
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/50">
                  <Upload className="h-4 w-4" /> Elegir imagen
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], "background")} />
                </label>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm"><Label>Oscurecer fondo</Label><span className="text-muted-foreground">{bg.overlay}%</span></div>
              <Slider value={[bg.overlay]} min={0} max={85} step={5} onValueChange={([value]) => updateBackground({ overlay: value })} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm"><Label>Desenfoque</Label><span className="text-muted-foreground">{bg.blur}px</span></div>
              <Slider value={[bg.blur]} min={0} max={16} step={1} onValueChange={([value]) => updateBackground({ blur: value })} />
            </div>

            <div className="space-y-2">
              <Label>Posición</Label>
              <Select value={bg.position} onValueChange={(position) => updateBackground({ position })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="top">Arriba</SelectItem>
                  <SelectItem value="bottom">Abajo</SelectItem>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Vista previa</p>
              <div className="relative h-28 overflow-hidden rounded-lg border border-border bg-background">
                <div
                  className="absolute inset-0 scale-105"
                  style={{
                    background: bg.mode === "image" ? undefined : bg.value,
                    backgroundImage: bg.mode === "image" && bg.value ? `url("${bg.value}")` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: bg.position,
                    filter: `blur(${bg.blur}px)`,
                  }}
                />
                {bg.overlay > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: bg.overlay / 100 }} />}
                <div className="relative z-10 m-4 rounded-lg border border-border bg-card/80 p-3 backdrop-blur">
                  <div className="h-2 w-20 rounded bg-primary" />
                  <div className="mt-2 h-2 w-32 rounded bg-muted-foreground/40" />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 mt-4 flex items-center gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
          <Button variant="outline" size="sm" onClick={handleReset} className="mr-auto gap-2">
            <RotateCcw className="h-4 w-4" /> Restaurar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
