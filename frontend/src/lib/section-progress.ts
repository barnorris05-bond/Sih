"use client";

import { useMotionValue, type MotionValue } from "framer-motion";
import { useEffect, type RefObject } from "react";

export function useSectionProgress(ref: RefObject<HTMLElement>, reduced: boolean): MotionValue<number> {
  const progress = useMotionValue(0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = ref.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const span = Math.max(window.innerHeight + element.offsetHeight, 1);
        progress.set(Math.min(1, Math.max(0, (window.innerHeight - rect.top) / span)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [reduced, ref, progress]);
  return progress;
}
