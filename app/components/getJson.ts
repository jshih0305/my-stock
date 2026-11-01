export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `請求失敗 (${res.status})`);
  return body;
}

const memo = new Map<string, Promise<unknown>>();

// For data that doesn't change while the page is open (daily history, chips):
// several components can ask for the same URL and share one request.
export function getJsonOnce<T>(url: string): Promise<T> {
  let p = memo.get(url) as Promise<T> | undefined;
  if (!p) {
    p = getJson<T>(url);
    p.catch(() => memo.delete(url));
    memo.set(url, p);
  }
  return p;
}

// For POST/DELETE calls that send (optional) JSON and get JSON back.
export async function sendJson<T>(url: string, method: "POST" | "DELETE", data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `請求失敗 (${res.status})`);
  return body;
}
