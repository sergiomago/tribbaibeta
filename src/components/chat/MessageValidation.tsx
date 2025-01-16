import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MessageValidationProps {
  threadId: string;
  messageCount: number;
  maxMessages: number;
  children: React.ReactNode;
}

export function MessageValidation({ threadId, messageCount, maxMessages, children }: MessageValidationProps) {
  const { toast } = useToast();
  const { hasSubscription } = useSubscription();

  // Query to check if thread has roles
  const { data: threadRoles } = useQuery({
    queryKey: ["thread-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("thread_roles")
        .select(`
          role:roles (*)
        `)
        .eq("thread_id", threadId);
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const validateMessage = async (message: string) => {
    if (!message.trim()) return false;

    if (!threadRoles?.length) {
      toast({
        title: "No roles assigned",
        description: "Please add at least one role to the chat before sending messages.",
        variant: "destructive",
      });
      return false;
    }

    if (messageCount >= maxMessages) {
      toast({
        title: "Message limit reached",
        description: hasSubscription 
          ? "You've reached the message limit for this thread."
          : "Upgrade to send more messages in this thread.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  return children;
}