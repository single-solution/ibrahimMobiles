/**
 * Merge duplicate chat threads so each signed-in customer holds exactly ONE
 * conversation, then create the unique `customerId` index that keeps it that
 * way. Run once per environment before deploying the unique-index schema:
 *
 *   MONGODB_URI="<srv-uri>" node packages/db/scripts/mergeDuplicateInquiries.mjs
 *
 * For every `customerId` with more than one inquiry, the oldest doc (by
 * `createdAt`) is the canonical thread; the rest have their messages appended
 * chronologically and are then deleted. Idempotent: re-running after a clean
 * pass finds no duplicates and only ensures the index exists.
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Pass it inline or via your env file.");
  process.exit(1);
}

const INDEX_NAME = "customerId_unique";

function sortedByCreatedAt(messages) {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

async function mergeGroup(collection, customerId) {
  const docs = await collection
    .find({ customerId })
    .sort({ createdAt: 1 })
    .toArray();
  if (docs.length <= 1) {
    return 0;
  }

  const canonical = docs[0];
  const others = docs.slice(1);
  const messages = sortedByCreatedAt(docs.flatMap((doc) => doc.messages ?? []));
  const last = messages[messages.length - 1];
  const subjectProductId = docs.find((doc) => doc.subjectProductId)?.subjectProductId ?? null;
  const subjectProductName = docs.find((doc) => doc.subjectProductName)?.subjectProductName ?? null;

  await collection.updateOne(
    { _id: canonical._id },
    {
      $set: {
        messages,
        status: last?.author === "customer" ? "open" : canonical.status,
        lastMessageAt: last?.createdAt ?? canonical.lastMessageAt,
        lastMessagePreview: (last?.body ?? canonical.lastMessagePreview ?? "").slice(0, 280),
        lastMessageAuthor: last?.author ?? canonical.lastMessageAuthor,
        unreadByCustomer: docs.reduce((sum, doc) => sum + (doc.unreadByCustomer ?? 0), 0),
        unreadByTeam: docs.reduce((sum, doc) => sum + (doc.unreadByTeam ?? 0), 0),
        ...(subjectProductId ? { subjectProductId } : {}),
        ...(subjectProductName ? { subjectProductName } : {}),
      },
    },
  );
  await collection.deleteMany({ _id: { $in: others.map((doc) => doc._id) } });

  return others.length;
}

async function main() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection("inquiries");

  const groups = await collection
    .aggregate([
      { $match: { customerId: { $type: "objectId" } } },
      { $group: { _id: "$customerId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  let removed = 0;
  for (const group of groups) {
    removed += await mergeGroup(collection, group._id);
  }
  console.log(
    `Merged duplicates for ${groups.length} customer(s); deleted ${removed} redundant thread(s).`,
  );

  await collection.createIndex(
    { customerId: 1 },
    {
      name: INDEX_NAME,
      unique: true,
      partialFilterExpression: { customerId: { $type: "objectId" } },
    },
  );
  console.log(`Ensured unique index "${INDEX_NAME}" on inquiries.customerId.`);
}

main()
  .catch((error) => {
    console.error("Failed to merge duplicate inquiries:", error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => {
    void mongoose.disconnect();
  });
