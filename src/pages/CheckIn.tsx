import { AppLayout } from "@/components/layout/AppLayout";
import { VisitorAccessPanel } from "@/components/access/VisitorAccessPanel";

export default function CheckIn() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Ingreso y Egreso</h1>
          <p className="text-muted-foreground mt-1">
            Registre entradas y salidas de visitas
          </p>
        </div>

        {/* Visitor Access Panel */}
        <VisitorAccessPanel />
      </div>
    </AppLayout>
  );
}
