import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { adminCreateUser } from "@/integrations/supabase/functions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fetchArtistProfile } from "@/integrations/supabase/api";

// Define the schema for the form
const formSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  nome: z.string().min(1, "O nome é obrigatório para o novo usuário."),
});

type UserCreationFormValues = z.infer<typeof formSchema>;

const AdminUserManagement: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if the current user is an admin (for frontend display purposes)
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["artistProfile"],
    queryFn: fetchArtistProfile,
  });

  const isAdmin = profile?.admin === true;

  const form = useForm<UserCreationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      nome: "",
    },
  });

  const onSubmit = async (values: UserCreationFormValues) => {
    setIsSubmitting(true);
    const loadingToastId = showLoading("Criando novo usuário...");

    try {
      // The user_metadata is used by the handle_new_user trigger (if implemented)
      // to populate the 'user' table with the name.
      const payload = {
        email: values.email,
        password: values.password,
        user_metadata: {
          nome: values.nome,
        },
      };
      
      await adminCreateUser(payload);

      dismissToast(loadingToastId);
      showSuccess(`Usuário ${values.email} criado com sucesso!`);
      
      form.reset();
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Falha ao criar usuário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProfile) {
    return <div className="text-center">Carregando permissões...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="text-center p-10">
        <h1 className="text-3xl font-bold text-destructive">Acesso Negado</h1>
        <p className="text-lg text-muted-foreground">Você não tem permissão de administrador para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Gerenciamento de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Criar Novo Usuário</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Nome */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Novo Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome Completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Criar Usuário
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserManagement;