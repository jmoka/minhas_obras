import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET_NAME = "art_gallery";

serve(async (req) => {
  const functionName = "analyze-artwork";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let filePath = "";

  try {
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

    const { data: setting, error: settingError } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "n8n_webhook_url")
      .single();

    if (settingError || !setting?.value) {
      console.error(`[${functionName}] Erro ao buscar URL do webhook n8n:`, settingError?.message);
      throw new Error("A URL do webhook de análise não está configurada. Configure-a no painel de administração.");
    }
    const n8nWebhookUrl = setting.value;

    const file = await req.blob();
    const fileExtension = file.type.split("/")[1] || 'png';
    filePath = `analysis_images/${user.id}/${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user")
      .select("nome, whatsapp")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error("Não foi possível encontrar o perfil do usuário.");
    }

    const n8nPayload = {
      imageUrl: publicUrl,
      userName: profile.nome,
      userPhone: profile.whatsapp,
    };

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      throw new Error(`O webhook n8n respondeu com o status: ${n8nResponse.status}`);
    }

    const analysisResult = await n8nResponse.json();
    console.log(`[${functionName}] Resposta recebida do webhook n8n para o usuário ${user.id}:`, JSON.stringify(analysisResult, null, 2));

    let rawData;
    if (Array.isArray(analysisResult) && analysisResult.length > 0) {
      rawData = analysisResult[0];
    } else if (typeof analysisResult === 'object' && analysisResult !== null && !Array.isArray(analysisResult)) {
      rawData = analysisResult;
    } else {
      throw new Error("A resposta da análise da IA está em um formato inesperado ou está vazia.");
    }

    const resultData = rawData.json || rawData;
    
    // Normalize keys to be lowercase to handle potential inconsistencies
    const normalizedResultData: { [key: string]: any } = {};
    for (const key in resultData) {
      if (Object.prototype.hasOwnProperty.call(resultData, key)) {
        normalizedResultData[key.toLowerCase()] = resultData[key];
      }
    }

    if (normalizedResultData["sugestão de titulo"] === "Imagem Inválida para Análise") {
      console.warn(`[${functionName}] n8n retornou um erro de imagem inválida para o usuário ${user.id}.`);
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);
      throw new Error("A IA não conseguiu processar o arquivo. Por favor, verifique se é uma imagem válida e tente novamente.");
    }

    const insertPayload = {
      user_id: user.id,
      image_url: filePath,
      suggested_title: normalizedResultData["sugestão de titulo"] || null,
      description: normalizedResultData["descrição da imagem detalhada"] || null,
      style_classification: normalizedResultData["classificação do estilo"] || null,
      constructive_feedback: normalizedResultData["uma opinião construtiva visando a melhoria do artista"] || null,
    };

    const { data: savedAnalysis, error: insertError } = await supabaseAdmin
      .from("obra_analysis")
      .insert(insertPayload)
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
    if (filePath) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});