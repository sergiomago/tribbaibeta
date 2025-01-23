import { createRoleOrchestrator } from "@/utils/conversation/orchestration/RoleOrchestrator";
import { useToast } from "@/hooks/use-toast";

interface MessageSenderProps {
  threadId: string;
  onMessageSent?: () => void;
}

export function useMessageSender({ threadId, onMessageSent }: MessageSenderProps) {
  const { toast } = useToast();

  const sendMessage = async (message: string, taggedRole?: string) => {
    try {
      const orchestrator = createRoleOrchestrator(threadId);
      await orchestrator.handleMessage(message, taggedRole);
      onMessageSent?.();
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { sendMessage };
}