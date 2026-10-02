import React, { useEffect, useState, useCallback, useRef } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminEmpty, StatusPill, timeAgo } from "@/components/admin/adminUi";
import { Bot, Send, ArrowUpRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminInbox() {
  const [conversations, setConversations] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const loadConvos = useCallback(async () => {
    try {
      const res = await adminApi.control({ action: "inboxList" });
      setConversations((res?.data || res)?.items || []);
    } catch (e) { setConversations([]); }
  }, []);

  const loadMessages = useCallback(async (userId) => {
    setLoadingMsgs(true);
    try {
      const res = await adminApi.control({ action: "inboxMessages", user_id: userId });
      setMessages((res?.data || res)?.items || []);
    } catch (e) { setMessages([]); } finally { setLoadingMsgs(false); }
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);
  useEffect(() => { if (active) loadMessages(active.userId); }, [active, loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (kind) => {
    if (kind === "ai") {
      setBusy(true);
      try {
        await adminApi.control({ action: "inboxAiReply", user_id: active.userId, user_email: active.userEmail, user_name: active.userName, workspace_name: active.workspace });
        await loadMessages(active.userId);
        await loadConvos();
      } finally { setBusy(false); }
      return;
    }
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await adminApi.control({ action: "inboxReply", user_id: active.userId, user_email: active.userEmail, user_name: active.userName, workspace_name: active.workspace, content: draft.trim() });
      setDraft("");
      await loadMessages(active.userId);
      await loadConvos();
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {/* Pinned Admin Assistant header */}
      <div className="rounded-2xl bg-gradient-to-r from-card to-background border border-primary/30 px-5 py-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">MHI BizMate</p>
          <p className="text-xs text-primary font-medium">Admin Assistant · AI Employee</p>
        </div>
      </div>

      {!active ? (
        <SectionCard title="Inbox" description="Conversations from users who messaged MHI BizMate">
          {!conversations ? <Spinner /> : conversations.length === 0 ? <AdminEmpty title="No support messages" description="User messages to MHI BizMate will appear here." /> : (
            <ul className="divide-y divide-border">
              {conversations.map((c) => (
                <li key={c.userId}>
                  <button onClick={() => setActive(c)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/30 transition-colors px-1">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {(c.userName || c.userEmail || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{c.userName || c.userEmail}</p>
                        {c.escalated && <StatusPill status="escalated" label="Escalated" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(c.last)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title={<span className="flex items-center gap-2"><button onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>{active.userName || active.userEmail}</span>}
          description={`${active.workspace || "No workspace"} · ${active.userEmail || ""}`}
          action={active.escalated ? <StatusPill status="escalated" label="Escalated" /> : <StatusPill status={active.status} />}
        >
          <div className="space-y-3 min-h-[300px]">
            {loadingMsgs ? <Spinner /> : messages.length === 0 ? <AdminEmpty title="No messages" /> : messages.map((m) => (
              <div key={m.id} className={cn("flex", m.direction === "user" ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  m.direction === "user" ? "bg-muted/40 border border-border text-foreground" :
                  m.direction === "ai" ? "bg-primary/15 border border-primary/30 text-foreground" :
                  "bg-success/15 border border-success/30 text-foreground")}>
                  {m.direction !== "user" && <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{m.direction === "ai" ? "AI" : "Admin"}</p>}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.ai_summary && <p className="text-[10px] text-muted-foreground mt-1.5 italic">{m.ai_summary}</p>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && send("admin")}
              placeholder="Reply as admin…"
              className="flex-1 h-10 px-3.5 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:border-primary/50"
              disabled={busy}
            />
            <button onClick={() => send("ai")} disabled={busy} title="Let the AI employee respond" className="h-10 px-3 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50">
              <Bot className="w-4 h-4" /> AI
            </button>
            <button onClick={() => send("admin")} disabled={busy || !draft.trim()} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
          {active.escalated && (
            <p className="mt-3 text-xs text-warning flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> Escalated — the AI could not safely resolve this. Review the conversation and reply.
            </p>
          )}
        </SectionCard>
      )}
    </div>
  );
}