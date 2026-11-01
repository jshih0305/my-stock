import { connectDB } from "./db";
import { Watchlist } from "./models/Watchlist";

// Seeded into the database the first time the list is read.
export const DEFAULT_WATCHLIST = ["2330", "2317", "2454", "2308", "2881"];
export const MAX_WATCHLIST = 20; // /api/realtime accepts at most 20 codes per call
export const CODE_RE = /^[0-9A-Z]{4,6}$/;

const KEY = "default"; // single-user app: one shared list

export async function getWatchlist(): Promise<string[]> {
  await connectDB();
  const doc = await Watchlist.findOneAndUpdate(
    { key: KEY },
    { $setOnInsert: { codes: DEFAULT_WATCHLIST } },
    { upsert: true, returnDocument: "after", lean: true },
  );
  return doc!.codes;
}

export async function addToWatchlist(code: string): Promise<string[]> {
  await getWatchlist(); // make sure the document exists (and is seeded)
  const doc = await Watchlist.findOneAndUpdate(
    { key: KEY, codes: { $ne: code } },
    { $push: { codes: code } },
    { returnDocument: "after", lean: true },
  );
  return doc ? doc.codes : getWatchlist(); // null = already in the list
}

export async function removeFromWatchlist(code: string): Promise<string[]> {
  await getWatchlist();
  const doc = await Watchlist.findOneAndUpdate(
    { key: KEY },
    { $pull: { codes: code } },
    { returnDocument: "after", lean: true },
  );
  return doc!.codes;
}
