import { CODE_RE } from "@/lib/watchlist";
import { analyzeWithOpenAI, collectStockData, DEFAULT_MODEL, OpenAIError, type AnalysisResult } from "@/lib/analysis";

const MODEL_RE = /^[\w.:-]{1,64}$/;

// POST /api/analyze/2330
// BYOK: the caller's own OpenAI key arrives in the X-OpenAI-Key header. It is
// used for this one request only — never stored, cached or logged.
export async function POST(req: Request, ctx: RouteContext<"/api/analyze/[code]">) {
  const code = (await ctx.params).code.toUpperCase();
  if (!CODE_RE.test(code)) {
    return Response.json({ error: "股票代號格式不正確" }, { status: 400 });
  }

  const apiKey = req.headers.get("x-openai-key")?.trim();
  if (!apiKey) {
    return Response.json({ error: "請先到設定輸入你的 OpenAI API Key" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;
  if (!MODEL_RE.test(model)) {
    return Response.json({ error: "模型名稱格式不正確" }, { status: 400 });
  }

  const data = await collectStockData(code);
  if (!data.realtime && !data.technicals) {
    return Response.json({ error: `找不到 ${code} 的行情資料，無法分析` }, { status: 404 });
  }

  try {
    const analysis = await analyzeWithOpenAI(apiKey, model, data);
    const result: AnalysisResult = { code, name: data.name, model, generatedAt: new Date().toISOString(), analysis };
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof OpenAIError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "AI 分析失敗，請稍後再試" }, { status: 500 });
  }
}
