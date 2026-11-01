import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// One document holds the whole list so the tile order is preserved.
const watchlistSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    codes: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type WatchlistDoc = InferSchemaType<typeof watchlistSchema>;

export const Watchlist: Model<WatchlistDoc> =
  mongoose.models.Watchlist ?? mongoose.model<WatchlistDoc>("Watchlist", watchlistSchema);
