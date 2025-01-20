import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createMemoryContextManager } from "@/utils/memory/contextManager";

export function useMemoryManagement(roleId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const memoryContextManager = roleId ? createMemoryContextManager(roleId) : null;

  // Get all memories including consolidated ones
  const { data: memories, isLoading: isLoadingMemories } = useQuery({
    queryKey: ["role-memories", roleId],
    queryFn: async () => {
      if (!roleId) return [];
      const { data, error } = await supabase
        .from("role_memories")
        .select("*")
        .eq("role_id", roleId)
        .order("importance_score", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!roleId,
  });

  // Store new memory with enhanced context
  const storeMemory = useMutation({
    mutationFn: async ({ 
      content, 
      contextType, 
      metadata = {},
      previousContextId = null 
    }: { 
      content: string; 
      contextType: string; 
      metadata?: any;
      previousContextId?: string | null;
    }) => {
      if (!roleId || !memoryContextManager) throw new Error("No role selected");
      
      await memoryContextManager.storeMemoryWithContext(content, contextType, {
        ...metadata,
        previous_context_id: previousContextId,
        memory_type: 'conversation',
        importance_score: 1.0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-memories", roleId] });
      toast({
        title: "Memory stored",
        description: "New memory has been stored successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error storing memory",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get relevant memories for current context
  const getRelevantMemories = async (content: string) => {
    if (!roleId || !memoryContextManager) return [];
    return await memoryContextManager.retrieveRelevantMemories(content);
  };

  return {
    memories,
    isLoadingMemories,
    storeMemory,
    getRelevantMemories,
  };
}