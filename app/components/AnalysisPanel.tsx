"use client";

import type { Action, AnalysisResult, Impact } from "@/lib/analysis-shared";

export type AnalysisState =
  | { status: "loading" }
  | { status: "done"; result: AnalysisResult }
  | { status: "error"; error: string; needsKey?: boolean };

const IMPACT_STYLE: Record<Impact, { pill: string; text: string; dot: string; bar: string }> = {
  利多: { pill: "pill-up", text: "text-[var(--up)]", dot: "bg-[var(--up)]", bar: "bg-[var(--up)]" },
  利空: { pill: "pill-down", text: "text-[var(--down)]", dot: "bg-[var(--down)]", bar: "bg-[var(--down)]" },
  中性: { pill: "pill-flat", text: "text-[var(--text-secondary)]", dot: "bg-[var(--text-tertiary)]", bar: "bg-[var(--text-tertiary)]" },
};

const ACTION_STYLE: Record<Action, { text: string; soft: string; icon: React.ReactNode; hint: string }> = {
  加碼買進: {
    text: "text-[var(--up)]",
    soft: "bg-[var(--up-soft)]",
    hint: "訊號偏多，可考慮分批買進",
    icon: <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  賣出: {
    text: "text-[var(--down)]",
    soft: "bg-[var(--down-soft)]",
    hint: "訊號偏空，持有者可考慮減碼",
    icon: <path d="M8 3v10M3.5 8.5L8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  暫時不動: {
    text: "text-[var(--accent)]",
    soft: "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]",
    hint: "方向還不明確，先觀察比較安全",
    icon: <path d="M5.5 4v8M10.5 4v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  },
};

const timeFmt = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function Sparkle({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        d="M8 1.5l1.4 3.9 3.9 1.4-3.9 1.4L8 12.1 6.6 8.2 2.7 6.8l3.9-1.4zM13 11l.6 1.4 1.4.6-1.4.6L13 15l-.6-1.4-1.4-.6 1.4-.6z"
        fill="currentColor"
      />
    </svg>
  );
}

// Inline panel on the dashboard showing the AI analysis of the selected stock.
export default function AnalysisPanel({
  code,
  name,
  state,
  onRun,
  onOpenSettings,
  ref,
}: {
  code: string;
  name: string;
  state: AnalysisState | undefined;
  onRun: () => void;
  onOpenSettings: () => void;
  ref?: React.Ref<HTMLElement>;
}) {
  const loading = state?.status === "loading";
  const done = state?.status === "done" ? state.result : null;

  return (
    <section ref={ref} className="card scroll-mt-24 p-6" aria-busy={loading}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Sparkle className="size-3 text-[var(--accent)]" />
            AI ANALYSIS
          </div>
          <h2 className="card-title mt-1 flex items-baseline gap-2">
            AI 分析・{name}
            <span className="num text-sm font-normal text-[var(--text-tertiary)]">{code}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {done && (
            <span className="meta">
              分析於 <span className="num">{timeFmt.format(new Date(done.generatedAt))}</span>・
              <span className="num">{done.model}</span>
            </span>
          )}
          {state && state.status !== "error" && (
            <button onClick={onRun} disabled={loading} className="btn-ghost flex h-9 items-center gap-1.5 border border-[var(--border)] px-3 disabled:opacity-50">
              {loading ? (
                <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.5h-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {loading ? "分析中…" : "重新分析"}
            </button>
          )}
        </div>
      </div>

      {!state && <Empty name={name} onRun={onRun} />}
      {loading && <Loading name={name} />}
      {state?.status === "error" && (
        <div className="flex flex-col items-start gap-4">
          <p className="notice-error w-full">{state.error}</p>
          <div className="flex gap-2">
            {state.needsKey ? (
              <button onClick={onOpenSettings} className="btn-primary">
                前往設定
              </button>
            ) : (
              <>
                <button onClick={onRun} className="btn-primary">
                  重試
                </button>
                <button onClick={onOpenSettings} className="btn-ghost h-10 px-4">
                  檢查設定
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {done && <Result result={done} />}
    </section>
  );
}

function Empty({ name, onRun }: { name: string; onRun: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]">
        <Sparkle className="size-5" />
      </div>
      <div>
        <p className="font-semibold">讓 AI 用白話幫你看懂 {name}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          整理行情、法人籌碼與最新新聞，告訴你目前偏利多還是利空，以及該加碼、賣出還是先不動。
        </p>
      </div>
      <button onClick={onRun} className="btn-primary mt-1 flex items-center gap-1.5">
        <Sparkle />
        開始 AI 分析
      </button>
    </div>
  );
}

function Loading({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[var(--accent)]" />
        </span>
        AI 正在整理 {name} 的行情、籌碼與新聞並進行分析，約需 10–40 秒…
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-28 rounded-2xl" />
          </div>
          <div className="skeleton h-20 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
      {children}
      {sub && <span className="text-xs font-normal text-[var(--text-tertiary)]">{sub}</span>}
    </h3>
  );
}

function Result({ result }: { result: AnalysisResult }) {
  const a = result.analysis;
  const v = IMPACT_STYLE[a.verdict] ?? IMPACT_STYLE["中性"];
  const act = ACTION_STYLE[a.action] ?? ACTION_STYLE["暫時不動"];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: the answers a beginner wants first */}
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="eyebrow">市場看法</div>
              <div className={`mt-1 text-3xl font-black tracking-tight ${v.text}`}>{a.verdict}</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--grid)]">
                  <div className={`h-full rounded-full ${v.bar}`} style={{ width: `${a.confidence}%` }} />
                </div>
                <span className="num shrink-0 text-xs text-[var(--text-secondary)]">把握度 {a.confidence}%</span>
              </div>
              <p className="meta mt-2">把握度越低，代表訊號越分歧</p>
            </div>

            <div className={`rounded-2xl border border-[var(--border)] p-4 ${act.soft}`}>
              <div className="eyebrow">操作建議</div>
              <div className={`mt-1 flex items-center gap-2 text-3xl font-black tracking-tight ${act.text}`}>
                <svg viewBox="0 0 16 16" className="size-6" aria-hidden>
                  {act.icon}
                </svg>
                {a.action}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{a.actionReason || act.hint}</p>
            </div>
          </div>

          <section>
            <SectionTitle>白話總結</SectionTitle>
            <div className="rounded-xl border border-[var(--border)] px-4 py-3">
              <p className="font-semibold leading-snug">{a.headline}</p>
              {a.plainSummary && <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{a.plainSummary}</p>}
            </div>
          </section>

          {a.watchFor?.length > 0 && (
            <section>
              <SectionTitle sub="出現這些變化時，可以再分析一次">接下來可以觀察</SectionTitle>
              <ul className="flex flex-col gap-2">
                {a.watchFor.map((w, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    <svg viewBox="0 0 16 16" className="mt-1 size-3.5 shrink-0 text-[var(--accent)]" aria-hidden>
                      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
                      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right: the reasoning */}
        <div className="flex flex-col gap-6">
          <section>
            <SectionTitle sub="紅色偏好消息、綠色偏壞消息">為什麼這樣判斷</SectionTitle>
            <ul className="flex flex-col gap-2">
              {a.reasons.map((r, i) => {
                const s = IMPACT_STYLE[r.impact] ?? IMPACT_STYLE["中性"];
                return (
                  <li key={i} className="flex gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
                    <span className={`mt-2 size-1.5 shrink-0 rounded-full ${s.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="pill pill-flat !font-medium">{r.category}</span>
                        <span className={`pill ${s.pill}`}>{r.impact === "利多" ? "好消息" : r.impact === "利空" ? "壞消息" : "中性"}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{r.point}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {a.risks.length > 0 && (
            <section>
              <SectionTitle>需要留意的風險</SectionTitle>
              <ul className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                {a.risks.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    <span className="font-bold text-[var(--up)]">!</span>
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {a.glossary?.length > 0 && (
        <details className="group rounded-xl border border-[var(--border)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span>
              名詞小辭典 <span className="ml-1 text-xs font-normal text-[var(--text-tertiary)]">看不懂的詞點這裡</span>
            </span>
            <svg viewBox="0 0 16 16" className="size-4 text-[var(--text-tertiary)] transition group-open:rotate-180" aria-hidden>
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <dl className="grid gap-x-6 gap-y-3 border-t border-[var(--border)] px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {a.glossary.map((g) => (
              <div key={g.term}>
                <dt className="font-semibold">{g.term}</dt>
                <dd className="text-[var(--text-secondary)]">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">新手提醒：</span>
        這是 AI 依公開資料自動產生的參考，不是專業投資建議，也可能出錯。AI 不知道你的資金、買進成本和能承受多少虧損，
        決定前請自己再想一想：只用閒錢、分批進場、事先想好最多能虧多少。
      </div>
    </div>
  );
}
