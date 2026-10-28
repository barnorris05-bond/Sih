export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Vibrant top glow: violet primary gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(101,73,232,0.35),transparent_55%)]" />

      {/* Animated violet blob (top-left) */}
      <div className="absolute -left-40 top-24 h-[34rem] w-[34rem] animate-aurora rounded-full bg-violet-500/25 blur-[120px]" />

      {/* Animated electric blue blob (top-right) */}
      <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] animate-aurora rounded-full bg-blue-500/20 blur-[130px] [animation-delay:-8s]" />

      {/* Animated indigo blob (bottom-left) */}
      <div className="absolute bottom-0 left-1/3 h-[26rem] w-[26rem] animate-aurora rounded-full bg-blue-600/15 blur-[140px] [animation-delay:-14s]" />

      {/* Enhanced starfield grid mask */}
      <div className="absolute inset-x-0 top-0 h-[80vh] grid-mask opacity-80" />

      {/* Vignette radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(23,20,58,0)_0%,rgba(23,20,58,0.65)_100%)] light:bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0)_0%,rgba(248,250,252,0.8)_100%)]" />

      {/* Top hairline accent: violet to blue gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 via-30% to-blue-400/60" />
    </div>
  );
}
