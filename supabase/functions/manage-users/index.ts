import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get("Authorization")!;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
  
  if (!caller) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: roleCheck } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .single();

  if (!roleCheck) {
    return new Response(JSON.stringify({ error: "No tiene permisos de administrador" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { action, ...body } = await req.json();

  if (action === "create-user") {
    const { email, password, full_name, role } = body;
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: role || "user" });

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ user: newUser.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (action === "list-users") {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
    
    const usersWithRoles = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || "",
      created_at: u.created_at,
      role: roles?.find(r => r.user_id === u.id)?.role || "user"
    }));

    return new Response(JSON.stringify({ users: usersWithRoles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (action === "update-user") {
    const { user_id, full_name, email, role, password } = body;

    // Update auth user metadata
    const updateData: Record<string, unknown> = {};
    if (full_name !== undefined) updateData.user_metadata = { full_name };
    if (email !== undefined) updateData.email = email;
    if (password) updateData.password = password;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, updateData);
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Update role if provided
    if (role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id, role });
      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Update profile
    if (full_name !== undefined || email !== undefined) {
      const profileUpdate: Record<string, string> = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (email !== undefined) profileUpdate.email = email;
      await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", user_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (action === "delete-user") {
    const { user_id } = body;
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "No puede eliminarse a sí mismo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "Acción no válida" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
