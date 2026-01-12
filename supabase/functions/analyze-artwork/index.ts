import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_WEBHOOK_URL = "https://jota-empresas-n8n.ubjifz.easypanel.host/webhook/8f1947b3-414a-4200-8f0f-d66ba0757271";
const BUCKET_NAME = "art_gallery";

serve(async (req) => {
  const functionName = "analyze-artwork";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Autenticar o usuário
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

    // 2. Fazer upload da imagem para o Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const file = await req.blob();
    const fileExtension = file.type.split("/")[1];
    const filePath = `analysis_images/${user.id}/${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // 3. Buscar dados do perfil do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user")
      .select("nome, whatsapp")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error("Não foi possível encontrar o perfil do usuário.");
    }

    // 4. Chamar o webhook do n8n
    const n8nPayload = {
      imageUrl: publicUrl,
      userName: profile.nome,
      userPhone: profile.whatsapp,
    };

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      throw new Error(`O webhook n8n respondeu com o status: ${n8nResponse.status}`);
    }

    const analysisResult = await n8nResponse.json();

    // 5. Salvar o resultado na tabela obra_analysis
    const { data: savedAnalysis, error: insertError } = await supabaseAdmin
      .from("obra_analysis")
      .insert({
        user_id: user.id,
        image_url: filePath,
        suggested_title: analysisResult["Sugestão de Titulo"],
        description: analysisResult["Descrição da Imagem detalhada"],
        style_classification: analysisResult["Classificação do estilo"],
        constructive_feedback: analysisResult["Uma opinião construtiva visando a melhoria do artista"],
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao salvar a análise: ${insertError.message}`);
    }

    return new Response(JSON.stringify(savedAnalysis), {
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