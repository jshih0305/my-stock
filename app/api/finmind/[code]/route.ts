import { getPrices, type PriceDay } from "@/lib/prices";

export async function GET(_req: Request, ctx: RouteContext<"/api/finmind/[code]">) {
  const { code } = await ctx.params;

  let prices: PriceDay[];
  try {
    prices = await getPrices(code);
  } catch {
    return Response.json({ error: "無法取得 FinMind 資料" }, { status: 502 });
  }
  return Response.json({ code, prices });
}
