
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

interface ProcessedMessage {
  content: string;
  analyzedPoints: {
    keyPoints: Array<{
      topic: string;
      point: string;
      madeBy: string;
      needsInputFrom: string[];
    }>;
    requiresExpertise: string[];
    addressedPoints: string[];
  };
  topicMap: {
    mainTopic: string | null;
    subTopics: string[];
    coverage: Record<string, string[]>;
    pendingAspects: string[];
  };
  interactionContext: {
    responseRequirements: string[];
    expertiseFocus: string[];
    referencedPoints: string[];
  };
}

export async function processMessage(
  supabase: SupabaseClient,
  openai: OpenAI,
  messageId: string,
  content: string,
  roleId: string | null,
  threadId: string
): Promise<ProcessedMessage> {
  console.log('Processing message:', { messageId, roleId, threadId });

  try {
    // Get conversation context
    const { data: context, error: contextError } = await supabase
      .from('messages')
      .select(`
        content,
        analyzed_points,
        topic_map,
        interaction_context,
        role:roles (
          name,
          expertise_areas
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (contextError) throw contextError;

    // Format context for analysis
    const contextString = context?.map(msg => {
      const roleName = msg.role?.name || 'User';
      const expertise = msg.role?.expertise_areas?.join(', ');
      return `${roleName}${expertise ? ` (${expertise})` : ''}: ${msg.content}`;
    }).join('\n\n');

    // Analyze message content
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this message in the context of the conversation. Extract:
1. Key points and their topics
2. Required expertise for follow-up
3. Points being addressed
4. Main topic and subtopics
5. Current coverage of different expertise areas
6. Pending aspects that need addressing
7. Required responses and expertise focus

Previous context:
${contextString}

Provide analysis in a structured format.`
        },
        { role: 'user', content }
      ],
    });

    const analysis = completion.choices[0].message.content;
    
    // Parse the analysis into structured data
    const processedMessage = parseAnalysis(analysis);

    // Store the processed data
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        analyzed_points: processedMessage.analyzedPoints,
        topic_map: processedMessage.topicMap,
        interaction_context: processedMessage.interactionContext
      })
      .eq('id', messageId);

    if (updateError) throw updateError;

    return processedMessage;

  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

function parseAnalysis(analysis: string): ProcessedMessage {
  // Initialize default structure
  const processedMessage: ProcessedMessage = {
    content: '',
    analyzedPoints: {
      keyPoints: [],
      requiresExpertise: [],
      addressedPoints: []
    },
    topicMap: {
      mainTopic: null,
      subTopics: [],
      coverage: {},
      pendingAspects: []
    },
    interactionContext: {
      responseRequirements: [],
      expertiseFocus: [],
      referencedPoints: []
    }
  };

  try {
    // Split analysis into sections
    const sections = analysis.split('\n\n');
    
    sections.forEach(section => {
      if (section.includes('Key Points:')) {
        const points = section.split('\n').slice(1);
        points.forEach(point => {
          const [topic, content] = point.split(':').map(s => s.trim());
          processedMessage.analyzedPoints.keyPoints.push({
            topic,
            point: content,
            madeBy: 'unknown',
            needsInputFrom: []
          });
        });
      } else if (section.includes('Required Expertise:')) {
        processedMessage.analyzedPoints.requiresExpertise = section
          .split('\n')
          .slice(1)
          .map(s => s.trim());
      } else if (section.includes('Topics:')) {
        const [mainTopic, ...subTopics] = section
          .split('\n')
          .slice(1)
          .map(s => s.trim());
        processedMessage.topicMap.mainTopic = mainTopic;
        processedMessage.topicMap.subTopics = subTopics;
      }
    });

  } catch (error) {
    console.error('Error parsing analysis:', error);
  }

  return processedMessage;
}
