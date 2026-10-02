import React from "react";

// Static, non-interactive Islamic motivation card.
// Premium, compact, matches the MHI BizMate dark navy + cyan visual style.
export default function QuranMotivationCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-primary/20 p-3.5 mb-2.5">
      <p className="text-sm text-foreground leading-relaxed">
        মানুষের জন্য তা-ই রয়েছে, যার জন্য সে চেষ্টা করে।
      </p>
      <p className="text-[11px] text-primary/80 mt-1.5">— সূরা আন-নাজম ৫৩:৩৯</p>
    </div>
  );
}