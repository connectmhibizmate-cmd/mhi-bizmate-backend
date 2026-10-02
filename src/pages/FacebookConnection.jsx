import React, { useState, useEffect } from "react";
import { integrationsApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState } from "@/components/EmptyState";
import { Facebook, CheckCircle2, AlertTriangle, Loader2, Link2, Unlink } from "lucide-react";

export default function FacebookConnection() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showPreOAuth, setShowPreOAuth] = useState(false);
  const [oauthUrl, setOauthUrl] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await integrationsApi.facebook({ action: "status" });
      setConnection(res?.connection || null);
    } catch (e) {
      setError(e?.data?.error || e?.error || e?.message || "Failed to load connection status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();

    // Listen for "facebook_connected" message from popup callback tab
    // (when OAuth runs in a new tab because the app is inside an iframe)
    const handleMessage = (event) => {
      if (event.data === "facebook_connected") {
        loadStatus();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleConnect = () => {
    const APP_ID = "1553694895997917";
    const REDIRECT = "https://mhi-bizmate51.base44.app/facebook-callback";
    const SCOPE = "public_profile,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging";
    const STATE = Math.random().toString(36).substring(7);
    localStorage.setItem("fb_state", STATE);
    const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${SCOPE}&response_type=code&state=${STATE}&auth_type=rerequest`;
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    try {
      await integrationsApi.facebook({ action: "disconnect" });
      toast({ title: "Facebook Page disconnected" });
      setConnection(null);
    } catch (e) {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    }
  };

  const isConnected = connection?.status === "connected";

  return (
    <div>
      <PageHeader title="Facebook Page" subtitle="Connect your Facebook Page" />
      <div className="px-4 pt-4 pb-4">
        {loading ? (
          <LoadingState label="Loading connection status…" />
        ) : error ? (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">Connection Error</h3>
            </div>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-3 border-border" onClick={loadStatus}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection status card */}
            <div
              className={`rounded-2xl border p-5 ${
                isConnected
                  ? "bg-success/5 border-success/30"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isConnected ? "bg-success/15" : "bg-muted/50"
                  }`}
                >
                  {isConnected ? (
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  ) : (
                    <Facebook className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {isConnected ? "Connected" : "Not Connected"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isConnected
                      ? connection.page_name || "Facebook Page"
                      : "Connect your Facebook Page to enable automations"}
                  </p>
                </div>
              </div>

              {isConnected ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-background/50 border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Page Name</span>
                      <span className="text-xs font-medium text-foreground">
                        {connection.page_name || "N/A"}
                      </span>
                    </div>
                    {connection.page_link && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">Page Link</span>
                        <a
                          href={connection.page_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary truncate hover:underline"
                        >
                          {connection.page_link}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                        Active
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={handleDisconnect}
                  >
                    <Unlink className="w-4 h-4" />
                    Disconnect Page
                  </Button>
                </div>
              ) : showPreOAuth ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-background/50 border border-border p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Before you connect</h3>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span className="text-xs text-muted-foreground">You'll authorize with your Facebook account</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span className="text-xs text-muted-foreground">Select the Facebook Page you manage</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span className="text-xs text-muted-foreground">BizMate only requests permissions needed for Page management</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 border-border" onClick={() => { setShowPreOAuth(false); setOauthUrl(""); }} disabled={connecting}>
                      Cancel
                    </Button>
                    <Button className="flex-1 glow-cyan-soft" onClick={handleConnect} disabled={connecting}>
                      {connecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting…
                        </>
                      ) : (
                        <>
                          <Facebook className="w-4 h-4" />
                          Continue
                        </>
                      )}
                    </Button>
                  </div>
                  {oauthUrl && (
                    <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Popup was blocked. Tap below to open Facebook authorization.
                      </p>
                      <a href={oauthUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full glow-cyan-soft">
                          <Facebook className="w-4 h-4" />
                          Open Facebook
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <Button className="w-full glow-cyan-soft" onClick={() => setShowPreOAuth(true)}>
                  <Facebook className="w-4 h-4" />
                  Connect Facebook Page
                </Button>
              )}
            </div>

            {/* Info card */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">How It Works</h3>
              <ol className="space-y-2">
                {[
                  "Click Connect to authorize your Facebook account",
                  "Select the Facebook Page you want to connect",
                  "Your Page connection enables Messenger and comment automations",
                  "Only one Page per business — disconnect to change Pages"
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl bg-muted/20 border border-border p-3 flex items-start gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                Your Facebook connection is secure and private. Access tokens are stored
                server-side and never exposed to the frontend. Other businesses cannot
                access your Page connection.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}