"use client";

import { useEffect, useState } from "react";
import type { ChipDay } from "@/lib/chips";
import NetBuyChart from "./NetBuyChart";
import { getJsonOnce } from "./getJson";

// Taiwan market convention: red = net buy, green = net sell
function signed(n: number) {
  const cls = n > 0 ? "text-[var(--up)]" : n < 0 ? "text-[var(--down)]" : "text-[var(--text-secondary)]";
  return (
    <span className={`num ${cls}`}>
      {n > 0 ? "+" : ""}
      {n.toLocaleString()}
    </span>
  );
}

function Stat({ label, value, sub }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
      <dt className="text-xs text-[var(--text-tertiary)]">{label}</dt>
      <dd className="num mt-1 text-xl font-bold">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-[var(--text-tertiary)]">{sub}</dd>}
    </div>
  );
}

export default function ChipsPanel({ code }: { code: string }) {
  const [days, setDays] = useState<ChipDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJsonOnce<{ days: ChipDay[] }>(`/api/finmind/${code}/chips`).then(
      (d) => setDays(d.days),
      (e) => setError(e.message),
    );
  }, [code]);

  const latest = days?.at(-1);
  const prev = days?.at(-2);
  const delta = (cur: number | null | undefined, before: number | null | undefined) =>
    cur != null && before != null ? <>較前日 {signed(cur - before)}</> : null;

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="eyebrow">INSTITUTIONAL</div>
          <h2 className="card-title mt-1">籌碼面</h2>
        </div>
        <p className="meta">資料來源：FinMind・單位：張（外資持股為 %）</p>
      </div>

      {error && <p className="notice-error">{error}</p>}
      {!days && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-[84px]" />
          ))}
        </div>
      )}

      {latest && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={<>三大法人合計（{latest.date.slice(5)}）</>} value={signed(latest.total)} />
            <Stat
              label="融資餘額"
              value={latest.marginBalance?.toLocaleString() ?? "–"}
              sub={delta(latest.marginBalance, prev?.marginBalance)}
            />
            <Stat
              label="融券餘額"
              value={latest.shortBalance?.toLocaleString() ?? "–"}
              sub={delta(latest.shortBalance, prev?.shortBalance)}
            />
            <Stat
              label="外資持股比例"
              value={latest.foreignRatio != null ? `${latest.foreignRatio.toFixed(2)}%` : "–"}
            />
          </dl>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold">
                三大法人合計買賣超
                <span className="ml-1.5 font-normal text-[var(--text-tertiary)]">近 60 個交易日</span>
              </h3>
              <NetBuyChart data={days!.map((d) => ({ date: d.date, value: d.total }))} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">
                三大法人買賣超明細
                <span className="ml-1.5 font-normal text-[var(--text-tertiary)]">近 10 日</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-[var(--surface-2)] text-xs text-[var(--text-tertiary)]">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium">日期</th>
                      <th className="px-3 py-2.5 text-right font-medium">外資</th>
                      <th className="px-3 py-2.5 text-right font-medium">投信</th>
                      <th className="px-3 py-2.5 text-right font-medium">自營商</th>
                      <th className="px-3 py-2.5 text-right font-medium">合計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {days!
                      .slice(-10)
                      .reverse()
                      .map((d) => (
                        <tr key={d.date} className="transition-colors hover:bg-[var(--surface-2)]">
                          <td className="num px-3 py-2 text-[var(--text-secondary)]">{d.date}</td>
                          <td className="px-3 py-2 text-right">{signed(d.foreign)}</td>
                          <td className="px-3 py-2 text-right">{signed(d.trust)}</td>
                          <td className="px-3 py-2 text-right">{signed(d.dealer)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{signed(d.total)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
