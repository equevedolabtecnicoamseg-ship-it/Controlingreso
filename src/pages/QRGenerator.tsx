import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { Download, Plus, QrCode, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import { QRCardsGallery } from "@/components/register/QRCardsGallery";


export default function QRGenerator() {
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const generateQRCode = () => {
    if (!label.trim() || !number.trim()) {
      toast.error("Ingrese un número y nombre para el QR");
      return;
    }

    // Generate unique code combining number and label
    const code = `${number.trim()}${label.trim().toUpperCase().replace(/\s/g, "")}`;
    setGeneratedCode(code);
    toast.success("Código QR generado");
  };

  const downloadQR = async () => {
    if (!cardRef.current || !generatedCode) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `QR-${number}-${label}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("QR descargado correctamente");
    } catch (error) {
      console.error("Error downloading QR:", error);
      toast.error("Error al descargar el QR");
    }
  };

  const saveToDatabase = async () => {
    if (!generatedCode || !label.trim() || !number.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("visitor_qr_codes").insert({
        code: generatedCode,
        label: `${number} - ${label}`,
        is_available: true,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Este código QR ya existe");
        } else {
          throw error;
        }
      } else {
        toast.success("QR guardado en el sistema");
        // Reset form
        setLabel("");
        setNumber("");
        setGeneratedCode(null);
      }
    } catch (error) {
      console.error("Error saving QR:", error);
      toast.error("Error al guardar el QR");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Generador de QR</h1>
          <p className="text-muted-foreground mt-1">
            Cree códigos QR personalizados para las tarjetas de visitantes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Datos del QR
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="number">Número de Tarjeta</Label>
                <Input
                  id="number"
                  placeholder="Ej: 01, 02, 03..."
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Nombre / Identificador</Label>
                <Input
                  id="label"
                  placeholder="Ej: VISITA, PROVEEDOR, CONTRATISTA..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={generateQRCode} className="w-full" size="lg">
              <QrCode className="h-4 w-4 mr-2" />
              Generar Código QR
            </Button>

            {generatedCode && (
              <div className="flex gap-2">
                <Button 
                  onClick={downloadQR} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PNG
                </Button>
                <Button 
                  onClick={saveToDatabase} 
                  variant="secondary" 
                  className="flex-1"
                  disabled={isSaving}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isSaving ? "Guardando..." : "Guardar en Sistema"}
                </Button>
              </div>
            )}
          </Card>

          {/* QR Preview Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Vista Previa de Tarjeta</h2>
            
            <div className="flex justify-center">
              {generatedCode ? (
                <div
                  ref={cardRef}
                  className="bg-white rounded-xl shadow-lg p-6 w-[280px] border-2 border-primary/20"
                >
                  {/* Card Header with Logo */}
                  <div className="flex items-center justify-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <Shield className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">AM Seguridad</h3>
                      <p className="text-xs text-gray-500">Control de Acceso</p>
                    </div>
                  </div>

                  {/* QR Code with Logo */}
                  <div className="flex justify-center mb-4">
                    <div className="relative bg-white p-3 rounded-lg">
                      <QRCodeSVG
                        value={generatedCode}
                        size={160}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "/favicon.ico",
                          height: 30,
                          width: 30,
                          excavate: true,
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="text-center space-y-1">
                    <p className="text-3xl font-bold text-primary">{number}</p>
                    <p className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                      {label || "VISITANTE"}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-[10px] text-gray-400 text-center">
                      Escanee el código al ingresar y salir
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-xl p-6 w-[280px] h-[380px] flex flex-col items-center justify-center text-muted-foreground">
                  <QrCode className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-sm text-center">
                    Complete los datos y presione "Generar" para ver la vista previa
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <QRCardsGallery />
      </div>

    </AppLayout>
  );
}
