// MHI BizMate — AI service stub (Backend Reset). No AI Gateway connected.
// ask() returns an honest placeholder reply; it does NOT fake an AI response
// and is clearly labeled as not connected.
export const aiApi = {
  ask: async () => ({
    reply:
      "AI backend is not connected yet. This is a placeholder — the AI Gateway will be wired up in the next phase.",
  }),
};