import { getRealtime } from "./mis";
import { getPrices, type PriceDay } from "./prices";
import { getChips } from "./chips";
import { getNews } from "./yahooNews";
import type { Analysis } from "./analysis-shared";

export { DEFAULT_MODEL, type Analysis, type AnalysisResult } from "./analysis-shared";

// ---------- 1. Collect the stock's current data ----------

// sv-SE gives an ISO-like "YYYY-MM-DD HH:mm"; news times are given to the model in Taiwan time.
const taipeiTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const pct = (now: number, then: number | undefined) => (then ? round(((now - then) / then) * 100) : null);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function technicals(prices: PriceDay[]) {
  if (!prices.length) return null;
  const closes = prices.map((p) => p.close);
  const last = closes.at(-1)!;
  const ma = (n: number) => (closes.length >= n ? round(avg(closes.slice(-n))!) : null);
  const back = (n: number) => closes.at(-1 - n);
  const lots = prices.map((p) => p.volume / 1000);
  return {
    latestClose: last,
    latestDate: prices.at(-1)!.date,
    return5d: pct(last, back(5)),
    return20d: pct(last, back(20)),
    return60d: pct(last, back(60)),
    ma5: ma(5),
    ma20: ma(20),
    ma60: ma(60),
    high52w: Math.max(...prices.map((p) => p.high)),
    low52w: Math.min(...prices.map((p) => p.low)),
    avgVolume5dLots: round(avg(lots.slice(-5))!, 0),
    avgVolume20dLots: round(avg(lots.slice(-20))!, 0),
    last10Closes: prices.slice(-10).map((p) => ({ date: p.date, close: p.close })),
  };
}

export async function collectStockData(code: string) {
  // Each source is optional: a failing one shouldn't block the analysis.
  const [quote, prices, chips, news] = await Promise.allSettled([
    getRealtime([code]).then((q) => q[0] ?? null),
    getPrices(code),
    getChips(code),
    getNews(code),
  ]);
  const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

  const q = ok(quote);
  const p = ok(prices) ?? [];
  const c = ok(chips) ?? [];
  const n = ok(news) ?? [];
  const latestChip = c.at(-1);
  const prevChip = c.at(-2);

  return {
    code,
    name: q?.name ?? code,
    realtime: q && {
      date: q.date,
      time: q.time,
      price: q.price,
      prevClose: q.prevClose,
      change: q.change,
      changePercent: q.changePercent && round(q.changePercent),
      open: q.open,
      high: q.high,
      low: q.low,
      volumeLots: q.volume,
    },
    technicals: technicals(p),
    chips: latestChip && {
      unit: "張（外資持股為 %）",
      latestDate: latestChip.date,
      institutionalNet5d: { foreign: sum(c.slice(-5).map((d) => d.foreign)), trust: sum(c.slice(-5).map((d) => d.trust)), dealer: sum(c.slice(-5).map((d) => d.dealer)) },
      institutionalNet20d: { foreign: sum(c.slice(-20).map((d) => d.foreign)), trust: sum(c.slice(-20).map((d) => d.trust)), dealer: sum(c.slice(-20).map((d) => d.dealer)) },
      last10Days: c.slice(-10).map(({ date, foreign, trust, dealer, total }) => ({ date, foreign, trust, dealer, total })),
      marginBalance: latestChip.marginBalance,
      marginChangeVsPrev: latestChip.marginBalance != null && prevChip?.marginBalance != null ? latestChip.marginBalance - prevChip.marginBalance : null,
      shortBalance: latestChip.shortBalance,
      foreignHoldingPercent: latestChip.foreignRatio,
      foreignHoldingPercent20dAgo: c.at(-21)?.foreignRatio ?? null,
    },
    recentNews: n
      .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 12)
      .map((item) => ({
        publishedAt: taipeiTime.format(new Date(item.publishedAt)), // e.g. "2026-11-01 11:48"
        title: item.title,
        summary: item.summary.slice(0, 160),
      })),
  };
}

// ---------- 2. Ask OpenAI ----------

