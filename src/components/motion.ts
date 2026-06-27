import type { Variants } from "framer-motion";

// Shared, enterprise-grade motion. Subtle vertical motion (12–24px), smooth
// ease-out. Reduced-motion is honored globally via <MotionConfig reducedMotion="user">.
const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export const logRow: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

// Re-enter animations once when scrolled into view.
export const VIEWPORT = { once: true, amount: 0.2 } as const;
