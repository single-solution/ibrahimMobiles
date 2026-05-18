import mongoose from "mongoose";
import { logger } from "@store/shared";

/**
 * Resolve `MONGODB_URI` lazily so that importing this module at build time
 * (when Next.js traces dependencies for static analysis) does not throw.
 * Only when `connectDB()` is actually invoked do we require the env var.
 */
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

if (!global.mongooseCache?.conn) {
  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("error", (error) => logger.error({ error }, "MongoDB connection error"));
}

/**
 * Connect to MongoDB using a module-level singleton so that hot-module
 * reloads (Next.js dev server) and serverless cold starts share one connection
 * rather than opening a new pool on every invocation.
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
      // 15s ceiling on server selection + initial TCP — long enough to ride
      // out a slow Atlas region cold-start, short enough that a truly dead
      // cluster fails fast instead of hanging every Next.js request.
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
      // Connection-pool sizing. Next.js dev + a small admin app rarely run
      // more than ~10 concurrent in-flight queries, so 25 max gives plenty
      // of headroom without burning Atlas connections. minPoolSize=2 keeps
      // a warm socket pair so the first query after a quiet period doesn't
      // pay the TCP+TLS+SCRAM handshake again.
      maxPoolSize: 25,
      minPoolSize: 2,
      // Idle sockets in the pool get torn down after 60s. Combined with
      // `minPoolSize`, the pool self-heals without leaking idle connections.
      maxIdleTimeMS: 60_000,
      // Wire-level compression. zstd is the fastest and most compact of
      // the supported algorithms; the driver negotiates `snappy`/`zlib`
      // as fallbacks if the server doesn't support zstd. Cuts payload
      // bytes on big aggregations by ~3–5×.
      compressors: ["zstd", "snappy", "zlib"],
      // Driver-level retry for transient read errors. Writes already retry
      // by default on Atlas; this makes reads symmetric.
      retryReads: true,
      retryWrites: true,
      // Auto-create indexes from schema definitions in dev (so adding an
      // `index()` call in `Product.ts` takes effect on the next start),
      // skip in production where indexes should be managed deliberately
      // and never block boot. Mongoose's default is `true`, which costs
      // ~tens of seconds against large collections every server start.
      autoIndex: process.env.NODE_ENV !== "production",
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
