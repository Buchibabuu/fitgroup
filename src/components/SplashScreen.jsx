export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#06060a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(234,179,8,0.12),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(168,85,247,0.1),transparent_45%)]" />
      <div className="relative flex flex-col items-center px-6">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-400/20 via-zinc-900 to-zinc-950 shadow-[0_0_48px_rgba(251,191,36,0.25)]">
          <span className="text-3xl font-black tracking-tighter text-amber-300">FG</span>
        </div>
        <h1 className="bg-gradient-to-r from-amber-200 via-white to-fuchsia-200 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          FitGroup
        </h1>
        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
          Squad up · Stack wins
        </p>
        <div className="mt-10 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-6 rounded-full bg-gradient-to-r from-amber-500 to-fuchsia-500 opacity-80 animate-pulse"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
