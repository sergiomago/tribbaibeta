import { supabase } from "@/integrations/supabase/client";

interface InteractionMetrics {
  wasLeader: boolean;
  responseQualityScore: number;
  topicMatchScore: number;
  effectivenessScore: number;
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
        thread_id: threadId,
        was_leader: metrics.wasLeader,
        response_quality_score: metrics.responseQualityScore,
        topic_match_score: metrics.topicMatchScore,
        effectiveness_score: metrics.effectivenessScore,
        metadata: {
          timestamp: new Date().toISOString(),
          interaction_type: metrics.wasLeader ? 'lead_response' : 'supporting_response'
        }
      });

    // Update role effectiveness metrics
    const { data: currentMetrics } = await supabase
      .from('roles')
      .select('effectiveness_metrics')
      .eq('id', roleId)
      .single();

    if (currentMetrics) {
      const updatedMetrics = {
        topic_matches: currentMetrics.effectiveness_metrics.topic_matches + (metrics.topicMatchScore > 0.7 ? 1 : 0),
        avg_relevance_score: (
          currentMetrics.effectiveness_metrics.avg_relevance_score * 
          currentMetrics.effectiveness_metrics.successful_responses + 
          metrics.effectivenessScore
        ) / (currentMetrics.effectiveness_metrics.successful_responses + 1),
        leader_success_rate: metrics.wasLeader ? 
          (currentMetrics.effectiveness_metrics.leader_success_rate * 
           currentMetrics.effectiveness_metrics.successful_responses + 
           (metrics.responseQualityScore > 0.7 ? 1 : 0)) / 
          (currentMetrics.effectiveness_metrics.successful_responses + 1) :
          currentMetrics.effectiveness_metrics.leader_success_rate,
        successful_responses: currentMetrics.effectiveness_metrics.successful_responses + 1
      };

      await supabase
        .from('roles')
        .update({ effectiveness_metrics: updatedMetrics })
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