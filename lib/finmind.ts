import { cacheLife } from "next/cache";

const FINMIND_URL = "https://api.finmindtrade.com/api/v4/data";

// Cached so repeated page loads don't burn through FinMind's hourly request quota.
export async function fetchFinMind<T>(dataset: string, code: string, startDate: string): Promise<T[]> {
  "use cache";
  cacheLife("hours");

  const url = new URL(FINMIND_URL);
  url.searchParams.set("dataset", dataset);
  url.searchParams.set("data_id", code);
  url.searchParams.set("start_date", startDate);

  // Token is optional: without it FinMind allows fewer requests per hour.
  const token = process.env.FINMIND_TOKEN;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const body = await res.json();
  if (!res.ok || body.status !== 200) {
    throw new Error(body.msg ?? `FinMind responded ${res.status}`);
  }
  return body.data;
}

export function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
