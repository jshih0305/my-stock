"use client";

import { useId, useRef, useState } from "react";

export type PricePoint = { date: string; close: number };

const WIDTH = 720;
const HEIGHT = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

export default function PriceChart({ data }: { data: PricePoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (data.length < 2) {
    return <p className="text-sm text-[var(--text-secondary)]">資料不足，無法繪製線圖</p>;
  }

  const closes = data.map((d) => d.close);
  const rawMin = Math.min(...closes);
  const rawMax = Math.max(...closes);
  const pad = (rawMax - rawMin) * 0.08 || 1;
  const min = rawMin - pad;
  const max = rawMax + pad;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.close)}`).join("");
  const yTicks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  const xTicks = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const i = Math.round(((px - PAD.left) / plotW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto touch-none select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="收盤價歷史線圖"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeDasharray="2 4" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-tertiary)">
              {t.toFixed(0)}
            </text>
          </g>
        ))}
        {xTicks.map((i, k) => (
          <text
            key={i}
            x={x(i)}
            y={HEIGHT - 8}
            fontSize="11"
            fill="var(--text-tertiary)"
            textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
          >
            {data[i].date}
          </text>
        ))}

        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--series-1)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path}L${x(data.length - 1)},${HEIGHT - PAD.bottom}L${x(0)},${HEIGHT - PAD.bottom}Z`} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

        {h && (
          <g pointerEvents="none">
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--text-tertiary)" strokeDasharray="3 3" />
            <circle cx={x(hover!)} cy={y(h.close)} r="5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {h && (
        <div
          className="pointer-events-none absolute top-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-2 text-xs shadow-[var(--shadow)] backdrop-blur"
          style={
            hover! > data.length / 2
              ? { right: `${100 - (x(hover!) / WIDTH) * 100 + 2}%` }
              : { left: `${(x(hover!) / WIDTH) * 100 + 2}%` }
          }
        >
          <div className="text-[var(--text-secondary)]">{h.date}</div>
          <div className="num font-semibold text-[var(--text-primary)]">收盤 {h.close.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
