import { useState, useEffect, useCallback } from "react";
import { businessApi } from "@/api";

// Each user has one BusinessProfile. Create a default on first access.
export function useBusinessProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const existing = await businessApi.get();
      if (existing) {
        setProfile(existing);
      } else {
        const created = await businessApi.createDefault();
        setProfile(created);
      }
    } catch (e) {
      console.error("BusinessProfile load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(async (data) => {
    if (!profile) return;
    const updated = await businessApi.update(profile.id, data);
    setProfile(updated);
    return updated;
  }, [profile]);

  return { profile, loading, update, reload: load, assistantName: profile?.assistant_name || "BizMate" };
}