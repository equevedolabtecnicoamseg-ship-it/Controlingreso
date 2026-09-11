import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";

interface StaffQrCardProps {
  staff: {
    first_name: string;
    last_name: string;
    dni_number: string;
    qr_code: string;
    sector_name?: string | null;
  };
}

export function StaffQrCard({ staff }: StaffQrCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: "#ffffff", scale: 3 });
    const link = document.createElement("a");
    link.download = `credencial-${staff.dni_number}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    const svg = cardRef.current?.querySelector("svg")?.outerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Credencial ${staff.dni_number}</title>
      <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;padding:24px}
      .card{border:2px solid #1e3a5f;border-radius:12px;width:320px;text-align:center;overflow:hidden}
      .header{background:#1e3a5f;color:#fff;padding:12px}
      .body{padding:16px}
      .name{font-size:18px;font-weight:bold;margin:8px 0}
      .dni{color:#666;font-size:14px}
      .sector{background:#e8f4f8;color:#1e3a5f;padding:6px 14px;border-radius:20px;display:inline-block;margin:10px 0;font-size:12px}
      </style></head><body>
      <div class="card"><div class="header"><strong>AM SEGURIDAD</strong><br/><small>Credencial de Personal</small></div>
      <div class="body"><div class="name">${staff.first_name} ${staff.last_name}</div>
      <div class="dni">DNI: ${staff.dni_number}</div>
      ${staff.sector_name ? `<div class="sector">${staff.sector_name}</div>` : ""}
      <div>${svg}</div><div class="dni">${staff.qr_code}</div></div></div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4">
      <Card className="p-0 max-w-xs mx-auto overflow-hidden bg-card" ref={cardRef}>
        <div className="bg-primary text-primary-foreground p-4 text-center">
          <h3 className="font-bold">AM SEGURIDAD</h3>
          <p className="text-xs opacity-90">Credencial de Personal</p>
        </div>
        <div className="p-5 text-center space-y-2">
          <h4 className="font-bold text-lg">
            {staff.first_name} {staff.last_name}
          </h4>
          <p className="text-sm text-muted-foreground">DNI: {staff.dni_number}</p>
          {staff.sector_name && (
            <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
              {staff.sector_name}
            </span>
          )}
          <div className="py-3 flex justify-center">
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={staff.qr_code} size={170} level="H" includeMargin />
            </div>
          </div>
          <p className="text-xs font-mono text-muted-foreground">{staff.qr_code}</p>
        </div>
      </Card>

      <div className="flex gap-3 max-w-xs mx-auto">
        <Button variant="outline" className="flex-1" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
        <Button className="flex-1" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
