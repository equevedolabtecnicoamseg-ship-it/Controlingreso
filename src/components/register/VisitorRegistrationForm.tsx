import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useSectors } from "@/hooks/usePersonnel";
import { useAvailableVisitorQRs } from "@/hooks/useVisitors";
import { Loader2, QrCode, UserCheck } from "lucide-react";

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

interface VisitorRegistrationFormProps {
  defaultValues?: Partial<{
    dni_number: string;
    first_name: string;
    last_name: string;
  }>;
  onSubmit: (data: VisitorFormData) => void;
  isSubmitting: boolean;
}

export function VisitorRegistrationForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting 
}: VisitorRegistrationFormProps) {
  const { data: sectors, isLoading: sectorsLoading } = useSectors();
  const { data: availableQRs = [] } = useAvailableVisitorQRs();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VisitorFormData>({
    defaultValues: {
      dni_number: "",
      first_name: "",
      last_name: "",
      sector_id: "",
      visitor_qr_id: "",
      person_to_visit: "",
      company: "",
      reason: "",
    },
  });

  // Update form when extracted data arrives
  useEffect(() => {
    if (defaultValues?.dni_number) {
      setValue("dni_number", defaultValues.dni_number);
    }
    if (defaultValues?.first_name) {
      setValue("first_name", defaultValues.first_name);
    }
    if (defaultValues?.last_name) {
      setValue("last_name", defaultValues.last_name);
    }
  }, [defaultValues, setValue]);

  const selectedSector = watch("sector_id");
  const selectedQR = watch("visitor_qr_id");

  const isFormValid = selectedQR && selectedSector;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <div className="p-2 rounded-full bg-primary text-primary-foreground">
          <UserCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Registro de Visita</h3>
          <p className="text-sm text-muted-foreground">Complete los datos y asigne un QR físico</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DNI */}
          <div className="space-y-2">
            <Label htmlFor="dni_number">Número de DNI</Label>
            <Input
              id="dni_number"
              {...register("dni_number")}
              placeholder="12345678"
            />
          </div>

          {/* Sector */}
          <div className="space-y-2">
            <Label htmlFor="sector_id">Sector a Visitar *</Label>
            <Select
              value={selectedSector}
              onValueChange={(value) => setValue("sector_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sector" />
              </SelectTrigger>
              <SelectContent>
                {sectorsLoading ? (
                  <SelectItem value="" disabled>Cargando...</SelectItem>
                ) : (
                  sectors?.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="first_name">Nombres *</Label>
            <Input
              id="first_name"
              {...register("first_name", { required: "Nombres es requerido" })}
              placeholder="Juan Carlos"
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="last_name">Apellidos *</Label>
            <Input
              id="last_name"
              {...register("last_name", { required: "Apellidos es requerido" })}
              placeholder="Pérez González"
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">{errors.last_name.message}</p>
            )}
          </div>

          {/* Person to Visit */}
          <div className="space-y-2">
            <Label htmlFor="person_to_visit">Persona a Visitar</Label>
            <Input
              id="person_to_visit"
              {...register("person_to_visit")}
              placeholder="Nombre de la persona"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              {...register("company")}
              placeholder="Empresa de la visita"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="reason">Motivo de la Visita</Label>
            <Input
              id="reason"
              {...register("reason")}
              placeholder="Motivo de la visita"
            />
          </div>
        </div>

        {/* QR Selection */}
        <div className="bg-primary/5 rounded-lg p-4 mt-4">
          <Label htmlFor="visitor_qr_id" className="flex items-center gap-2 mb-3">
            <QrCode className="h-4 w-4" />
            QR Físico a Entregar *
          </Label>
          <Select
            value={selectedQR}
            onValueChange={(value) => setValue("visitor_qr_id", value)}
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
            Entregue este QR físico a la visita para registrar su entrada/salida
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-success hover:bg-success/90"
          size="lg" 
          disabled={isSubmitting || !isFormValid}
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
