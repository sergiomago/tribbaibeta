
import { supabase } from "@/lib/supabase";
import { memoryService } from "./memory-service";
import { Role } from "@/types/role";

// Define the shape of a role in the response
type RoleResponse = {
  id: string;
  name: string;
  tag: string;
  instructions: string;
  special_capabilities: string[];
}

// Define the shape of the thread role response
type ThreadRoleResponse = {
  role: RoleResponse;
}

export async function handleChatMessage(threadId: string, content: string, messageId: string, taggedRoleId?: string | null) {
  try {
    // Get roles in the thread with proper type assertion
    const { data: threadRoles, error: rolesError } = await supabase
      .from('thread_roles')
      .select(`
        role:roles (
          id,
          name,
          tag,
          instructions,
          special_capabilities
        )
      `)
      .eq('thread_id', threadId);

    if (rolesError) throw rolesError;

    // If no roles are assigned, return early
    if (!threadRoles || threadRoles.length === 0) {
      return {
        error: 'No roles assigned to this thread'
      };
    }

    // Cast the threadRoles to the correct type and extract the roles
    const roles = (threadRoles as ThreadRoleResponse[]).map(tr => tr.role);
    const roleIds = roles.map(role => role.id);

    // Get conversation context
    const context = await memoryService.getConversationContext(threadId, roleIds);

    // Process message based on whether a role was tagged
    if (taggedRoleId) {
      // Handle tagged role response
      const taggedRole = roles.find(role => role.id === taggedRoleId);
      if (!taggedRole) {
        throw new Error('Tagged role not found in thread');
      }

      await processRoleResponse(threadId, taggedRole, content, context, messageId);
    } else {
      // Handle orchestrated responses
      for (const role of roles) {
        await processRoleResponse(threadId, role, content, context, messageId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in handleChatMessage:', error);
    return { error: error.message };
  }
}

async function processRoleResponse(
  threadId: string,
  role: RoleResponse,
  content: string,
  context: any,
  messageId: string
) {
  try {
    // Store role's response
    const { error: responseError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: role.id,
        content: `As ${role.name}: ${content}`,
        is_bot: true,
        metadata: {
          context_type: 'conversation',
          role_response: true
        },
        response_to_id: messageId
      });

    if (responseError) throw responseError;

  } catch (error) {
    console.error(`Error processing response for role ${role.name}:`, error);
    throw error;
  }
}
