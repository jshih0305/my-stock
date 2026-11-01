"use client";

import { useEffect, useId, useState } from "react";
import type { Realtime } from "@/lib/mis";
import type { PricePoint } from "./PriceChart";
import { getJsonOnce } from "./getJson";

const SPARK_DAYS = 22; // about one month of trading days
const W = 120;
const H = 36;

function Sparkline({ data }: { data: number[] | null }) {
  const id = useId();
  if (!data) return <div className="skeleton h-9 w-full" />;
  if (data.length < 2) return <div className="h-9" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, 3 + (1 - (v - min) / range) * (H - 6)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("");
  // Colour by the month's direction (Taiwan convention: red = up, green = down).
  const color = data.at(-1)! >= data[0] ? "var(--up)" : "var(--down)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W},${H}L0,${H}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function StockTile({
  code,
  quote,
  selected,
  onSelect,
}: {
  code: string;
  quote: Realtime | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const [spark, setSpark] = useState<number[] | null>(null);

  useEffect(() => {
    getJsonOnce<{ prices: PricePoint[] }>(`/api/finmind/${code}`).then(
      (d) => setSpark(d.prices.slice(-SPARK_DAYS).map((p) => p.close)),
      () => setSpark([]),
    );
  }, [code]);

  // Taiwan market convention: red = up, green = down
  const change = quote?.change ?? 0;
  const trend = change > 0 ? "text-[var(--up)]" : change < 0 ? "text-[var(--down)]" : "text-[var(--text-primary)]";
  const pill = change > 0 ? "pill-up" : change < 0 ? "pill-down" : "pill-flat";
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "";

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`card flex h-full w-full flex-col gap-2 p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
        selected
          ? "!border-[var(--accent)] ring-4 ring-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
          : "hover:border-[color-mix(in_srgb,var(--text-tertiary)_60%,var(--border))]"
      }`}
    >
      <div className="pr-6">
        <div className="truncate font-semibold">{quote?.name ?? <span className="skeleton inline-block h-4 w-14 align-middle" />}</div>
        <div className="num text-xs text-[var(--text-tertiary)]">{code}</div>
      </div>
      <div className={`num text-2xl font-bold ${trend}`}>{quote?.price?.toLocaleString() ?? "–"}</div>
      <div className="h-5">
        {quote?.change != null && (
          <span className={`pill ${pill}`}>
            {arrow} {Math.abs(quote.change).toLocaleString()}（{quote.changePercent!.toFixed(2)}%）
          </span>
        )}
      </div>
      <div className="mt-1">
        <Sparkline data={spark} />
        <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">近一個月</div>
      </div>
    </button>
  );
}
