import { useState, useEffect, useCallback } from "react";
import { automationApi } from "@/api";

// Each user has one AutomationSetting record. Create defaults on first access.
const DEFAULTS = {
  facebook_comment_reply: false,
  messenger_ai_assistant: false,
  product_qa: false,
  customer_info_collection: false,
  order_confirmation: true,
  followup_12h: false,
};

export function useAutomationSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await automationApi.getSettings();
      if (list && list.length > 0) {
        setSettings({ ...DEFAULTS, ...list[0] });
      } else {
        const created = await automationApi.createSettings({ ...DEFAULTS });
        setSettings({ ...DEFAULTS, ...created });
      }
    } catch (e) {
      console.error("AutomationSettings load failed", e);
      setError(true);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(async (data) => {
    if (!settings?.id) {
      const created = await automationApi.createSettings({ ...DEFAULTS, ...data });
      setSettings({ ...DEFAULTS, ...created });
      return created;
    }
    const updated = await automationApi.saveSettings(settings.id, data);
    setSettings({ ...DEFAULTS, ...updated });
    return updated;
  }, [settings]);

  return { settings, loading, error, update, reload: load };
}