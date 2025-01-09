import OpenAI from "https://esm.sh/openai@4.28.0";
import { Role } from "./types.ts";

export class OpenAIManager {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ 
      apiKey,
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'
      }
    });
  }

  async createThread(): Promise<string> {
    const thread = await this.openai.beta.threads.create();
    return thread.id;
  }

  async addMessageToThread(
    threadId: string,
    content: string,
    metadata: Record<string, unknown>
  ) {
    console.log('Adding message to thread:', { threadId, content });
    return await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content,
      metadata
    });
  }

  async runAssistant(threadId: string, role: Role, memoryContext: string) {
    if (!role.assistant_id) {
      throw new Error('No assistant ID configured for role');
    }

    console.log('Running assistant:', { threadId, roleId: role.id, assistantId: role.assistant_id });
    
    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: role.assistant_id,
      instructions: `${role.instructions}\n\n${memoryContext}`
    });

    console.log('Run created:', run.id);

    let runStatus = await this.openai.beta.threads.runs.retrieve(
      threadId,
      run.id
    );

    while (!['completed', 'failed', 'cancelled', 'expired'].includes(runStatus.status)) {
      console.log('Run status:', runStatus.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(
        threadId,
        run.id
      );
    }

    if (runStatus.status !== 'completed') {
      console.error('Run failed:', runStatus);
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    console.log('Run completed, retrieving messages');

    const messages = await this.openai.beta.threads.messages.list(
      threadId,
      { order: 'desc', limit: 1 }
    );

    return messages.data[0];
  }
}