import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aiApi } from "@/api";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import PageHeader from "@/components/PageHeader";
import { Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "আজ আমার ব্যবসার পারফরম্যান্স কেমন?",
  "আমার পণ্যের জন্য একটি বিজ্ঞাপনের স্ক্রিপ্ট তৈরি করো",
  "কম স্টকে থাকা পণ্যগুলোর সারসংক্ষেপ দেখাও",
  "আমার কি কোনো Pending Order আছে?",
  "একটি নতুন পণ্য যোগ করতে চাই",
];

export default function AskBizMate() {
  const navigate = useNavigate();
  const { assistantName, profile } = useBusinessProfile();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const ask = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    const userMsg = { role: "user", content: question };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const res = await aiApi.ask({
        question,
        assistant_name: assistantName,
        business_name: profile?.business_name || "your business",
      });
      console.log("ASK_BIZMATE FULL RESPONSE:", JSON.stringify(res).substring(0, 3000));
      const replyText = res?.reply || res?.answer || "";
      if (!replyText) {
        console.error("Empty reply, full res:", res);
        setMessages((prev) => [...prev, { role: "assistant", content: `DEBUG: Backend returned empty. Full response: ${JSON.stringify(res).substring(0, 1000)}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);
      }
    } catch (e) {
      // Surface the backend's friendly error when available (e.g. quota
      // reached or assistant unavailable); avoid showing raw HTTP errors.
      const err = e?.message || "I couldn't answer that right now — please try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: err, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title={`Ask ${assistantName}`} subtitle="Your AI business assistant" />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">Hi, I'm {assistantName}</h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">
              Ask me anything about your products, sales, or business — I use your real catalog to answer.
            </p>

          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : m.error
                  ? "bg-destructive/10 border border-destructive/30 text-destructive"
                  : "bg-card border border-border text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-3.5 py-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t border-border p-3 pb-28">
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-primary/40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder={`Ask ${assistantName}...`}
            className="flex-1 h-11 rounded-xl bg-card border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={() => ask()}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 glow-cyan-soft"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}