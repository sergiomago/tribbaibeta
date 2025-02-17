
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useMemoryManagement(roleId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Store new memory with enhanced metadata
  const storeMemory = useMutation({
    mutationFn: async ({ content, contextType, metadata }: { 
      content: string; 
      contextType: string; 
      metadata?: any; 
    }) => {
      if (!roleId) throw new Error("No role selected");
      
      const { error } = await supabase
        .from("role_memories")
        .insert({
          role_id: roleId,
          content,
          context_type: contextType,
          metadata: {
            ...metadata,
            timestamp: Date.now(),
            consolidated: false,
            memory_type: 'conversation',
            importance_score: 1.0,
          },
          relevance_score: 1.0,
          confidence_score: 1.0,
        });
      
      if (error) throw error;
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

  // Reinforce memory and update its importance
  const reinforceMemory = useMutation({
    mutationFn: async (memoryId: string) => {
      const { error } = await supabase
        .from("role_memories")
        .update({
          reinforcement_count: 1,  // Changed from string to number
          last_reinforced: new Date().toISOString(),
          importance_score: 1.1,  // Changed from string to number
        })
        .eq("id", memoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-memories", roleId] });
    },
    onError: (error) => {
      console.error("Error reinforcing memory:", error);
    },
  });

  // Get consolidated memories for a specific context
  const getConsolidatedMemories = async (contextType: string) => {
    if (!roleId) return [];
    
    const { data, error } = await supabase
      .from("role_memories")
      .select("*")
      .eq("role_id", roleId)
      .eq("context_type", "consolidated")
      .eq("memory_type", contextType)
      .order("importance_score", { ascending: false })
      .limit(5);

    if (error) throw error;
    return data;
  };

  return {
    memories,
    isLoadingMemories,
    storeMemory,
    reinforceMemory,
    getConsolidatedMemories,
  };
}
