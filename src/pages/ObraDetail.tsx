import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchObraById, getPublicUrl } from "@/integrations/supabase/api";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Video, User, Image, Mail, Phone, Share2, Edit, Trash2, BookText, PlayCircle } from "lucide-react";
import GalleryManager from "@/components/GalleryManager";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { showSuccess, showError } from "@/utils/toast";

const ObraDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const obraId = id;
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: obra, isLoading, error } = useQuery({
    queryKey: ["obra", obraId],
    queryFn: () => {
      if (!obraId) {
        throw new Error("Invalid artwork ID.");
      }
      return fetchObraById(obraId);
    },
    enabled: !!obraId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="md:col-span-2 h-[500px]" />
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !obra) {
    return <div className="text-center text-red-500">Obra de arte não encontrada ou ID inválido.</div>;
  }

  const imageUrl = getPublicUrl(obra.img);
  const videoUrl = obra.video ? getPublicUrl(obra.video) : null;
  const ownerPhotoUrl = getPublicUrl(obra.foto_dono);
  const creationDate = obra.data_criacao ? new Date(obra.data_criacao).toLocaleDateString('pt-BR') : 'Data Desconhecida';
  
  const isOwner = currentUser && obra.user_id && currentUser.id === obra.user_id;

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', obraId);
      
      if (error) throw error;
      
      showSuccess('Obra deletada com sucesso!');
      navigate('/');
    } catch (error) {
      showError('Erro ao deletar obra');
      console.error(error);
    }
  };

  const obraUrl = `${window.location.origin}/obras/${obraId}`;
  const whatsappMessage = encodeURIComponent(`Olá! Gostaria de saber mais sobre a obra "${obra.titulo}" que está em sua coleção.\n\nVeja a obra: ${obraUrl}`);
  const emailSubject = encodeURIComponent(`Interesse na obra: ${obra.titulo}`);
  const emailBody = encodeURIComponent(`Olá!\n\nGostaria de saber mais sobre a obra "${obra.titulo}" que está em sua coleção.\n\nVeja a obra: ${obraUrl}\n\nAguardo retorno.`);

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8 bg-[#fcfbf9] min-h-screen text-stone-800">
      <h1 className="text-2xl md:text-4xl font-serif font-bold border-b-4 border-amber-400/30 pb-4 text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">{obra.titulo}</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-2 overflow-hidden rounded-2xl border-none shadow-lg bg-white/80 backdrop-blur-sm">
            {obra.img ? (
              <img 
                src={imageUrl} 
                alt={obra.titulo || "Obra de Arte"} 
                className="w-full h-auto object-contain max-h-[70vh] rounded-xl" 
              />
            ) : (
              <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-900 flex items-center justify-center rounded-lg">
                <Image className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </Card>
          
          {videoUrl && (
            <Dialog>
              <DialogTrigger asChild>
                <Card className="p-4 rounded-2xl border-none shadow-lg bg-white/80 backdrop-blur-sm cursor-pointer group">
                  <h2 className="text-lg md:text-xl font-semibold flex items-center mb-2 text-teal-700"><Video className="h-5 w-5 mr-2" /> Vídeo da Obra</h2>
                  <div className="relative overflow-hidden rounded-lg">
                    <img src={imageUrl} alt="Poster do vídeo" className="w-full transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <PlayCircle className="h-16 w-16 text-white/80 group-hover:text-white transition-all duration-300 group-hover:scale-110" />
                    </div>
                  </div>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 border-0 bg-transparent shadow-none">
                <video controls autoPlay src={videoUrl} className="w-full rounded-lg" />
              </DialogContent>
            </Dialog>
          )}

          {obra.descricao && (
            <Card className="p-4 rounded-2xl border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <h2 className="text-lg md:text-xl font-semibold flex items-center mb-2 text-teal-700">
                <BookText className="h-5 w-5 mr-2" /> Sobre a Obra
              </h2>
              <p className="text-stone-700 whitespace-pre-wrap">
                {obra.descricao}
              </p>
            </Card>
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="rounded-2xl border-none shadow-md bg-white/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl md:text-2xl text-teal-800">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2 text-amber-500" />
                Data de Criação: <span className="ml-2 font-medium text-stone-700">{creationDate}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-white/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl md:text-2xl text-teal-800">Proprietário</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center space-x-4">
              {obra.foto_dono ? (
                <img 
                  src={ownerPhotoUrl} 
                  alt={obra.nome_dono || "Dono"} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-8 w-8 text-secondary-foreground" />
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">{obra.nome_dono || "Proprietário Desconhecido"}</p>
                <p className="text-sm text-muted-foreground">Coleção Particular</p>
              </div>
            </CardContent>
          </Card>

          {(obra.email_dono || obra.telefone_dono) && (
            <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-white to-stone-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-teal-800">
                  <Share2 className="h-5 w-5 text-amber-500" />
                  Entrar em Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {obra.email_dono && (
                  <a href={`mailto:${obra.email_dono}?subject=${emailSubject}&body=${emailBody}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full border-teal-200 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Email
                    </Button>
                  </a>
                )}
                {obra.telefone_dono && (
                  <a href={`https://wa.me/${obra.telefone_dono.replace(/\D/g, '')}?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white border-none transition-colors">
                      <Phone className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {isOwner && (
            <Card className="rounded-2xl border-none shadow-md bg-white/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg md:text-xl text-stone-700">Gerenciar Obra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white border-none"
                  onClick={() => navigate(`/admin/edit-obra/${obraId}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Obra
                </Button>

                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar Obra
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A obra será permanentemente deletada.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Deletar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {obraId && <GalleryManager obraId={obraId} isOwner={!!isOwner} />}
    </div>
  );
};

export default ObraDetail;