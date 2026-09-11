import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { useVisitorQRCodes, type VisitorQRCode } from "@/hooks/useVisitors";

function parseLabel(label: string) {
  const [num, ...rest] = label.split(" - ");
  return { number: num?.trim() ?? label, name: rest.join(" - ").trim() || "VISITANTE" };
}

export function QRCardsGallery() {
  const { data: qrs = [], isLoading } = useVisitorQRCodes();
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const cards = qrs.filter((qr) => /^\d{1,2}\s*-/.test(qr.label));

  const downloadOne = async (qr: VisitorQRCode) => {
    const el = refs.current[qr.id];
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 3, useCORS: true });
    const link = document.createElement("a");
    link.download = `QR-${qr.label.replace(/\s/g, "")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadAll = async () => {
    try {
      for (const qr of cards) {
        await downloadOne(qr);
        await new Promise((r) => setTimeout(r, 350));
      }
      toast.success("QR descargados");
    } catch {
      toast.error("Error al descargar los QR");
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tarjetas QR del 1 al 10</h2>
          <p className="text-sm text-muted-foreground">
            Tarjetas físicas registradas en el sistema. Descárguelas para imprimir.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadAll} disabled={cards.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Descargar todas
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((qr) => {
            const { number, name } = parseLabel(qr.label);
            return (
              <div key={qr.id} className="space-y-2">
                <div
                  ref={(el) => {
                    refs.current[qr.id] = el;
                  }}
                  className="bg-white rounded-xl shadow-lg p-5 border-2 border-primary/20 mx-auto w-[260px]"
                >
                  <div className="flex items-center justify-center gap-2 mb-3 pb-2 border-b border-gray-200">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                      <Shield className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-bold text-gray-900">AM Seguridad</h3>
                      <p className="text-[10px] text-gray-500">Control de Acceso</p>
                    </div>
                  </div>
                  <div className="flex justify-center mb-3">
                    <QRCodeSVG value={qr.code} size={150} level="H" includeMargin={false} />
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-3xl font-bold text-primary">{number}</p>
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">{name}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-[10px] text-gray-400 text-center">
                      Escanee el código al ingresar y salir
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => downloadOne(qr)}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar {number}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
