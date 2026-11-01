"use client";

import { useRef, useState } from "react";

type Point = { date: string; value: number };

const WIDTH = 480;
const HEIGHT = 300;
const PAD = { top: 12, right: 16, bottom: 28, left: 64 };

// Diverging bar chart around zero: red = net buy, green = net sell (Taiwan convention).
export default function NetBuyChart({ data }: { data: Point[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (!data.length) return null;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.max(1, slot - 2); // 2px gap between bars
  const y = (v: number) => PAD.top + (1 - (v + maxAbs) / (2 * maxAbs)) * plotH;
  const zero = y(0);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const i = Math.floor((px - PAD.left) / slot);
    setHover(i >= 0 && i < data.length ? i : null);
  }

  const h = hover !== null ? data[hover] : null;
  const xTicks = [0, data.length - 1];

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
        aria-label="三大法人合計買賣超長條圖"
      >
        {[maxAbs, 0, -maxAbs].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--text-secondary)" : "var(--grid)"} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-tertiary)">
              {t > 0 ? "+" : ""}
              {Math.round(t).toLocaleString()}
            </text>
          </g>
        ))}
        {xTicks.map((i, k) => (
          <text
            key={i}
            x={PAD.left + slot * i + (k ? slot : 0)}
            y={HEIGHT - 8}
            fontSize="11"
            fill="var(--text-tertiary)"
            textAnchor={k ? "end" : "start"}
          >
            {data[i].date}
          </text>
        ))}

        {data.map((d, i) => {
          const top = Math.min(y(d.value), zero);
          return (
            <rect
              key={d.date}
              x={PAD.left + slot * i + 1}
              y={top}
              width={barW}
              height={Math.max(1, Math.abs(y(d.value) - zero))}
              rx={Math.min(2, barW / 2)}
              fill={d.value >= 0 ? "var(--up)" : "var(--down)"}
              opacity={hover === null || hover === i ? 1 : 0.4}
            />
          );
        })}
      </svg>

      {h && (
        <div
          className="pointer-events-none absolute top-0 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-2 text-xs shadow-[var(--shadow)] backdrop-blur"
          style={
            hover! > data.length / 2
              ? { right: `${100 - ((PAD.left + slot * hover!) / WIDTH) * 100 + 1}%` }
              : { left: `${((PAD.left + slot * (hover! + 1)) / WIDTH) * 100 + 1}%` }
          }
        >
          <div className="text-[var(--text-secondary)]">{h.date}</div>
          <div className="num font-semibold text-[var(--text-primary)]">
            {h.value >= 0 ? "買超" : "賣超"} {Math.abs(h.value).toLocaleString()} 張
          </div>
        </div>
      )}
    </div>
  );
}
