
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY');

export async function buildMemoryContext(
  supabase: SupabaseClient,
  openai: OpenAI,
  threadId: string,
  roleId: string,
  content: string,
  mindId: string
): Promise<{ systemContext: string; enrichedMessage: string }> {
  try {
    // Get relevant memories from both sources
    const [dbMemories, llongtermMemories] = await Promise.all([
      // Get local memories from database
      supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', roleId)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Get memories from Llongterm
      fetch(`https://api.llongterm.com/v1/minds/${mindId}/memories/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llongtermApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: content,
          limit: 5,
          metadata: {
            threadId
          }
        })
      }).then(res => res.json()).catch(err => {
        console.error('Error fetching Llongterm memories:', err);
        return { memories: [] };
      })
    ]);

    // Format local memories
    const localMemoryContext = dbMemories.data?.map(memory => 
      `Previous interaction (${new Date(memory.created_at).toLocaleDateString()}):
      ${memory.content}`
    ).join('\n\n') || '';

    // Format Llongterm memories
    const llongtermMemoryContext = llongtermMemories.memories?.map((memory: any) =>
      `Long-term memory (${new Date(memory.metadata.timestamp).toLocaleDateString()}):
      ${memory.content}`
    ).join('\n\n') || '';

    // Get conversation depth
    const { data: depth } = await supabase.rpc(
      'get_conversation_depth',
      { 
        p_thread_id: threadId,
        p_role_id: roleId
      }
    );

    // Build enriched context
    const enrichedMessage = `
Current conversation depth: ${depth || 1}

${localMemoryContext ? `Recent memories:\n${localMemoryContext}\n\n` : ''}
${llongtermMemoryContext ? `Long-term context:\n${llongtermMemoryContext}\n\n` : ''}

Current user message:
${content}`;

    // Build system context
    const systemContext = `
You have access to both recent and long-term memories from previous interactions.
Use these memories to:
1. Maintain consistency in your responses
2. Reference previous conversations when relevant
3. Build upon established context
4. Avoid repeating yourself
5. Learn from past interactions to provide better responses`;

    return {
      systemContext,
      enrichedMessage
    };
  } catch (error) {
    console.error('Error building memory context:', error);
    return {
      systemContext: '',
      enrichedMessage: content
    };
  }
}
