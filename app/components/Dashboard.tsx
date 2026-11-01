"use client";

import { useEffect, useRef, useState } from "react";
import type { Realtime } from "@/lib/mis";
import StockTile from "./StockTile";
import StockDetail from "./StockDetail";
import NewsPanel from "./NewsPanel";
import WatchlistForm from "./WatchlistForm";
import ThemeToggle from "./ThemeToggle";
import SettingsDialog from "./SettingsDialog";
import AnalysisPanel, { type AnalysisState } from "./AnalysisPanel";
import { useSettings } from "./settings";
import type { AnalysisResult } from "@/lib/analysis-shared";
import { getJson, sendJson } from "./getJson";

const POLL_MS = 5000;
const ANALYSES_KEY = "my-stock:analyses";

// Previously finished analyses saved in this browser (see the effect in Dashboard).
// Nothing analysis-related renders until the watchlist has loaded, so reading
// storage here doesn't cause a hydration mismatch.
function loadSavedAnalyses(): Record<string, AnalysisState> {
  if (typeof window === "undefined") return {};
  try {
    const saved = JSON.parse(localStorage.getItem(ANALYSES_KEY) ?? "{}") as Record<string, AnalysisResult>;
    return Object.fromEntries(
      Object.entries(saved)
        .filter(([, r]) => r?.analysis?.action) // skip results saved in an older format
        .map(([code, result]) => [code, { status: "done", result } as const]),
    );
  } catch {
    return {};
  }
}

// TWSE trades 09:00-13:30 Taiwan time, Mon-Fri. Keep polling a few minutes
// past the close so the final settled price is picked up.
function isMarketOpen() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  if (get("weekday") === "Sat" || get("weekday") === "Sun") return false;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return minutes >= 9 * 60 && minutes <= 13 * 60 + 35;
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="brand-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#brand-bg)" />
      <rect x="8" y="17" width="3.5" height="7" rx="1.2" fill="#fff" opacity="0.55" />
      <rect x="14.25" y="13" width="3.5" height="11" rx="1.2" fill="#fff" opacity="0.75" />
      <rect x="20.5" y="8" width="3.5" height="16" rx="1.2" fill="#fff" />
    </svg>
  );
}

