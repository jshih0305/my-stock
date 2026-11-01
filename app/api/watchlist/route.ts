import { getRealtime } from "@/lib/mis";
import { addToWatchlist, getWatchlist, CODE_RE, MAX_WATCHLIST } from "@/lib/watchlist";

export async function GET() {
  try {
    return Response.json({ codes: await getWatchlist() });
  } catch {
    return Response.json({ error: "無法讀取追蹤清單（資料庫連線失敗）" }, { status: 500 });
  }
}

// Body: { "code": "2603" }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return Response.json({ error: "股票代號格式不正確（4–6 碼，例如 2603）" }, { status: 400 });
  }

  let codes: string[];
  try {
    codes = await getWatchlist();
  } catch {
    return Response.json({ error: "無法讀取追蹤清單（資料庫連線失敗）" }, { status: 500 });
  }
  if (codes.includes(code)) {
    return Response.json({ error: `${code} 已在追蹤清單中` }, { status: 409 });
  }
  if (codes.length >= MAX_WATCHLIST) {
    return Response.json({ error: `追蹤清單最多 ${MAX_WATCHLIST} 檔` }, { status: 400 });
  }

  // Only accept codes TWSE MIS actually knows about.
  try {
    const [quote] = await getRealtime([code]);
    if (!quote) return Response.json({ error: `找不到股票代號 ${code}` }, { status: 404 });
  } catch {
    return Response.json({ error: "無法驗證股票代號，請稍後再試" }, { status: 502 });
  }

  try {
    return Response.json({ codes: await addToWatchlist(code) }, { status: 201 });
  } catch {
    return Response.json({ error: "儲存失敗（資料庫連線失敗）" }, { status: 500 });
  }
}
