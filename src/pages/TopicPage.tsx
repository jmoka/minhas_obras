import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { fetchTopicById, fetchTopicMessages, createForumMessage, getPublicUrl } from "@/integrations/supabase/api";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Send, User } from "lucide-react";
import { showError } from "@/utils/toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const messageSchema = z.object({
  content: z.string().min(1, "A mensagem não pode estar vazia."),
});

type MessageFormValues = z.infer<typeof messageSchema>;

const TopicPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const { data: topic, isLoading: isLoadingTopic } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: () => fetchTopicById(topicId!),
    enabled: !!topicId,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["topicMessages", topicId],
    queryFn: () => fetchTopicMessages(topicId!),
    enabled: !!topicId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!topicId) return;

    const channel = supabase
      .channel(`topic-${topicId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_messages",
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["topicMessages", topicId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, queryClient]);

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (values: MessageFormValues) => createForumMessage(topicId!, values.content),
    onSuccess: () => {
      form.reset();
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const onSubmit = (values: MessageFormValues) => {
    sendMessageMutation.mutate(values);
  };

  if (isLoadingTopic || isLoadingMessages) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-4 mt-8">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!topic) {
    return <div className="text-center text-red-500">Tópico não encontrado.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-15rem)]">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">{topic.title}</h1>
        <p className="text-sm text-muted-foreground">{topic.description}</p>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
        {messages?.map((message) => {
          const isCurrentUser = message.user_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${isCurrentUser ? "justify-end" : ""}`}
            >
              {!isCurrentUser && (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getPublicUrl(message.user?.foto)} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-md p-3 rounded-lg ${
                    isCurrentUser
                      ? "bg-teal-600 text-white rounded-br-none"
                      : "bg-white dark:bg-gray-800 rounded-bl-none"
                  }`}
                >
                  {!isCurrentUser && (
                    <p className="font-semibold text-sm mb-1">{message.user?.nome || "Anônimo"}</p>
                  )}
                  <p>{message.content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              {isCurrentUser && (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getPublicUrl(message.user?.foto)} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-background">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input placeholder="Digite sua mensagem..." {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
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
  );
};

export default TopicPage;