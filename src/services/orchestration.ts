import { supabase } from './supabase';
import { generateRoleResponse } from './openai';
import { MemoryService } from './memory-service';
import { generateEmbedding } from './embedding-generator';
import type { AI_Role, Message } from '../types/database';

export class Orchestrator {
  static async handleMessage(message: Message) {
    try {
      console.log('Handling message for conversation:', message.conversation_id);
      console.log('Message content:', message.content);

      // First, store the message with initial state
      const { data: storedMessage, error: storeError } = await supabase
        .from('messages')
        .insert({
          conversation_id: message.conversation_id,
          content: message.content,
          current_state: 'pending_processing',
          is_ai: false
        })
        .select()
        .single();

      if (storeError) {
        console.error('Failed to store user message in the database. Error details:', storeError);
        return;
      }

      // Get context and roles
      const context = await this.getFullContext(message.conversation_id);
      console.log('Full context:', context);

      const roles = await this.getRelevantRoles(message);
      console.log('Retrieved roles:', roles);

      if (roles.length === 0) {
        console.warn('No roles found for the message. Unable to generate a response.');
        return;
      }

      // Generate responses from each role
      const responses = await Promise.all(
        roles.map(async (role) => {
          console.log('Generating response for role:', role);
          const response = await generateRoleResponse(role, message.content, context);
          return {
            conversation_id: message.conversation_id,
            content: response,
            role_id: role.id,
            current_state: 'completed',
            is_ai: true,
            reply_to_message_id: storedMessage.id
          };
        })
      );

      console.log('Generated responses:', responses);
      
      // Store all responses
      const { error: responsesError } = await supabase
        .from('messages')
        .insert(responses);

      if (responsesError) {
        console.error('Failed to store generated responses in the database. Error details:', responsesError);
      }

      // Update original message state to completed
      const { error: updateError } = await supabase
        .from('messages')
        .update({ current_state: 'completed' })
        .eq('id', storedMessage.id);

      if (updateError) {
        console.error('Failed to update message state for the user message. Error details:', updateError);
      }

    } catch (error) {
      console.error('An unexpected error occurred while processing the message. Error details:', error);
    }
  }

  private static async getContext(conversationId: string): Promise<string[]> {
    const { data } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(5);
    return data?.map(m => m.content) || [];
  }

  private static async getFullContext(conversationId: string): Promise<string[]> {
    const supabaseContext = await this.getContext(conversationId);
    const memoryContext = await MemoryService.getConversationContext(conversationId);
    return [...memoryContext, ...supabaseContext];
  }

  private static async getRelevantRoles(message: Message): Promise<AI_Role[]> {
    console.log(`Fetching roles for conversation: ${message.conversation_id}`);

    // Directly query the thread_roles table
    const { data: threadRoles, error: trError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', message.conversation_id);

    if (trError) {
      console.error('Error fetching thread roles:', trError);
      return [];
    }

    if (!threadRoles || threadRoles.length === 0) {
      console.warn(`No thread roles found for conversation ${message.conversation_id}`);
      return [];
    }

    console.log('Thread roles received:', threadRoles);

    // Extract role IDs and fetch full role details from 'roles' table
    const roleIds = threadRoles.map((row: any) => row.role_id);
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .in('id', roleIds);

    if (rolesError) {
      console.error('Error fetching role details:', rolesError);
      return [];
    }

    console.log('Role details received:', rolesData);

    // Clear and explicit error message if no valid roles found
    if (!rolesData || rolesData.length === 0) {
      console.warn(`No valid role details found for role IDs: ${roleIds.join(', ')}`);
      return [];
    }

    return rolesData;
  }

  private static async storeResponses(conversationId: string, responses: string[]) {
    const messages = responses.map(content => ({
      conversation_id: conversationId,
      content,
      is_ai: true
    }));

    const { data, error } = await supabase
      .from('messages')
      .insert(messages);

    if (error) {
      console.error('Error storing responses:', error);
    } else {
      console.log('Responses stored successfully:', data);
    }
  }
}
