import { daysAgoIso, fetchFinMind } from "./finmind";

type InstitutionalRow = { date: string; name: string; buy: number; sell: number };
type MarginRow = {
  date: string;
  MarginPurchaseTodayBalance: number;
  ShortSaleTodayBalance: number;
};
type ShareholdingRow = { date: string; ForeignInvestmentSharesRatio: number };

// FinMind splits institutions into five rows; group them into the usual three.
const GROUP: Record<string, "foreign" | "trust" | "dealer"> = {
  Foreign_Investor: "foreign",
  Foreign_Dealer_Self: "foreign",
  Investment_Trust: "trust",
  Dealer_self: "dealer",
  Dealer_Hedging: "dealer",
};

export type ChipDay = {
  date: string;
  // Net buy/sell in lots (張, 1 lot = 1000 shares)
  foreign: number;
  trust: number;
  dealer: number;
  total: number;
  marginBalance: number | null; // 融資餘額 (張)
  shortBalance: number | null; // 融券餘額 (張)
  foreignRatio: number | null; // 外資持股比例 (%)
};

// Daily institutional flows, margin balances and foreign holding for ~90 days, oldest first.
export async function getChips(code: string): Promise<ChipDay[]> {
  const start = daysAgoIso(90);
  const [institutional, margin, shareholding] = await Promise.all([
    fetchFinMind<InstitutionalRow>("TaiwanStockInstitutionalInvestorsBuySell", code, start),
    fetchFinMind<MarginRow>("TaiwanStockMarginPurchaseShortSale", code, start),
    fetchFinMind<ShareholdingRow>("TaiwanStockShareholding", code, start),
  ]);

  const days = new Map<string, ChipDay>();
  const day = (date: string) => {
    let d = days.get(date);
    if (!d) {
      d = { date, foreign: 0, trust: 0, dealer: 0, total: 0, marginBalance: null, shortBalance: null, foreignRatio: null };
      days.set(date, d);
    }
    return d;
  };

  for (const r of institutional) {
    const group = GROUP[r.name];
    if (!group) continue;
    const net = Math.round((r.buy - r.sell) / 1000);
    const d = day(r.date);
    d[group] += net;
    d.total += net;
  }
  for (const r of margin) {
    const d = day(r.date);
    d.marginBalance = r.MarginPurchaseTodayBalance;
    d.shortBalance = r.ShortSaleTodayBalance;
  }
  for (const r of shareholding) {
    day(r.date).foreignRatio = r.ForeignInvestmentSharesRatio;
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
