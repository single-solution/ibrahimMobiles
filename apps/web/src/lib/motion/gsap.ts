import type gsapCore from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

type GsapBundle = {
  gsap: typeof gsapCore;
  ScrollTrigger: typeof ScrollTriggerType;
};

let bundlePromise: Promise<GsapBundle> | null = null;
let registered = false;

/** Lazy-load GSAP + ScrollTrigger once per session (keeps them off the critical path). */
export function loadGsap(): Promise<GsapBundle> {
  if (!bundlePromise) {
    bundlePromise = Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ]).then(([gsapMod, stMod]) => {
      const gsap = gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger;
      if (!registered) {
        gsap.registerPlugin(ScrollTrigger);
        registered = true;
      }
      return { gsap, ScrollTrigger };
    });
  }
  return bundlePromise;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Kill every ScrollTrigger tied to a root element (preset teardown). */
export async function killScrollTriggers(root: Element | null): Promise<void> {
  if (!root || typeof window === "undefined") return;
  const { ScrollTrigger } = await loadGsap();
  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger.trigger && root.contains(trigger.trigger as Node)) {
      trigger.kill();
    }
  });
}
