import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { adminUpdateUser } from "@/integrations/supabase/functions";
import { UserProfile } from "@/types/database";

const editUserSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  admin: z.boolean(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ user, open, onOpenChange, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      nome: user?.nome || "",
      email: "",
      password: "",
      admin: user?.admin || false,
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        nome: user.nome || "",
        email: "",
        password: "",
        admin: user.admin || false,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    const loadingToastId = showLoading("Atualizando usuário...");

    try {
      const payload: any = {
        userId: user.id,
        admin: values.admin,
      };

      if (values.nome !== user.nome) {
        payload.user_metadata = { nome: values.nome };
      }

      if (values.email && values.email.trim() !== "") {
        payload.email = values.email;
      }

      if (values.password && values.password.trim() !== "") {
        payload.password = values.password;
      }

      await adminUpdateUser(payload);

      dismissToast(loadingToastId);
      showSuccess("Usuário atualizado com sucesso!");
      
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Falha ao atualizar usuário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-teal-800">Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações do usuário. Deixe os campos vazios para não alterá-los.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome Completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo Email (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="novo-email@exemplo.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Deixe vazio para manter o email atual
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha (opcional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                  </FormControl>
                  <FormDescription>
                    Deixe vazio para manter a senha atual
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="admin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Administrador</FormLabel>
                    <FormDescription>
                      Concede permissões administrativas ao usuário
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
