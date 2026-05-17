import Image from "next/image";
import { cn } from "@/lib/utils";

// wordmark-on-light: dark text, use on cream/white backgrounds
// wordmark-on-dark: cream text, use on near-black backgrounds
type Variant = "wordmark-on-light" | "wordmark-on-dark";

const SRC: Record<Variant, string> = {
  "wordmark-on-light": "/logos/png/wordmark/handle-wordmark-1024.png",
  "wordmark-on-dark": "/logos/png/wordmark-dark/handle-wordmark-dark-1024.png",
};

export function HandleLogo({
  variant = "wordmark-on-light",
  width = 96,
  height = 24,
  className,
  priority,
}: {
  variant?: Variant;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={SRC[variant]}
      width={width}
      height={height}
      alt="Handle"
      priority={priority}
      className={cn("select-none", className)}
    />
  );
}
