import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle } from "lucide-react";

interface VisitorCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedQRCode: string;
  visitorName: string;
  qrLabel: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export function VisitorCheckoutDialog({
  open,
  onOpenChange,
  expectedQRCode,
  visitorName,
  qrLabel,
  onConfirm,
  isLoading,
}: VisitorCheckoutDialogProps) {
  const [qrInput, setQrInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQrInput("");
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const normalizeQRCode = (code: string): string => {
    return code.trim().replace(/[''`]/g, '-');
  };

  const handleVerify = () => {
    const normalized = normalizeQRCode(qrInput);
    
    if (normalized === expectedQRCode) {
      setError(null);
      setSuccess(true);
      // Small delay to show success before confirming
      setTimeout(() => {
        onConfirm();
      }, 500);
    } else {
      setError("El código QR no coincide con el asignado a esta visita");
      setSuccess(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && qrInput.trim()) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Confirmar Salida de Visita
          </DialogTitle>
          <DialogDescription>
            Para registrar la salida de <span className="font-semibold">{visitorName}</span>, 
            escanee el código QR <span className="font-semibold">{qrLabel}</span> que le fue asignado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Escanee el código QR..."
              value={qrInput}
              onChange={(e) => {
                setQrInput(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              onKeyPress={handleKeyPress}
              className="flex-1"
              autoFocus
              disabled={isLoading || success}
            />
            <Button 
              onClick={handleVerify} 
              disabled={!qrInput.trim() || isLoading || success}
            >
              Verificar
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-success bg-success/10 p-3 rounded-md">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">Código verificado, registrando salida...</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            El lector QR enviará automáticamente el código al campo de texto
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading || success}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
