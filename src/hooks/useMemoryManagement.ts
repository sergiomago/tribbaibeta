import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useMemoryManagement(roleId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
          metadata,
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

  const reinforceMemory = useMutation({
    mutationFn: async (memoryId: string) => {
      const { error } = await supabase
        .from("role_memories")
        .update({
          reinforcement_count: supabase.sql`reinforcement_count + 1`,
          last_reinforced: new Date().toISOString(),
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

  return {
    memories,
    isLoadingMemories,
    storeMemory,
    reinforceMemory,
  };
}