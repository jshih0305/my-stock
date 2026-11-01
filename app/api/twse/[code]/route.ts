import { cacheLife } from "next/cache";

const TWSE_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";

type TwseRow = {
  Date: string;
  Code: string;
  Name: string;
  TradeVolume: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
  ClosingPrice: string;
  Change: string;
};

// The upstream returns every listed stock (~1400 rows) and only changes once a day,
// so cache the whole list instead of hitting TWSE on every request.
async function getAllStocks(): Promise<TwseRow[]> {
  "use cache";
  cacheLife("hours");

  const res = await fetch(TWSE_URL);
  if (!res.ok) throw new Error(`TWSE responded ${res.status}`);
  return res.json();
}

// TWSE dates are in ROC format, e.g. "1151030" -> "2026-10-30"
function rocToIso(roc: string) {
  const year = Number(roc.slice(0, -4)) + 1911;
  return `${year}-${roc.slice(-4, -2)}-${roc.slice(-2)}`;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/twse/[code]">) {
  const { code } = await ctx.params;

  let rows: TwseRow[];
  try {
    rows = await getAllStocks();
  } catch {
    return Response.json({ error: "無法取得證交所資料" }, { status: 502 });
  }

  const row = rows.find((r) => r.Code === code);
  if (!row) {
    return Response.json({ error: `找不到股票代號 ${code}` }, { status: 404 });
  }

  const close = Number(row.ClosingPrice);
  const change = Number(row.Change);

  return Response.json({
    code: row.Code,
    name: row.Name,
    date: rocToIso(row.Date),
    open: Number(row.OpeningPrice),
    high: Number(row.HighestPrice),
    low: Number(row.LowestPrice),
    close,
    change,
    changePercent: (change / (close - change)) * 100,
    volume: Number(row.TradeVolume),
  });
}
