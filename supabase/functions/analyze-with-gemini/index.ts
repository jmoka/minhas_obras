import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to get the plain text API key
async function getApiKey(supabaseAdmin: any, userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error("Erro ao buscar chave de API:", error);
    throw new Error("Não foi possível encontrar sua chave de API. Verifique se ela está salva corretamente.");
  }
  if (!data || !data.api_key) {
    throw new Error("Nenhuma chave de API configurada para este usuário.");
  }
  return data.api_key;
}

serve(async (req) => {
  const functionName = "analyze-with-gemini";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, filePath } = await req.json();
    if (!imageUrl || !filePath) {
      throw new Error("A URL e o caminho da imagem são obrigatórios.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado.");
    
    const token = authHeader.replace("Bearer ", "");
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) throw new Error("Falha na autenticação.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = await getApiKey(supabaseAdmin, user.id);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `
      Você é um crítico de arte especialista. Analise a imagem fornecida e retorne um JSON com as seguintes chaves: "suggested_title", "description", "style_classification", "constructive_feedback".
      - suggested_title: Um título criativo e relevante para a obra.
      - description: Uma descrição detalhada da imagem, abordando composição, cores, luz e atmosfera.
      - style_classification: Classifique o estilo da obra (ex: Abstrato, Surrealista, etc.) e justifique.
      - constructive_feedback: Forneça uma opinião construtiva e detalhada para ajudar o artista a melhorar, destacando pontos fortes e áreas para desenvolvimento.
      Responda APENAS com o objeto JSON, sem nenhum texto ou formatação adicional.
    `;

    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
    });

    const imagePart = {
      inlineData: {
        data: imageBase64 as string,
        mimeType: imageBlob.type,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Limpa a resposta para garantir que é um JSON válido
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysisData = JSON.parse(jsonString);

    const insertPayload = {
      user_id: user.id,
      image_url: filePath,
      suggested_title: analysisData.suggested_title,
      description: analysisData.description,
      style_classification: analysisData.style_classification,
      constructive_feedback: analysisData.constructive_feedback,
    };

    const { data: savedAnalysis, error: insertError } = await supabaseAdmin
      .from("obra_analysis")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) throw new Error(`Erro ao salvar a análise: ${insertError.message}`);

    return new Response(JSON.stringify(savedAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`[${functionName}] Erro:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});