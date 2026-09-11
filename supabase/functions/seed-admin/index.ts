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

  // Create admin user
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const adminExists = existing?.users?.find(u => u.email === "tobiasbrito2023@gmail.com");

  if (adminExists) {
    // Ensure role exists
    const { data: roleExists } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", adminExists.id)
      .eq("role", "admin")
      .single();

    if (!roleExists) {
      await supabaseAdmin.from("user_roles").insert({ user_id: adminExists.id, role: "admin" });
    }

    return new Response(JSON.stringify({ message: "Admin ya existe, rol verificado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email: "tobiasbrito2023@gmail.com",
    password: "TOBIAS1234",
    email_confirm: true,
    user_metadata: { full_name: "Tobias Brito" }
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });

  return new Response(JSON.stringify({ message: "Admin creado exitosamente" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});