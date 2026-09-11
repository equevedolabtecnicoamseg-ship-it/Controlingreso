import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DNIScanner } from "@/components/register/DNIScanner";
import { WebcamCapture } from "@/components/register/WebcamCapture";
import { VisitorRegistrationForm, VisitorFormData } from "@/components/register/VisitorRegistrationForm";
import { useCreateVisitor } from "@/hooks/useVisitors";
import { useSectors } from "@/hooks/usePersonnel";
import { supabase } from "@/integrations/supabase/client";
import { saveEntryToLocalArchive } from "@/lib/localArchive";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { CheckCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";


type Step = "scan" | "verify" | "form" | "complete";

interface ExtractedData {
  dni_number?: string;
  first_name?: string;
  last_name?: string;
}

interface CompletedVisitor {
  name: string;
  qr_label: string;
  sector_name?: string;
}

interface DNIImages {
  frontBase64: string;
  backBase64: string;
}

export default function Register() {
  const [step, setStep] = useState<Step>("scan");
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [dniImages, setDniImages] = useState<DNIImages | null>(null);
  const [visitorPhoto, setVisitorPhoto] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedVisitor, setCompletedVisitor] = useState<CompletedVisitor | null>(null);
  
  const createVisitor = useCreateVisitor();
  const { data: sectors } = useSectors();

  const handleImagesCapture = async (
    frontBase64: string,
    backBase64: string,
    _frontFile: File,
    _backFile: File
  ) => {
    // Store DNI images for later reference
    setDniImages({ frontBase64, backBase64 });
    
    // Move to verification step immediately - camera will open
    setStep("verify");
    
    // Process DNI in background
    processExtractDNI(frontBase64, backBase64);
  };

  const processExtractDNI = async (frontBase64: string, backBase64: string) => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("extract-dni-data", {
        body: { frontImageBase64: frontBase64, backImageBase64: backBase64 },
      });

      if (error) throw error;

      if (data.success && data.data) {
        setExtractedData({
          dni_number: data.data.dni_number,
          first_name: data.data.first_name,
          last_name: data.data.last_name,
        });
        toast.success("Datos del DNI extraídos correctamente");
      } else {
        toast.error(data.error || "Error al extraer datos del DNI");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar las imágenes del DNI");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoCapture = (photoBase64: string) => {
    setVisitorPhoto(photoBase64);
    setPhotoReady(true);
    toast.success("Foto capturada correctamente");
    if (!isProcessing) {
      setStep("form");
    } else {
      toast.info("Procesando datos del DNI...");
    }
  };

  // Effect to move to form when processing completes after photo capture
  useEffect(() => {
    if (photoReady && !isProcessing && step === "verify") {
      setStep("form");
    }
  }, [isProcessing, photoReady, step]);

  const handleSkipVerification = () => {
    setStep("form");
  };

  const uploadPhoto = async (base64: string, folder: string, filename: string): Promise<string | null> => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const filePath = `${folder}/${filename}.jpg`;
      
      const { error } = await supabase.storage
        .from('visitor-photos')
        .upload(filePath, blob, { upsert: true });
      
      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Photo upload error:", error);
      return null;
    }
  };

  const handleVisitorSubmit = async (formData: VisitorFormData) => {
    try {
      // Get the selected QR info
      const { data: qrData } = await supabase
        .from("visitor_qr_codes")
        .select("label")
        .eq("id", formData.visitor_qr_id)
        .single();

      // Upload photos if available
      const timestamp = Date.now();
      let dniPhotoUrl: string | undefined;
      let webcamPhotoUrl: string | undefined;

      if (dniImages?.frontBase64) {
        dniPhotoUrl = await uploadPhoto(dniImages.frontBase64, 'dni', `dni_${timestamp}`) || undefined;
      }

      if (visitorPhoto) {
        webcamPhotoUrl = await uploadPhoto(visitorPhoto, 'webcam', `webcam_${timestamp}`) || undefined;
      }

      await createVisitor.mutateAsync({
        name: `${formData.first_name} ${formData.last_name}`,
        dni_number: formData.dni_number || undefined,
        visitor_qr_id: formData.visitor_qr_id,
        sector_id: formData.sector_id,
        person_to_visit: formData.person_to_visit || undefined,
        company: formData.company || undefined,
        reason: formData.reason || undefined,
        dni_photo_url: dniPhotoUrl,
        webcam_photo_url: webcamPhotoUrl,
      });

      const sectorName = sectors?.find(s => s.id === formData.sector_id)?.name;
      const fullName = `${formData.first_name} ${formData.last_name}`;

      // Copia local en la carpeta "FOTOS DE INGRESOS" (si está configurada)
      try {
        const saved = await saveEntryToLocalArchive({
          fullName,
          dniNumber: formData.dni_number || undefined,
          company: formData.company || undefined,
          reason: formData.reason || undefined,
          personToVisit: formData.person_to_visit || undefined,
          sectorName,
          qrLabel: qrData?.label || undefined,
          dniFrontBase64: dniImages?.frontBase64,
          dniBackBase64: dniImages?.backBase64,
          photoBase64: visitorPhoto,
        });
        if (saved) toast.success("Fotos y datos guardados en FOTOS DE INGRESOS");
      } catch (archiveError) {
        console.error("Local archive error:", archiveError);
        toast.error("No se pudo guardar en la carpeta local FOTOS DE INGRESOS");
      }

      setCompletedVisitor({
        name: fullName,
        qr_label: qrData?.label || "QR",
        sector_name: sectorName,
      });
      setStep("complete");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al registrar la visita");
    }
  };

  const handleFinish = () => {
    setStep("scan");
    setExtractedData({});
    setDniImages(null);
    setVisitorPhoto(null);
    setPhotoReady(false);
    setCompletedVisitor(null);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Registro de Visita</h1>
          <p className="text-muted-foreground mt-1">
            Escanee el DNI para registrar una nueva visita
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {[
            { key: "scan", label: "1. Escanear DNI" },
            { key: "verify", label: "2. Verificar Foto" },
            { key: "form", label: "3. Completar Datos" },
            { key: "complete", label: "4. Completado" },
          ].map((s, i, arr) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s.key
                    ? "bg-primary text-primary-foreground"
                    : arr.slice(0, i).some(prev => prev.key === step) || 
                      (step === "verify" && s.key === "scan") ||
                      (step === "form" && (s.key === "scan" || s.key === "verify")) ||
                      (step === "complete" && s.key !== "complete")
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${step === s.key ? "font-medium" : "text-muted-foreground"}`}>
                {s.label.split(". ")[1]}
              </span>
              {i < arr.length - 1 && <div className="w-4 md:w-8 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        {/* Content */}
        {step === "scan" && (
          <>
            <DNIScanner onImagesCapture={handleImagesCapture} isProcessing={isProcessing} />
          </>
        )}

        {step === "verify" && (
          <WebcamCapture
            dniPhoto={dniImages?.frontBase64}
            onPhotoCapture={handlePhotoCapture}
            onSkip={handleSkipVerification}
          />
        )}

        {step === "form" && (
          <VisitorRegistrationForm
            defaultValues={extractedData}
            onSubmit={handleVisitorSubmit}
            isSubmitting={createVisitor.isPending || isProcessing}
          />
        )}

        {step === "complete" && completedVisitor && (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground">
                Visita Registrada
              </h2>
              
              <p className="text-muted-foreground">
                {completedVisitor.name} ha sido registrado/a correctamente
              </p>

              <div className="bg-primary/5 rounded-lg p-6 mt-4">
                <div className="flex items-center justify-center gap-3">
                  <QrCode className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">QR Asignado</p>
                    <p className="text-2xl font-bold text-primary">{completedVisitor.qr_label}</p>
                  </div>
                </div>
                {completedVisitor.sector_name && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Sector: {completedVisitor.sector_name}
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-2">
                Entregue el QR físico <strong>{completedVisitor.qr_label}</strong> a la visita
              </p>

              <Button onClick={handleFinish} size="lg" className="mt-4">
                Nueva Visita
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
