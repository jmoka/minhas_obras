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
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can delete users." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (currentUser.id === userId) {
      return new Response(
        JSON.stringify({ error: "Você não pode deletar sua própria conta." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetUser } = await supabaseAnon
      .from("user")
      .select("admin")
      .eq("id", userId)
      .single();

    if (targetUser?.admin) {
      return new Response(
        JSON.stringify({ error: "Não é possível deletar usuários administradores." }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { count, error: countError } = await supabaseAnon
      .from("obras")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error(`[${functionName}] Error counting obras:`, countError.message);
      return new Response(JSON.stringify({ error: "Failed to check user's artworks." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (count !== null && count > 0) {
      console.warn(`[${functionName}] Attempted to delete user ${userId} with ${count} artworks.`);
      return new Response(
        JSON.stringify({ error: `Este usuário possui ${count} obra(s) e não pode ser deletado. Bloqueie o usuário em vez disso.` }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${functionName}] Admin user ${currentUser.id} is deleting user ${userId}.`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 1: Attempt to delete from auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    // If the user is not found in auth, it's an orphan record. We can ignore this specific error.
    if (deleteAuthError && !deleteAuthError.message.includes("User not found")) {
      console.error(`[${functionName}] Error deleting auth user:`, deleteAuthError.message);
      return new Response(JSON.stringify({ error: deleteAuthError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (deleteAuthError?.message.includes("User not found")) {
      console.warn(`[${functionName}] User ${userId} not found in auth.users. This is an orphan record. Proceeding to clean up public.user.`);
    }

    // Step 2: Always attempt to delete from public.user to ensure cleanup
    const { error: deleteProfileError } = await supabaseAdmin
      .from("user")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      console.error(`[${functionName}] Error deleting profile from public.user:`, deleteProfileError.message);
      return new Response(JSON.stringify({ error: `Failed to delete user profile: ${deleteProfileError.message}` }), {
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