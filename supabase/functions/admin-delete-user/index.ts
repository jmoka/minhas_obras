import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const functionName = "admin-delete-user";
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      console.error(`[${functionName}] Missing userId.`);
      return new Response(JSON.stringify({ error: "userId is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Initialize Supabase client for RLS check (using anon key)
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

    // 2. Get current user and verify admin
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
      console.warn(`[${functionName}] User ${currentUser.id} attempted to delete user but is not an admin.`);
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can delete users." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // 3. Prevent self-deletion
    if (currentUser.id === userId) {
      console.warn(`[${functionName}] User ${currentUser.id} attempted to delete themselves.`);
      return new Response(
        JSON.stringify({ error: "Você não pode deletar sua própria conta." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Prevent deleting any admin user
    const { data: targetUser, error: targetUserError } = await supabaseAnon
      .from("user")
      .select("admin")
      .eq("id", userId)
      .single();

    if (targetUserError) {
      console.error(`[${functionName}] Error checking target user status:`, targetUserError.message);
      return new Response(JSON.stringify({ error: "Could not verify user to be deleted." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUser?.admin) {
      console.warn(`[${functionName}] Admin ${currentUser.id} attempted to delete another admin ${userId}. This is not allowed.`);
      return new Response(
        JSON.stringify({ error: "Não é possível deletar usuários administradores." }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${functionName}] Admin user ${currentUser.id} is deleting user ${userId}.`);

    // 5. Delete from user table first (cascade will handle related data)
    const { error: deleteTableError } = await supabaseAnon
      .from("user")
      .delete()
      .eq("id", userId);

    if (deleteTableError) {
      console.error(`[${functionName}] Error deleting from user table:`, deleteTableError.message);
      return new Response(JSON.stringify({ error: `Falha ao deletar usuário: ${deleteTableError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Initialize Supabase client with Service Role Key for auth deletion
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 7. Delete from auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error(`[${functionName}] Error deleting auth user:`, deleteAuthError.message);
      return new Response(JSON.stringify({ error: deleteAuthError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${functionName}] Successfully deleted user: ${userId}`);
    
    return new Response(JSON.stringify({ 
      message: "User deleted successfully", 
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