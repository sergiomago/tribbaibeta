import { UpgradeSubscriptionCard } from "@/components/subscription/UpgradeSubscriptionCard";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface MessageCounterProps {
  messageCount: number;
  maxMessages: number;
}

export function MessageCounter({ messageCount, maxMessages }: MessageCounterProps) {
  const { hasSubscription } = useSubscription();
  const showUpgradeCard = !hasSubscription && messageCount >= maxMessages;

  return (
    <>
      {showUpgradeCard && (
        <div className="p-4 border-b">
          <UpgradeSubscriptionCard 
            variant="compact" 
            showCreatorPlan={true}
            context="messages"
          />
        </div>
      )}
      <div className="text-xs text-muted-foreground text-center">
        {messageCount < maxMessages ? (
          <span>{messageCount}/{maxMessages} messages used</span>
        ) : (
          <span className="text-destructive">
            Message limit reached. {!hasSubscription && "Upgrade to send more messages."}
          </span>
        )}
      </div>
    </>
  );
}