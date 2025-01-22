import { SubscriptionState } from "@/types";

const STORAGE_KEY = 'subscription_status';

export const useSubscriptionCache = () => {
  const loadCache = (): (SubscriptionState & { timestamp: number }) | null => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading cached subscription:', error);
    }
    return null;
  };

  const saveCache = (data: SubscriptionState & { timestamp: number }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving subscription cache:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { loadCache, saveCache, clearCache };
};