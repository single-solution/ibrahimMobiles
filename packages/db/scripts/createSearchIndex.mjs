/**
 * Create (or report) the Atlas Search index that powers the chat assistant's
 * `searchCatalog`. Run once per environment after the cluster is on Atlas:
 *
 *   MONGODB_URI="<atlas-srv-uri>" node packages/db/scripts/createSearchIndex.mjs
 *
 * Optional overrides:
 *   MONGODB_SEARCH_INDEX  index name (default "products_search")
 *
 * The index maps `name` for both full-token (text) and prefix (autocomplete)
 * matching, plus brand/category slugs and the public-visibility flags so the
 * query can filter and rank in a single indexed pass. Idempotent: if the index
 * already exists the script reports it and exits cleanly.
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Pass it inline or via your env file.");
  process.exit(1);
}

const indexName = process.env.MONGODB_SEARCH_INDEX?.trim() || "products_search";
const collectionName = "products";

const definition = {
  mappings: {
    dynamic: false,
    fields: {
      name: [
        { type: "string" },
        {
          type: "autocomplete",
          tokenization: "edgeGram",
          minGrams: 2,
          maxGrams: 15,
          foldDiacritics: true,
        },
      ],
      brandSlug: { type: "string" },
      categorySlug: { type: "string" },
      isActive: { type: "boolean" },
      isArchived: { type: "boolean" },
    },
  },
};

async function main() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection(collectionName);

  const existing = await collection.listSearchIndexes().toArray();
  if (existing.some((index) => index.name === indexName)) {
    console.log(`Search index "${indexName}" already exists on "${collectionName}". Nothing to do.`);
    return;
  }

  await collection.createSearchIndex({ name: indexName, definition });
  console.log(
    `Created Atlas Search index "${indexName}" on "${collectionName}". It may take a minute to build before queries use it.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to create Atlas Search index:", error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => {
    void mongoose.disconnect();
  });
