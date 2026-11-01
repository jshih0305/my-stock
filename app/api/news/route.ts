import type { NextRequest } from "next/server";
import { getNews, type NewsItem } from "@/lib/yahooNews";

const MAX_CODES = 10;

// News for one or more stocks, newest first: /api/news?codes=2330,2317
export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^\w{4,6}$/.test(c));

  if (!codes.length) {
    return Response.json({ error: "請提供 codes 參數，例如 ?codes=2330,2317" }, { status: 400 });
  }
  if (codes.length > MAX_CODES) {
    return Response.json({ error: `一次最多查詢 ${MAX_CODES} 檔` }, { status: 400 });
  }

  // One failing feed shouldn't hide news for the other stocks.
  const results = await Promise.allSettled(codes.map(getNews));
  const items: NewsItem[] = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (!items.length && results.some((r) => r.status === "rejected")) {
    return Response.json({ error: "無法取得 Yahoo 新聞" }, { status: 502 });
  }

  // The same article can show up under several stocks; merge them into one entry.
  const byLink = new Map<string, Omit<NewsItem, "code"> & { codes: string[] }>();
  for (const { code, ...item } of items) {
    const existing = byLink.get(item.link);
    if (existing) existing.codes.push(code);
    else byLink.set(item.link, { ...item, codes: [code] });
  }

  return Response.json({
    items: [...byLink.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  });
}
