import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { MessageContext } from "./types.ts";

export async function compileMessageContext(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  content: string
): Promise<MessageContext> {
  console.log('Compiling message context:', { threadId, roleId });

  try {
    // Get relevant memories
    const { data: memories, error: memoriesError } = await supabase.rpc(
      'get_similar_memories',
      {
        p_embedding: content,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: roleId
      }
    );

    if (memoriesError) throw memoriesError;

    // Get conversation depth
    const { data: depth, error: depthError } = await supabase.rpc(
      'get_conversation_depth',
      { 
        p_thread_id: threadId,
        p_role_id: roleId
      }
    );

    if (depthError) throw depthError;

    // Get recent interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from('role_interactions')
      .select(`
        *,
        initiator:roles!role_interactions_initiator_role_id_fkey(name),
        responder:roles!role_interactions_responder_role_id_fkey(name)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (interactionsError) throw interactionsError;

    const context: MessageContext = {
      memories: memories || [],
      previousInteractions: interactions || [],
      conversationDepth: depth || 0,
      chainContext: {
        lastUpdated: new Date().toISOString(),
        contextType: 'message'
      }
    };

    console.log('Context compiled successfully');
    return context;
  } catch (error) {
    console.error('Error compiling message context:', error);
    throw error;
  }
}

export async function updateContextualMemory(
  supabase: SupabaseClient,
  roleId: string,
  content: string,
  context: MessageContext
): Promise<void> {
  console.log('Updating contextual memory:', { roleId, context });

  try {
    // Store the interaction as a memory
    const { error } = await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content,
        context_type: 'conversation',
        metadata: {
          conversation_depth: context.conversationDepth,
          interaction_count: context.previousInteractions.length,
          memory_context: context.chainContext
        }
      });

    if (error) throw error;
    console.log('Contextual memory updated successfully');
  } catch (error) {
    console.error('Error updating contextual memory:', error);
    throw error;
  }
}