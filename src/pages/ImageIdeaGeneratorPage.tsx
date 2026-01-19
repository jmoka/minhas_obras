import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createImageIdea, updateImageIdea, fetchImageIdeas, deleteImageIdea } from "@/integrations/supabase/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Lightbulb, Sparkles, History, Trash2, Image as ImageIcon, Download, Copy } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

// Form Schema
const ideaSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório."),
  descricao_principal: z.string().min(1, "Descrição principal é obrigatória."),
  tema: z.string().optional(),
  estilo_artistico: z.string().optional(),
  referencia_artistica: z.string().optional(),
  paleta_cores: z.string().optional(),
  iluminacao: z.string().optional(),
  atmosfera: z.string().optional(),
  ambiente: z.string().optional(),
  possui_personagens: z.boolean().default(false),
  descricao_personagens: z.string().optional(),
  enquadramento: z.string().optional(),
  nivel_detalhe: z.string().optional(),
  texturas_materiais: z.string().optional(),
  qualidade_render: z.string().optional(),
  formato_imagem: z.string().optional(),
  resolucao: z.string().optional(),
  finalidade: z.string().optional(),
  prompt_negativo: z.string().optional(),
});

type IdeaFormValues = z.infer<typeof ideaSchema>;

// Options for selects
const temas = ["Fantasia", "Ficção Científica", "Realismo", "Abstrato", "Natureza", "Urbano", "Outro"];
const estilos = ["Arte digital", "Pintura a óleo", "Aquarela", "Ilustração", "Anime / Mangá", "Realismo", "Surrealismo"];
const paletas = ["Tons quentes", "Tons frios", "Monocromático", "Neon"];
const iluminacoes = ["Natural", "Dramática", "Cinematográfica", "Noturna", "Suave", "Contra-luz"];
const atmosferas = ["Alegre", "Sombrio", "Misterioso", "Épico", "Tranquilo", "Melancólico"];
const ambientes = ["Floresta", "Cidade", "Espaço", "Interior", "Fantástico", "Personalizado"];
const enquadramentos = ["Close-up", "Plano médio", "Plano aberto", "Vista aérea", "Primeira pessoa"];
const detalhes = ["Minimalista", "Médio", "Alto", "Ultra detalhado"];
const qualidades = ["Padrão", "HD", "Ultra HD", "Cinematográfico"];
const formatos = ["1:1", "16:9", "9:16"];
const resolucoes = ["1024x1024", "1920x1080", "4K"];
const finalidades = ["Wallpaper", "Capa", "Post redes sociais", "Conceito artístico", "Referência visual"];

const ImageIdeaGeneratorPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeIdea, setActiveIdea] = useState<any>(null);

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    defaultValues: { possui_personagens: false },
  });
  const possuiPersonagens = form.watch("possui_personagens");

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["imageIdeas"],
    queryFn: fetchImageIdeas,
  });

  const generateMutation = useMutation({
    mutationFn: async (values: IdeaFormValues) => {
      const generatePrompt = (data: IdeaFormValues): string => {
        return `
          ${data.descricao_principal}.
          Tema: ${data.tema || 'N/A'}.
          Estilo artístico: ${data.estilo_artistico || 'N/A'}.
          Referência artística: ${data.referencia_artistica || 'N/A'}.
          Paleta de cores: ${data.paleta_cores || 'N/A'}.
          Iluminação: ${data.iluminacao || 'N/A'}.
          Atmosfera: ${data.atmosfera || 'N/A'}.
          Ambiente: ${data.ambiente || 'N/A'}.
          Personagens: ${data.possui_personagens ? data.descricao_personagens || 'Sim, sem descrição' : 'Não'}.
          Enquadramento: ${data.enquadramento || 'N/A'}.
          Nível de detalhe: ${data.nivel_detalhe || 'N/A'}.
          Texturas e materiais: ${data.texturas_materiais || 'N/A'}.
          Qualidade do render: ${data.qualidade_render || 'N/A'}.
          Formato da imagem: ${data.formato_imagem || 'N/A'}.
          Resolução: ${data.resolucao || 'N/A'}.
          Finalidade: ${data.finalidade || 'N/A'}.
          Restrições: ${data.prompt_negativo || 'Nenhuma'}.
        `.replace(/\s+/g, ' ').trim();
      };

      const prompt_final = generatePrompt(values);
      const initialIdea = await createImageIdea({ ...values, prompt_final });

      // SIMULAÇÃO DA CHAMADA À IA
      await new Promise(resolve => setTimeout(resolve, 3000)); 
      const placeholderUrl = `https://picsum.photos/seed/${initialIdea.id}/1024`;

      const updatedIdea = await updateImageIdea(initialIdea.id, {
        imagem_url: placeholderUrl,
        status: 'GERADO',
      });

      return updatedIdea;
    },
    onSuccess: (data) => {
      showSuccess("Imagem gerada com sucesso!");
      setActiveIdea(data);
      queryClient.invalidateQueries({ queryKey: ["imageIdeas"] });
      form.reset();
    },
    onError: (error) => {
      showError(`Erro ao gerar imagem: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteImageIdea,
    onSuccess: (_, deletedId) => {
      showSuccess("Ideia deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["imageIdeas"] });
      if (activeIdea?.id === deletedId) {
        setActiveIdea(null);
      }
    },
    onError: (error) => showError(error.message),
  });

  const onSubmit = (values: IdeaFormValues) => {
    generateMutation.mutate(values);
  };

  const handleDownload = async () => {
    if (!activeIdea?.imagem_url) return;
    try {
      const response = await fetch(activeIdea.imagem_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeIdea.titulo.replace(/\s+/g, '_') || 'arte-gerada'}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("Download iniciado!");
    } catch (error) {
      showError("Não foi possível baixar a imagem.");
      console.error(error);
    }
  };

  const handleCopyPrompt = () => {
    if (!activeIdea?.prompt_final) return;
    navigator.clipboard.writeText(activeIdea.prompt_final);
    showSuccess("Prompt copiado para a área de transferência!");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400">
          Gerador de Ideias de Arte
        </h1>
        <p className="mt-4 text-lg text-stone-600 max-w-3xl mx-auto">
          Transforme suas ideias em prompts detalhados e gere imagens incríveis. Preencha o formulário para começar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lightbulb className="h-6 w-6 text-purple-600" />
              Crie sua Ideia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-6">
                    <FormField name="titulo" control={form.control} render={({ field }) => (<FormItem><FormLabel>Título da Arte</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="descricao_principal" control={form.control} render={({ field }) => (<FormItem><FormLabel>Descrição Principal</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField name="tema" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tema</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{temas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="estilo_artistico" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estilo Artístico</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{estilos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="referencia_artistica" control={form.control} render={({ field }) => (<FormItem><FormLabel>Referência Artística (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField name="paleta_cores" control={form.control} render={({ field }) => (<FormItem><FormLabel>Paleta de Cores</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{paletas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="iluminacao" control={form.control} render={({ field }) => (<FormItem><FormLabel>Iluminação</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{iluminacoes.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="atmosfera" control={form.control} render={({ field }) => (<FormItem><FormLabel>Atmosfera</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{atmosferas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="ambiente" control={form.control} render={({ field }) => (<FormItem><FormLabel>Ambiente</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{ambientes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>

                    <FormField name="possui_personagens" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Possui Personagens?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    {possuiPersonagens && <FormField name="descricao_personagens" control={form.control} render={({ field }) => (<FormItem><FormLabel>Descrição dos Personagens</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />}

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField name="enquadramento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Enquadramento</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{enquadramentos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="nivel_detalhe" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nível de Detalhe</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{detalhes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="texturas_materiais" control={form.control} render={({ field }) => (<FormItem><FormLabel>Texturas e Materiais</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField name="qualidade_render" control={form.control} render={({ field }) => (<FormItem><FormLabel>Qualidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{qualidades.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="formato_imagem" control={form.control} render={({ field }) => (<FormItem><FormLabel>Formato</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{formatos.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="resolucao" control={form.control} render={({ field }) => (<FormItem><FormLabel>Resolução</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{resolucoes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField name="finalidade" control={form.control} render={({ field }) => (<FormItem><FormLabel>Finalidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{finalidades.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="prompt_negativo" control={form.control} render={({ field }) => (<FormItem><FormLabel>Prompt Negativo</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </ScrollArea>
                <Button type="submit" className="w-full" disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? "Gerando Imagem..." : <><Sparkles className="mr-2 h-4 w-4" />Gerar Imagem</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Resultado e Histórico */}
        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ImageIcon className="h-6 w-6 text-teal-600" />
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generateMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
                  <Sparkles className="h-8 w-8 text-muted-foreground animate-pulse" />
                  <p className="mt-2 text-muted-foreground">Gerando sua obra de arte...</p>
                </div>
              ) : activeIdea?.imagem_url ? (
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <img 
                        src={activeIdea.imagem_url} 
                        alt={activeIdea.titulo} 
                        className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-2">
                      <img src={activeIdea.imagem_url} alt={activeIdea.titulo} className="w-full h-auto rounded-lg" />
                    </DialogContent>
                  </Dialog>

                  <div className="flex gap-2">
                    <Button onClick={handleDownload} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Imagem
                    </Button>
                  </div>

                  <div>
                    <Label>Prompt Final Gerado</Label>
                    <div className="relative mt-1">
                      <Textarea 
                        readOnly 
                        value={activeIdea.prompt_final} 
                        className="pr-10 h-32 bg-gray-50" 
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={handleCopyPrompt}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
                  <p className="text-muted-foreground">A imagem gerada aparecerá aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <History className="h-6 w-6 text-stone-600" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {isLoadingHistory ? <Skeleton className="h-full w-full" /> : (
                  history?.map((idea: any) => (
                    <div key={idea.id} onClick={() => setActiveIdea(idea)} className={cn("group flex items-center gap-4 p-2 border-b cursor-pointer hover:bg-muted/50", { "bg-muted": activeIdea?.id === idea.id })}>
                      <img src={idea.imagem_url || 'https://via.placeholder.com/64'} alt={idea.titulo} className="h-16 w-16 object-cover rounded-md" />
                      <div className="flex-grow"><p className="font-semibold">{idea.titulo}</p><p className="text-sm text-muted-foreground">{new Date(idea.criado_em).toLocaleDateString()}</p></div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(idea.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImageIdeaGeneratorPage;