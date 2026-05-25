/**
 * Image source candidates per product slug.
 *
 * Each entry lists candidate web pages to scrape for product images.
 * The discover script will:
 *   1. Fetch each page
 *   2. Extract `og:image` (always 1 high-quality hero)
 *   3. Extract additional product/swatch images from the page
 *   4. De-duplicate and save them to `tmp/product-images/<slug>/`
 *
 * Pages are tried in order; once we have >= TARGET_IMAGES per slug we stop.
 * Goal: at least 2–4 images per product so grades can show different photos.
 */

export const TARGET_IMAGES_PER_PRODUCT = 4;

export const SOURCES = {
  // ───────────────── Apple iPhones ─────────────────
  "apple-iphone-16-pro-max": [
    { url: "https://en.wikipedia.org/wiki/IPhone_16_Pro", source: "wikipedia" },
    { url: "https://www.apple.com/shop/buy-iphone/iphone-16-pro", source: "apple" },
    { url: "https://www.apple.com/iphone-16-pro/", source: "apple" },
  ],
  "apple-iphone-16-pro": [
    { url: "https://en.wikipedia.org/wiki/IPhone_16_Pro", source: "wikipedia" },
    { url: "https://www.apple.com/iphone-16-pro/", source: "apple" },
    { url: "https://www.apple.com/shop/buy-iphone/iphone-16-pro", source: "apple" },
  ],
  "apple-iphone-16-plus": [
    { url: "https://en.wikipedia.org/wiki/IPhone_16", source: "wikipedia" },
    { url: "https://www.apple.com/iphone-16/", source: "apple" },
    { url: "https://www.apple.com/shop/buy-iphone/iphone-16", source: "apple" },
  ],
  "apple-iphone-16": [
    { url: "https://en.wikipedia.org/wiki/IPhone_16", source: "wikipedia" },
    { url: "https://www.apple.com/iphone-16/", source: "apple" },
    { url: "https://www.apple.com/shop/buy-iphone/iphone-16", source: "apple" },
  ],

  // ───────────────── Samsung Galaxy ─────────────────
  // Samsung Mobile Press is the gold source — pure white-background press photos.
  "samsung-galaxy-s25-ultra": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-s25-ultra", source: "samsung-press" },
    { url: "https://en.wikipedia.org/wiki/Samsung_Galaxy_S25_Ultra", source: "wikipedia" },
  ],
  "samsung-galaxy-s25-plus": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-s25-plus", source: "samsung-press" },
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-s25-and-s25-plus", source: "samsung-press" },
  ],
  "samsung-galaxy-s25": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-s25", source: "samsung-press" },
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-s25-and-s25-plus", source: "samsung-press" },
  ],
  "samsung-galaxy-z-fold-6": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-z-fold6", source: "samsung-press" },
    { url: "https://en.wikipedia.org/wiki/Samsung_Galaxy_Z_Fold6", source: "wikipedia" },
  ],
  "samsung-galaxy-z-flip-6": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-z-flip6", source: "samsung-press" },
    { url: "https://en.wikipedia.org/wiki/Samsung_Galaxy_Z_Flip_6", source: "wikipedia" },
  ],

  // ───────────────── Google Pixel ─────────────────
  "google-pixel-9-pro-xl": [
    { url: "https://en.wikipedia.org/wiki/Pixel_9", source: "wikipedia" },
    { url: "https://store.google.com/us/product/pixel_9_pro?hl=en-US", source: "google-store" },
  ],
  "google-pixel-9-pro": [
    { url: "https://en.wikipedia.org/wiki/Pixel_9", source: "wikipedia" },
    { url: "https://store.google.com/us/product/pixel_9_pro?hl=en-US", source: "google-store" },
  ],
  "google-pixel-9": [
    { url: "https://en.wikipedia.org/wiki/Pixel_9", source: "wikipedia" },
    { url: "https://store.google.com/us/product/pixel_9?hl=en-US", source: "google-store" },
  ],
  "google-pixel-9-pro-fold": [
    { url: "https://en.wikipedia.org/wiki/Pixel_9_Pro_Fold", source: "wikipedia" },
    { url: "https://store.google.com/us/product/pixel_9_pro_fold?hl=en-US", source: "google-store" },
  ],

  // ───────────────── Oppo ─────────────────
  "oppo-find-x8-pro": [
    { url: "https://www.oppo.com/en/smartphones/series-find-x/find-x8-pro/", source: "oppo" },
    { url: "https://www.oppo.com/in/smartphones/series-find-x/find-x8-pro/", source: "oppo" },
    { url: "https://www.oppo.com/sg/smartphones/series-find-x/find-x8-pro/", source: "oppo" },
    { url: "https://www.oppo.com/lu/smartphones/series-find-x/find-x8-pro/", source: "oppo" },
    { url: "https://en.wikipedia.org/wiki/Oppo_Find_X8_Pro", source: "wikipedia" },
  ],
  "oppo-find-x8": [
    { url: "https://www.oppo.com/en/smartphones/series-find-x/find-x8/", source: "oppo" },
    { url: "https://www.oppo.com/in/smartphones/series-find-x/find-x8/", source: "oppo" },
    { url: "https://www.oppo.com/sg/smartphones/series-find-x/find-x8/", source: "oppo" },
    { url: "https://en.wikipedia.org/wiki/Oppo_Find_X8", source: "wikipedia" },
  ],
  "oppo-reno-12-pro": [
    { url: "https://www.oppo.com/en/smartphones/series-reno/reno12-pro/", source: "oppo" },
    { url: "https://www.oppo.com/in/smartphones/series-reno/reno12-pro/", source: "oppo" },
    { url: "https://www.oppo.com/sg/smartphones/series-reno/reno12-pro/", source: "oppo" },
  ],

  // ───────────────── Accessories ─────────────────
  // Apple accessories — direct CDN URLs by SKU. Pattern:
  //   https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/<SKU>?wid=890&hei=890&fmt=png-alpha
  // Verified working for all SKUs below.
  "apple-20w-usb-c-power-adapter": [
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MWVV3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MHJA3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MWVV3?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MUVT3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true },
  ],
  "apple-magsafe-charger": [
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MX6X3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MHXH3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MX6X3?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MHXH3?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
  ],
  "apple-usb-c-to-lightning-cable-1m": [
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MUQ93?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MM0A3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MUQ93?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
  ],
  "apple-iphone-16-pro-max-silicone-case": [
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MYYT3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true }, // Black
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MYYV3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true }, // Stone Gray
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MYYW3?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true }, // Plum
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MDGW4?wid=890&hei=890&fmt=png-alpha", source: "apple-cdn", direct: true }, // Peony
  ],

  // Samsung accessories — scrape the US accessory product page; images live at
  //   https://images.samsung.com/is/image/samsung/p6pim/us/<sku>/gallery/...
  "samsung-25w-usb-c-power-adapter": [
    { url: "https://www.samsung.com/us/mobile/mobile-accessories/phones/25w-pd-power-adapter-with-usb-c-cable-white-ep-t2510xwegus/", source: "samsung" },
    { url: "https://www.samsung.com/us/business/mobile-accessories/25w-pd-power-adapter-with-usb-c-cable-white-sku-ep-t2510xwegus/", source: "samsung" },
  ],
  "samsung-45w-super-fast-charger": [
    { url: "https://www.samsung.com/us/mobile-accessories/45w-pd-power-adapter-with-5a-usb-c-cable-black-sku-ep-t4511xbegus/", source: "samsung" },
    { url: "https://www.samsung.com/us/mobile/mobile-accessories/phones/45w-pd-power-adapter-ep-t4511nbegus/", source: "samsung" },
  ],
  "samsung-usb-c-to-usb-c-cable-1m": [
    { url: "https://www.samsung.com/us/mobile-accessories/1-8m-cable-3a-black-sku-ep-dx310jbegus/", source: "samsung" },
  ],
  "samsung-galaxy-s25-ultra-tempered-glass": [
    { url: "https://www.samsung.com/nz/mobile-accessories/galaxy-s25-ultra-anti-reflecting-film-transparent-ef-us938ctegww/", source: "samsung" },
    { url: "https://www.samsung.com/uk/mobile-accessories/galaxy-s25-ultra-anti-reflecting-film-transparent-ef-us938ctegww/", source: "samsung" },
    { url: "https://www.samsung.com/au/mobile-accessories/galaxy-s25-ultra-anti-reflecting-film-transparent-ef-us938ctegww/", source: "samsung" },
    { url: "https://www.samsung.com/sg/mobile-accessories/galaxy-s25-ultra-anti-reflecting-film-transparent-ef-us938ctegww/", source: "samsung" },
  ],
  "google-pixel-9-pro-xl-tempered-glass": [
    { url: "https://store.google.com/us/category/pixel_accessories?hl=en-US", source: "google-store" },
  ],
  "google-usb-c-to-usb-c-cable-1m": [
    // Direct Google Store image URLs verified for the official "Google USB-C to USB-C Cable" product page
    { url: "https://lh3.googleusercontent.com/TmTXOc4WY5vEJwthTKuU07PDWvnOyQvl8mMCH9RVUi0C5niJXMObefpxdgho0Tjg9l4d=s2000-w2000", source: "google-store", direct: true },
    { url: "https://lh3.googleusercontent.com/BgGdMUvK1RaX5KbM1iVnDQ0P-uaZ35hhGZM8jgE2F4r7t7h8cPlNeHCz5YIEeV1MxJ4=s2000-w2000", source: "google-store", direct: true },
    { url: "https://store.google.com/us/product/usb_type_c_usb_type_c?hl=en-US", source: "google-store" },
  ],

  // ───────────────── Audio gadgets ─────────────────
  "apple-airpods-pro-2": [
    { url: "https://en.wikipedia.org/wiki/AirPods_Pro", source: "wikipedia" },
    { url: "https://www.apple.com/airpods-pro/", source: "apple" },
    { url: "https://www.apple.com/shop/buy-airpods/airpods-pro-2", source: "apple" },
  ],
  "apple-airpods-max": [
    { url: "https://en.wikipedia.org/wiki/AirPods_Max", source: "wikipedia" },
    { url: "https://www.apple.com/airpods-max/", source: "apple" },
    { url: "https://www.apple.com/shop/buy-airpods/airpods-max", source: "apple" },
  ],
  "samsung-galaxy-buds-3-pro": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-buds3-pro", source: "samsung-press" },
    { url: "https://en.wikipedia.org/wiki/Samsung_Galaxy_Buds3_Pro", source: "wikipedia" },
  ],

  // ───────────────── Watches ─────────────────
  // Apple Watch direct CDN URLs (2024 era = Series 10 / Ultra 2 lineup).
  // Apple's shop pages now default to Series 11 (Sep 2025), so we pin the
  // 2024 gallery SKUs directly instead of scraping the page.
  "apple-watch-series-10-46mm-gps": [
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s10-case-unselect-gallery-1-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s10-case-unselect-gallery-2-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s10-case-unselect-gallery-3-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/apple-watch-s10-og-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
  ],
  "apple-watch-ultra-2-49mm": [
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ultra-case-unselect-gallery-1-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ultra-case-unselect-gallery-2-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ultra-case-unselect-gallery-3-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
    { url: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/apple-watch-ultra-og-202409?wid=1144&hei=1144&fmt=png-alpha", source: "apple-cdn", direct: true },
  ],
  "samsung-galaxy-watch-7-44mm": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-watch7", source: "samsung-press" },
    { url: "https://en.wikipedia.org/wiki/Samsung_Galaxy_Watch_7", source: "wikipedia" },
  ],
  "samsung-galaxy-watch-ultra-46mm": [
    { url: "https://www.samsungmobilepress.com/media-assets/galaxy-watch-ultra", source: "samsung-press" },
    { url: "https://en.wikipedia.org/wiki/Samsung_Galaxy_Watch_Ultra", source: "wikipedia" },
  ],
};
