
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface Message {
  id: string;
  thread_id: string;
  role_id: string | null;
  content: string;
  created_at: string;
  metadata?: Json;
}

export interface RoleMemory {
  id: string;
  content: string;
  created_at: string;
  metadata: Json;
  relevance_score: number;
  context_type: string;
  role_id: string | null;
}

export class ConversationStore {
  // Get all messages for a conversation
  static async getMessages(threadId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Save a message to a conversation
  static async saveMessage(threadId: string, content: string, roleId: string | null): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: roleId,
        content,
        metadata: {
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get role memories from a specific conversation
  static async getRoleMemoriesFromThread(roleId: string, threadId: string): Promise<RoleMemory[]> {
    const { data, error } = await supabase
      .from('role_memories')
      .select('id, content, created_at, metadata, relevance_score, context_type, role_id')
      .eq('role_id', roleId)
      .filter('metadata->thread_id', 'eq', threadId)
      .order('relevance_score', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // Get all memories for a role
  static async getRoleMemories(roleId: string): Promise<RoleMemory[]> {
    const { data, error } = await supabase
      .from('role_memories')
      .select('id, content, created_at, metadata, relevance_score, context_type, role_id')
      .eq('role_id', roleId)
      .order('relevance_score', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  // Create a new thread
  static async createThread(userId: string, title: string, roleIds: string[]): Promise<string> {
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert({
        user_id: userId,
        name: title
      })
      .select()
      .single();

    if (threadError) throw threadError;

    // Add roles to thread
    const roleAssignments = roleIds.map(roleId => ({
      thread_id: thread.id,
      role_id: roleId
    }));

    const { error: rolesError } = await supabase
      .from('thread_roles')
      .insert(roleAssignments);

    if (rolesError) throw rolesError;

    return thread.id;
  }
}

export const createConversationStore = () => {
  return ConversationStore;
};
