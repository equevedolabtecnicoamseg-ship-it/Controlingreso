import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RotateCcw, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebcamCaptureProps {
  dniPhoto?: string;
  onPhotoCapture: (photoBase64: string) => void;
  onSkip: () => void;
}

export function WebcamCapture({ dniPhoto, onPhotoCapture, onSkip }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
        },
        audio: false,
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifique los permisos.");
      toast.error("No se pudo acceder a la cámara");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(photoData);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedPhoto) {
      const base64 = capturedPhoto.split(",")[1];
      onPhotoCapture(base64);
    }
  }, [capturedPhoto, onPhotoCapture]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Verificación de Identidad</h2>
        <p className="text-muted-foreground mt-1">
          Tome una foto del visitante para verificar su identidad
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DNI Photo Reference - Cropped to face area */}
        {dniPhoto && (
          <Card className="p-4">
            <h3 className="font-medium mb-3 text-center">Foto del DNI (Rostro)</h3>
            <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <div className="relative w-full h-full overflow-hidden">
                <img
                  src={`data:image/jpeg;base64,${dniPhoto}`}
                  alt="Foto del DNI"
                  className="absolute w-[200%] h-auto object-cover"
                  style={{ 
                    left: '-5%', 
                    top: '-5%',
                    objectPosition: 'left top'
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Área del rostro del documento
            </p>
          </Card>
        )}

        {/* Webcam / Captured Photo - Wider view */}
        <Card className="p-4">
          <h3 className="font-medium mb-3 text-center">Foto del Visitante</h3>
          <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-4">
                <X className="h-10 w-10 text-destructive mb-2" />
                <p className="text-sm text-center text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={startCamera}>
                  Reintentar
                </Button>
              </div>
            )}

            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Foto capturada"
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
                style={{ transform: "scaleX(-1)" }}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Posicione al visitante en el centro del encuadre
          </p>

          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="flex gap-2 mt-4">
            {capturedPhoto ? (
              <>
                <Button variant="outline" className="flex-1" onClick={retakePhoto}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Tomar Otra
                </Button>
                <Button className="flex-1" onClick={confirmPhoto}>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar
                </Button>
              </>
            ) : (
              <Button 
                className="w-full" 
                onClick={capturePhoto}
                disabled={isLoading || !!error}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Foto
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Button variant="ghost" className="w-full" onClick={onSkip}>
        Omitir verificación
      </Button>
    </div>
  );
}
