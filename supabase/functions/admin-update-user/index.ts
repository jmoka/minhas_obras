import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const functionName = "admin-update-user";
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, password, user_metadata, admin, bloc } = await req.json();

    if (!userId) {
      console.error(`[${functionName}] Missing userId.`);
      return new Response(JSON.stringify({ error: "userId is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[${functionName}] Unauthorized: Missing Authorization header.`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user: currentUser }, error: userError } = await supabaseAnon.auth.getUser();

    if (userError || !currentUser) {
      console.error(`[${functionName}] Failed to get current user:`, userError?.message);
      return new Response(JSON.stringify({ error: "Authentication failed." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseAnon
      .from("user")
      .select("admin")
      .eq("id", currentUser.id)
      .single();

    if (profileError || !profile || profile.admin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can update users." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`[${functionName}] Admin user ${currentUser.id} is updating user ${userId}.`);

    if (admin === false || bloc === true) {
      const { count } = await supabaseAnon
        .from("user")
        .select("*", { count: "exact", head: true })
        .eq("admin", true);

      if (count === 1) {
        const { data: targetUser } = await supabaseAnon
          .from("user")
          .select("admin")
          .eq("id", userId)
          .single();
        
        if (targetUser?.admin) {
          const errorMsg = "Não é possível remover o último administrador do sistema.";
          console.warn(`[${functionName}] ${errorMsg}`);
          return new Response(
            JSON.stringify({ error: errorMsg }), 
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updatePayload: any = {};
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;
    if (user_metadata) updatePayload.user_metadata = user_metadata;

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updatePayload
      );

      if (updateError) {
        console.error(`[${functionName}] Error updating auth user:`, updateError.message);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userTableUpdate: any = {};
    if (user_metadata?.nome) userTableUpdate.nome = user_metadata.nome;
    if (admin !== undefined) userTableUpdate.admin = admin;
    if (bloc !== undefined) userTableUpdate.bloc = bloc;

    if (Object.keys(userTableUpdate).length > 0) {
      const { error: tableUpdateError } = await supabaseAdmin
        .from("user")
        .update(userTableUpdate)
        .eq("id", userId);
      
      if (tableUpdateError) {
        console.error(`[${functionName}] Error updating user table:`, tableUpdateError.message);
        return new Response(JSON.stringify({ error: `Falha ao atualizar tabela de usuário: ${tableUpdateError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[${functionName}] Successfully updated user: ${userId}`);
    
    return new Response(JSON.stringify({ 
      message: "User updated successfully", 
      userId 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[${functionName}] General error:`, error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});