import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatSidebarProps {
  defaultSize: number;
  onResize: (size: number) => void;
  onThreadSelect: (threadId: string) => void;
}

export function ChatSidebar({ onThreadSelect }: ChatSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createThread = useMutation({
    mutationFn: async () => {
      // First create an OpenAI thread
      const { data: openAIThread, error: openAIError } = await supabase.functions.invoke(
        "create-thread"
      );
      if (openAIError) throw openAIError;

      // Then create the thread in our database
      const { data, error } = await supabase
        .from("threads")
        .insert({
          name: "New Thread",
          openai_thread_id: openAIThread.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setSelectedThreadId(newThread.id);
      onThreadSelect(newThread.id);
      toast({
        title: "Success",
        description: "New thread created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create thread: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleThreadClick = (threadId: string) => {
    setSelectedThreadId(threadId);
    onThreadSelect(threadId);
  };

  return (
    <div className="h-full flex flex-col border-r">
      <div className="p-4 border-b">
        <Button
          className="w-full"
          onClick={() => createThread.mutate()}
          disabled={createThread.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {threads?.map((thread) => (
            <button
              key={thread.id}
              onClick={() => handleThreadClick(thread.id)}
              className={`w-full p-3 text-left rounded-lg transition-colors ${
                selectedThreadId === thread.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">{thread.name}</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}