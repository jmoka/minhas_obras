import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const functionName = "gemini-chat";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, message, modelName: requestedModel } = await req.json();
    if (!message) throw new Error("A mensagem é obrigatória.");

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

    // 3. Buscar chave de API, prompt do sistema e nome do modelo
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('user_api_keys').select('api_key').eq('user_id', user.id).single();
    if (apiKeyError || !apiKeyData?.api_key) throw new Error("Chave de API do Gemini não configurada.");

    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('settings').select('value').eq('key', 'gemini_tutor_prompt').single();
    if (promptError || !promptData?.value) throw new Error("Prompt do sistema para o tutor não configurado pelo admin.");

    const { data: modelData } = await supabaseAdmin
      .from('settings').select('value').eq('key', 'gemini_model_name').single();

    const apiKey = apiKeyData.api_key;
    const systemPrompt = promptData.value;
    const modelToUse = requestedModel || modelData?.value || "gemini-pro";

    // 4. Buscar histórico da conversa, se houver
    let currentSessionId = sessionId;
    const history = [];
    if (currentSessionId) {
      const { data: messages, error: historyError } = await supabaseAdmin
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });
      if (historyError) throw new Error("Erro ao buscar histórico.");
      
      for (const msg of messages) {
        history.push({ role: msg.role, parts: [{ text: msg.content }] });
      }
    }

    // 5. Interagir com a API do Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelToUse,
      systemInstruction: systemPrompt,
    });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const modelResponseText = response.text();

    // 6. Salvar a conversa no banco de dados
    if (!currentSessionId) {
      const { data: newSession, error: newSessionError } = await supabaseAdmin
        .from('chat_sessions')
        .insert({ user_id: user.id, title: message.substring(0, 50) })
        .select('id')
        .single();
      if (newSessionError) throw new Error("Erro ao criar nova sessão de chat.");
      currentSessionId = newSession.id;
    }

    const messagesToInsert = [
      { session_id: currentSessionId, role: 'user', content: message },
      { session_id: currentSessionId, role: 'model', content: modelResponseText },
    ];
    const { error: insertError } = await supabaseAdmin
      .from('chat_messages').insert(messagesToInsert);
    if (insertError) throw new Error("Erro ao salvar mensagens.");

    // 7. Retornar a resposta
    return new Response(JSON.stringify({ 
      response: modelResponseText, 
      sessionId: currentSessionId 
    }), {
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