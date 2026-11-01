import { cacheLife } from "next/cache";

// Undocumented endpoint used by TWSE's own quote site (mis.twse.com.tw).
// Snapshots update about every 5 seconds during trading hours.
const MIS_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp";

type MisRow = Record<string, string>;

export type Realtime = {
  code: string;
  name: string;
  exchange: string;
  date: string;
  time: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null; // 累積成交量 (張)
  bestBid: number | null;
  bestAsk: number | null;
};

// One upstream call for all codes, cached briefly so many viewers polling at
// once only hit TWSE about once a second.
async function fetchRows(codes: string[]): Promise<MisRow[]> {
  "use cache";
  cacheLife("seconds");

  // Ask for both exchanges; only the one each stock is listed on returns data.
  const exCh = codes.flatMap((c) => [`tse_${c}.tw`, `otc_${c}.tw`]).join("|");
  const res = await fetch(`${MIS_URL}?ex_ch=${exCh}&json=1&delay=0`);
  if (!res.ok) throw new Error(`MIS responded ${res.status}`);
  const body = await res.json();
  return body.msgArray;
}

const num = (s: string | undefined) => {
  const n = Number(s);
  return s && s !== "-" && Number.isFinite(n) ? n : null;
};
const firstLevel = (s: string | undefined) => num(s?.split("_")[0]);

function toRealtime(row: MisRow): Realtime {
  const prevClose = num(row.y);
  // "z" is "-" when no trade happened in this snapshot; fall back to the best bid.
  const price = num(row.z) ?? num(row.pz) ?? firstLevel(row.b);
  const change = price !== null && prevClose !== null ? price - prevClose : null;

  return {
    code: row.c,
    name: row.n,
    exchange: row.ex,
    date: `${row.d.slice(0, 4)}-${row.d.slice(4, 6)}-${row.d.slice(6)}`,
    time: row.t,
    price,
    prevClose,
    change,
    changePercent: change !== null && prevClose ? (change / prevClose) * 100 : null,
    open: num(row.o),
    high: num(row.h),
    low: num(row.l),
    volume: num(row.v),
    bestBid: firstLevel(row.b),
    bestAsk: firstLevel(row.a),
  };
}

// Returns quotes in the same order as `codes`; unknown codes are omitted.
export async function getRealtime(codes: string[]): Promise<Realtime[]> {
  const rows = await fetchRows(codes);
  return codes.flatMap((code) => {
    const row = rows.find((r) => r.c === code);
    return row ? [toRealtime(row)] : [];
  });
}
