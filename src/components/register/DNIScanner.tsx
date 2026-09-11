import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, Loader2, ScanLine, PenLine, Download, CheckCircle2, FolderOpen, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useScannerFolder } from "@/hooks/useScannerFolder";
import { useScannerBridge } from "@/hooks/useScannerBridge";
import instructivo from "@/assets/apoye-dni-scanner.png.asset.json";

interface DNIScannerProps {
  onImagesCapture: (frontBase64: string, backBase64: string, frontFile: File, backFile: File) => void;
  isProcessing: boolean;
}

type Side = "front" | "back";
interface ImageData { file: File; preview: string; base64: string }

export function DNIScanner({ onImagesCapture, isProcessing }: DNIScannerProps) {
  const [frontImage, setFrontImage] = useState<ImageData | null>(null);
  const [backImage, setBackImage] = useState<ImageData | null>(null);
  const [dragOver, setDragOver] = useState<{ front: boolean; back: boolean }>({ front: false, back: false });
  const [manualMode, setManualMode] = useState(false);

  const slotsRef = useRef({ front: frontImage, back: backImage });
  slotsRef.current = { front: frontImage, back: backImage };

  const setSide = useCallback((side: Side, data: ImageData | null) => {
    if (side === "front") setFrontImage(data);
    else setBackImage(data);
  }, []);

  const processFile = useCallback((file: File, side: Side) => {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo no es una imagen válida");
      return;
    }
    const preview = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      setSide(side, { file, preview, base64 });
    };
    reader.readAsDataURL(file);
  }, [setSide]);

  /** Escáner por carpeta / Ctrl+V: llena frente y después dorso. */
  const processIncoming = useCallback((file: File) => {
    const { front, back } = slotsRef.current;
    if (!front) processFile(file, "front");
    else if (!back) processFile(file, "back");
  }, [processFile]);

  const scanner = useScannerFolder(processIncoming);
  const bridge = useScannerBridge();

  const base64ToFile = (base64: string, name: string): File => {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], name, { type: "image/jpeg" });
  };

  /** Escaneo dúplex: mueve el rodillo y trae las 2 caras. */
  const scanWithBridge = useCallback(async () => {
    try {
      const images = await bridge.scan();
      if (!images.length) {
        toast.error("El escáner no devolvió imágenes");
        return;
      }
      processFile(base64ToFile(images[0], "dni-frente.jpg"), "front");
      if (images[1]) processFile(base64ToFile(images[1], "dni-dorso.jpg"), "back");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo escanear el documento");
    }
  }, [bridge, processFile]);

  // Escaneo automático en cuanto el escáner detecta el DNI apoyado
  useEffect(() => {
    if (!bridge.available || !bridge.paperPresent || bridge.scanning || isProcessing) return;
    if (frontImage && backImage) return;
    void scanWithBridge();
  }, [bridge.available, bridge.paperPresent, bridge.scanning, isProcessing, frontImage, backImage, scanWithBridge]);

  // Pegar con Ctrl+V (respaldo)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        processIncoming(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processIncoming, isProcessing]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, side: Side) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, side);
    e.target.value = "";
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent, side: Side) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(prev => ({ ...prev, [side]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, side);
  }, [processFile]);

  const removeImage = (side: Side) => {
    const current = side === "front" ? frontImage : backImage;
    if (current) URL.revokeObjectURL(current.preview);
    setSide(side, null);
  };

  const bothReady = Boolean(frontImage && backImage);

  const handleProcessImages = () => {
    if (!frontImage || !backImage) {
      toast.error("Se requieren ambas imágenes del DNI");
      return;
    }
    onImagesCapture(frontImage.base64, backImage.base64, frontImage.file, backImage.file);
  };

  const manualSlot = (side: Side, label: string) => {
    const image = side === "front" ? frontImage : backImage;
    const isOver = dragOver[side];
    return (
      <Card className="p-4">
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
          <ScanLine className="h-4 w-4" />
          {label}
        </h3>
        {image ? (
          <div className="relative">
            <img src={image.preview} alt={label} className="w-full h-40 object-contain rounded-lg bg-muted" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => removeImage(side)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(p => ({ ...p, [side]: true })); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(p => ({ ...p, [side]: false })); }}
            onDrop={(e) => handleDrop(e, side)}
          >
            <Upload className={`h-8 w-8 mb-2 ${isOver ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-sm text-muted-foreground text-center px-4">
              Arrastrá la imagen o hacé click para subirla
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, side)} disabled={isProcessing} />
          </label>
        )}
      </Card>
    );
  };

  // === Resultado del escaneo: las 2 caras ===
  if (bothReady && !manualMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Documento escaneado</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(["front", "back"] as Side[]).map((side) => {
            const image = side === "front" ? frontImage! : backImage!;
            return (
              <Card key={side} className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {side === "front" ? "Frente del DNI" : "Dorso del DNI"}
                </p>
                <img
                  src={image.preview}
                  alt={side === "front" ? "Frente del DNI escaneado" : "Dorso del DNI escaneado"}
                  className="w-full h-56 object-contain rounded-lg bg-muted"
                />
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1" size="lg" onClick={handleProcessImages} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => { removeImage("front"); removeImage("back"); }}
            disabled={isProcessing}
          >
            <ScanLine className="h-5 w-5 mr-2" />
            Escanear de nuevo
          </Button>
        </div>
      </div>
    );
  }

  // === Ingreso manual ===
  if (manualMode) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {manualSlot("front", "Frente del DNI")}
          {manualSlot("back", "Dorso del DNI")}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1" size="lg" onClick={handleProcessImages} disabled={!bothReady || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setManualMode(false)}>
            <ScanLine className="h-5 w-5 mr-2" />
            Volver al escáner
          </Button>
        </div>
      </div>
    );
  }

  // === Pantalla principal: apoyar el DNI en el escáner ===
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <img
          src={instructivo.url}
          alt="Apoye el DNI en el escáner"
          className="w-full max-h-[420px] object-cover"
        />
        <div className="p-6 text-center space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Apoyá el DNI en el escáner</h2>
          {bridge.scanning ? (
            <p className="flex items-center justify-center gap-2 text-primary font-medium">
              <Loader2 className="h-5 w-5 animate-spin" />
              Escaneando el documento...
            </p>
          ) : frontImage ? (
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              <ScanLine className="h-5 w-5 text-primary animate-pulse" />
              Frente listo — apoyá el dorso del DNI
            </p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              <ScanLine className="h-5 w-5 text-primary animate-pulse" />
              Esperando el documento: el escaneo arranca solo
            </p>
          )}

          {!bridge.available && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground/70">
              <a href={bridge.helperUrl} download className="inline-flex items-center gap-1 hover:text-foreground">
                <Download className="h-3.5 w-3.5" />
                Instalar escáner en esta PC (una sola vez)
              </a>
              {scanner.supported && !scanner.watching && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => void (scanner.needsPermission ? scanner.resume() : scanner.connect())}
                  disabled={isProcessing}
                >
                  {scanner.needsPermission ? <AlertTriangle className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                  Usar carpeta del escáner
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setManualMode(true)}>
          <PenLine className="h-4 w-4 mr-2" />
          Ingreso manual
        </Button>
      </div>
    </div>
  );
}
