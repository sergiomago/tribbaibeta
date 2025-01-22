export interface SubscriptionState {
  hasSubscription: boolean;
  planType: string | null;
  interval: 'month' | 'year' | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  isLoading: boolean;
  trialStarted: boolean;
}

export interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  startSubscription: (planType: "creator" | "maestro", interval?: 'month' | 'year') => Promise<void>;
  startTrial: () => Promise<void>;
}