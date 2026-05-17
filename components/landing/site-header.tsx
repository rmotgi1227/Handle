"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#how-it-works", label: "Workflow" },
  { href: "#stack", label: "Stack" },
  { href: "#preview", label: "Preview" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "border-b border-[#E8E3DA] bg-[#F6F4EF]/85 backdrop-blur supports-[backdrop-filter]:bg-[#F6F4EF]/70"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
        <Link
          href="/"
          aria-label="Handle home"
          className="flex items-center gap-2"
        >
          <Image
            src="/logos/png/wordmark/handle-wordmark-1024.png"
            width={88}
            height={22}
            alt="Handle"
            priority
            className="select-none"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm font-bold text-[#15161A] transition-colors hover:bg-[#EEEBE4]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#15161A] px-4 text-sm font-bold text-[#F6F4EF] transition-colors hover:bg-[#2A2C30]"
          >
            Open dashboard <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex size-9 items-center justify-center rounded-full border border-[#E8E3DA] bg-white text-[#15161A] md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#E8E3DA] bg-[#F6F4EF] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-8 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-bold text-[#15161A] hover:bg-[#EEEBE4]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#15161A] px-4 text-sm font-bold text-[#F6F4EF]"
            >
              Open dashboard <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
