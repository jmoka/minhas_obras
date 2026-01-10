import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  fetchGalleryImagesByObraId, 
  uploadAndAddToGallery, 
  deleteGalleryImage,
  getPublicUrl 
} from "@/integrations/supabase/api";
import { showSuccess, showError } from "@/utils/toast";

interface GalleryManagerProps {
  obraId: string;
  isOwner: boolean;
}

const GalleryManager: React.FC<GalleryManagerProps> = ({ obraId, isOwner }) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: galleryImages, isLoading } = useQuery({
    queryKey: ["galleryImages", obraId],
    queryFn: () => fetchGalleryImagesByObraId(obraId),
  });

  const addImageMutation = useMutation({
    mutationFn: (file: File) => uploadAndAddToGallery(file, obraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryImages", obraId] });
      showSuccess("Imagem adicionada à galeria!");
      setSelectedFile(null);
    },
    onError: (error) => {
      showError(`Erro ao adicionar imagem: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: ({ imageId, imagePath }: { imageId: string; imagePath: string }) => 
      deleteGalleryImage(imageId, imagePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryImages", obraId] });
      showSuccess("Imagem removida da galeria!");
    },
    onError: (error) => {
      showError(`Erro ao deletar imagem: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    },
  });

  const handleUpload = () => {
    if (!selectedFile) {
      showError("Selecione uma imagem primeiro.");
      return;
    }

    addImageMutation.mutate(selectedFile);
  };

  const handleDelete = (imageId: string, imagePath: string) => {
    if (confirm("Tem certeza que deseja remover esta imagem da galeria?")) {
      deleteImageMutation.mutate({ imageId, imagePath });
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Carregando galeria...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold">Galeria de Imagens</h3>

      {isOwner && (
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="flex-grow"
            />
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || addImageMutation.isPending}
            >
              {addImageMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>
        </Card>
      )}

      {galleryImages && galleryImages.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.map((img) => (
            <Card key={img.id} className="relative group overflow-hidden">
              <img
                src={getPublicUrl(img.url)}
                alt={`Galeria ${img.id}`}
                className="w-full h-48 object-cover"
              />
              
              {isOwner && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(img.id, img.url!)}
                    disabled={deleteImageMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground p-8">
          Nenhuma imagem na galeria ainda.
        </p>
      )}
    </div>
  );
};

export default GalleryManager;