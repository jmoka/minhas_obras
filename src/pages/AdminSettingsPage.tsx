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
import { Save, Info, BrainCircuit, MessageCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const settingsSchema = z.object({
  n8n_webhook_url: z.string().url("Por favor, insira uma URL válida.").or(z.literal("")),
  gemini_tutor_prompt: z.string().min(10, "O prompt do sistema parece muito curto."),
  gemini_model_name: z.string().min(3, "O nome do modelo parece muito curto."),
  admin_whatsapp: z.string().refine(val => /^\+\d{10,15}$/.test(val) || val === '', {
    message: "Formato inválido. Use o formato internacional, ex: +5511999999999"
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["allAdminSettings"],
    queryFn: async () => {
      const n8nUrl = await getSetting("n8n_webhook_url");
      const tutorPrompt = await getSetting("gemini_tutor_prompt");
      const modelName = await getSetting("gemini_model_name");
      const adminWhatsApp = await getSetting("admin_whatsapp");
      return { 
        n8n_webhook_url: n8nUrl, 
        gemini_tutor_prompt: tutorPrompt,
        gemini_model_name: modelName,
        admin_whatsapp: adminWhatsApp,
      };
    },
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      n8n_webhook_url: "",
      gemini_tutor_prompt: "",
      gemini_model_name: "gemini-pro",
      admin_whatsapp: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        n8n_webhook_url: settings.n8n_webhook_url || "",
        gemini_tutor_prompt: settings.gemini_tutor_prompt || "",
        gemini_model_name: settings.gemini_model_name || "gemini-pro",
        admin_whatsapp: settings.admin_whatsapp || "",
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      await setSetting("n8n_webhook_url", values.n8n_webhook_url);
      await setSetting("gemini_tutor_prompt", values.gemini_tutor_prompt);
      await setSetting("gemini_model_name", values.gemini_model_name);
      await setSetting("admin_whatsapp", values.admin_whatsapp);
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
                <MessageCircle className="h-6 w-6 text-green-600" />
                Contato do Administrador
              </CardTitle>
              <CardDescription>
                Número de WhatsApp para solicitações de desbloqueio de novos usuários.
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
              <CardTitle>Integração com n8n</CardTitle>
              <CardDescription>
                Configure a URL do webhook para o Analisador de Obras com IA (legado).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="n8n_webhook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Webhook de Análise (n8n)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://seu-n8n.com/webhook/..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Esta é a URL que a plataforma chamará para iniciar a análise da IA.
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
                Defina o modelo e a personalidade do seu assistente de IA.
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
                      Modelos recomendados: <code>gemini-pro</code>, <code>gemini-1.5-flash</code> (se disponível), ou <code>gemini-pro-vision</code> para análise de imagem.
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
                      Esta é a instrução principal que guiará todas as respostas do Gemini no chat do tutor de arte.
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

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="flex flex-row items-center gap-3">
          <Info className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-blue-800">Como funciona o fluxo de dados?</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 space-y-2 text-sm">
          <p>
            <strong>1. Envio:</strong> Quando um usuário envia uma imagem para análise, nossa plataforma envia essa imagem para a URL de webhook que você configurou acima.
          </p>
          <p>
            <strong>2. Processamento:</strong> Seu workflow no n8n recebe a imagem, processa com a IA e prepara os resultados.
          </p>
          <p>
            <strong>3. Retorno:</strong> No final do seu workflow n8n, você deve usar o nó "Respond to Webhook". Ele enviará os resultados da análise de volta para nossa plataforma na mesma requisição.
          </p>
          <p className="font-semibold">
            Por isso, um segundo "webhook de retorno" não é necessário. A comunicação de ida e volta acontece na mesma conexão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;