import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uploadFile, fetchObraById, getPublicUrl } from "@/integrations/supabase/api";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";

// Define the schema for the form
const formSchema = z.object({
  titulo: z.string().min(1, "O título é obrigatório."),
  data_criacao: z.date({ required_error: "A data de criação é obrigatória." }),
  nome_dono: z.string().min(1, "O nome do dono é obrigatório."),
  telefone_dono: z.string().optional(),
  email_dono: z.string().email("Email inválido").optional().or(z.literal("")),
  
  // File fields are handled separately as File objects, but we validate presence
  imgFile: z.instanceof(File).optional(),
  videoFile: z.instanceof(File).optional(),
  fotoDonoFile: z.instanceof(File).optional(),
});

type ObraFormValues = z.infer<typeof formSchema> & {
  telefone_dono?: string;
  email_dono?: string;
  imgFile?: File;
  videoFile?: File;
  fotoDonoFile?: File;
};

const AdminEditObra: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: obra, isLoading } = useQuery({
    queryKey: ["obra", id],
    queryFn: () => fetchObraById(id!),
    enabled: !!id,
  });

  const form = useForm<ObraFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      nome_dono: "",
    },
  });

  // Update form values when obra data is loaded
  useEffect(() => {
    if (obra) {
      form.reset({
        titulo: obra.titulo || "",
        data_criacao: obra.data_criacao ? new Date(obra.data_criacao) : undefined,
        nome_dono: obra.nome_dono || "",
        telefone_dono: obra.telefone_dono || "",
        email_dono: obra.email_dono || "",
      });
    }
  }, [obra, form]);

  const handleFileUpload = async (file: File | undefined, folder: string): Promise<string | null> => {
    if (!file) return null;
    return uploadFile(file, folder);
  };

  const onSubmit = async (values: ObraFormValues) => {
    setIsSubmitting(true);
    const loadingToastId = showLoading("Fazendo upload de arquivos e atualizando obra...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      // Only upload new files if they were selected
      const [imgPath, videoPath, fotoDonoPath] = await Promise.all([
        handleFileUpload(values.imgFile, "images"),
        handleFileUpload(values.videoFile, "videos"),
        handleFileUpload(values.fotoDonoFile, "owner_photos"),
      ]);

      const updateData: any = {
        titulo: values.titulo,
        data_criacao: format(values.data_criacao, 'yyyy-MM-dd'),
        nome_dono: values.nome_dono,
        telefone_dono: values.telefone_dono || null,
        email_dono: values.email_dono || null,
      };

      // Only update file paths if new files were uploaded
      if (imgPath) updateData.img = imgPath;
      if (videoPath) updateData.video = videoPath;
      if (fotoDonoPath) updateData.foto_dono = fotoDonoPath;

      const { error } = await supabase
        .from('obras')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new Error(`Falha ao atualizar obra: ${error.message}`);
      }

      dismissToast(loadingToastId);
      showSuccess("Obra atualizada com sucesso!");
      
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["obra", id] });
      
      navigate(`/obras/${id}`);
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Falha ao atualizar obra: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Carregando obra...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-destructive">Obra não encontrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Editar Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Título */}
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Obra</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: O Grito" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data de Criação */}
              <FormField
                control={form.control}
                name="data_criacao"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Criação</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Selecione a data</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Imagem da Obra */}
              <FormField
                control={form.control}
                name="imgFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Imagem da Obra (Opcional)</FormLabel>
                    {obra.img && (
                      <div className="mb-2">
                        <p className="text-sm text-muted-foreground mb-2">Imagem atual:</p>
                        <img 
                          src={getPublicUrl(obra.img)} 
                          alt="Imagem atual da obra" 
                          className="max-w-xs rounded border"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Selecione uma nova imagem para substituir</p>
                      </div>
                    )}
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        accept="image/*"
                        onChange={(event) => onChange(event.target.files ? event.target.files[0] : undefined)}
                        className="file:text-primary file:bg-secondary hover:file:bg-secondary/80"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vídeo da Obra */}
              <FormField
                control={form.control}
                name="videoFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Vídeo da Obra (Opcional)</FormLabel>
                    {obra.video && (
                      <div className="mb-2">
                        <p className="text-sm text-muted-foreground mb-2">Vídeo atual:</p>
                        <video 
                          src={getPublicUrl(obra.video)} 
                          controls 
                          className="max-w-xs rounded border"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Selecione um novo vídeo para substituir</p>
                      </div>
                    )}
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        accept="video/*"
                        onChange={(event) => onChange(event.target.files ? event.target.files[0] : undefined)}
                        className="file:text-primary file:bg-secondary hover:file:bg-secondary/80"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h3 className="text-xl font-semibold mt-8 border-t pt-4">Detalhes do Proprietário</h3>

              {/* Nome do Dono */}
              <FormField
                control={form.control}
                name="nome_dono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Proprietário Atual</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Maria Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Telefone do Dono */}
              <FormField
                control={form.control}
                name="telefone_dono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone do Proprietário (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 11999999999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email do Dono */}
              <FormField
                control={form.control}
                name="email_dono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Proprietário (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Ex: proprietario@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Foto do Dono */}
              <FormField
                control={form.control}
                name="fotoDonoFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Foto do Proprietário (Opcional)</FormLabel>
                    {obra.foto_dono && (
                      <div className="mb-2">
                        <p className="text-sm text-muted-foreground mb-2">Foto atual do proprietário:</p>
                        <img 
                          src={getPublicUrl(obra.foto_dono)} 
                          alt="Foto atual do proprietário" 
                          className="max-w-xs rounded border"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Selecione uma nova foto para substituir</p>
                      </div>
                    )}
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        accept="image/*"
                        onChange={(event) => onChange(event.target.files ? event.target.files[0] : undefined)}
                        className="file:text-primary file:bg-secondary hover:file:bg-secondary/80"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Upload className="mr-2 h-4 w-4" />
                {isSubmitting ? "Salvando..." : "Atualizar Obra"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEditObra;
