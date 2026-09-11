import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSectors } from "@/hooks/usePersonnel";
import { VisitorQRCode } from "@/hooks/useVisitors";
import { ArrowLeft, Loader2, QrCode } from "lucide-react";

export interface VisitorFormData {
  dni_number: string;
  first_name: string;
  last_name: string;
  visitor_qr_id: string;
  sector_id: string;
  person_to_visit?: string;
  company?: string;
  reason?: string;
}

interface VisitorFormProps {
  defaultValues: {
    dni_number?: string;
    first_name?: string;
    last_name?: string;
  };
  availableQRs: VisitorQRCode[];
  onSubmit: (data: VisitorFormData) => void;
  isSubmitting: boolean;
  onBack: () => void;
}

export function VisitorForm({ 
  defaultValues, 
  availableQRs, 
  onSubmit, 
  isSubmitting, 
  onBack 
}: VisitorFormProps) {
  const [formData, setFormData] = useState<VisitorFormData>({
    dni_number: defaultValues.dni_number || "",
    first_name: defaultValues.first_name || "",
    last_name: defaultValues.last_name || "",
    visitor_qr_id: "",
    sector_id: "",
    person_to_visit: "",
    company: "",
    reason: "",
  });

  const { data: sectors = [] } = useSectors();

  const handleChange = (field: keyof VisitorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isValid = formData.first_name && formData.last_name && formData.visitor_qr_id && formData.sector_id;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold">Datos de la Visita</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos extraídos del DNI */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Datos del DNI</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Apellido"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dni_number">DNI</Label>
            <Input
              id="dni_number"
              value={formData.dni_number}
              onChange={(e) => handleChange("dni_number", e.target.value)}
              placeholder="Número de documento"
            />
          </div>
        </div>

        {/* Datos de la visita */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Información de la visita</h3>
          
          <div>
            <Label htmlFor="sector_id">Sector a visitar *</Label>
            <Select 
              value={formData.sector_id} 
              onValueChange={(value) => handleChange("sector_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sector" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="person_to_visit">Persona a visitar (opcional)</Label>
            <Input
              id="person_to_visit"
              value={formData.person_to_visit}
              onChange={(e) => handleChange("person_to_visit", e.target.value)}
              placeholder="Nombre de la persona"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Empresa (opcional)</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Empresa de la visita"
              />
            </div>
            <div>
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                placeholder="Motivo de la visita"
              />
            </div>
          </div>
        </div>

        {/* QR Selection */}
        <div className="bg-primary/5 rounded-lg p-4">
          <Label htmlFor="visitor_qr_id" className="flex items-center gap-2 mb-2">
            <QrCode className="h-4 w-4" />
            QR físico a entregar *
          </Label>
          <Select 
            value={formData.visitor_qr_id} 
            onValueChange={(value) => handleChange("visitor_qr_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar QR disponible" />
            </SelectTrigger>
            <SelectContent>
              {availableQRs.length === 0 ? (
                <SelectItem value="none" disabled>
                  No hay QRs disponibles
                </SelectItem>
              ) : (
                availableQRs.map((qr) => (
                  <SelectItem key={qr.id} value={qr.id}>
                    {qr.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Entrega este QR físico a la visita para su salida
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-success hover:bg-success/90" 
          size="lg"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Registrando...
            </>
          ) : (
            "Registrar Ingreso de Visita"
          )}
        </Button>
      </form>
    </Card>
  );
}
