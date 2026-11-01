"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

// The theme lives on <html data-theme>; the inline script in layout.tsx sets it
// before first paint (saved choice, else the system setting). Watching the
// attribute keeps this button in sync, including when the system theme changes.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getSnapshot = () => (document.documentElement.dataset.theme as Theme | undefined) ?? "light";
const getServerSnapshot = () => null; // unknown on the server; render a placeholder

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", next);
    } catch {
      // storage blocked (private mode etc.): the switch still works for this visit
    }
    document.documentElement.dataset.theme = next;
  }

  const label = theme === "dark" ? "切換為淺色模式" : "切換為深色模式";

  return (
    <button
      onClick={toggle}
      disabled={theme === null}
      aria-label={theme ? label : "切換深淺色模式"}
      title={theme ? label : undefined}
      className="flex size-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition hover:text-[var(--text-primary)] active:scale-95"
    >
      {theme === "dark" ? (
        // sun: shown in dark mode, click for light
        <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden>
          <circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3L6 14M14 6l1.3-1.3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : theme === "light" ? (
        // moon: shown in light mode, click for dark
        <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden>
          <path
            d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5a6.8 6.8 0 1 0 8.7 8.7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
