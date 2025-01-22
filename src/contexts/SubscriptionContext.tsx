import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = 'subscription_status';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface SubscriptionState {
  hasSubscription: boolean;
  planType: string | null;
  interval: 'month' | 'year' | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  isLoading: boolean;
  trialStarted: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  startSubscription: (planType: "creator" | "maestro", interval?: 'month' | 'year') => Promise<void>;
  startTrial: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<SubscriptionState>({
    hasSubscription: false,
    planType: null,
    interval: null,
    trialEnd: null,
    currentPeriodEnd: null,
    isLoading: true,
    trialStarted: false,
  });

  const loadCachedSubscription = useCallback(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setState(prevState => ({ ...prevState, ...data }));
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading cached subscription:', error);
    }
    return false;
  }, []);

  const checkSubscriptionWithRetry = useCallback(async (retryCount = 0): Promise<void> => {
    if (!session?.user?.id) {
      console.log('No valid session for subscription check');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      const subscriptionState = {
        hasSubscription: data.hasSubscription,
        planType: data.planType,
        interval: data.interval || null,
        trialEnd: data.trialEnd,
        currentPeriodEnd: data.currentPeriodEnd,
        isLoading: false,
        trialStarted: data.trialStarted || false,
      };

      setState(subscriptionState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: subscriptionState,
        timestamp: Date.now()
      }));

    } catch (error: any) {
      console.error('Error checking subscription:', error);
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying subscription check (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => {
          checkSubscriptionWithRetry(retryCount + 1);
        }, RETRY_DELAY * (retryCount + 1));
      } else {
        toast({
          variant: "destructive",
          title: "Error checking subscription",
          description: "Please try refreshing the page",
        });
        // Keep existing subscription state on error instead of defaulting to free
        setState(s => ({ ...s, isLoading: false }));
      }
    }
  }, [session, toast]);

  const checkSubscription = useCallback(async () => {
    if (!session?.user?.id) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    // Use cached data while fetching fresh data
    const hasCachedData = loadCachedSubscription();
    if (!hasCachedData) {
      setState(s => ({ ...s, isLoading: true }));
    }

    // Add a small delay to ensure session is fully established
    setTimeout(() => {
      checkSubscriptionWithRetry();
    }, 500);
  }, [session, loadCachedSubscription, checkSubscriptionWithRetry]);

  // Clear subscription data on logout
  useEffect(() => {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY);
      setState({
        hasSubscription: false,
        planType: null,
        interval: null,
        trialEnd: null,
        currentPeriodEnd: null,
        isLoading: false,
        trialStarted: false,
      });
    }
  }, [session]);

  // Check subscription when session changes
  useEffect(() => {
    if (session?.user?.id) {
      checkSubscription();
    }
  }, [session, checkSubscription]);

  const startTrial = async () => {
    if (!session) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to start a trial.",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('start-trial');
      
      if (error) throw error;
      
      await checkSubscription();
      
      toast({
        title: "Trial started",
        description: "Your 7-day trial has begun!",
      });
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast({
        variant: "destructive",
        title: "Error starting trial",
        description: error.message,
      });
    }
  };

  const startSubscription = async (planType: "creator" | "maestro", interval: 'month' | 'year' = 'month') => {
    if (!session) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to start a subscription.",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planType, interval },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error starting subscription:', error);
      toast({
        variant: "destructive",
        title: "Error starting subscription",
        description: error.message,
      });
    }
  };

  return (
    <SubscriptionContext.Provider 
      value={{
        ...state,
        checkSubscription,
        startSubscription,
        startTrial,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
