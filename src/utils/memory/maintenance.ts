import { MemoryMetadata, JsonMetadata } from './types';
import { supabase } from '@/integrations/supabase/client';

export async function updateMemoryMetadata(
  memoryId: string,
  metadata: MemoryMetadata
): Promise<void> {
  try {
    const { error } = await supabase
      .from('role_memories')
      .update({
        metadata: metadata as JsonMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', memoryId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating memory metadata:', error);
    throw error;
  }
}

export async function deleteMemory(memoryId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('role_memories')
      .delete()
      .eq('id', memoryId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
}

export async function clearOldMemories(roleId: string, thresholdDate: Date): Promise<void> {
  try {
    const { error } = await supabase
      .from('role_memories')
      .delete()
      .eq('role_id', roleId)
      .lt('created_at', thresholdDate.toISOString());

    if (error) throw error;
  } catch (error) {
    console.error('Error clearing old memories:', error);
    throw error;
  }
}