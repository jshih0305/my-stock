import { cacheLife } from "next/cache";

const RSS_URL = "https://tw.stock.yahoo.com/rss";

export type NewsItem = {
  code: string;
  title: string;
  link: string;
  publishedAt: string; // ISO
  summary: string;
  isAnnouncement: boolean; // 公司重大訊息公告
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === "#") return String.fromCodePoint(parseInt(e.slice(e[1] === "x" ? 2 : 1), e[1] === "x" ? 16 : 10));
      return ENTITIES[e] ?? m;
    })
    .trim();
}

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : "";
}

// The feed is small and regular, so a couple of regexes are enough; no XML parser needed.
function parseRss(xml: string, code: string): NewsItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const title = tag(item, "title");
    return {
      code,
      title,
      link: tag(item, "link"),
      publishedAt: new Date(tag(item, "pubDate")).toISOString(),
      summary: tag(item, "description").replace(/<[^>]+>/g, ""),
      isAnnouncement: title.startsWith("【公告】"),
    };
  });
}

// The feed declares a 5 minute TTL, so cache for minutes rather than hours.
export async function getNews(code: string): Promise<NewsItem[]> {
  "use cache";
  cacheLife("minutes");

  const res = await fetch(`${RSS_URL}?s=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`Yahoo RSS responded ${res.status}`);
  return parseRss(await res.text(), code);
}
