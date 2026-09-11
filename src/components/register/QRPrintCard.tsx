import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Download, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";

interface QRPrintCardProps {
  personnel: {
    first_name: string;
    last_name: string;
    dni_number: string;
    qr_code: string;
    sector_name?: string;
  };
  onFinish: () => void;
}

export function QRPrintCard({ personnel, onFinish }: QRPrintCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!cardRef.current) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Credencial - ${personnel.first_name} ${personnel.last_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              padding: 20px;
            }
            .card {
              border: 2px solid #1e3a5f;
              border-radius: 12px;
              padding: 24px;
              width: 300px;
              text-align: center;
            }
            .header {
              background: #1e3a5f;
              color: white;
              padding: 12px;
              margin: -24px -24px 16px -24px;
              border-radius: 10px 10px 0 0;
            }
            .name { font-size: 18px; font-weight: bold; margin: 8px 0; }
            .dni { color: #666; font-size: 14px; }
            .sector { 
              background: #e8f4f8; 
              padding: 8px 16px; 
              border-radius: 20px; 
              display: inline-block;
              margin: 12px 0;
              font-size: 12px;
              color: #1e3a5f;
            }
            .qr { margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <strong>AM SEGURIDAD</strong><br/>
              <small>Control de Acceso</small>
            </div>
            <div class="name">${personnel.first_name} ${personnel.last_name}</div>
            <div class="dni">DNI: ${personnel.dni_number}</div>
            ${personnel.sector_name ? `<div class="sector">${personnel.sector_name}</div>` : ""}
            <div class="qr">
              ${cardRef.current.querySelector("svg")?.outerHTML || ""}
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    
    const link = document.createElement("a");
    link.download = `credencial-${personnel.dni_number}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-success mb-4">
        <CheckCircle className="h-6 w-6" />
        <span className="font-semibold text-lg">¡Registro Exitoso!</span>
      </div>

      <Card className="p-6 max-w-sm mx-auto" ref={cardRef}>
        <div className="bg-primary text-primary-foreground rounded-lg p-4 -mx-6 -mt-6 mb-4 text-center">
          <h3 className="font-bold text-lg">AM SEGURIDAD</h3>
          <p className="text-sm opacity-90">Control de Acceso</p>
        </div>

        <div className="text-center space-y-2">
          <h4 className="font-bold text-xl">
            {personnel.first_name} {personnel.last_name}
          </h4>
          <p className="text-muted-foreground">DNI: {personnel.dni_number}</p>
          
          {personnel.sector_name && (
            <span className="inline-block bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-medium">
              {personnel.sector_name}
            </span>
          )}

          <div className="py-4 flex justify-center">
            <QRCodeSVG
              value={personnel.qr_code}
              size={180}
              level="H"
              includeMargin
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-4 max-w-sm mx-auto">
        <Button variant="outline" className="flex-1" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
        <Button className="flex-1" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="text-center">
        <Button variant="ghost" onClick={onFinish}>
          Registrar otro personal
        </Button>
      </div>
    </div>
  );
}
