/**
 * Public surface of `@store/db`.
 *
 * Apps import everything from this barrel so we can rearrange the internal
 * file layout without breaking consumers. Both the customer-facing storefront
 * and the admin app reach into the same MongoDB cluster through this package
 * — there is no second source of truth.
 */

export { connectDB } from "./connection";
export { handleMongoError, isMongoDuplicateKeyError } from "./mongoErrors";
export { nextOrderNumberForYear, createWithUniqueOrderNumber } from "./orderNumber";
export { getStoreSettings, invalidateStoreSettingsCache } from "./storeSettings";

export * from "./models";
