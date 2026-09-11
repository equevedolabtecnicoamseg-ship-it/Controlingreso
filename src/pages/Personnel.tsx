import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, Eye, Building2, MapPin, Calendar, CreditCard, User, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PersonRecord {
  id: string;
  name: string;
  dni_number: string | null;
  company: string | null;
  reason: string | null;
  person_to_visit: string | null;
  sector_id: string | null;
  dni_photo_url: string | null;
  webcam_photo_url: string | null;
  dni_back_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sectors?: { name: string } | null;
  visitor_qr_codes?: { label: string; code: string } | null;
}

interface SectorRecord {
  id: string;
  name: string;
}

function useAllPeople() {
  return useQuery({
    queryKey: ["all_people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitors")
        .select("*, sectors(name), visitor_qr_codes(label, code)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PersonRecord[];
    },
  });
}

function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sectors").select("*").order("name");
      if (error) throw error;
      return data as SectorRecord[];
    },
  });
}

export default function Personnel() {
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [editPerson, setEditPerson] = useState<PersonRecord | null>(null);
  const [deletePerson, setDeletePerson] = useState<PersonRecord | null>(null);
  const { data: people, isLoading } = useAllPeople();
  const { data: sectors } = useSectors();
  const queryClient = useQueryClient();

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDni, setEditDni] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editPersonToVisit, setEditPersonToVisit] = useState("");
  const [editSectorId, setEditSectorId] = useState("");

  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; name: string; dni_number: string | null; company: string | null; reason: string | null; person_to_visit: string | null; sector_id: string | null }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from("visitors").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_people"] });
      toast.success("Persona actualizada exitosamente");
      setEditPerson(null);
    },
    onError: (err: Error) => {
      toast.error("Error al actualizar: " + err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete related access logs first
      const { error: logsErr } = await supabase.from("visitor_access_logs").delete().eq("visitor_id", id);
      if (logsErr) throw logsErr;
      const { error } = await supabase.from("visitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_people"] });
      toast.success("Persona eliminada exitosamente");
      setDeletePerson(null);
    },
    onError: (err: Error) => {
      toast.error("Error al eliminar: " + err.message);
    },
  });

  const handleOpenEdit = (person: PersonRecord) => {
    setEditName(person.name);
    setEditDni(person.dni_number || "");
    setEditCompany(person.company || "");
    setEditReason(person.reason || "");
    setEditPersonToVisit(person.person_to_visit || "");
    setEditSectorId(person.sector_id || "");
    setEditPerson(person);
  };

  const handleSaveEdit = () => {
    if (!editPerson) return;
    updateMutation.mutate({
      id: editPerson.id,
      name: editName,
      dni_number: editDni || null,
      company: editCompany || null,
      reason: editReason || null,
      person_to_visit: editPersonToVisit || null,
      sector_id: editSectorId || null,
    });
  };

  const filtered = people?.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.dni_number && p.dni_number.includes(q)) ||
      (p.company && p.company.toLowerCase().includes(q))
    );
  });

  const uniquePeople = filtered
    ? Object.values(
        filtered.reduce<Record<string, PersonRecord>>((acc, p) => {
          const key = p.dni_number || p.id;
          if (!acc[key] || new Date(p.created_at) > new Date(acc[key].created_at)) {
            acc[key] = p;
          }
          return acc;
        }, {})
      )
    : [];

  const getInitials = (name: string) =>
    name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Personal Registrado</h1>
            <p className="text-muted-foreground mt-1">Directorio completo de personas con acceso registrado</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Users className="h-5 w-5 mr-2" />
              {uniquePeople.length} personas
            </Badge>
            <Button asChild size="lg">
              <Link to="/register">
                <User className="h-5 w-5 mr-2" />
                Registrar nueva persona
              </Link>
            </Button>
          </div>

        </div>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, DNI o empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </Card>

        <Card>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : uniquePeople.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Registro</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniquePeople.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={person.webcam_photo_url || person.dni_photo_url || ""} alt={person.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{person.dni_number || "-"}</code>
                    </TableCell>
                    <TableCell>{person.company || "-"}</TableCell>
                    <TableCell>
                      {person.sectors ? <Badge variant="outline">{person.sectors.name}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={person.is_active ? "default" : "secondary"} className={person.is_active ? "bg-success/20 text-success border-success/30" : ""}>
                        {person.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(person.created_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPerson(person)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleOpenEdit(person)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletePerson(person)} title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "No se encontraron resultados" : "No hay personal registrado"}
            </div>
          )}
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Persona</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-6">
              <div className="flex justify-center">
                {selectedPerson.webcam_photo_url ? (
                  <img src={selectedPerson.webcam_photo_url} alt={selectedPerson.name} className="w-36 h-36 object-cover rounded-xl border-2 border-primary/30" />
                ) : (
                  <div className="w-36 h-36 bg-muted rounded-xl flex items-center justify-center">
                    <User className="h-14 w-14 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DetailItem icon={<User className="h-4 w-4" />} label="Nombre" value={selectedPerson.name} />
                <DetailItem icon={<CreditCard className="h-4 w-4" />} label="DNI" value={selectedPerson.dni_number || "-"} />
                <DetailItem icon={<Building2 className="h-4 w-4" />} label="Empresa" value={selectedPerson.company || "-"} />
                <DetailItem icon={<MapPin className="h-4 w-4" />} label="Sector" value={selectedPerson.sectors?.name || "-"} />
                <DetailItem icon={<User className="h-4 w-4" />} label="Visita a" value={selectedPerson.person_to_visit || "-"} />
                <DetailItem icon={<Calendar className="h-4 w-4" />} label="Motivo" value={selectedPerson.reason || "-"} />
                <DetailItem icon={<Calendar className="h-4 w-4" />} label="Registro" value={format(new Date(selectedPerson.created_at), "dd/MM/yyyy HH:mm", { locale: es })} />
                <DetailItem icon={<CreditCard className="h-4 w-4" />} label="QR" value={selectedPerson.visitor_qr_codes?.label || "-"} />
              </div>
              {(selectedPerson.dni_photo_url || selectedPerson.dni_back_url) && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documento de Identidad</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPerson.dni_photo_url && (
                      <div className="text-center">
                        <img src={selectedPerson.dni_photo_url} alt="DNI Frente" className="w-full h-auto rounded-lg border border-border object-contain" />
                        <p className="text-xs text-muted-foreground mt-1">Frente</p>
                      </div>
                    )}
                    {selectedPerson.dni_back_url && (
                      <div className="text-center">
                        <img src={selectedPerson.dni_back_url} alt="DNI Dorso" className="w-full h-auto rounded-lg border border-border object-contain" />
                        <p className="text-xs text-muted-foreground mt-1">Dorso</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPerson} onOpenChange={() => setEditPerson(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>DNI</Label>
              <Input value={editDni} onChange={(e) => setEditDni(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select value={editSectorId} onValueChange={setEditSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Persona a visitar</Label>
              <Input value={editPersonToVisit} onChange={(e) => setEditPersonToVisit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPerson(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending || !editName.trim()}>
              {updateMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePerson} onOpenChange={() => setDeletePerson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar persona?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deletePerson?.name}</strong> y todos sus registros de acceso. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePerson && deleteMutation.mutate(deletePerson.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