const SYSTEM_PROMPT = `你是一位專業、審慎、很會用白話解釋的台股研究分析師。你的讀者是「完全沒有投資經驗的新手」。
使用者會提供某一檔台股的即時行情、技術指標、三大法人籌碼與近期新聞（JSON 格式）。

【分析原則】
- 只根據提供的資料分析，不要捏造資料中沒有的數字或事件；資料不足時要直接說明。
- 台股慣例：上漲為利多方向，下跌為利空方向；籌碼單位為「張」（1 張 = 1000 股）。
- 判斷整體是「利多」、「利空」或「中性」，並給 0–100 的信心分數（訊號互相矛盾時分數要低）。
- 給出操作傾向，只能是以下三種之一：
  ・「加碼買進」：多數訊號偏多、風險相對可控時
  ・「賣出」：多數訊號偏空、下跌風險明顯時（對已持有的人而言可考慮減碼或賣出）
  ・「暫時不動」：訊號分歧、資料不足，或方向不明時。拿不定主意時一律選這個。
  這是依據資料推導出的一般性傾向，你不知道讀者的資金、成本、持股與風險承受度，因此不可以寫成保證或命令。

【寫作方式：給新手看】
- 全部用繁體中文、口語白話，像在跟朋友解釋；句子短。
- 出現專有名詞（例如：外資、投信、均線、月線、融資、籌碼、52 週高點）時，第一次出現要用括號簡短說明，例如「外資（外國的大型投資機構）」。
- 數字要說明代表的意義，例如「外資這 5 天賣了約 2.6 萬張，代表大戶在出貨」，而不是只丟數字。
- reasons 列 3–5 點，涵蓋技術面、籌碼面、消息面（資料足夠時才寫基本面），每點引用資料中的數字或新聞。
- watchFor 列 2–3 個「之後可以觀察什麼」，要具體，例如「股價能不能重新站上 2,470 元（月線）」。
- risks 列 2–3 點需要留意的風險。
- glossary 解釋 3–5 個這份分析裡用到、新手最可能看不懂的名詞。`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "verdict",
    "confidence",
    "headline",
    "plainSummary",
    "action",
    "actionReason",
    "watchFor",
    "reasons",
    "risks",
    "glossary",
  ],
  properties: {
    verdict: { type: "string", enum: ["利多", "利空", "中性"] },
    confidence: { type: "integer", description: "0 到 100 的信心分數" },
    headline: { type: "string", description: "一句話白話結論，25 字以內" },
    plainSummary: { type: "string", description: "用 2–3 句白話向新手說明這檔股票現在的狀況，80 字以內" },
    action: { type: "string", enum: ["加碼買進", "賣出", "暫時不動"] },
    actionReason: { type: "string", description: "白話說明為什麼是這個操作傾向，60 字以內" },
    watchFor: { type: "array", items: { type: "string" }, description: "之後可以觀察的具體訊號" },
    reasons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "impact", "point"],
        properties: {
          category: { type: "string", enum: ["技術面", "籌碼面", "消息面", "基本面"] },
          impact: { type: "string", enum: ["利多", "利空", "中性"] },
          point: { type: "string", description: "白話、引用具體數據的理由，70 字以內" },
        },
      },
    },
    risks: { type: "array", items: { type: "string" } },
    glossary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "meaning"],
        properties: {
          term: { type: "string" },
          meaning: { type: "string", description: "新手看得懂的白話解釋，40 字以內" },
        },
      },
    },
  },
} as const;

export class OpenAIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function analyzeWithOpenAI(apiKey: string, model: string, data: unknown): Promise<Analysis> {
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `以下是股票資料：\n${JSON.stringify(data)}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "stock_analysis", strict: true, schema: SCHEMA },
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new OpenAIError(timeout ? "OpenAI 回應逾時，請稍後再試" : "無法連線到 OpenAI", 504);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg: string = body?.error?.message ?? "";
    if (res.status === 401) throw new OpenAIError("OpenAI API Key 無效，請到設定重新輸入", 401);
    if (res.status === 429)
      throw new OpenAIError(
        body?.error?.code === "insufficient_quota" ? "OpenAI 帳戶額度不足，請確認帳單設定" : "OpenAI 請求太頻繁，請稍後再試",
        429,
      );
    if (res.status === 404 || body?.error?.code === "model_not_found")
      throw new OpenAIError(`找不到模型「${model}」，請到設定更換模型名稱`, 400);
    throw new OpenAIError(`OpenAI 錯誤：${msg || res.status}`, 502);
  }

  const message = body?.choices?.[0]?.message;
  if (message?.refusal) throw new OpenAIError(`模型拒絕回答：${message.refusal}`, 502);
  try {
    const a = JSON.parse(message?.content) as Analysis;
    a.confidence = Math.max(0, Math.min(100, Math.round(a.confidence)));
    return a;
  } catch {
    throw new OpenAIError("OpenAI 回傳格式無法解析，請再試一次", 502);
  }
}
