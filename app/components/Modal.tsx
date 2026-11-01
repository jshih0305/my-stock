"use client";

import { useEffect, useRef } from "react";

// Native <dialog>: gives focus trapping, Esc to close and a backdrop for free.
export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // click on backdrop
      className={`card m-auto w-[calc(100%-2rem)] overflow-hidden p-0 text-[var(--text-primary)] backdrop:bg-black/50 backdrop:backdrop-blur-sm ${
        wide ? "max-w-2xl" : "max-w-md"
      }`}
    >
      {open && (
        <div className="flex max-h-[min(88vh,820px)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
            <div className="min-w-0">
              {eyebrow && <div className="eyebrow">{eyebrow}</div>}
              <h2 className="card-title mt-0.5 text-lg">{title}</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="關閉"
              className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
