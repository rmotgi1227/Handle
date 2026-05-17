import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function CtaStrip() {
  return (
    <section className="w-full border-t border-[#E8E3DA] bg-[#F6F4EF]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-10">
        <Image
          src="/logos/png/wordmark/handle-wordmark-1024.png"
          width={80}
          height={20}
          alt="Handle"
          className="select-none opacity-60"
        />
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#15161A] hover:text-[#3B5A78]"
        >
          Open dashboard
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
