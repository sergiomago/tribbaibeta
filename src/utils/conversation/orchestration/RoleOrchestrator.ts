
import { supabase } from "@/integrations/supabase/client";
import { createRoleSelector } from "../../roles/selection/RoleSelector";

export class RoleOrchestrator {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    try {
      // Get thread roles
      const { data: threadRoles, error: rolesError } = await supabase
        .from('thread_roles')
        .select(`
          role:roles (
            id,
            name,
            instructions,
            tag,
            model
          )
        `)
        .eq('thread_id', this.threadId);

      if (rolesError) throw rolesError;

      // Filter roles based on tagged role if provided
      const chain = taggedRoleId 
        ? threadRoles.filter(tr => tr.role.id === taggedRoleId)
        : threadRoles;

      if (!chain.length) {
        throw new Error('No roles available to respond');
      }

      // Insert user message first
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert({
          thread_id: this.threadId,
          content: content,
          metadata: {
            sender: 'user'
          }
        });

      if (userMessageError) throw userMessageError;

      // Create placeholder messages
      for (let i = 0; i < chain.length; i++) {
        const { error: placeholderError } = await supabase
          .from('messages')
          .insert({
            thread_id: this.threadId,
            role_id: chain[i].role.id,
            content: '...',
            chain_order: i + 1,
            metadata: {
              role_name: chain[i].role.name,
              streaming: true
            }
          });

        if (placeholderError) {
          console.error('Error creating placeholder:', placeholderError);
          throw placeholderError;
        }
      }

      // Process each role in sequence
      for (let i = 0; i < chain.length; i++) {
        try {
          console.log(`Invoking edge function for role ${chain[i].role.name}`);
          const { error: fnError } = await supabase.functions.invoke(
            'handle-chat-message',
            {
              body: { 
                threadId: this.threadId, 
                content,
                role: chain[i].role,
                chain_order: i + 1
              }
            }
          );

          if (fnError) {
            console.error('Error in role response:', fnError);
            await supabase
              .from('messages')
              .update({
                content: 'Failed to generate response. Please try again.',
                metadata: {
                  error: fnError.message,
                  streaming: false
                }
              })
              .eq('thread_id', this.threadId)
              .eq('role_id', chain[i].role.id)
              .eq('chain_order', i + 1);
          }
        } catch (roleError) {
          console.error(`Error processing role ${chain[i].role.name}:`, roleError);
          await supabase
            .from('messages')
            .update({
              content: 'Failed to generate response. Please try again.',
              metadata: {
                error: roleError.message,
                streaming: false
              }
            })
            .eq('thread_id', this.threadId)
            .eq('role_id', chain[i].role.id)
            .eq('chain_order', i + 1);
        }
      }

    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
