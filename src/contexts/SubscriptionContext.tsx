import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionCache } from "@/hooks/useSubscriptionCache";
import { useSubscriptionAPI } from "@/hooks/useSubscriptionAPI";
import { SubscriptionContextType, SubscriptionState } from "@/types/subscription";

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const initialState: SubscriptionState = {
  hasSubscription: false,
  planType: null,
  interval: null,
  trialEnd: null,
  currentPeriodEnd: null,
  isLoading: true,
  trialStarted: false,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MIN_CHECK_INTERVAL = 30 * 1000; // 30 seconds
let lastCheckTime = 0;

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<SubscriptionState>(initialState);
  const { loadCache, saveCache, clearCache } = useSubscriptionCache();
  const { checkSubscription: checkSubscriptionAPI, startTrial: startTrialAPI, startSubscription: startSubscriptionAPI } = useSubscriptionAPI();

  const checkSubscription = useCallback(async (force = false) => {
    if (!session?.user?.id) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    const now = Date.now();
    if (!force && now - lastCheckTime < MIN_CHECK_INTERVAL) {
      console.log('Skipping subscription check - too soon');
      return;
    }

    // Use cached data while fetching fresh data
    const cachedData = loadCache();
    if (cachedData) {
      setState(cachedData);
      
      // If cache is fresh enough, don't fetch
      if (!force && now - cachedData.timestamp < CACHE_DURATION) {
        console.log('Using cached subscription data');
        return;
      }
    }

    setState(s => ({ ...s, isLoading: true }));
    lastCheckTime = now;

    try {
      const data = await checkSubscriptionAPI();
      const subscriptionState = {
        hasSubscription: data.hasSubscription,
        planType: data.planType,
        interval: data.interval || null,
        trialEnd: data.trialEnd,
        currentPeriodEnd: data.currentPeriodEnd,
        isLoading: false,
        trialStarted: data.trialStarted || false,
        timestamp: Date.now(),
      };

      setState(subscriptionState);
      saveCache(subscriptionState);
    } catch (error: any) {
      // Don't clear existing state on error
      setState(s => ({ ...s, isLoading: false }));
      
      // Only show toast for non-rate-limit errors
      if (!error.message?.includes('rate limit')) {
        toast({
          variant: "destructive",
          title: "Error checking subscription",
          description: "Please try again later",
        });
      }
      console.error('Error checking subscription:', error);
    }
  }, [session, loadCache, saveCache, checkSubscriptionAPI, toast]);

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
      await startTrialAPI();
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
      const data = await startSubscriptionAPI(planType, interval);
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

  // Clear subscription data on logout
  useEffect(() => {
    if (!session) {
      clearCache();
      setState(initialState);
    }
  }, [session, clearCache]);

  // Check subscription when session changes
  useEffect(() => {
    if (session?.user?.id) {
      // Add a small delay to ensure session is fully established
      setTimeout(() => {
        checkSubscription(true);
      }, 500);
    }
  }, [session, checkSubscription]);

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
