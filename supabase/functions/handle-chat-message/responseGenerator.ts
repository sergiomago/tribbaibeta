import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function generateRoleResponse(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  memories: any[],
  openai: OpenAI
) {
  // Get role details with capabilities and metrics
  const { data: role } = await supabase
    .from('roles')
    .select(`
      *,
      effectiveness_metrics,
      thread_roles!inner(*)
    `)
    .eq('id', roleId)
    .eq('thread_roles.thread_id', threadId)
    .single();

  if (!role) throw new Error(`Role ${roleId} not found`);

  // Get conversation state to determine role position
  const { data: convState } = await supabase
    .from('conversation_states')
    .select('current_leader_role_id, topic_context')
    .eq('thread_id', threadId)
    .single();

  const isLeader = convState?.current_leader_role_id === roleId;

  // Get recent conversation context
  const { data: previousMessages } = await supabase
    .from('messages')
    .select(`
      content,
      role:roles (
        name,
        tag,
        special_capabilities
      ),
      chain_order,
      created_at,
      metadata
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Build rich conversation context
  const conversationContext = previousMessages
    ?.map(msg => {
      const roleInfo = msg.role?.name ? 
        `${msg.role.name} (${msg.role.tag})${
          msg.role.special_capabilities?.length ? 
          ` with capabilities: ${msg.role.special_capabilities.join(', ')}` : 
          ''
        }` : 
        'User';
      return `${roleInfo}: ${msg.content}`;
    })
    .reverse()
    .join('\n');

  // Process memories for relevant context
  const memoryContext = memories?.length 
    ? `Relevant context from your memory:\n${memories
        .map(m => `[Relevance: ${m.similarity.toFixed(2)}] ${m.content}`)
        .join('\n\n')}`
    : '';

  // Build role-specific system prompt
  let systemPrompt = `${role.instructions}\n\n`;
  
  // Add role position context
  if (isLeader) {
    systemPrompt += `You are the lead responder in this conversation. 
Your role is to:
- Provide comprehensive responses
- Guide the conversation direction
- Ensure topic continuity
- Consider and build upon previous context\n\n`;
  } else {
    systemPrompt += `You are a supporting responder in this conversation. 
Your role is to:
- Add unique insights not covered by previous responses
- Complement the leader's perspective
- Stay focused on your specific expertise
- Maintain conversation coherence\n\n`;
  }

  // Add capability-specific instructions
  if (role.special_capabilities?.length) {
    systemPrompt += 'Your special capabilities:\n';
    role.special_capabilities.forEach((capability: string) => {
      systemPrompt += `- You can use ${capability}\n`;
    });
  }

  // Add context sections
  systemPrompt += `\n${memoryContext}\n\nRecent conversation:\n${conversationContext}`;

  // Generate response
  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage.content }
    ],
  });

  const responseContent = completion.choices[0].message.content;

  // Calculate response quality metrics
  const topicRelevance = calculateTopicRelevance(
    responseContent,
    convState?.topic_context?.current_topic || ''
  );

  const responseQuality = assessResponseQuality(
    responseContent,
    isLeader,
    previousMessages || []
  );

  // Save response with enhanced metadata
  const { data: savedMessage } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      role_id: roleId,
      content: responseContent,
      chain_id: userMessage.id,
      metadata: {
        response_type: isLeader ? 'lead_response' : 'supporting_response',
        topic_relevance: topicRelevance,
        response_quality: responseQuality,
        used_memories: memories?.map(m => m.id),
        timestamp: new Date().toISOString()
      }
    })
    .select()
    .single();

  // Record interaction with enhanced metrics
  await recordInteraction(
    supabase, 
    threadId, 
    roleId, 
    userMessage.tagged_role_id,
    isLeader,
    topicRelevance,
    responseQuality
  );

  // Update role effectiveness metrics
  await updateRoleEffectiveness(
    supabase,
    roleId,
    topicRelevance,
    responseQuality,
    isLeader
  );

  return { savedMessage, role };
}

function calculateTopicRelevance(response: string, currentTopic: string): number {
  if (!currentTopic) return 0.5;
  // Simple keyword matching for now - can be enhanced with embeddings
  const topicKeywords = currentTopic.toLowerCase().split(' ');
  const responseWords = response.toLowerCase().split(' ');
  
  const matchCount = topicKeywords.filter(keyword => 
    responseWords.includes(keyword)
  ).length;
  
  return Math.min(matchCount / topicKeywords.length, 1);
}

function assessResponseQuality(
  response: string,
  isLeader: boolean,
  previousMessages: any[]
): number {
  let score = 0;
  
  // Length appropriateness (0.2 weight)
  const wordCount = response.split(' ').length;
  score += 0.2 * (
    wordCount > 50 && wordCount < 200 ? 1 :
    wordCount > 30 && wordCount < 300 ? 0.7 :
    0.3
  );

  // Context utilization (0.3 weight)
  if (previousMessages.length) {
    const contextKeywords = previousMessages
      .map(m => m.content.toLowerCase().split(' '))
      .flat();
    const responseWords = response.toLowerCase().split(' ');
    const contextUtilization = responseWords
      .filter(word => contextKeywords.includes(word)).length / responseWords.length;
    score += 0.3 * Math.min(contextUtilization * 2, 1);
  } else {
    score += 0.3; // No context to utilize
  }

  // Role alignment (0.5 weight)
  if (isLeader) {
    // Leader criteria: comprehensive and directive
    score += 0.5 * (
      (response.includes('?') ? 0.2 : 0) +
      (wordCount > 100 ? 0.3 : 0.1) +
      (response.toLowerCase().includes('let') || 
       response.toLowerCase().includes('should') ? 0.3 : 0) +
      (previousMessages.length === 0 ? 0.2 : 0)
    );
  } else {
    // Supporter criteria: complementary and focused
    score += 0.5 * (
      (wordCount < 150 ? 0.3 : 0.1) +
      (response.includes('also') || 
       response.includes('additionally') ? 0.3 : 0.1) +
      (response.includes('specifically') || 
       response.includes('particular') ? 0.2 : 0) +
      (previousMessages.length > 0 ? 0.2 : 0)
    );
  }

  return Math.min(Math.max(score, 0), 1);
}

async function recordInteraction(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  taggedRoleId: string | null,
  wasLeader: boolean,
  topicMatchScore: number,
  responseQualityScore: number
) {
  await supabase
    .from('role_interactions')
    .insert({
      thread_id: threadId,
      initiator_role_id: roleId,
      responder_role_id: taggedRoleId || roleId,
      interaction_type: wasLeader ? 'lead_response' : 'supporting_response',
      was_leader: wasLeader,
      topic_match_score: topicMatchScore,
      response_quality_score: responseQualityScore,
      metadata: {
        interaction_context: {
          timestamp: new Date().toISOString(),
          role_position: wasLeader ? 'leader' : 'supporter'
        }
      }
    });
}

async function updateRoleEffectiveness(
  supabase: SupabaseClient,
  roleId: string,
  topicMatchScore: number,
  responseQualityScore: number,
  wasLeader: boolean
) {
  const { data: role } = await supabase
    .from('roles')
    .select('effectiveness_metrics')
    .eq('id', roleId)
    .single();

  const currentMetrics = role?.effectiveness_metrics || {
    topic_matches: 0,
    avg_relevance_score: 0,
    leader_success_rate: 0,
    successful_responses: 0
  };

  const updatedMetrics = {
    topic_matches: currentMetrics.topic_matches + (topicMatchScore > 0.7 ? 1 : 0),
    avg_relevance_score: (
      currentMetrics.avg_relevance_score * currentMetrics.successful_responses + 
      topicMatchScore
    ) / (currentMetrics.successful_responses + 1),
    leader_success_rate: wasLeader ? 
      (currentMetrics.leader_success_rate * currentMetrics.successful_responses + 
       (responseQualityScore > 0.7 ? 1 : 0)) / 
      (currentMetrics.successful_responses + 1) :
      currentMetrics.leader_success_rate,
    successful_responses: currentMetrics.successful_responses + 1
  };

  await supabase
    .from('roles')
    .update({ effectiveness_metrics: updatedMetrics })
    .eq('id', roleId);
}