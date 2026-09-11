import { useForm } from "react-hook-form";
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
import { Loader2, Save } from "lucide-react";

export interface PersonnelFormData {
  dni_number: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  address: string;
  sector_id: string;
}

interface PersonnelFormProps {
  defaultValues?: Partial<PersonnelFormData>;
  onSubmit: (data: PersonnelFormData) => void;
  isSubmitting: boolean;
}

export function PersonnelForm({ defaultValues, onSubmit, isSubmitting }: PersonnelFormProps) {
  const { data: sectors, isLoading: sectorsLoading } = useSectors();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PersonnelFormData>({
    defaultValues: {
      dni_number: defaultValues?.dni_number || "",
      first_name: defaultValues?.first_name || "",
      last_name: defaultValues?.last_name || "",
      birth_date: defaultValues?.birth_date || "",
      gender: defaultValues?.gender || "",
      address: defaultValues?.address || "",
      sector_id: defaultValues?.sector_id || "",
    },
  });

  const selectedSector = watch("sector_id");

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-6">Datos del Personal</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dni_number">Número de DNI *</Label>
            <Input
              id="dni_number"
              {...register("dni_number", { required: "DNI es requerido" })}
              placeholder="12345678"
            />
            {errors.dni_number && (
              <p className="text-sm text-destructive">{errors.dni_number.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector_id">Sector Asignado *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
            <Input
              id="birth_date"
              type="date"
              {...register("birth_date")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Género</Label>
            <Select
              value={watch("gender")}
              onValueChange={(value) => setValue("gender", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Domicilio</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="Calle 123, Ciudad"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Guardar y Generar QR
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
