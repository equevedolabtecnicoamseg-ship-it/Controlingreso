import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSectors } from "@/hooks/usePersonnel";
import {
  StaffMember,
  useCreateSector,
  useCreateStaff,
  useDeleteStaff,
  useStaffList,
} from "@/hooks/useStaff";
import { StaffQrCard } from "@/components/staff/StaffQrCard";
import { Building2, IdCard, Loader2, Plus, QrCode, Search, Trash2, UserPlus } from "lucide-react";

export default function Staff() {
  const { data: sectors } = useSectors();
  const { data: staff, isLoading } = useStaffList();
  const createStaff = useCreateStaff();
  const deleteStaff = useDeleteStaff();
  const createSector = useCreateSector();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dni_number: "",
    sector_id: "",
    birth_date: "",
    address: "",
  });
  const [newSector, setNewSector] = useState("");
  const [showNewSector, setShowNewSector] = useState(false);
  const [search, setSearch] = useState("");
  const [qrTarget, setQrTarget] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const filtered = useMemo(() => {
    const list = staff ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      [p.first_name, p.last_name, p.dni_number, p.sectors?.name, p.qr_code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [staff, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, StaffMember[]>();
    filtered.forEach((p) => {
      const key = p.sectors?.name ?? "Sin objetivo";
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const canSubmit =
    form.first_name.trim() && form.last_name.trim() && form.dni_number.trim() && form.sector_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const created = await createStaff.mutateAsync({
      first_name: form.first_name,
      last_name: form.last_name,
      dni_number: form.dni_number,
      sector_id: form.sector_id,
      birth_date: form.birth_date || null,
      address: form.address || null,
    });
    setForm({ first_name: "", last_name: "", dni_number: "", sector_id: "", birth_date: "", address: "" });
    setQrTarget(created);
  };

  const handleCreateSector = async () => {
    if (!newSector.trim()) return;
    const created = await createSector.mutateAsync(newSector);
    setForm((f) => ({ ...f, sector_id: created.id }));
    setNewSector("");
    setShowNewSector(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Personal por Objetivo</h1>
            <p className="text-muted-foreground mt-1">
              Alta de personas fijas por objetivo con QR generado y asignado automáticamente
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <IdCard className="h-5 w-5 mr-2" />
            {staff?.length ?? 0} personas
          </Badge>
        </div>

        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nueva persona
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombres *</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Juan Carlos"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos *</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Pérez"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni_number">DNI *</Label>
                <Input
                  id="dni_number"
                  value={form.dni_number}
                  onChange={(e) => setForm({ ...form, dni_number: e.target.value.replace(/\D/g, "") })}
                  placeholder="35534791"
                  maxLength={9}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo *</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.sector_id}
                    onValueChange={(v) => setForm({ ...form, sector_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar objetivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewSector((v) => !v)}
                    title="Crear objetivo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {showNewSector && (
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={newSector}
                      onChange={(e) => setNewSector(e.target.value)}
                      placeholder="Nombre del nuevo objetivo"
                      maxLength={60}
                    />
                    <Button type="button" onClick={handleCreateSector} disabled={createSector.isPending}>
                      Crear
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Domicilio</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Calle 123, Ciudad"
                  maxLength={160}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || createStaff.isPending}>
              {createStaff.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5 mr-2" />
                  Guardar y generar QR
                </>
              )}
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por nombre, DNI, objetivo o código QR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-10 text-center text-muted-foreground">Cargando...</Card>
        ) : grouped.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Todavía no hay personal cargado.
          </Card>
        ) : (
          grouped.map(([objetivo, people]) => (
            <Card key={objetivo} className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">{objetivo}</h3>
                <Badge variant="secondary">{people.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {p.last_name}, {p.first_name}
                      </p>
                      <p className="text-sm text-muted-foreground">DNI: {p.dni_number}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{p.qr_code}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="icon" variant="outline" onClick={() => setQrTarget(p)} title="Ver QR">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(p)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!qrTarget} onOpenChange={(o) => !o && setQrTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credencial QR</DialogTitle>
          </DialogHeader>
          {qrTarget?.qr_code && (
            <StaffQrCard
              staff={{
                first_name: qrTarget.first_name,
                last_name: qrTarget.last_name,
                dni_number: qrTarget.dni_number,
                qr_code: qrTarget.qr_code,
                sector_name: qrTarget.sectors?.name ?? null,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a esta persona?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {deleteTarget?.first_name} {deleteTarget?.last_name} y sus registros de acceso.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteStaff.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
