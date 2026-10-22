export async function fireApprovalCelebration(): Promise<void> {
  if (typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#c084fc"];

  confetti({
    particleCount: 90,
    spread: 78,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.62 },
    colors,
    scalar: 0.95,
    disableForReducedMotion: true,
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 55,
      angle: 60,
      spread: 62,
      origin: { x: 0.1, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 55,
      angle: 120,
      spread: 62,
      origin: { x: 0.9, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
  }, 180);

  window.setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      startVelocity: 28,
      decay: 0.92,
      origin: { x: 0.5, y: 0.45 },
      colors,
      disableForReducedMotion: true,
    });
  }, 430);
}
