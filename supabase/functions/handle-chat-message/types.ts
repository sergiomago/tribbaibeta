export interface ResponseChain {
  roleId: string;
  chainOrder: number;
}

export interface RoleResponse {
  roleId: string;
  content?: string;
  error?: string;
}