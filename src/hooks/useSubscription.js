import { useState, useEffect, useCallback } from "react";
import { subscriptionsApi } from "@/api";

// Subscription status is always fetched from the backend (never localStorage),
// so trial/expiry/ads decisions are server-verified on every load.
export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await subscriptionsApi.status();
      setSubscription(res);
    } catch (e) {
      console.error("Subscription status failed", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { subscription, loading, error, refresh };
}