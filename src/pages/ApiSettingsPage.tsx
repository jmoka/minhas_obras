import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { saveUserApiKey, getUserApiKey, deleteUserApiKey } from "@/integrations/supabase/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import { Save, Key, CheckCircle, AlertCircle, AlertTriangle, Eye, EyeOff, Trash2, Edit } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const settingsSchema = z.object({
  gemini_api_key: z.string().min(10, "A chave de API parece muito curta."),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const ApiSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const { data: apiKeyData, isLoading } = useQuery({
    queryKey: ["userApiKey"],
    queryFn: getUserApiKey,
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gemini_api_key: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) => saveUserApiKey(values.gemini_api_key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userApiKey"] });
      showSuccess("Chave de API salva com sucesso!");
      form.reset();
      setIsEditing(false);
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userApiKey"] });
      showSuccess("Chave de API deletada com sucesso!");
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    saveMutation.mutate(values);
  };

  const maskApiKey = (key: string | null | undefined): string => {
    if (!key) return "";
    if (key.length <= 8) return "••••••••";
    return `${key.substring(0, 4)}••••••••••••••••••••${key.substring(key.length - 4)}`;
  };

  const apiKey = apiKeyData?.apiKey;
  const isKeySet = !!apiKey;

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
      <h1 className="text-3xl font-bold">Configurações de API</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-6 w-6 text-teal-600" />
            Sua Chave da API do Google Gemini
          </CardTitle>
          <CardDescription>
            Para usar o Analisador de Obras, você precisa fornecer sua própria chave da API do Google Gemini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Aviso de Segurança</AlertTitle>
            <AlertDescription>
              Sua chave de API será armazenada em nosso banco de dados em texto simples. Embora tomemos medidas para proteger nossos sistemas, por favor, esteja ciente dos riscos.
            </AlertDescription>
          </Alert>

          {isKeySet && !isEditing ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-700" />
                <AlertTitle className="text-green-800">Chave de API configurada!</AlertTitle>
              </Alert>
              <div className="p-4 border rounded-lg flex items-center justify-between">
                <span className="font-mono text-sm">
                  {showKey ? apiKey : maskApiKey(apiKey)}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Alterar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Chave de API?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Você precisará inserir uma nova chave para usar o analisador de obras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                          {deleteMutation.isPending ? "Removendo..." : "Confirmar Remoção"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ) : (
            <>
              {!isKeySet && (
                <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 mb-6">
                  <AlertCircle className="h-4 w-4 text-yellow-700" />
                  <AlertTitle className="text-yellow-800">Ação Necessária</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    Nenhuma chave de API encontrada. Por favor, insira sua chave abaixo para começar.
                  </AlertDescription>
                </Alert>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="gemini_api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave da API do Gemini</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Cole sua chave aqui..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Você pode obter sua chave no{" "}
                          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                            Google AI Studio
                          </a>.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saveMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {saveMutation.isPending ? "Salvando..." : "Salvar Chave"}
                    </Button>
                    {isEditing && (
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiSettingsPage;