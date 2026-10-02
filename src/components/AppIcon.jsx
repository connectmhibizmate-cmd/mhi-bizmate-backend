import React from "react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

const APP_ICON_URL =
  "https://media.base44.com/images/public/6aab3193b86f9c7573160194/b1358a937_IMG_0533.jpeg";

/**
 * The official MHI BizMate app icon (rounded square, dark navy, M+B growth arrow).
 * Rendered at the same visual footprint as the previous chart-icon logo,
 * perfectly centered, aspect-ratio safe, and responsive.
 */
export default function AppIcon({ className, size = "md", glow = false }) {
  const dim = size === "lg" ? "w-14 h-14 sm:w-16 sm:h-16" : size === "sm" ? "w-9 h-9" : "w-11 h-11";
  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-center overflow-hidden rounded-2xl",
        dim,
        glow && "glow-cyan",
        className
      )}
    >
      <Image
        src={APP_ICON_URL}
        alt="MHI BizMate"
        fittingType="fill"
        className="w-full h-full"
      />
    </div>
  );
}