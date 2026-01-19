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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const settingsSchema = z.object({
  gemini_tutor_prompt: z.string().min(10, "O prompt do sistema parece muito curto."),
  gemini_model_name: z.string().min(1, "É necessário selecionar um modelo padrão."),
  admin_whatsapp: z.string().refine(val => /^\+\d{10,15}$/.test(val) || val === '', {
    message: "Formato inválido. Use o formato internacional, ex: +5511999999999"
  }),
  pix_key: z.string().optional(),
  gemini_idea_prompt: z.string().optional(),
  available_gemini_models: z.string().optional(),
  gemini_image_model_name: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

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
      const availableModels = await getSetting("available_gemini_models");
      const imageModelName = await getSetting("gemini_image_model_name");
      return { 
        gemini_tutor_prompt: tutorPrompt,
        gemini_model_name: modelName,
        admin_whatsapp: adminWhatsApp,
        pix_key: pixKey,
        gemini_idea_prompt: ideaPrompt,
        available_gemini_models: availableModels,
        gemini_image_model_name: imageModelName,
      };
    },
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gemini_tutor_prompt: "",
      gemini_model_name: "",
      admin_whatsapp: "",
      pix_key: "",
      gemini_idea_prompt: "",
      available_gemini_models: "gemini-1.5-flash,gemini-pro,gemini-pro-vision",
      gemini_image_model_name: "",
    },
  });

  const availableModels = form.watch('available_gemini_models')?.split(',').map(m => m.trim()).filter(Boolean) || [];

  useEffect(() => {
    if (settings) {
      form.reset({
        gemini_tutor_prompt: settings.gemini_tutor_prompt || "",
        gemini_model_name: settings.gemini_model_name || "",
        admin_whatsapp: settings.admin_whatsapp || "",
        pix_key: settings.pix_key || "",
        gemini_idea_prompt: settings.gemini_idea_prompt || "",
        available_gemini_models: settings.available_gemini_models || "gemini-1.5-flash,gemini-pro,gemini-pro-vision",
        gemini_image_model_name: settings.gemini_image_model_name || "",
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
      await setSetting("available_gemini_models", values.available_gemini_models || "");
      await setSetting("gemini_image_model_name", values.gemini_image_model_name || "");
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
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
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
                      <Input placeholder="Sua chave PIX (CPF, CNPJ, email, etc.)" {...field} value={field.value || ''} />
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
                Configurações do Gemini
              </CardTitle>
              <CardDescription>
                Defina os modelos e a personalidade dos assistentes de IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="available_gemini_models"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelos Gemini Disponíveis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="gemini-1.5-flash,gemini-pro,gemini-pro-vision"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Liste os modelos que os usuários podem escolher, separados por vírgula.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gemini_model_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo Padrão (Tutor de Arte)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um modelo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableModels.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Este será o modelo padrão para o chat do Tutor de Arte.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gemini_image_model_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo de Imagem (Gerador de Ideias)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um modelo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableModels.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Este modelo será usado para gerar as imagens. Recomenda-se 'gemini-1.5-flash'.
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
                        value={field.value || ''}
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