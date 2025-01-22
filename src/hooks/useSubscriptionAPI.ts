import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CACHE_KEY = 'subscription_status';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MIN_CHECK_INTERVAL = 30 * 1000; // 30 seconds
let lastCheckTime = 0;

export const useSubscriptionAPI = () => {
  const { toast } = useToast();

  const loadCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error loading subscription cache:', error);
    }
    return null;
  };

  const saveCache = (data: any) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving subscription cache:', error);
    }
  };

  const checkSubscription = async (retryCount = 0) => {
    const now = Date.now();
    
    // Use cached data if available and fresh
    const cached = loadCache();
    if (cached && now - lastCheckTime < MIN_CHECK_INTERVAL) {
      console.log('Using cached subscription data');
      return cached;
    }

    try {
      lastCheckTime = now;
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        // Don't show toast for rate limit errors
        if (!error.message?.includes('rate limit')) {
          toast({
            title: "Error checking subscription",
            description: "Please try again later",
            variant: "destructive",
          });
        }
        throw error;
      }

      // Cache successful response
      saveCache(data);
      return data;
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      
      // Return cached data if available during error
      if (cached) {
        console.log('Using cached data during error');
        return cached;
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