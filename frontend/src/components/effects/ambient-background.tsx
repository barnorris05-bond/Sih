export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(79,70,229,0.28),transparent_55%)]" />
      <div className="absolute -left-40 top-24 h-[34rem] w-[34rem] animate-aurora rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] animate-aurora rounded-full bg-sky-500/15 blur-[130px] [animation-delay:-8s]" />
      <div className="absolute bottom-0 left-1/3 h-[26rem] w-[26rem] animate-aurora rounded-full bg-violet-600/10 blur-[140px] [animation-delay:-14s]" />
      <div className="absolute inset-x-0 top-0 h-[80vh] grid-mask opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(2,6,23,0)_0%,rgba(2,6,23,0.55)_100%)] light:bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0)_0%,rgba(248,250,252,0.8)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
    </div>
  );
}
