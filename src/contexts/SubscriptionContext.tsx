import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = 'subscription_status';

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

  // Load cached subscription data on mount
  useEffect(() => {
    const loadCachedSubscription = () => {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Only use cache if it's less than 1 hour old
          if (Date.now() - timestamp < 3600000) {
            setState(prevState => ({ ...prevState, ...data }));
          }
        }
      } catch (error) {
        console.error('Error loading cached subscription:', error);
      }
    };

    loadCachedSubscription();
  }, []);

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

  const checkSubscription = async () => {
    if (!session) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      const subscriptionState = {
        hasSubscription: data.hasSubscription,
        planType: data.planType,
        interval: data.interval || 'month',
        trialEnd: data.trialEnd,
        currentPeriodEnd: data.currentPeriodEnd,
        isLoading: false,
        trialStarted: data.trialStarted || false,
      };

      // Update state
      setState(subscriptionState);

      // Cache subscription data with timestamp
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: subscriptionState,
        timestamp: Date.now()
      }));

    } catch (error: any) {
      console.error('Error checking subscription:', error);
      toast({
        variant: "destructive",
        title: "Error checking subscription",
        description: error.message,
      });
      setState(s => ({ ...s, isLoading: false }));
    }
  };

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

  useEffect(() => {
    checkSubscription();
  }, [session]);

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