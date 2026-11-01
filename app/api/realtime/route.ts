import type { NextRequest } from "next/server";
import { getRealtime } from "@/lib/mis";

const MAX_CODES = 20;

// Batch quotes: /api/realtime?codes=2330,2317,2454
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

  try {
    return Response.json({ quotes: await getRealtime(codes) });
  } catch {
    return Response.json({ error: "無法取得即時行情" }, { status: 502 });
  }
}
