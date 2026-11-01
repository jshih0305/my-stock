"use client";

import { useEffect, useState } from "react";
import { getJson } from "./getJson";

type News = {
  codes: string[];
  title: string;
  link: string;
  publishedAt: string;
  summary: string;
  isAnnouncement: boolean;
};

const REFRESH_MS = 5 * 60 * 1000; // the RSS feed's own TTL
const PAGE = 10;

const timeFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export default function NewsPanel({
  codes,
  selected,
  names,
}: {
  codes: string[];
  selected: string;
  names: Record<string, string>;
}) {
  const [items, setItems] = useState<News[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"selected" | "all">("selected");
  const [hideAnnouncements, setHideAnnouncements] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    const load = () =>
      getJson<{ items: News[] }>(`/api/news?codes=${codes.join(",")}`).then(
        (d) => {
          setItems(d.items);
          setError(null);
        },
        (e) => setError(e.message),
      );
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [codes]);

  const filtered = (items ?? []).filter(
    (n) => (scope === "all" || n.codes.includes(selected)) && !(hideAnnouncements && n.isAnnouncement),
  );

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">NEWS</div>
          <h2 className="card-title mt-1">相關新聞</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={hideAnnouncements}
              onChange={(e) => setHideAnnouncements(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            隱藏公告
          </label>
          <div className="seg" role="group" aria-label="新聞範圍">
            <button aria-pressed={scope === "selected"} onClick={() => { setScope("selected"); setShown(PAGE); }}>
              {names[selected] ?? selected}
            </button>
            <button aria-pressed={scope === "all"} onClick={() => { setScope("all"); setShown(PAGE); }}>
              全部追蹤
            </button>
          </div>
        </div>
      </div>

      {error && !items && <p className="notice-error">{error}</p>}
      {!items && !error && (
        <div className="flex flex-col gap-4 py-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      )}
      {items && !filtered.length && (
        <p className="rounded-xl bg-[var(--surface-2)] px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">目前沒有相關新聞</p>
      )}

      <ul className="-mx-3 flex flex-col">
        {filtered.slice(0, shown).map((n) => (
          <li key={n.link}>
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-[var(--surface-2)]"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                  <time dateTime={n.publishedAt} className="num">{timeFmt.format(new Date(n.publishedAt))}</time>
                  {n.isAnnouncement && <span className="pill pill-flat !font-medium">公告</span>}
                  {scope === "all" &&
                    n.codes.map((c) => (
                      <span key={c} className="pill bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] !font-medium text-[var(--accent)]">
                        {names[c] ?? c}
                      </span>
                    ))}
                </div>
                <div className="font-semibold leading-snug transition-colors group-hover:text-[var(--accent)]">{n.title}</div>
                {n.summary && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{n.summary}</p>
                )}
              </div>
              <svg
                viewBox="0 0 16 16"
                className="mt-1 size-4 shrink-0 text-[var(--text-tertiary)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
              >
                <path d="M5 11l6-6M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </li>
        ))}
      </ul>

      {filtered.length > shown && (
        <button onClick={() => setShown((s) => s + PAGE)} className="btn-ghost mt-2 w-full py-2.5">
          顯示更多（還有 <span className="num">{filtered.length - shown}</span> 則）
        </button>
      )}
      <p className="meta mt-3">資料來源：Yahoo 股市 RSS・每 5 分鐘更新</p>
    </section>
  );
}
