import { getRealtime } from "@/lib/mis";

export async function GET(_req: Request, ctx: RouteContext<"/api/realtime/[code]">) {
  const { code } = await ctx.params;

  let quotes;
  try {
    quotes = await getRealtime([code]);
  } catch {
    return Response.json({ error: "無法取得即時行情" }, { status: 502 });
  }
  if (!quotes.length) {
    return Response.json({ error: `找不到股票代號 ${code}` }, { status: 404 });
  }
  return Response.json(quotes[0]);
}
