import { getChips, type ChipDay } from "@/lib/chips";

export type { ChipDay };

export async function GET(_req: Request, ctx: RouteContext<"/api/finmind/[code]/chips">) {
  const { code } = await ctx.params;

  let days: ChipDay[];
  try {
    days = await getChips(code);
  } catch {
    return Response.json({ error: "無法取得 FinMind 籌碼資料" }, { status: 502 });
  }
  return Response.json({ code, days });
}
