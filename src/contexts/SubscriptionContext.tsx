import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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

const SUBSCRIPTION_STORAGE_KEY = 'app_subscription_state';
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<SubscriptionState>(() => {
    // Try to restore state from localStorage
    const savedState = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    return savedState ? JSON.parse(savedState) : {
      hasSubscription: false,
      planType: null,
      interval: null,
      trialEnd: null,
      currentPeriodEnd: null,
      isLoading: true,
      trialStarted: false,
    };
  });

  const checkSubscription = async () => {
    try {
      // Only check subscription if we have a session
      if (!session?.user?.id) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      console.log("Checking subscription status for user:", session.user.id);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        // Don't clear existing subscription state on error
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const newState = {
        hasSubscription: data.hasSubscription,
        planType: data.planType,
        interval: data.interval || 'month',
        trialEnd: data.trialEnd,
        currentPeriodEnd: data.currentPeriodEnd,
        isLoading: false,
        trialStarted: data.trialStarted || false,
      };

      // Save to localStorage for persistence
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(newState));
      setState(newState);
      
      console.log("Subscription status updated:", newState);
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      toast({
        variant: "destructive",
        title: "Error checking subscription",
        description: error.message,
      });
      setState(prev => ({ ...prev, isLoading: false }));
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

  // Check subscription on mount and when session changes
  useEffect(() => {
    if (session?.user?.id) {
      checkSubscription();
    } else {
      // Clear subscription state when logged out
      const defaultState = {
        hasSubscription: false,
        planType: null,
        interval: null,
        trialEnd: null,
        currentPeriodEnd: null,
        isLoading: false,
        trialStarted: false,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(defaultState));
      setState(defaultState);
    }
  }, [session?.user?.id]);

  // Periodic subscription check
  useEffect(() => {
    if (!session?.user?.id) return;

    const intervalId = setInterval(checkSubscription, SUBSCRIPTION_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, [session?.user?.id]);

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