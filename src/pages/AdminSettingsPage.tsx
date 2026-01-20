import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSetting, setSetting } from "@/integrations/supabase/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import { Save, BrainCircuit, MessageCircle, Key, Lightbulb } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const settingsSchema = z.object({
  gemini_tutor_prompt: z.string().min(10, "O prompt do sistema parece muito curto."),
  gemini_model_name: z.string().min(3, "O nome do modelo parece muito curto."),
  admin_whatsapp: z.string().refine(val => /^\+\d{10,15}$/.test(val) || val === '', {
    message: "Formato inválido. Use o formato internacional, ex: +5511999999999"
  }),
  pix_key: z.string().optional(),
  gemini_idea_prompt: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const DEFAULT_TUTOR_PROMPT = "Você é 'Maestro', um tutor de arte amigável, experiente e inspirador. Seu objetivo é ajudar artistas a superarem bloqueios criativos, explorarem novas técnicas e aprofundarem seu conhecimento. Use uma linguagem acessível, mas com profundidade técnica. Ofereça exemplos práticos, sugira exercícios e faça perguntas que estimulem a reflexão. Seja sempre encorajador e positivo.";
const DEFAULT_IDEA_PROMPT = "Você é uma IA especializada em criar descrições visuais artísticas voltadas exclusivamente para ARTISTAS PINTORES. Sua função é transformar o prompt do usuário em uma DESCRIÇÃO VISUAL CRIATIVA, pensada como REFERÊNCIA PARA PINTURA EM TELA (quadro), e não como arte digital final. Diretrizes obrigatórias: 1. Finalidade artística - As imagens geradas devem servir como INSPIRAÇÃO para pintura manual (óleo, acrílico, aquarela, guache, etc.). - Pense sempre como um pintor: composição, luz, volumes, cores, emoção e atmosfera. - Evite aparência fotográfica perfeita; priorize interpretação artística. 2. Interpretação do prompt do usuário - Respeite fielmente o tema, estilo, atmosfera, personagens, cores, enquadramento e referências fornecidas pelo usuário. - Caso algo não esteja especificado, complete de forma criativa e coerente com pintura artística. 3. Linguagem visual - Descreva a cena de forma clara, rica e sensorial, permitindo que o artista imagine facilmente o quadro. - Destaque: - Composição da cena - Ponto focal - Relação entre luz e sombra - Movimento e emoção - Profundidade e perspectiva 4. Estilo artístico - Quando houver referência a artistas famosos, utilize apenas a INSPIRAÇÃO ESTÉTICA (traços, formas, paleta, abstração), sem copiar obras existentes. - Adapte o estilo para pintura tradicional. 5. Materiais e técnica pictórica - Considere o tipo de pintura informado (óleo, acrílico, textura, pinceladas, camadas). - Caso não seja informado, sugira implicitamente pinceladas, massas de tinta e textura de tela. 6. Minimalismo vs detalhamento - Siga o nível de detalhe solicitado pelo usuário (minimalista, médio, detalhado). - Nunca adicione excesso de elementos que prejudiquem a leitura do quadro. 7. Formato e enquadramento - Respeite proporção, enquadramento e ponto de vista descritos. - Pense na imagem como um quadro pendurado em uma galeria. 8. Tom da resposta - Não explique regras, não dê avisos técnicos. - Entregue apenas o PROMPT ARTÍSTICO FINAL, pronto para gerar a imagem. Objetivo final: Criar descrições visuais que despertem ideias, emoções e interpretações artísticas, funcionando como referência criativa para pintores transformarem em obras físicas.";

const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["allAdminSettings"],
    queryFn: async () => {
      const tutorPrompt = await getSetting("gemini_tutor_prompt");
      const modelName = await getSetting("gemini_model_name");
      const adminWhatsApp = await getSetting("admin_whatsapp");
      const pixKey = await getSetting("pix_key");
      const ideaPrompt = await getSetting("gemini_idea_prompt");
      return { 
        gemini_tutor_prompt: tutorPrompt,
        gemini_model_name: modelName,
        admin_whatsapp: adminWhatsApp,
        pix_key: pixKey,
        gemini_idea_prompt: ideaPrompt,
      };
    },
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gemini_tutor_prompt: DEFAULT_TUTOR_PROMPT,
      gemini_model_name: "gemini-pro",
      admin_whatsapp: "",
      pix_key: "",
      gemini_idea_prompt: DEFAULT_IDEA_PROMPT,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        gemini_tutor_prompt: settings.gemini_tutor_prompt || DEFAULT_TUTOR_PROMPT,
        gemini_model_name: settings.gemini_model_name || "gemini-pro",
        admin_whatsapp: settings.admin_whatsapp || "",
        pix_key: settings.pix_key || "",
        gemini_idea_prompt: settings.gemini_idea_prompt || DEFAULT_IDEA_PROMPT,
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      await setSetting("gemini_tutor_prompt", values.gemini_tutor_prompt);
      await setSetting("gemini_model_name", values.gemini_model_name);
      await setSetting("admin_whatsapp", values.admin_whatsapp);
      await setSetting("pix_key", values.pix_key || "");
      await setSetting("gemini_idea_prompt", values.gemini_idea_prompt || "");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAdminSettings"] });
      showSuccess("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Configurações de Administrador</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-6 w-6 text-blue-600" />
                Configurações de Pagamento
              </CardTitle>
              <CardDescription>
                Chave PIX para receber doações para a plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="pix_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua chave PIX (CPF, CNPJ, email, etc.)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Esta chave será exibida na página de doação.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-green-600" />
                Contato do Administrador
              </CardTitle>
              <CardDescription>
                Número de WhatsApp para solicitações de desbloqueio e envio de comprovantes de doação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="admin_whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp do Administrador</FormLabel>
                    <FormControl>
                      <Input placeholder="+5511999999999" {...field} />
                    </FormControl>
                    <FormDescription>
                      Insira o número completo no formato internacional (código do país + DDD + número).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-purple-600" />
                Configurações do Gemini (Tutor de Arte)
              </CardTitle>
              <CardDescription>
                Defina o modelo e a personalidade do seu assistente de IA para o chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="gemini_model_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Modelo Gemini</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: gemini-pro" {...field} />
                    </FormControl>
                    <FormDescription>
                      Modelos recomendados: <code>gemini-pro</code>, <code>gemini-1.5-flash</code>, ou <code>gemini-pro-vision</code>.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gemini_tutor_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt do Sistema (Personalidade do Tutor)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Você é um professor de arte amigável e experiente. Seu nome é 'Maestro'..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Esta instrução guiará todas as respostas do Gemini no chat do tutor de arte.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-yellow-500" />
                Configurações do Gerador de Ideias
              </CardTitle>
              <CardDescription>
                Defina uma instrução base para a criação de prompts de imagem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="gemini_idea_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt do Sistema (para geração de ideias)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Crie um prompt detalhado para um gerador de imagens de IA como Midjourney ou DALL-E, em inglês para melhor compatibilidade, com base nas seguintes características..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Esta instrução será o início de todos os prompts gerados na página "Gerador de Ideias".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Salvando..." : "Salvar Todas as Configurações"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AdminSettingsPage;