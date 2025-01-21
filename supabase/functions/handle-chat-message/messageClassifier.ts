import { Message } from "./types.ts";

type MessageType = 'simple' | 'topical';

export function classifyMessage(content: string): MessageType {
  // Simple messages are typically greetings, acknowledgments, or very basic questions
  const simplePatterns = [
    /^(hi|hello|hey|greetings)/i,
    /^(thanks|thank you|thx)/i,
    /^(ok|okay|sure|yes|no)/i,
    /^(bye|goodbye|see you)/i,
    /^(how are you|what's up)/i
  ];

  // Check if message matches any simple patterns
  if (simplePatterns.some(pattern => pattern.test(content.trim()))) {
    return 'simple';
  }

  // If not simple, consider it topical
  return 'topical';
}

export async function findMostRelevantRole(
  supabase: any,
  threadId: string,
  content: string
) {
  // Get role with highest topic relevance
  const { data: roles } = await supabase.rpc(
    'get_best_responding_role',
    {
      p_thread_id: threadId,
      p_context: content,
      p_threshold: 0.1,
      p_max_roles: 1
    }
  );

  return roles?.[0]?.role_id || null;
}

export async function buildResponseChain(
  supabase: any,
  threadId: string,
  content: string,
  messageType: MessageType
): Promise<Array<{ roleId: string, order: number }>> {
  // Get all roles in thread
  const { data: threadRoles } = await supabase
    .from('thread_roles')
    .select('role_id')
    .eq('thread_id', threadId);

  if (!threadRoles?.length) {
    throw new Error('No roles found in thread');
  }

  if (messageType === 'simple') {
    // For simple messages, all roles respond in random order
    return threadRoles.map((tr: any, index: number) => ({
      roleId: tr.role_id,
      order: index + 1
    })).sort(() => Math.random() - 0.5);
  } else {
    // For topical messages, find most relevant role to respond first
    const primaryRoleId = await findMostRelevantRole(supabase, threadId, content);
    
    // Other roles follow in random order
    const otherRoles = threadRoles
      .filter((tr: any) => tr.role_id !== primaryRoleId)
      .map((tr: any) => tr.role_id)
      .sort(() => Math.random() - 0.5);

    return [
      { roleId: primaryRoleId, order: 1 },
      ...otherRoles.map((roleId: string, index: number) => ({
        roleId,
        order: index + 2
      }))
    ];
  }
}
