import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { saveUserApiKeys, getUserApiKeys, deleteUserApiKey } from "@/integrations/supabase/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import { Save, Key, CheckCircle, AlertCircle, AlertTriangle, Eye, EyeOff, Trash2, Edit, Image as ImageIcon } from "lucide-react";
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
  gemini_api_key: z.string().optional(),
  pexels_api_key: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const ApiSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingGemini, setEditingGemini] = useState(false);
  const [editingPexels, setEditingPexels] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showPexelsKey, setShowPexelsKey] = useState(false);

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["userApiKeys"],
    queryFn: getUserApiKeys,
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      gemini_api_key: "",
      pexels_api_key: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) => saveUserApiKeys({
      geminiApiKey: values.gemini_api_key || undefined,
      pexelsApiKey: values.pexels_api_key || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userApiKeys"] });
      showSuccess("Chave(s) de API salva(s) com sucesso!");
      form.reset({ gemini_api_key: "", pexels_api_key: "" });
      setEditingGemini(false);
      setEditingPexels(false);
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (keyType: 'gemini' | 'pexels') => deleteUserApiKey(keyType),
    onSuccess: (_, keyType) => {
      queryClient.invalidateQueries({ queryKey: ["userApiKeys"] });
      showSuccess(`Chave de API (${keyType}) deletada com sucesso!`);
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

  const isGeminiKeySet = !!apiKeys?.geminiApiKey;
  const isPexelsKeySet = !!apiKeys?.pexelsApiKey;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Configurações de API</h1>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Aviso de Segurança</AlertTitle>
        <AlertDescription>
          Suas chaves de API serão armazenadas em nosso banco de dados. Embora tomemos medidas para proteger nossos sistemas, por favor, esteja ciente dos riscos.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Gemini API Key Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-6 w-6 text-teal-600" />
                Chave da API do Google Gemini
              </CardTitle>
              <CardDescription>
                Necessária para o Analisador de Obras e o Tutor de Arte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGeminiKeySet && !editingGemini ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-700" />
                    <AlertTitle className="text-green-800">Chave Gemini configurada!</AlertTitle>
                  </Alert>
                  <div className="p-4 border rounded-lg flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono text-sm break-all">
                      {showGeminiKey ? apiKeys.geminiApiKey : maskApiKey(apiKeys.geminiApiKey)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setShowGeminiKey(!showGeminiKey)}><EyeOff className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingGemini(true)}><Edit className="h-4 w-4 mr-2" />Alterar</Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Remover</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover Chave Gemini?</AlertDialogTitle><AlertDialogDescription>Você precisará inserir uma nova chave para usar as funcionalidades de IA.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate('gemini')}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {!isGeminiKeySet && <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 mb-6"><AlertCircle className="h-4 w-4 text-yellow-700" /><AlertTitle className="text-yellow-800">Ação Necessária</AlertTitle><AlertDescription className="text-yellow-700">Nenhuma chave de API Gemini encontrada.</AlertDescription></Alert>}
                  <FormField control={form.control} name="gemini_api_key" render={({ field }) => (<FormItem><FormLabel>Chave da API do Gemini</FormLabel><FormControl><Input type="password" placeholder="Cole sua chave aqui..." {...field} /></FormControl><FormDescription>Obtenha sua chave no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google AI Studio</a>.</FormDescription><FormMessage /></FormItem>)} />
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={saveMutation.isPending}><Save className="mr-2 h-4 w-4" />Salvar Chave Gemini</Button>
                    {editingGemini && <Button type="button" variant="outline" onClick={() => setEditingGemini(false)}>Cancelar</Button>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pexels API Key Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-blue-600" />
                Chave da API da Pexels
              </CardTitle>
              <CardDescription>
                Necessária para o Gerador de Ideias encontrar imagens de referência.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPexelsKeySet && !editingPexels ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-700" />
                    <AlertTitle className="text-green-800">Chave Pexels configurada!</AlertTitle>
                  </Alert>
                  <div className="p-4 border rounded-lg flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono text-sm break-all">
                      {showPexelsKey ? apiKeys.pexelsApiKey : maskApiKey(apiKeys.pexelsApiKey)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setShowPexelsKey(!showPexelsKey)}><EyeOff className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingPexels(true)}><Edit className="h-4 w-4 mr-2" />Alterar</Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Remover</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover Chave Pexels?</AlertDialogTitle><AlertDialogDescription>O gerador de ideias usará a chave do sistema como fallback, se disponível.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate('pexels')}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {!isPexelsKeySet && <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 mb-6"><AlertCircle className="h-4 w-4 text-yellow-700" /><AlertTitle className="text-yellow-800">Ação Opcional</AlertTitle><AlertDescription className="text-yellow-700">Nenhuma chave de API Pexels encontrada. O sistema usará a chave padrão, se disponível.</AlertDescription></Alert>}
                  <FormField control={form.control} name="pexels_api_key" render={({ field }) => (<FormItem><FormLabel>Chave da API da Pexels</FormLabel><FormControl><Input type="password" placeholder="Cole sua chave aqui..." {...field} /></FormControl><FormDescription>Obtenha sua chave em <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Pexels API</a>.</FormDescription><FormMessage /></FormItem>)} />
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={saveMutation.isPending}><Save className="mr-2 h-4 w-4" />Salvar Chave Pexels</Button>
                    {editingPexels && <Button type="button" variant="outline" onClick={() => setEditingPexels(false)}>Cancelar</Button>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default ApiSettingsPage;