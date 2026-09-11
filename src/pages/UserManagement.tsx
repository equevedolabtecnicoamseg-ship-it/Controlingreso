import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Users, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "user" });
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ user_id: "", email: "", full_name: "", role: "user", password: "" });
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const res = await supabase.functions.invoke("manage-users", {
      body: { action: "list-users" },
    });
    if (res.error) {
      toast({ title: "Error", description: "No se pudieron cargar los usuarios", variant: "destructive" });
    } else {
      setUsers(res.data.users || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await supabase.functions.invoke("manage-users", {
      body: { action: "create-user", ...form },
    });
    setCreating(false);
    if (res.error || res.data?.error) {
      toast({ title: "Error", description: res.data?.error || "Error al crear usuario", variant: "destructive" });
    } else {
      toast({ title: "Usuario creado", description: `${form.email} fue agregado exitosamente` });
      setForm({ email: "", password: "", full_name: "", role: "user" });
      setOpen(false);
      fetchUsers();
    }
  };

  const handleEdit = (user: AppUser) => {
    setEditForm({ user_id: user.id, email: user.email, full_name: user.full_name, role: user.role, password: "" });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const body: Record<string, string> = {
      action: "update-user",
      user_id: editForm.user_id,
      full_name: editForm.full_name,
      email: editForm.email,
      role: editForm.role,
    };
    if (editForm.password) body.password = editForm.password;

    const res = await supabase.functions.invoke("manage-users", { body });
    setUpdating(false);
    if (res.error || res.data?.error) {
      toast({ title: "Error", description: res.data?.error || "Error al actualizar usuario", variant: "destructive" });
    } else {
      toast({ title: "Usuario actualizado" });
      setEditOpen(false);
      fetchUsers();
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`¿Eliminar al usuario ${email}?`)) return;
    const res = await supabase.functions.invoke("manage-users", {
      body: { action: "delete-user", user_id: userId },
    });
    if (res.error || res.data?.error) {
      toast({ title: "Error", description: res.data?.error || "Error al eliminar", variant: "destructive" });
    } else {
      toast({ title: "Usuario eliminado" });
      fetchUsers();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground mt-1">Administrar usuarios del sistema</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Creando..." : "Crear Usuario"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Nueva Contraseña (dejar vacío para no cambiar)</Label>
                <Input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={updating}>
                {updating ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Cargando usuarios...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "-"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "Administrador" : "Usuario"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString("es-AR")}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.email || "")}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
