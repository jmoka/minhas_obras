import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile } from "@/types/database";
import { insertArtistProfile, updateArtistProfile, uploadFile, getPublicUrl } from "@/integrations/supabase/api";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";

// Define the schema for the form
const formSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório."),
  descricao: z.string().optional(),
  
  // File field for new avatar upload
  newFotoFile: z.instanceof(File).optional(),
});

type ProfileFormValues = z.infer<typeof formSchema> & {
  newFotoFile?: File;
};

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  onSave: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialProfile, onSave }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialProfile?.nome || "",
      descricao: initialProfile?.descricao || "",
    },
  });

  const currentAvatarUrl = initialProfile?.foto ? getPublicUrl(initialProfile.foto) : "/placeholder.svg";

  const onSubmit = async (values: ProfileFormValues) => {
    if (!initialProfile) {
      showError("Perfil não encontrado. Faça login novamente.");
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = showLoading("Atualizando perfil...");

    try {
      let fotoPath = initialProfile?.foto || null;

      if (values.newFotoFile) {
        // O upload do arquivo deve funcionar agora que o bucket foi corrigido
        fotoPath = await uploadFile(values.newFotoFile, "avatars");
      }

      const profileData = {
        nome: values.nome,
        descricao: values.descricao || null,
        foto: fotoPath,
      };

      // initialProfile.id é agora uma string, garantindo precisão
      await updateArtistProfile(initialProfile.id, profileData);

      dismissToast(loadingToastId);
      showSuccess("Perfil atualizado com sucesso!");
      
      queryClient.invalidateQueries({ queryKey: ["artistProfile"] });
      
      onSave();
    } catch (error) {
      dismissToast(loadingToastId);
      showError("Falha ao salvar perfil. Verifique o console para detalhes.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="flex items-center space-x-6">
          <div className="relative w-24 h-24">
            <img
              src={currentAvatarUrl}
              alt="Current Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-primary"
            />
            {/* Simple overlay for visual feedback */}
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </div>
          
          {/* New Avatar Upload */}
          <FormField
            control={form.control}
            name="newFotoFile"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem className="flex-grow">
                <FormLabel>Nova Foto de Perfil (Opcional)</FormLabel>
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
        </div>

        {/* Nome */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Artista</FormLabel>
              <FormControl>
                <Input placeholder="Seu nome ou nome artístico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descrição */}
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biografia / Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Conte um pouco sobre você e sua arte..." 
                  className="resize-none min-h-[150px]"
                  {...field} 
                  value={field.value || ""} // Ensure controlled component handles null/undefined
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm;