import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  useVisitorByQRCode, 
  useCheckOutVisitor,
  useActiveVisitors,
  useVisitorAccessLogs
} from "@/hooks/useVisitors";
import { useActiveVisitorLog, useActivePersonnelLog } from "@/hooks/useActiveLog";
import { useStaffByQR } from "@/hooks/useStaff";
import { useCheckIn, useCheckOut } from "@/hooks/usePersonnel";
import { soundPlayer } from "@/lib/sounds";
import { VisitorCheckoutDialog } from "@/components/checkin/VisitorCheckoutDialog";
import { QrCode, LogOut, LogIn, Clock, User, MapPin, UserCheck, Building, IdCard } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function VisitorAccessPanel() {
  const [qrInput, setQrInput] = useState("");
  const [searchQR, setSearchQR] = useState<string | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<{
    visitorId: string;
    visitorQrId: string;
    visitorName: string;
    qrCode: string;
    qrLabel: string;
    logId: string;
  } | null>(null);
  
  const { data: visitor, isLoading } = useVisitorByQRCode(searchQR);
  const { data: activeVisitorLog } = useActiveVisitorLog(visitor?.id || null);
  const { data: activeVisitors = [] } = useActiveVisitors();
  const { data: accessLogs = [] } = useVisitorAccessLogs();
  
  const checkOutVisitor = useCheckOutVisitor();

  // Personal fijo por objetivo (QR propio PER-...)
  const { data: staff, isLoading: isLoadingStaff } = useStaffByQR(searchQR);
  const { data: activeStaffLog } = useActivePersonnelLog(staff?.id || null);
  const checkInStaff = useCheckIn();
  const checkOutStaff = useCheckOut();

  const handleStaffToggle = async () => {
    if (!staff) return;
    if (activeStaffLog) {
      await checkOutStaff.mutateAsync(activeStaffLog.id);
      soundPlayer.playCheckOut();
    } else {
      await checkInStaff.mutateAsync(staff.id);
      soundPlayer.playCheckIn();
    }
    handleClear();
  };

  const normalizeQRCode = (code: string): string => {
    return code
      .trim()
      .replace(/[''`]/g, '-')
      .replace(/\s+/g, '')
      .toUpperCase();
  };

  const handleSearch = useCallback(() => {
    if (qrInput.trim()) {
      const normalized = normalizeQRCode(qrInput);
      setSearchQR(normalized);
    }
  }, [qrInput]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleVisitorCheckoutClick = () => {
    if (!visitor || !visitor.visitor_qr_codes || !activeVisitorLog) return;
    setCheckoutTarget({
      visitorId: visitor.id,
      visitorQrId: visitor.visitor_qr_id!,
      visitorName: visitor.name,
      qrCode: visitor.visitor_qr_codes.code,
      qrLabel: visitor.visitor_qr_codes.label,
      logId: activeVisitorLog.id,
    });
    setShowCheckoutDialog(true);
  };

  const handleCheckoutConfirm = async () => {
    if (!checkoutTarget) return;
    await checkOutVisitor.mutateAsync({ 
      logId: checkoutTarget.logId, 
      visitorId: checkoutTarget.visitorId,
      visitorQrId: checkoutTarget.visitorQrId
    });
    soundPlayer.playCheckOut();
    setShowCheckoutDialog(false);
    setCheckoutTarget(null);
    handleClear();
  };

  const handleQuickCheckOut = (v: typeof activeVisitors[number]) => {
    const activeLog = accessLogs.find(
      log => log.visitor_id === v.id && !log.exit_time
    );
    
    if (activeLog && v.visitor_qr_id && v.visitor_qr_codes) {
      setCheckoutTarget({
        visitorId: v.id,
        visitorQrId: v.visitor_qr_id,
        visitorName: v.name,
        qrCode: v.visitor_qr_codes.code,
        qrLabel: v.visitor_qr_codes.label,
        logId: activeLog.id,
      });
      setShowCheckoutDialog(true);
    }
  };

  const handleClear = () => {
    setQrInput("");
    setSearchQR(null);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: QR Scanner */}
      <div className="lg:col-span-2 space-y-6">
        {/* QR Input */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">Código QR de Visita</h2>
          </div>
          
          <div className="flex gap-4">
            <Input
              placeholder="Escanee el QR de la visita o del personal..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 text-lg"
            />
            <Button onClick={handleSearch} disabled={!qrInput.trim()}>
              Buscar
            </Button>
          </div>
          
        <p className="text-xs text-muted-foreground mt-2">
          Escanee el QR físico asignado a la visita para registrar su entrada o salida
        </p>
      </Card>

        {/* Loading */}
        {(isLoading || isLoadingStaff) && (
          <Card className="p-6 text-center text-muted-foreground">
            Buscando...
          </Card>
        )}

        {/* Not found */}
        {searchQR && !isLoading && !isLoadingStaff && !visitor && !staff && (
          <Card className="p-6 text-center">
            <p className="text-destructive font-medium">
              No se encontró visita activa con este código QR
            </p>
            <Button variant="outline" className="mt-4" onClick={handleClear}>
              Limpiar
            </Button>
          </Card>
        )}

        {/* Staff Card */}
        {staff && !visitor && (
          <Card className="p-6 space-y-6">
            <div className="bg-primary/10 -mx-6 -mt-6 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IdCard className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">PERSONAL</span>
                {staff.sectors?.name && (
                  <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm font-bold ml-2">
                    {staff.sectors.name}
                  </span>
                )}
              </div>
              {activeStaffLog && (
                <div className="flex items-center gap-1 text-success">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium">En edificio</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <IdCard className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">
                  {staff.first_name} {staff.last_name}
                </h3>
                <p className="text-muted-foreground">DNI: {staff.dni_number}</p>
                {staff.sectors?.name && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Objetivo: {staff.sectors.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 font-mono">{staff.qr_code}</p>
              </div>
            </div>

            <Button
              onClick={handleStaffToggle}
              disabled={checkInStaff.isPending || checkOutStaff.isPending}
              variant={activeStaffLog ? "destructive" : "default"}
              className="w-full"
              size="lg"
            >
              {activeStaffLog ? (
                <>
                  <LogOut className="h-5 w-5 mr-2" />
                  Registrar Salida
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Registrar Entrada
                </>
              )}
            </Button>

            <Button variant="outline" className="w-full" onClick={handleClear}>
              Limpiar y buscar otro
            </Button>
          </Card>
        )}

        {/* Visitor Card */}
        {visitor && (
          <Card className="p-6 space-y-6">
            {/* Status Banner */}
            <div className="bg-amber-500/10 -mx-6 -mt-6 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-600">VISITA</span>
                <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-sm font-bold ml-2">
                  {visitor.visitor_qr_codes?.label || `QR #${visitor.qr_number}`}
                </span>
              </div>
              {activeVisitorLog && (
                <div className="flex items-center gap-1 text-success">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium">En edificio</span>
                </div>
              )}
            </div>

            {/* Visitor Info */}
            <div className="flex items-start gap-4">
              {/* Photo: webcam or fallback icon */}
              {visitor.webcam_photo_url ? (
                <img
                  src={visitor.webcam_photo_url}
                  alt="Foto de la visita"
                  className="h-20 w-20 rounded-full object-cover border-2 border-amber-500/30"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <UserCheck className="h-8 w-8 text-amber-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold">{visitor.name}</h3>
                {visitor.dni_number && (
                  <p className="text-muted-foreground">DNI: {visitor.dni_number}</p>
                )}
                {visitor.sectors && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Sector: {visitor.sectors.name}
                  </div>
                )}
                {visitor.person_to_visit && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Visita a: {visitor.person_to_visit}
                  </div>
                )}
                {visitor.company && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    {visitor.company}
                  </div>
                )}
                {visitor.reason && (
                  <p className="text-sm text-muted-foreground">Motivo: {visitor.reason}</p>
                )}
              </div>
            </div>

            {/* DNI Photo */}
            {visitor.dni_photo_url && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Foto DNI Frente</p>
                <img
                  src={visitor.dni_photo_url}
                  alt="DNI Frente"
                  className="w-full max-w-sm h-auto rounded-lg border border-border object-contain bg-muted"
                />
              </div>
            )}

            {/* Actions */}
            {activeVisitorLog && (
              <Button
                onClick={handleVisitorCheckoutClick}
                disabled={checkOutVisitor.isPending}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Registrar Salida de Visita
              </Button>
            )}

            <Button variant="outline" className="w-full" onClick={handleClear}>
              Limpiar y buscar otro
            </Button>

            {/* Checkout confirmation dialog */}
          </Card>
        )}
      </div>

      {/* Right: Active Visitors List */}
      <div>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Visitas Activas</h2>
            <span className="ml-auto bg-success/10 text-success px-2 py-1 rounded-full text-sm font-medium">
              {activeVisitors.length}
            </span>
          </div>

          {activeVisitors.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No hay visitas activas
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {activeVisitors.map((v) => {
                const activeLog = accessLogs.find(
                  log => log.visitor_id === v.id && !log.exit_time
                );
                
                return (
                  <div
                    key={v.id}
                    className="p-3 bg-muted/50 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                        {v.visitor_qr_codes?.label || `QR #${v.qr_number}`}
                      </span>
                      <Button
                        onClick={() => handleQuickCheckOut(v)}
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={checkOutVisitor.isPending}
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Salida
                      </Button>
                    </div>
                    
                    <p className="font-medium text-sm">{v.name}</p>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      {v.sectors && (
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {v.sectors.name}
                        </p>
                      )}
                      {v.person_to_visit && (
                        <p className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {v.person_to_visit}
                        </p>
                      )}
                      {activeLog && (
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Ingreso: {format(new Date(activeLog.entry_time), "HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Shared checkout dialog */}
      {checkoutTarget && (
        <VisitorCheckoutDialog
          open={showCheckoutDialog}
          onOpenChange={(open) => {
            setShowCheckoutDialog(open);
            if (!open) setCheckoutTarget(null);
          }}
          expectedQRCode={checkoutTarget.qrCode}
          visitorName={checkoutTarget.visitorName}
          qrLabel={checkoutTarget.qrLabel}
          onConfirm={handleCheckoutConfirm}
          isLoading={checkOutVisitor.isPending}
        />
      )}
    </div>
  );
}
