"use client";

import { useState } from "react";

export default function WatchlistForm({ onAdd }: { onAdd: (code: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(c);
      setCode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative">
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]"
            aria-hidden
          >
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="輸入股票代號，例如 2603"
            aria-label="股票代號"
            aria-invalid={!!error}
            maxLength={6}
            className="field num w-52 pl-9 sm:w-60"
          />
        </div>
        <button type="submit" disabled={busy || !code.trim()} className="btn-primary flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {busy ? "加入中…" : "加入追蹤"}
        </button>
      </form>
      {error && (
        <span role="alert" className="text-xs font-medium text-[var(--up)]">
          {error}
        </span>
      )}
    </div>
  );
}
