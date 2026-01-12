import React from "react";
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
import { Save, Info } from "lucide-react";

const settingsSchema = z.object({
  n8n_webhook_url: z.string().url("Por favor, insira uma URL válida.").or(z.literal("")),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: webhookUrl, isLoading } = useQuery({
    queryKey: ["settings", "n8n_webhook_url"],
    queryFn: () => getSetting("n8n_webhook_url"),
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      n8n_webhook_url: webhookUrl || "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: SettingsFormValues) => setSetting("n8n_webhook_url", values.n8n_webhook_url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "n8n_webhook_url"] });
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

      <Card>
        <CardHeader>
          <CardTitle>Integração com n8n</CardTitle>
          <CardDescription>
            Configure a URL do webhook para o Analisador de Obras com IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Button type="submit" disabled={mutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {mutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

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