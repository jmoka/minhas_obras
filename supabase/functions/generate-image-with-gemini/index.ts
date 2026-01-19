import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";
import { decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET_NAME = "art_gallery";

serve(async (req) => {
  const functionName = "generate-image-with-gemini";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) throw new Error("O prompt é obrigatório.");

    // 1. Autenticar usuário
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

    // 2. Iniciar cliente admin para buscar segredos
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Buscar chave de API e nome do modelo de imagem
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('user_api_keys').select('api_key').eq('user_id', user.id).single();
    if (apiKeyError || !apiKeyData?.api_key) throw new Error("Chave de API do Gemini não configurada.");

    const { data: modelData } = await supabaseAdmin
      .from('settings').select('value').eq('key', 'gemini_image_model_name').single();
    
    const apiKey = apiKeyData.api_key;
    const modelName = modelData?.value || "gemini-1.5-flash"; // Fallback

    // 4. Interagir com a API do Gemini para gerar a imagem
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // 5. Verificar se a resposta contém uma imagem
    const imagePart = response.candidates?.[0]?.content?.parts?.[0];
    if (!imagePart || !('inlineData' in imagePart)) {
      const textResponse = response.text();
      console.error(`[${functionName}] A resposta da IA não continha uma imagem. Resposta recebida:`, textResponse);
      return new Response(JSON.stringify({ 
        error: `O modelo '${modelName}' não retornou uma imagem. Verifique se o modelo correto para geração de imagem está configurado pelo administrador.` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400, // Bad Request, pois é um erro de configuração ou de prompt
      });
    }

    const base64ImageData = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType;
    const fileExtension = mimeType.split('/')[1] || 'png';

    // 6. Fazer upload da imagem para o Supabase Storage
    const imageBytes = decode(base64ImageData);
    const filePath = `generated_images/${user.id}/${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageBytes, { contentType: mimeType });

    if (uploadError) {
      throw new Error(`Erro ao salvar imagem no armazenamento: ${uploadError.message}`);
    }

    // 7. Retornar o caminho do arquivo salvo
    return new Response(JSON.stringify({ filePath }), {
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