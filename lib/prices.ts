import { daysAgoIso, fetchFinMind } from "./finmind";

type FinMindRow = {
  date: string;
  open: number;
  max: number;
  min: number;
  close: number;
  Trading_Volume: number;
};

export type PriceDay = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // shares
};

// About one year of daily prices, oldest first.
export async function getPrices(code: string): Promise<PriceDay[]> {
  const rows = await fetchFinMind<FinMindRow>("TaiwanStockPrice", code, daysAgoIso(365));
  return rows.map((r) => ({
    date: r.date,
    open: r.open,
    high: r.max,
    low: r.min,
    close: r.close,
    volume: r.Trading_Volume,
  }));
}
