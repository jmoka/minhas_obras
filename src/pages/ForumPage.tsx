import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { fetchForumTopics, createForumTopic, getPublicUrl } from "@/integrations/supabase/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, MessageSquare, User } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const newTopicSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z.string().optional(),
});

type NewTopicFormValues = z.infer<typeof newTopicSchema>;

const ForumPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: topics, isLoading } = useQuery({
    queryKey: ["forumTopics"],
    queryFn: fetchForumTopics,
  });

  const form = useForm<NewTopicFormValues>({
    resolver: zodResolver(newTopicSchema),
    defaultValues: { title: "", description: "" },
  });

  const createTopicMutation = useMutation({
    mutationFn: (values: NewTopicFormValues) => createForumTopic(values.title, values.description || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumTopics"] });
      showSuccess("Tópico criado com sucesso!");
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const onSubmit = (values: NewTopicFormValues) => {
    createTopicMutation.mutate(values);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">
          Fórum dos Artistas
        </h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-600 to-teal-500 text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Novo Tópico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar um Novo Tópico de Discussão</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Qual o assunto principal?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Dê mais detalhes sobre o que você quer discutir." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createTopicMutation.isPending}>
                    {createTopicMutation.isPending ? "Criando..." : "Criar Tópico"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : topics && topics.length > 0 ? (
        <div className="space-y-4">
          {topics.map((topic) => (
            <Link to={`/forum/${topic.id}`} key={topic.id}>
              <Card className="hover:border-teal-500 hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <MessageSquare className="h-8 w-8 text-teal-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg">{topic.title}</h3>
                      <p className="text-sm text-muted-foreground">{topic.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground text-right">
                    <div className="hidden sm:block">
                      <p>Criado por</p>
                      <p className="font-medium text-foreground">{topic.user?.nome || "Anônimo"}</p>
                    </div>
                    <Avatar>
                      <AvatarImage src={getPublicUrl(topic.user?.foto)} />
                      <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="text-center p-12">
          <h3 className="text-xl font-semibold">Nenhum tópico ainda</h3>
          <p className="text-muted-foreground mt-2">Seja o primeiro a iniciar uma conversa!</p>
        </Card>
      )}
    </div>
  );
};

export default ForumPage;