import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { conversationsApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { MessageCircle, Send, ArrowLeft, Facebook, Search } from "lucide-react";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const ADMIN_SUPPORT_CONV = {
  id: "admin-support",
  name: "Admin Support",
  is_synthetic: true,
  last_message: "Talk to the admin team",
  last_message_time: null,
  unread_count: 0,
  profile_pic: null,
};

export default function Inbox() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useBusinessProfile();
  const { user } = useSupabaseAuth();
  const [conversations, setConversations] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [bizmateMessages, setBizmateMessages] = useState([]);
  const [bizmateSending, setBizmateSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await conversationsApi.list("-last_message_time", 100);
      setConversations(list || []);
    } catch (e) {
      toast({ title: "Failed to load conversations", variant: "destructive" });
    } finally {
      setLoadingConv(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to new conversations / updates
  useEffect(() => {
    const unsubscribe = conversationsApi.subscribe((event) => {
      loadConversations();
    });
    return unsubscribe;
  }, [loadConversations]);

  const loadMessages = useCallback(async (conv) => {
    setLoadingMsgs(true);
    try {
      const msgs = await conversationsApi.messages(conv.id, "timestamp", 200);
      setMessages(msgs || []);
      // Mark as read
      if (conv.unread_count > 0) {
        try {
          await conversationsApi.update(conv.id, { unread_count: 0 });
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      toast({ title: "Failed to load messages", variant: "destructive" });
    } finally {
      setLoadingMsgs(false);
    }
  }, [toast]);

  // Subscribe to new messages for the active conversation
  useEffect(() => {
    if (!activeConv) return;
    const unsubscribe = conversationsApi.subscribeMessages((event) => {
      if (event.data?.conversation_id === activeConv.id) {
        loadMessages(activeConv);
      }
    });
    return unsubscribe;
  }, [activeConv, loadMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, bizmateMessages, bizmateSending]);

  const loadBizmateMessages = useCallback(async () => {
    if (!user?.id) return;
    try {
      const msgs = await conversationsApi.adminMessages(user.id, "created_date", 200);
      setBizmateMessages((msgs || []).map((m) => ({ role: m.direction === "user" ? "user" : "assistant", content: m.content, escalated: m.escalated })));
    } catch (e) { /* ignore */ }
  }, [user]);

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    if (conv.is_synthetic) loadBizmateMessages();
    else loadMessages(conv);
  };

  const toggleHandoff = async (conv, on) => {
    try {
      await conversationsApi.update(conv.id, { needs_human: on, ai_paused: false });
      setActiveConv((c) => (c && c.id === conv.id ? { ...c, needs_human: on, ai_paused: false } : c));
      setConversations((list) => list.map((c) => (c.id === conv.id ? { ...c, needs_human: on, ai_paused: false } : c)));
      toast({ title: on ? "Marked for human follow-up" : "AI resumed", description: on ? "AI replies are paused for this customer." : undefined });
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !activeConv || sending || bizmateSending) return;
    const text = draft.trim();
    setDraft("");
    if (activeConv.is_synthetic) {
      setBizmateSending(true);
      setBizmateMessages((m) => [...m, { role: "user", content: text }]);
      try {
        await conversationsApi.createAdminMessage({
          user_id: user.id, user_email: user.email, user_name: user.full_name || "",
          workspace_name: profile?.business_name || "", direction: "user", content: text, status: "open", escalated: false
        });
        const res = await conversationsApi.adminAiReply({
          user_id: user.id, user_email: user.email,
          user_name: user.full_name || "", workspace_name: profile?.business_name || ""
        });
        const reply = res?.message?.content || "I've noted your message — the admin team will look into it.";
        setBizmateMessages((m) => [...m, { role: "assistant", content: reply }]);
      } catch (e) {
        const err = e?.message || "I couldn't answer that right now.";
        setBizmateMessages((m) => [...m, { role: "assistant", content: err, error: true }]);
      } finally {
        setBizmateSending(false);
      }
      return;
    }
    setSending(true);
    try {
      await conversationsApi.send({
        conversation_id: activeConv.id,
        message: text
      });
      // Optimistic: reload messages + conversations
      await loadMessages(activeConv);
      loadConversations();
    } catch (e) {
      setDraft(text);
      toast({ title: e?.message || "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) || (c.last_message || "").toLowerCase().includes(q);
  });

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  // ── Message thread view ──
  if (activeConv) {
    return (
      <div className="flex flex-col h-screen">
        <div className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-3 py-3">
            <button
              onClick={() => { setActiveConv(null); setMessages([]); }}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/50 -ml-1"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shrink-0 overflow-hidden">
              {activeConv.profile_pic ? (
                <img src={activeConv.profile_pic} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">{(activeConv.name || "?").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{activeConv.name || "Facebook User"}</h3>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                {activeConv.is_synthetic ? (
                  <>Talk to the admin team</>
                ) : (
                  <><Facebook className="w-3 h-3" /> {(activeConv.needs_human || activeConv.ai_paused) ? "Messenger · AI paused" : "Messenger"}</>
                )}
              </p>
            </div>
            {!activeConv.is_synthetic && (
              <button
                onClick={() => toggleHandoff(activeConv, !(activeConv.needs_human || activeConv.ai_paused))}
                className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-colors ${
                  (activeConv.needs_human || activeConv.ai_paused)
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                    : "bg-primary/10 text-primary border-primary/30"
                }`}
              >
                {(activeConv.needs_human || activeConv.ai_paused) ? "Resume AI" : "Hand to human"}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {activeConv.is_synthetic ? (
            bizmateMessages.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Message Admin Support" description="Reach the admin team for help with your account, billing, or any questions." />
            ) : (
              bizmateMessages.map((m, i) => {
                const isPage = m.role === "user";
                return (
                  <div key={i} className={`flex ${isPage ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                        isPage
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : m.error
                          ? "bg-destructive/10 border border-destructive/30 text-destructive rounded-bl-md"
                          : "bg-card border border-border text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                );
              })
            )
          ) : loadingMsgs ? (
            <LoadingState label="Loading messages…" />
          ) : messages.length === 0 ? (
            <EmptyState title="No messages yet" description="Start the conversation by sending a reply." />
          ) : (
            messages.map((m) => {
              const isPage = m.sender_type === "page";
              return (
                <div key={m.id} className={`flex ${isPage ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                      isPage
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                    <p className={`text-[10px] mt-1 ${isPage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(m.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {bizmateSending && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl px-3.5 py-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-card/80 backdrop-blur border-t border-border p-3 safe-bottom">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Type a reply…"
              className="flex-1 resize-none bg-background border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
            />
            <Button
              onClick={handleSend}
              disabled={!draft.trim() || sending || bizmateSending}
              className="rounded-full h-10 w-10 p-0 glow-cyan-soft shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Conversation list view ──
  return (
    <div>
      <PageHeader title="Inbox" subtitle="Facebook Messenger conversations" />
      <div className="px-4 pt-4 pb-4">
        {totalUnread > 0 && (
          <div className="mb-3 rounded-xl bg-primary/10 border border-primary/30 px-3 py-2 text-xs text-primary font-medium">
            {totalUnread} unread message{totalUnread > 1 ? "s" : ""}
          </div>
        )}

        {conversations.length > 4 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {loadingConv ? (
          <LoadingState label="Loading conversations…" />
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => handleSelectConv(ADMIN_SUPPORT_CONV)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 hover:border-primary/60 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shrink-0">
                <span className="text-base">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">Admin Support</h3>
                  <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[9px] font-semibold">SUPPORT</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">Talk to the admin team</p>
              </div>
            </button>
            {filteredConvs.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title={search ? "No matches found" : "No conversations yet"}
                description={search ? "Try a different search term." : "Facebook Messenger messages will appear here once your webhook is connected."}
              />
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shrink-0 overflow-hidden">
                    {conv.profile_pic ? (
                      <img src={conv.profile_pic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base">{(conv.name || "?").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{conv.name || "Facebook User"}</h3>
                        {(conv.needs_human || conv.ai_paused) && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/40 text-[9px] font-semibold">HUMAN</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.last_message_time)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message || "No messages"}</p>
                      {conv.unread_count > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}