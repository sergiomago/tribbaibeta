export interface Message {
  id: string;
  thread_id: string;
  content: string;
  role_id?: string;
  tagged_role_id?: string | null;
  chain_id?: string;
  chain_order?: number;
}

export interface ResponseChain {
  roleId: string;
  chainOrder: number;
}

export interface Role {
  id: string;
  name: string;
  instructions: string;
  model: string;
  special_capabilities?: string[];
}