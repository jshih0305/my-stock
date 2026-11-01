"use client";

import { useEffect, useState } from "react";
import type { Realtime } from "@/lib/mis";
import PriceChart, { type PricePoint } from "./PriceChart";
import ChipsPanel from "./ChipsPanel";
import { getJson, getJsonOnce } from "./getJson";

type Quote = { date: string; close: number };

const RANGES = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
];

const fmt = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString());

export default function StockDetail({ code, live }: { code: string; live: Realtime | undefined }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<PricePoint[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    getJson<Quote>(`/api/twse/${code}`).then(setQuote, () => {});
    getJsonOnce<{ prices: PricePoint[] }>(`/api/finmind/${code}`).then(
      (d) => setHistory(d.prices),
      (e) => setHistoryError(e.message),
    );
  }, [code]);

  // Measure the range back from the latest trading day rather than "now",
  // so the chart is stable and doesn't read the clock during render.
  let visible: PricePoint[] = [];
  if (history?.length) {
    const cutoff = new Date(history[history.length - 1].date);
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    visible = history.filter((p) => p.date >= cutoffIso);
  }
  const rangeChange =
    visible.length > 1 ? ((visible.at(-1)!.close - visible[0].close) / visible[0].close) * 100 : null;

  // Taiwan market convention: red = up, green = down
  const change = live?.change ?? 0;
  const trend = change > 0 ? "text-[var(--up)]" : change < 0 ? "text-[var(--down)]" : "";
  const pill = change > 0 ? "pill-up" : change < 0 ? "pill-down" : "pill-flat";
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "";

  // Where today's price sits within the day's range, for the range bar.
  const dayPos =
    live?.price != null && live.high != null && live.low != null && live.high > live.low
      ? ((live.price - live.low) / (live.high - live.low)) * 100
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card flex flex-col p-6">
          <div className="eyebrow">即時行情</div>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-xl font-bold tracking-tight">{live?.name ?? "…"}</h2>
            <span className="num rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
              {code}
            </span>
          </div>

          <div className={`num mt-4 text-5xl font-bold ${trend}`}>{fmt(live?.price)}</div>
          <div className="mt-2 h-6">
            {live?.change != null && (
              <span className={`pill ${pill} text-sm`}>
                {arrow} {Math.abs(live.change).toLocaleString()}（{live.changePercent!.toFixed(2)}%）
              </span>
            )}
          </div>

          {dayPos !== null && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
                <span>
                  低 <span className="num">{fmt(live!.low)}</span>
                </span>
                <span>今日區間</span>
                <span>
                  高 <span className="num">{fmt(live!.high)}</span>
                </span>
              </div>
              <div className="relative mt-2 h-1.5 rounded-full bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--border)]">
                <div
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)] bg-[var(--text-primary)] shadow"
                  style={{ left: `${dayPos}%` }}
                />
              </div>
            </div>
          )}

          <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)] text-sm">
            {[
              ["開盤", fmt(live?.open)],
              ["昨收", fmt(live?.prevClose)],
              ["最高", fmt(live?.high)],
              ["最低", fmt(live?.low)],
              ["買進", fmt(live?.bestBid)],
              ["賣出", fmt(live?.bestAsk)],
              ["成交量（張）", fmt(live?.volume)],
            ].map(([k, v], i) => (
              <div
                key={k}
                className={`bg-[var(--surface-2)] px-3 py-2.5 ${i % 2 ? "border-l border-[var(--border)]" : ""} ${i >= 2 ? "border-t border-[var(--border)]" : ""} ${i === 6 ? "col-span-2" : ""}`}
              >
                <dt className="text-xs text-[var(--text-tertiary)]">{k}</dt>
                <dd className="num mt-0.5 truncate font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {quote && (
            <p className="meta mt-auto pt-4">
              證交所最新收盤 <span className="num">{quote.close.toLocaleString()}</span>（{quote.date}）
            </p>
          )}
        </section>

        <section className="card p-6 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="eyebrow">PRICE</div>
              <h2 className="card-title mt-1 flex items-center gap-2">
                收盤價走勢
                {rangeChange !== null && (
                  <span className={`pill ${rangeChange > 0 ? "pill-up" : rangeChange < 0 ? "pill-down" : "pill-flat"}`}>
                    {rangeChange > 0 ? "+" : ""}
                    {rangeChange.toFixed(2)}%
                  </span>
                )}
              </h2>
            </div>
            <div className="seg" role="group" aria-label="走勢區間">
              {RANGES.map((r) => (
                <button key={r.months} onClick={() => setMonths(r.months)} aria-pressed={months === r.months} className="num">
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {historyError && <p className="notice-error">{historyError}</p>}
          {!history && !historyError && <div className="skeleton aspect-[720/300] w-full" />}
          {history && <PriceChart data={visible} />}
          <p className="meta mt-2">資料來源：FinMind</p>
        </section>
      </div>

      <ChipsPanel code={code} />
    </div>
  );
}
