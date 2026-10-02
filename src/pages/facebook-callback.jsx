import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { integrationsApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/EmptyState";
import { Facebook, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function FacebookCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  // Guard against double-fire (React re-renders, StrictMode, or hot reload)
  // which would exchange the same OAuth code twice and cause a 400 "code
  // already used" error on the second attempt.
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const returnedState = urlParams.get("state");
    const savedState = localStorage.getItem("fb_state");
    const fbError = urlParams.get("error");

    if (returnedState && savedState && returnedState !== savedState) {
      console.warn("Facebook callback: state mismatch (possible CSRF). Continuing anyway.", { returnedState, savedState });
    }

    if (fbError) {
      const desc = (urlParams.get("error_description") || "").toLowerCase();
      let friendlyMsg = "We couldn't complete the Facebook connection. Please try again.";
      if (fbError === "access_denied" || desc.includes("cancel")) {
        friendlyMsg = "Facebook connection was cancelled.";
      } else if (desc.includes("permission") || desc.includes("authorize")) {
        friendlyMsg = "Your Facebook account does not have permission to connect this Page.";
      }
      setError(friendlyMsg);
      setLoading(false);
      return;
    }

    if (!code) {
      setError("No authorization code received from Facebook.");
      setLoading(false);
      return;
    }

    // Idempotency lock (survives reload/back-forward within the tab): if this
    // OAuth code was already processed, do NOT re-exchange it — Meta rejects a
    // reused code with "authorization code has been used" (36009). The backend
    // also guards this (returns the stored token's pages without re-exchange).
    const lockKey = `fb_code_processed_${code}`;
    if (sessionStorage.getItem(lockKey)) {
      console.log("Facebook callback: code already processed — skipping exchange");
      navigate("/facebook-connection");
      return;
    }
    sessionStorage.setItem(lockKey, "1");

    // Pass the OAuth `state` parameter to the backend so it can validate
    // it matches the authenticated user's ID (CSRF protection).
    integrationsApi
      .facebook({
        action: "exchange",
        code
      })
      .then((data) => {
        if (data.pages && data.pages.length > 0) {
          setPages(data.pages);
          if (data.pages.length === 1) {
            // Auto-connect if only one page
            handleConnect(data.pages[0].id);
          } else {
            setLoading(false);
          }
        } else {
          const debug = data.accounts_debug ? JSON.stringify(data.accounts_debug, null, 2) : "";
          setError("No eligible Page found. Please ensure:\n1. You are ADMIN of the Facebook Page\n2. You allowed all permissions\n3. Your Page is published\nTry login with FB account that is direct Admin of Page, not via Business Manager.\n\nAccounts response:\n" + debug);
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err?.message || "Facebook connection failed. Please try again.");
        setLoading(false);
      });
  }, []);

  const handleConnect = async (pageId) => {
    setConnecting(true);
    setError("");
    try {
      await integrationsApi.facebook({
        action: "connect",
        page_id: pageId
      });
      // If this callback opened as a popup tab (from an iframe context),
      // notify the opener window and close this tab.
      if (window.opener) {
        window.opener.postMessage("facebook_connected", "*");
        window.close();
      } else {
        navigate("/facebook-connection");
      }
    } catch (err) {
      setError(err?.message || "Connection failed. Please try again.");
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Facebook Connect" subtitle="Select your Page" />
      <div className="px-4 pt-4 pb-4">
        {loading && !error && (
          <LoadingState label="Connecting to Facebook…" />
        )}

        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">Connection Failed</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">{error}</p>
            <Button variant="outline" className="border-border" onClick={() => navigate("/facebook-connection")}>
              Back to Facebook Settings
            </Button>
          </div>
        )}

        {!loading && !error && pages.length > 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-success/5 border border-success/30 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Authorization Successful</p>
                <p className="text-xs text-muted-foreground">Select the Facebook Page you want to connect</p>
              </div>
            </div>

            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleConnect(page.id)}
                  disabled={connecting}
                  className="w-full rounded-2xl bg-card border border-border p-4 flex items-center gap-3 hover:border-primary/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    {page.picture ? (
                      <img src={page.picture} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <Facebook className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{page.name}</h3>
                    <p className="text-xs text-muted-foreground">Click to connect this Page</p>
                  </div>
                  {connecting && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}