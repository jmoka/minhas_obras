import React, { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { adminDeleteUser } from "@/integrations/supabase/functions";
import { UserProfile } from "@/types/database";

interface DeleteUserDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ user, open, onOpenChange, onSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    if (user.admin) {
      showError("Não é possível deletar usuários administradores.");
      onOpenChange(false);
      return;
    }

    setIsDeleting(true);
    const loadingToastId = showLoading("Deletando usuário...");

    try {
      await adminDeleteUser({ userId: user.id });

      dismissToast(loadingToastId);
      showSuccess("Usuário deletado com sucesso!");
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Falha ao deletar usuário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (user?.admin) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-2xl">Ação Não Permitida</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-4 space-y-3">
              <div className="text-base text-stone-800">
                Não é possível deletar usuários administradores.
              </div>
              <div className="text-sm text-stone-600">
                O usuário <span className="font-semibold">{user.nome || "Sem nome"}</span> possui permissões de administrador e não pode ser removido.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-2xl">Deletar Usuário</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-4 space-y-3">
            <div className="text-base">
              Tem certeza que deseja deletar o usuário{" "}
              <span className="font-semibold text-stone-800">{user?.nome || "Sem nome"}</span>?
            </div>
            <div className="text-sm text-red-600 font-medium">
              ⚠️ Esta ação não pode ser desfeita.
            </div>
            <div className="text-sm text-stone-600">
              Todos os dados relacionados a este usuário, incluindo suas obras e imagens, serão permanentemente removidos.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deletando...
              </>
            ) : (
              "Deletar Permanentemente"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;