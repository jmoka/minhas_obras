import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const functionName = "save-user-api-key";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();
    if (!apiKey) {
      throw new Error("A chave de API (apiKey) é obrigatória.");
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

    // A criptografia será feita no lado do banco de dados para segurança máxima.
    // Aqui, apenas chamamos a função RPC que fará o upsert seguro.
    const { error: rpcError } = await supabaseAdmin.rpc('upsert_api_key', {
      p_user_id: user.id,
      p_api_key: apiKey
    });

    if (rpcError) {
      console.error(`[${functionName}] Erro ao salvar chave:`, rpcError);
      throw new Error(`Não foi possível salvar a chave de API: ${rpcError.message}`);
    }

    return new Response(JSON.stringify({ message: "Chave de API salva com sucesso." }), {
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