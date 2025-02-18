
export interface RoleChainMember {
  role_id: string;
  order: number;
}

export interface MessageProcessor {
  supabase: any;
  threadId: string;
  content: string;
  messageId?: string;
  taggedRoleId?: string | null;
}

export interface MessageResponse {
  success: boolean;
  error?: string;
  data?: any;
}
