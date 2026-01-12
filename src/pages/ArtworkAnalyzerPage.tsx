import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { analyzeArtwork, fetchAnalysisHistory, getPublicUrl } from "@/integrations/supabase/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Sparkles, Lightbulb, Palette, MessageSquare, History, Image as ImageIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const formSchema = z.object({
  image: z.instanceof(File).refine(file => file.size > 0, "Por favor, selecione uma imagem."),
});

type FormValues = z.infer<typeof formSchema>;

const ArtworkAnalyzerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["analysisHistory"],
    queryFn: fetchAnalysisHistory,
  });

  const analysisMutation = useMutation({
    mutationFn: (file: File) => analyzeArtwork(file),
    onSuccess: (data) => {
      showSuccess("Análise concluída com sucesso!");
      setLatestAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["analysisHistory"] });
    },
    onError: (error) => {
      showError(`Erro na análise: ${error.message}`);
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

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">
          Analisador de Obras com IA
        </h1>
        <p className="mt-4 text-lg text-stone-600 max-w-3xl mx-auto">
          Receba feedback instantâneo sobre sua arte. Envie uma imagem e nossa IA fornecerá uma análise detalhada, sugestões e críticas construtivas.
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
                  <Button type="submit" className="w-full" disabled={analysisMutation.isPending}>
                    {analysisMutation.isPending ? "Analisando..." : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analisar Obra
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {analysisMutation.isPending && (
            <Card>
              <CardContent className="p-6 text-center">
                <p>Analisando... Isso pode levar alguns instantes.</p>
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          )}

          {latestAnalysis && (
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
                  <AlertDescription>{latestAnalysis.suggested_title}</AlertDescription>
                </Alert>
                <Alert>
                  <ImageIcon className="h-4 w-4" />
                  <AlertTitle>Descrição Detalhada</AlertTitle>
                  <AlertDescription>{latestAnalysis.description}</AlertDescription>
                </Alert>
                <Alert>
                  <Palette className="h-4 w-4" />
                  <AlertTitle>Classificação de Estilo</AlertTitle>
                  <AlertDescription>{latestAnalysis.style_classification}</AlertDescription>
                </Alert>
                <Alert variant="default" className="bg-teal-50 border-teal-200">
                  <MessageSquare className="h-4 w-4" />
                  <AlertTitle className="text-teal-800">Opinião Construtiva</AlertTitle>
                  <AlertDescription className="text-teal-700">{latestAnalysis.constructive_feedback}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
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
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <img src={getPublicUrl(item.image_url)} alt="Obra analisada" className="h-16 w-16 object-cover rounded-md" />
                    <div className="flex-grow">
                      <p className="font-semibold">{item.suggested_title || "Análise"}</p>
                      <p className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground p-8">Nenhuma análise realizada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ArtworkAnalyzerPage;