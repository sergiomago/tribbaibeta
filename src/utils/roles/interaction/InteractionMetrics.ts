import { supabase } from "@/integrations/supabase/client";

interface InteractionMetrics {
  wasLeader: boolean;
  responseQualityScore: number;
  topicMatchScore: number;
  effectivenessScore: number;
}

interface EffectivenessMetrics {
  topic_matches: number;
  avg_relevance_score: number;
  leader_success_rate: number;
  successful_responses: number;
}

export async function updateRoleInteractionMetrics(
  roleId: string,
  threadId: string,
  metrics: InteractionMetrics
) {
  try {
    // Update role_interactions table
    await supabase
      .from('role_interactions')
      .insert({
        initiator_role_id: roleId,
        responder_role_id: roleId, // Self-interaction for now
        thread_id: threadId,
        was_leader: metrics.wasLeader,
        response_quality_score: metrics.responseQualityScore,
        topic_match_score: metrics.topicMatchScore,
        effectiveness_score: metrics.effectivenessScore,
        interaction_type: metrics.wasLeader ? 'lead_response' : 'support_response',
        metadata: {
          timestamp: new Date().toISOString(),
          interaction_type: metrics.wasLeader ? 'lead_response' : 'supporting_response'
        }
      });

    // Get current metrics
    const { data: currentMetrics } = await supabase
      .from('roles')
      .select('effectiveness_metrics')
      .eq('id', roleId)
      .single();

    if (currentMetrics?.effectiveness_metrics) {
      const current = currentMetrics.effectiveness_metrics as EffectivenessMetrics;
      
      const updatedMetrics = {
        topic_matches: current.topic_matches + (metrics.topicMatchScore > 0.7 ? 1 : 0),
        avg_relevance_score: (
          current.avg_relevance_score * 
          current.successful_responses + 
          metrics.effectivenessScore
        ) / (current.successful_responses + 1),
        leader_success_rate: metrics.wasLeader ? 
          (current.leader_success_rate * 
           current.successful_responses + 
           (metrics.responseQualityScore > 0.7 ? 1 : 0)) / 
          (current.successful_responses + 1) :
          current.leader_success_rate,
        successful_responses: current.successful_responses + 1
      };

      await supabase
        .from('roles')
        .update({ 
          effectiveness_metrics: updatedMetrics as unknown as Json 
        })
        .eq('id', roleId);
    }
  } catch (error) {
    console.error('Error updating role interaction metrics:', error);
    throw error;
  }
}

export async function getRoleEffectiveness(roleId: string, threadId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('role_interactions')
      .select('response_quality_score, topic_match_score')
      .eq('initiator_role_id', roleId)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) return 0.5; // Default score for new roles

    const avgQualityScore = data.reduce((sum, interaction) => 
      sum + interaction.response_quality_score, 0) / data.length;
    
    const avgTopicScore = data.reduce((sum, interaction) => 
      sum + interaction.topic_match_score, 0) / data.length;

    return (avgQualityScore * 0.6 + avgTopicScore * 0.4);
  } catch (error) {
    console.error('Error getting role effectiveness:', error);
    throw error;
  }
}