import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register GSAP plugins once per browser session. */
export function ensureGsapPlugins(): typeof gsap {
  if (typeof window === "undefined") {
    return gsap;
  }
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return gsap;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Kill every ScrollTrigger tied to a root element (preset teardown). */
export function killScrollTriggers(root: Element | null): void {
  if (!root || typeof window === "undefined") return;
  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger.trigger && root.contains(trigger.trigger as Node)) {
      trigger.kill();
    }
  });
}

export { gsap, ScrollTrigger };