export default function Dashboard() {
  const [codes, setCodes] = useState<string[] | null>(null); // null = loading
  const [listError, setListError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Realtime>>({});
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  // Fall back to the first tile when nothing is picked or the pick was removed.
  const selected = picked && codes?.includes(picked) ? picked : codes?.[0];

  useEffect(() => {
    getJson<{ codes: string[] }>("/api/watchlist").then(
      (d) => setCodes(d.codes),
      (e) => setListError(e.message),
    );
  }, []);

  async function addCode(code: string) {
    const d = await sendJson<{ codes: string[] }>("/api/watchlist", "POST", { code });
    setCodes(d.codes);
    setPicked(code);
  }

  // ---- AI analysis (BYOK) ----
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisState>>(loadSavedAnalyses);
  const setAnalysis = (code: string, s: AnalysisState) => setAnalyses((prev) => ({ ...prev, [code]: s }));
  const panelRef = useRef<HTMLElement>(null);

  // Keep finished analyses in this browser so they are still there after a reload.
  useEffect(() => {
    const done = Object.fromEntries(
      Object.entries(analyses).flatMap(([code, s]) => (s.status === "done" ? [[code, s.result]] : [])),
    );
    try {
      localStorage.setItem(ANALYSES_KEY, JSON.stringify(done));
    } catch {
      // storage full or blocked: results just won't survive a reload
    }
  }, [analyses]);

  async function runAnalysis(code: string) {
    if (!settings.apiKey) {
      setAnalysis(code, { status: "error", error: "要使用 AI 分析，請先在設定中輸入你自己的 OpenAI API Key。", needsKey: true });
      return;
    }
    setAnalysis(code, { status: "loading" });
    try {
      const res = await fetch(`/api/analyze/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-OpenAI-Key": settings.apiKey },
        body: JSON.stringify({ model: settings.model || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalysis(code, { status: "error", error: body.error ?? `分析失敗 (${res.status})`, needsKey: res.status === 401 });
        return;
      }
      setAnalysis(code, { status: "done", result: body as AnalysisResult });
    } catch {
      setAnalysis(code, { status: "error", error: "無法連線到伺服器，請確認網路後再試" });
    }
  }

  // Tile button: select the stock and bring its analysis panel into view.
  // Show a finished analysis instead of paying for a new one; run otherwise.
  function openAnalysis(code: string) {
    setPicked(code);
    const s = analyses[code];
    if (s?.status !== "done" && s?.status !== "loading") runAnalysis(code);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function removeCode(code: string) {
    try {
      const d = await sendJson<{ codes: string[] }>(`/api/watchlist/${code}`, "DELETE");
      setCodes(d.codes);
      setListError(null);
    } catch (e) {
      setListError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!codes?.length) return;
    const load = () =>
      getJson<{ quotes: Realtime[] }>(`/api/realtime?codes=${codes.join(",")}`).then(
        (d) => {
          setQuotes(Object.fromEntries(d.quotes.map((q) => [q.code, q])));
          setError(null);
          setPolling(isMarketOpen());
        },
        (e) => setError(e.message),
      );

    load();
    const id = setInterval(() => {
      const open = isMarketOpen();
      setPolling(open);
      if (open && document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [codes]);

  const any = Object.values(quotes)[0];

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_78%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <h1 className="text-[15px] font-bold tracking-tight sm:text-base">我的股票摘要站</h1>
              <p className="hidden text-xs text-[var(--text-tertiary)] sm:block">自選台股・行情・籌碼・新聞</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] shadow-[var(--shadow-sm)]"
            aria-live="polite"
          >
            <span className="relative flex size-2">
              {polling && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--up)] opacity-60" />
              )}
              <span
                className={`relative inline-flex size-2 rounded-full ${polling ? "bg-[var(--up)]" : "bg-[var(--text-tertiary)]"}`}
              />
            </span>
            <span className="font-medium text-[var(--text-primary)]">{polling ? "盤中" : "已收盤"}</span>
            {any && (
              <span className="num hidden sm:inline">
                {any.date} {any.time}
              </span>
            )}
          </div>
            <ThemeToggle />
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="設定"
              title={settings.apiKey ? "設定（已設定 OpenAI Key）" : "設定（尚未設定 OpenAI Key）"}
              className="relative flex size-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition hover:text-[var(--text-primary)] active:scale-95"
            >
              <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden>
                <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M10 2.5l1.3 1.9 2.2-.6.6 2.2 2.2.6-.6 2.2 1.8 1.2-1.8 1.2.6 2.2-2.2.6-.6 2.2-2.2-.6L10 17.5l-1.3-1.9-2.2.6-.6-2.2-2.2-.6.6-2.2L2.5 10l1.8-1.2-.6-2.2 2.2-.6.6-2.2 2.2.6z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              {!settings.apiKey && (
                <span className="absolute right-0.5 top-0.5 size-2 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-12 pt-8">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="eyebrow">WATCHLIST</div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                我的追蹤清單
                {codes && (
                  <span className="num ml-2 align-middle text-sm font-medium text-[var(--text-tertiary)]">
                    {codes.length} 檔
                  </span>
                )}
              </h2>
            </div>
            <WatchlistForm onAdd={addCode} />
          </div>

          {listError && <p className="notice-error">{listError}</p>}
          {error && (
            <p className="notice-error">
              即時行情更新失敗：{error}
              {Object.keys(quotes).length > 0 && "（顯示最後一次成功的資料）"}
            </p>
          )}

          {codes === null ? (
            !listError && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="card flex flex-col gap-3 p-4">
                    <div className="skeleton h-4 w-16" />
                    <div className="skeleton h-7 w-24" />
                    <div className="skeleton h-9 w-full" />
                  </div>
                ))}
              </div>
            )
          ) : codes.length === 0 || !selected ? (
            <div className="card flex flex-col items-center gap-2 border-dashed px-6 py-12 text-center">
              <div className="text-base font-semibold">追蹤清單是空的</div>
              <p className="text-sm text-[var(--text-secondary)]">在右上方輸入股票代號（例如 2330），加入你的第一檔股票。</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {codes.map((code) => {
                const name = quotes[code]?.name ?? code;
                const a = analyses[code];
                const action = a?.status === "done" ? a.result.analysis.action : null;
                return (
                  <div key={code} className="flex flex-col gap-2">
                    <div className="group relative flex-1">
                      <StockTile
                        code={code}
                        quote={quotes[code]}
                        selected={code === selected}
                        onSelect={() => setPicked(code)}
                      />
                      <button
                        onClick={() => removeCode(code)}
                        aria-label={`從追蹤清單移除 ${name}`}
                        title="從追蹤清單移除"
                        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--up-soft)] hover:text-[var(--up)] focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => openAnalysis(code)}
                      aria-label={`AI 分析 ${name}`}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
                    >
                      {a?.status === "loading" ? (
                        <>
                          <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          分析中…
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                            <path
                              d="M8 1.5l1.4 3.9 3.9 1.4-3.9 1.4L8 12.1 6.6 8.2 2.7 6.8l3.9-1.4zM13 11l.6 1.4 1.4.6-1.4.6L13 15l-.6-1.4-1.4-.6 1.4-.6z"
                              fill="currentColor"
                            />
                          </svg>
                          AI 分析
                          {action && (
                            <span className={`pill ml-0.5 !px-1.5 !py-0 !text-[11px] ${action === "加碼買進" ? "pill-up" : action === "賣出" ? "pill-down" : "pill-flat"}`}>
                              {action === "加碼買進" ? "加碼" : action === "賣出" ? "賣出" : "觀望"}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {codes && codes.length > 0 && selected && (
          <>
            <AnalysisPanel
              ref={panelRef}
              code={selected}
              name={quotes[selected]?.name ?? selected}
              state={analyses[selected]}
              onRun={() => runAnalysis(selected)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
            <StockDetail key={selected} code={selected} live={quotes[selected]} />
            <NewsPanel
              codes={codes}
              selected={selected}
              names={Object.fromEntries(Object.values(quotes).map((q) => [q.code, q.name]))}
            />
          </>
        )}
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-[var(--text-tertiary)]">
          <span>© 我的股票摘要站</span>
          <span>資料來源：證交所 MIS・證交所 OpenAPI・FinMind・Yahoo 股市｜僅供參考，不構成投資建議</span>
        </div>
      </footer>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
