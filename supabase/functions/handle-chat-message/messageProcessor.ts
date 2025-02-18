
import { MessageProcessor } from "./types.ts";
import { getRoleChain } from "./responseChainManager.ts";
import { analyzeMessage } from "./messageAnalyzer.ts";
import { generateResponse } from "./responseGenerator.ts";
import { compileContext } from "./contextCompiler.ts";

export async function processMessage(processor: MessageProcessor) {
  try {
    const { supabase, threadId, content, messageId, taggedRoleId } = processor;

    // Get the chain of roles that should respond
    const chain = await getRoleChain(supabase, threadId, taggedRoleId);

    if (!chain || chain.length === 0) {
      throw new Error("No roles available to process the message");
    }

    console.log("Processing with role chain:", chain);

    // For each role in the chain
    for (const role of chain) {
      try {
        // Compile context for this role
        const context = await compileContext(supabase, {
          threadId,
          roleId: role.role_id,
          content,
          analysis: await analyzeMessage(content)
        });

        // Generate response using the compiled context
        const response = await generateResponse({
          roleId: role.role_id,
          content,
          context,
          analysis: await analyzeMessage(content)
        });

        // Store the response
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role.role_id,
            content: response,
            is_bot: true,
            response_order: role.order,
            metadata: {
              context_type: 'response',
              origin_message_id: messageId
            }
          });

        if (insertError) throw insertError;

      } catch (roleError) {
        console.error(`Error processing role ${role.role_id}:`, roleError);
        // Continue with next role even if one fails
      }
    }

    return { success: true, message: "Message processed successfully" };
  } catch (error) {
    console.error("Error in message processor:", error);
    throw error;
  }
}
