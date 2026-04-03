import { useEffect, useRef, useState } from 'react';

export default function StreakPanel({ streak, display }) {
  const [bump, setBump] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setBump(true);
    const t = setTimeout(() => setBump(false), 520);
    return () => clearTimeout(t);
  }, [streak, display.kind]);

  const barTint =
    display.kind === 'active'
      ? 'from-amber-500/30 via-orange-500/15 to-transparent'
      : display.kind === 'frozen'
        ? 'from-sky-500/25 via-cyan-500/12 to-transparent'
        : 'from-red-500/25 via-rose-950/20 to-transparent';

  const glow =
    display.kind === 'active'
      ? 'shadow-[0_0_40px_rgba(251,146,60,0.22)] ring-emerald-400/25'
      : display.kind === 'frozen'
        ? 'shadow-[0_0_34px_rgba(56,189,248,0.18)] ring-sky-400/20'
        : 'shadow-[0_0_38px_rgba(248,113,113,0.22)] ring-red-500/30';

  const ring = display.kind === 'broken' ? 'border-red-500/25' : 'border-white/10';

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border bg-surface-card p-5 shadow-xl transition-all duration-300 ${ring} ${glow} ${
        bump ? 'animate-streak-pop' : ''
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${barTint}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Streak</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl leading-none" aria-hidden>
              {display.emoji}
            </span>
            <p
              key={streak}
              className="text-4xl font-black tabular-nums tracking-tight text-white drop-shadow-sm transition-all duration-300"
            >
              {streak}
            </p>
            <span className="text-sm font-medium text-zinc-400">day{streak === 1 ? '' : 's'}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">{display.headline}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{display.sub}</p>
        </div>
        <div
          className={`hidden h-14 w-14 shrink-0 rounded-2xl border border-white/10 bg-black/20 sm:flex sm:items-center sm:justify-center ${
            display.kind === 'active' ? 'shadow-[0_0_28px_rgba(251,146,60,0.22)]' : ''
          }`}
          aria-hidden
        >
          <span className="text-2xl">{display.emoji}</span>
        </div>
      </div>
    </section>
  );
}
