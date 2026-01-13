import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { fetchChatSessions, fetchChatMessages, sendChatMessageToTutor, deleteChatSession } from "@/integrations/supabase/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Plus, MessageSquare, Trash2, Send, BrainCircuit, User } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const messageSchema = z.object({
  content: z.string().min(1, "A mensagem não pode estar vazia."),
});
type MessageFormValues = z.infer<typeof messageSchema>;

const ArtTutorPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat sessions (history)
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["chatSessions"],
    queryFn: fetchChatSessions,
  });

  // Fetch messages for the active session
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["chatMessages", activeSessionId],
    queryFn: () => fetchChatMessages(activeSessionId!),
    enabled: !!activeSessionId,
  });

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: (values: { message: string }) => sendChatMessageToTutor(activeSessionId, values.message),
    onSuccess: (data) => {
      if (!activeSessionId) {
        setActiveSessionId(data.sessionId);
      }
      queryClient.invalidateQueries({ queryKey: ["chatMessages", data.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
    },
    onError: (error) => showError(error.message),
  });

  // Mutation for deleting a session
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => deleteChatSession(sessionId),
    onSuccess: (_, deletedSessionId) => {
      showSuccess("Conversa deletada.");
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
      if (activeSessionId === deletedSessionId) {
        setActiveSessionId(null);
      }
    },
    onError: (error) => showError(error.message),
  });

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = (values: MessageFormValues) => {
    sendMessageMutation.mutate({ message: values.content });
    form.reset();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    form.reset();
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-10rem)] max-w-7xl mx-auto border rounded-lg">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
        <div className="flex flex-col h-full p-2">
          <Button onClick={handleNewChat} className="mb-2">
            <Plus className="mr-2 h-4 w-4" /> Nova Conversa
          </Button>
          <ScrollArea className="flex-grow">
            {isLoadingSessions ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              sessions?.map((session: any) => (
                <div
                  key={session.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer ${activeSessionId === session.id ? "bg-muted" : "hover:bg-muted/50"}`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-sm">{session.title}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Conversa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSessionMutation.mutate(session.id)}>Deletar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75}>
        <div className="flex flex-col h-full">
          <ScrollArea className="flex-grow p-4">
            {!activeSessionId ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <BrainCircuit className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold">Tutor de Arte com Gemini</h2>
                <p className="text-muted-foreground">Inicie uma nova conversa ou selecione uma no painel ao lado.</p>
              </div>
            ) : isLoadingMessages ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-3/4 ml-auto" />
              </div>
            ) : (
              <div className="space-y-6">
                {messages?.map((message: any) => (
                  <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'model' && <BrainCircuit className="h-8 w-8 text-teal-500 flex-shrink-0 mt-1" />}
                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-md p-3 rounded-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {message.role === 'user' && <User className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-1" />}
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex items-start gap-3">
                    <BrainCircuit className="h-8 w-8 text-teal-500 flex-shrink-0 mt-1 animate-pulse" />
                    <div className="max-w-md p-3 rounded-lg bg-muted rounded-bl-none">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="p-4 border-t">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Input placeholder="Pergunte algo ao tutor de arte..." {...field} autoComplete="off" disabled={!activeSessionId && sessions?.length > 0 && !isLoadingSessions} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default ArtTutorPage;