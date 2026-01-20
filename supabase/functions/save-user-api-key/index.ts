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
    const { geminiApiKey, pexelsApiKey } = await req.json();
    if (!geminiApiKey && !pexelsApiKey) {
      throw new Error("Pelo menos uma chave de API (geminiApiKey ou pexelsApiKey) é obrigatória.");
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

    const upsertData: { user_id: string; api_key?: string; pexels_api_key?: string } = {
      user_id: user.id,
    };

    if (geminiApiKey) {
      upsertData.api_key = geminiApiKey;
    }
    if (pexelsApiKey) {
      upsertData.pexels_api_key = pexelsApiKey;
    }

    const { error: upsertError } = await supabaseAdmin
      .from('user_api_keys')
      .upsert(upsertData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error(`[${functionName}] Erro ao salvar chave:`, upsertError);
      throw new Error(`Não foi possível salvar a chave de API: ${upsertError.message}`);
    }

    return new Response(JSON.stringify({ message: "Chave(s) de API salva(s) com sucesso." }), {
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