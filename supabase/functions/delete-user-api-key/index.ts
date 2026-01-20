import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const functionName = "delete-user-api-key";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyType } = await req.json();
    if (!keyType || (keyType !== 'gemini' && keyType !== 'pexels')) {
      throw new Error("O tipo da chave ('gemini' ou 'pexels') é obrigatório.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Usuário não autenticado.");
    }
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      throw new Error("Falha na autenticação.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updatePayload: { [key: string]: null } = {};
    if (keyType === 'gemini') {
      updatePayload.api_key = null;
    } else if (keyType === 'pexels') {
      updatePayload.pexels_api_key = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_api_keys')
      .update(updatePayload)
      .eq('user_id', user.id);

    if (updateError) {
      console.error(`[${functionName}] Erro ao deletar chave:`, updateError);
      throw new Error(`Não foi possível deletar a chave de API: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ message: "Chave de API deletada com sucesso." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`[${functionName}] Erro:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});