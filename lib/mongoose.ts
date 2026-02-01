import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

declare global {
  // For hot-reloading in development to avoid creating multiple connections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

export function connectMongoose() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoosePromise) {
      global._mongoosePromise = mongoose.connect(MONGODB_URI);
    }
    return global._mongoosePromise;
  }
  return mongoose.connect(MONGODB_URI);
}