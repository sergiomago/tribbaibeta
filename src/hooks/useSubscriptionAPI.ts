import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useSubscriptionAPI = () => {
  const { toast } = useToast();

  const checkSubscription = async (retryCount = 0) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      
      // Only retry on rate limit errors
      if (error.message?.includes('rate limit') && retryCount < MAX_RETRIES) {
        console.log(`Retrying subscription check (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return checkSubscription(retryCount + 1);
      }
      
      throw error;
    }
  };

  const startTrial = async () => {
    const { error } = await supabase.functions.invoke('start-trial');
    if (error) throw error;
    return true;
  };

  const startSubscription = async (planType: "creator" | "maestro", interval: 'month' | 'year' = 'month') => {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { planType, interval },
    });
    
    if (error) throw error;
    return data;
  };

  return {
    checkSubscription,
    startTrial,
    startSubscription,
  };
};