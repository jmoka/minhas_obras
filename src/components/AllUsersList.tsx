import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User as UserIcon, Edit, Trash2, ShieldBan } from "lucide-react";
import { getPublicUrl } from "@/integrations/supabase/api";
import { UserProfile } from "@/types/database";
import EditUserDialog from "./EditUserDialog";
import DeleteUserDialog from "./DeleteUserDialog";

const AllUsersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["allUsers"] });
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
  };

  const handleDelete = (user: UserProfile) => {
    setDeletingUser(user);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">Erro ao carregar usuários.</div>;
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center p-8 text-stone-500">
        <p>Nenhum usuário cadastrado no sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600 border-b-2 border-amber-100 pb-2">
        Todos os Usuários <span className="text-lg text-stone-500 font-normal ml-2">({users.length})</span>
      </h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className={`overflow-hidden rounded-xl border-none shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group ${user.bloc ? 'opacity-60' : ''}`}>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="relative h-16 w-16 flex-shrink-0">
                {user.foto ? (
                  <img
                    src={getPublicUrl(user.foto)}
                    alt={user.nome || "Usuário"}
                    className="h-16 w-16 rounded-full object-cover border-2 border-amber-400 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center border-2 border-stone-200">
                    <UserIcon className="h-8 w-8 text-stone-400" />
                  </div>
                )}
                {user.bloc && (
                  <div className="absolute -top-1 -right-1 bg-red-600 p-1 rounded-full border-2 border-white">
                    <ShieldBan className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-stone-800 truncate group-hover:text-teal-700 transition-colors">
                    {user.nome || "Sem nome"}
                  </h3>
                  {user.admin ? (
                    <Badge className="bg-teal-600 text-white text-xs">Admin</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Usuário</Badge>
                  )}
                  {user.bloc && (
                    <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                  )}
                </div>
                <p className="text-sm text-stone-500 line-clamp-2">
                  {user.descricao || "Sem biografia"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => handleEdit(user)}
                  className="hover:bg-teal-50 hover:text-teal-700"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {!user.admin && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => handleDelete(user)}
                    className="hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditUserDialog 
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSuccess={handleSuccess}
      />

      <DeleteUserDialog 
        user={deletingUser}
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default AllUsersList;