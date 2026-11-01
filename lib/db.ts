import mongoose from "mongoose";

// Reuse one connection across hot reloads in dev and across requests in prod.
const g = globalThis as typeof globalThis & { _mongoose?: Promise<typeof mongoose> };

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env.local");
  g._mongoose ??= mongoose.connect(uri).catch((e) => {
    g._mongoose = undefined; // allow a retry on the next request
    throw e;
  });
  return g._mongoose;
}
