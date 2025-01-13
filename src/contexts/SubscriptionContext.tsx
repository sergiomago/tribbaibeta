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
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  startSubscription: (planType: "creator" | "maestro", interval?: 'month' | 'year') => Promise<void>;
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
  });

  const checkSubscription = async () => {
    if (!session) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      setState({
        hasSubscription: data.hasSubscription,
        planType: data.planType,
        interval: data.interval || 'month',
        trialEnd: data.trialEnd,
        currentPeriodEnd: data.currentPeriodEnd,
        isLoading: false,
      });
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