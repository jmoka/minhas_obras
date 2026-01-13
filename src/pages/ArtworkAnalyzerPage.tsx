import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { analyzeArtwork, fetchAnalysisHistory, getPublicUrl, deleteAnalysis, getUserApiKeyStatus, fetchObras, updateObraDetails } from "@/integrations/supabase/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Sparkles, Lightbulb, Palette, MessageSquare, History, Image as ImageIcon, Trash2, AlertCircle, Key, Check, Link as LinkIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  image: z.instanceof(File).refine(file => file.size > 0, "Por favor, selecione uma imagem."),
});

type FormValues = z.infer<typeof formSchema>;

const ArtworkAnalyzerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [deletingAnalysis, setDeletingAnalysis] = useState<any | null>(null);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { data: apiKeyStatus, isLoading: isLoadingKeyStatus } = useQuery({
    queryKey: ["userApiKeyStatus"],
    queryFn: getUserApiKeyStatus,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["analysisHistory"],
    queryFn: fetchAnalysisHistory,
  });

  const { data: myObras, isLoading: isLoadingMyObras } = useQuery({
    queryKey: ["myObras"],
    queryFn: fetchObras,
    enabled: !!apiKeyStatus?.isSet,
  });

  const analysisMutation = useMutation({
    mutationFn: (file: File) => analyzeArtwork(file),
    onSuccess: (data) => {
      showSuccess("Análise concluída com sucesso!");
      setActiveAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["analysisHistory"] });
    },
    onError: (error) => {
      showError(`Erro na análise: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (analysis: { id: string; image_url: string }) => deleteAnalysis(analysis.id, analysis.image_url),
    onSuccess: () => {
      showSuccess("Análise deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["analysisHistory"] });
      if (activeAnalysis?.id === deletingAnalysis?.id) {
        setActiveAnalysis(null);
      }
      setDeletingAnalysis(null);
    },
    onError: (error) => {
      showError(`Erro ao deletar: ${error.message}`);
      setDeletingAnalysis(null);
    },
  });

  const updateObraMutation = useMutation({
    mutationFn: (data: { obraId: string; details: { titulo: string; descricao: string } }) =>
      updateObraDetails(data.obraId, data.details),
    onSuccess: (_, variables) => {
      showSuccess("Obra atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["obra", variables.obraId] });
      setIsApplyDialogOpen(false);
      setSelectedObraId(null);
      navigate(`/obras/${variables.obraId}`);
    },
    onError: (error) => {
      showError(`Erro ao atualizar obra: ${error.message}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    analysisMutation.mutate(values.image);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("image", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingAnalysis) {
      deleteMutation.mutate(deletingAnalysis);
    }
  };

  const handleApplyAnalysis = () => {
    if (selectedObraId && activeAnalysis) {
      updateObraMutation.mutate({
        obraId: selectedObraId,
        details: {
          titulo: activeAnalysis.suggested_title,
          descricao: activeAnalysis.description,
        },
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">
          Analisador de Obras com IA
        </h1>
        <p className="mt-4 text-lg text-stone-600 max-w-3xl mx-auto">
          Receba feedback instantâneo sobre sua arte. Envie uma imagem e nossa IA, usando sua chave de API do Gemini, fornecerá uma análise detalhada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload e Resultado */}
        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Upload className="h-6 w-6 text-teal-600" />
                1. Envie sua Obra
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingKeyStatus ? (
                <Skeleton className="h-40 w-full" />
              ) : !apiKeyStatus?.isSet ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Configuração de API Necessária</AlertTitle>
                  <AlertDescription>
                    Para usar o analisador, você precisa configurar sua chave da API do Gemini.
                    <Link to="/settings/api" className="block mt-2">
                      <Button>
                        <Key className="mr-2 h-4 w-4" />
                        Configurar Chave de API
                      </Button>
                    </Link>
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="image"
                      render={() => (
                        <FormItem>
                          <FormLabel>Arquivo de Imagem</FormLabel>
                          <FormControl>
                            <Input type="file" accept="image/*" onChange={handleFileChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedImage && (
                      <div className="mt-4">
                        <img src={selectedImage} alt="Pré-visualização" className="max-h-64 w-auto mx-auto rounded-lg" />
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={analysisMutation.isPending || !apiKeyStatus?.isSet}>
                      {analysisMutation.isPending ? "Analisando..." : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analisar Obra com Gemini
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {analysisMutation.isPending && (
            <Card>
              <CardContent className="p-6 text-center">
                <p>Analisando com Gemini... Isso pode levar alguns instantes.</p>
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          )}

          {activeAnalysis && (
            <div className="space-y-8">
              <Card className="shadow-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sparkles className="h-6 w-6 text-yellow-500" />
                    2. Resultado da Análise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Título Sugerido</AlertTitle>
                    <AlertDescription>{activeAnalysis.suggested_title}</AlertDescription>
                  </Alert>
                  <Alert>
                    <ImageIcon className="h-4 w-4" />
                    <AlertTitle>Descrição Detalhada</AlertTitle>
                    <AlertDescription>{activeAnalysis.description}</AlertDescription>
                  </Alert>
                  <Alert>
                    <Palette className="h-4 w-4" />
                    <AlertTitle>Classificação de Estilo</AlertTitle>
                    <AlertDescription>{activeAnalysis.style_classification}</AlertDescription>
                  </Alert>
                  <Alert variant="default" className="bg-teal-50 border-teal-200">
                    <MessageSquare className="h-4 w-4" />
                    <AlertTitle className="text-teal-800">Opinião Construtiva</AlertTitle>
                    <AlertDescription className="text-teal-700">{activeAnalysis.constructive_feedback}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card className="shadow-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <LinkIcon className="h-6 w-6 text-blue-600" />
                    3. Próximo Passo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Check className="mr-2 h-4 w-4" />
                        Usar esta Análise em uma Obra
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Aplicar Análise à Obra</DialogTitle>
                        <DialogDescription>
                          Selecione uma de suas obras para atualizar o título e a descrição com o conteúdo gerado pela IA.
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[50vh] my-4">
                        <div className="space-y-2 pr-4">
                          {isLoadingMyObras ? (
                            <p>Carregando suas obras...</p>
                          ) : myObras && myObras.length > 0 ? (
                            myObras.map((obra) => (
                              <div
                                key={obra.id}
                                onClick={() => setSelectedObraId(obra.id)}
                                className={cn(
                                  "flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
                                  { "ring-2 ring-primary bg-muted": selectedObraId === obra.id }
                                )}
                              >
                                <img src={getPublicUrl(obra.img)} alt={obra.titulo || ""} className="h-16 w-16 object-cover rounded-md" />
                                <div className="flex-grow">
                                  <p className="font-semibold">{obra.titulo || "Sem Título"}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{obra.descricao || "Sem descrição"}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-muted-foreground p-8">Você não possui nenhuma obra cadastrada.</p>
                          )}
                        </div>
                      </ScrollArea>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>Cancelar</Button>
                        <Button
                          onClick={handleApplyAnalysis}
                          disabled={!selectedObraId || updateObraMutation.isPending}
                        >
                          {updateObraMutation.isPending ? "Atualizando..." : "Confirmar e Atualizar Obra"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Histórico */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <History className="h-6 w-6 text-stone-600" />
              Histórico de Análises
            </CardTitle>
            <CardDescription>Veja suas análises anteriores.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[800px] overflow-y-auto">
            {isLoadingHistory ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveAnalysis(item)}
                    className={cn(
                      "group flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50/50 transition-colors cursor-pointer",
                      { "bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800": activeAnalysis?.id === item.id }
                    )}
                  >
                    <img src={getPublicUrl(item.image_url)} alt="Obra analisada" className="h-16 w-16 object-cover rounded-md" />
                    <div className="flex-grow">
                      <p className="font-semibold">{item.suggested_title || "Análise"}</p>
                      <p className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingAnalysis(item);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground p-8">Nenhuma análise realizada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingAnalysis} onOpenChange={(open) => !open && setDeletingAnalysis(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja deletar esta análise?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A análise e a imagem associada serão permanentemente removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArtworkAnalyzerPage;