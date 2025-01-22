import { SubscriptionState } from "@/types";

const STORAGE_KEY = 'subscription_status';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export const useSubscriptionCache = () => {
  const loadCache = (): SubscriptionState | null => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error loading cached subscription:', error);
    }
    return null;
  };

  const saveCache = (data: SubscriptionState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving subscription cache:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { loadCache, saveCache, clearCache };
};