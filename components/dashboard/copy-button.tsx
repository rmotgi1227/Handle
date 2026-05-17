"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md p-1 text-[#6B7070] hover:bg-white hover:text-[#15161A]"
      aria-label="Copy"
    >
      {copied ? <Check className="size-3.5 text-[#3B5A78]" /> : <Copy className="size-3.5" />}
    </button>
  );
}
