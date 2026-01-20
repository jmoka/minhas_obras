import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient as createPexelsClient } from "https://esm.sh/pexels@1.4.0";
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const functionName = "find-reference-image";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      throw new Error("A query string is required.");
    }

    // Autenticar usuário para buscar sua chave
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado.");
    
    const token = authHeader.replace("Bearer ", "");
    const supabaseAnon = createSupabaseClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) throw new Error("Falha na autenticação.");

    // Buscar a chave do usuário
    const supabaseAdmin = createSupabaseClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: keyData } = await supabaseAdmin
      .from('user_api_keys')
      .select('pexels_api_key')
      .eq('user_id', user.id)
      .single();

    // Usar a chave do usuário ou a chave do sistema como fallback
    const pexelsApiKey = keyData?.pexels_api_key || Deno.env.get("PEXELS_API_KEY");

    if (!pexelsApiKey) {
      console.error(`[${functionName}] PEXELS_API_KEY secret is not set and user has no key.`);
      throw new Error("Pexels API key is not configured. Please add it in your API settings or contact the administrator.");
    }

    const pexelsClient = createPexelsClient(pexelsApiKey);

    const response = await pexelsClient.photos.search({ query, per_page: 1, locale: 'pt-BR' });

    if ('error' in response) {
        throw new Error(`Pexels API error: ${response.error}`);
    }
    
    if (response.photos.length === 0) {
      const simpleQuery = query.split(' ')[0];
      const fallbackResponse = await pexelsClient.photos.search({ query: simpleQuery, per_page: 1, locale: 'pt-BR' });
      if ('error' in fallbackResponse || fallbackResponse.photos.length === 0) {
        const artResponse = await pexelsClient.photos.search({ query: 'art', per_page: 1 });
        if ('error' in artResponse || artResponse.photos.length === 0) {
          throw new Error("No reference image found for the given query.");
        }
        const imageUrl = artResponse.photos[0].src.large2x;
        return new Response(JSON.stringify({ imageUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      const imageUrl = fallbackResponse.photos[0].src.large2x;
      return new Response(JSON.stringify({ imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const imageUrl = response.photos[0].src.large2x;

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`[${functionName}] Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});