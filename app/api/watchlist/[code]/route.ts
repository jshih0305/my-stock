import { removeFromWatchlist } from "@/lib/watchlist";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/watchlist/[code]">) {
  const { code } = await ctx.params;
  try {
    return Response.json({ codes: await removeFromWatchlist(code.toUpperCase()) });
  } catch {
    return Response.json({ error: "移除失敗（資料庫連線失敗）" }, { status: 500 });
  }
}
