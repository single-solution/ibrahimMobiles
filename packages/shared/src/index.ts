/**
 * Public surface of `@store/shared`.
 *
 * Framework-light (Next + clsx, no React), app-agnostic utilities used by
 * BOTH the storefront and the admin app. Anything that's only one app's
 * concern lives inside that app's `src/lib`, never here.
 */

export * from "./chat/chatTransport";
export * from "./chat/guestToken";
export * from "./chat/inquiryStatus";
export * from "./chat/poll";
export * from "./chat/types";
export * from "./chat/validators";
export * from "./wireCoercion";
export * from "./icons";
export * from "./classNames";
export * from "./colorContrast";
export * from "./constants";
export * from "./escapeRegex";
export * from "./formatters";
export * from "./logger";
export * from "./loyalty";
export * from "./phone";
export * from "./rateLimit";
export * from "./responseHelpers";
export * from "./seo/composeSeoMeta";
export * from "./seo/seoChecklist";
export * from "./seo/seoMeta";
export * from "./seo/titleTemplate";
export * from "./serverEnv";
export * from "./attributeOption";
export * from "./attributeVisibility";
export * from "./catalog/gradeImages";
export * from "./slug";
export * from "./storage/providers";
export * from "./storage/types";
export * from "./storage/urlPolicy";
export * from "./storeSettings";
export * from "./structuredContent";
export * from "./types";
export * from "./validation";
export * from "./warranty";
