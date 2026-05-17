"use client";

import { useState, useTransition } from "react";
import { StickyNote, X } from "lucide-react";

export function AddNoteButton({ action }: { action: (note: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await action(text.trim());
      setText("");
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-xs font-semibold text-[#15161A] transition-colors hover:bg-[#EEEBE4] hover:border-[#D5CFC6]"
      >
        <StickyNote className="size-3.5 text-[#3B5A78]" />
        Add note
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div
            className="relative w-full max-w-sm rounded-2xl border border-[#E8E3DA] bg-white p-6"
            style={{ boxShadow: "0 16px 48px rgba(21,22,26,0.18)" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-[#9AA0A0] hover:text-[#15161A]"
            >
              <X className="size-4" />
            </button>
            <h3 className="text-sm font-bold text-[#15161A]">Add note</h3>
            <p className="mt-1 text-xs font-medium text-[#9AA0A0]">
              This will be added to the job timeline.
            </p>
            <textarea
              className="mt-4 w-full rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] p-3 text-sm font-medium text-[#15161A] placeholder:text-[#9AA0A0] focus:border-[#3B5A78] focus:outline-none focus:ring-2 focus:ring-[#3B5A78]/20 resize-none"
              rows={4}
              placeholder="What happened?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#E8E3DA] px-4 py-2 text-xs font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!text.trim() || pending}
                onClick={submit}
                className="rounded-full bg-[#15161A] px-4 py-2 text-xs font-semibold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:opacity-40"
              >
                {pending ? "Saving…" : "Save note"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
