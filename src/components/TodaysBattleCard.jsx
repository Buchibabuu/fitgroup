import { Link } from 'react-router-dom';
import { getExerciseLinesForUi, parsePlanDay } from '../lib/planDay';

export default function TodaysBattleCard({
  todayLabel,
  dayName,
  todayPlan,
  todayRow,
  statusLabel,
  completionPct,
  completionHint,
  battleEmoji,
  battleSubtitle,
  onMarkDone,
  onMarkRest,
  busy = false,
}) {
  const p = parsePlanDay(todayPlan);
  const hasPlan = p.rest || p.items.some((i) => i.name.trim());
  const exercises = getExerciseLinesForUi(todayPlan);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card/80 p-5 shadow-xl backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-transparent to-fuchsia-500/12" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Today&apos;s Battle</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {battleEmoji}
              </span>
              <div className="min-w-0">
                <p className="truncate text-2xl font-black tracking-tight text-white">{dayName}</p>
                <p className="text-xs text-zinc-500">{todayLabel}</p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{battleSubtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-zinc-200">
              {statusLabel}
            </div>
            <Link
              to="/plan"
              className="hidden text-[11px] font-bold text-emerald-300/90 hover:underline sm:block"
            >
              Edit week
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
            <span>Battle progress</span>
            <span className="font-semibold text-zinc-200">{completionHint}</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/35 ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-accent to-lime-300 transition-[width] duration-700 ease-out"
              style={{ width: `${completionPct}%` }}
            />
            <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.55),transparent)] bg-[length:220%_100%] animate-shimmer" />
          </div>
        </div>

        <div className="mt-4">
          {!hasPlan && !todayRow?.completed && !todayRow?.rest_day ? (
            <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-100">No plan = No progress ⚠️</p>
              <p className="mt-1 text-sm text-amber-100/75">Discipline starts with a plan.</p>
              <Link
                to="/plan"
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-accent py-3 text-sm font-extrabold text-black shadow-lg shadow-emerald-500/10 transition active:scale-[0.98] sm:w-auto sm:px-6"
              >
                Set your plan
              </Link>
            </div>
          ) : p.rest && !todayRow?.completed && !todayRow?.rest_day ? (
            <div className="rounded-3xl border border-sky-500/25 bg-sky-500/5 p-4 text-sm text-sky-100/90">
              <p className="font-semibold">Recovery day — consistency still counts</p>
              <p className="mt-1 text-sky-100/70">Log rest when you’re ready to keep your streak honest.</p>
            </div>
          ) : !hasPlan ? (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              {todayRow?.rest_day
                ? 'No exercises listed for today — recovery still counts toward consistency.'
                : 'No exercises listed for today — nice work logging a win anyway.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {exercises.map((label, i) => {
                const done = !!todayRow?.completed;
                return (
                  <li
                    key={`${i}-${label}`}
                    className={`flex items-center gap-3 rounded-2xl border border-white/5 bg-[#12121a]/90 px-3 py-2.5 text-sm backdrop-blur transition ${
                      done ? 'opacity-90' : 'opacity-95'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        done
                          ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                          : 'bg-white/5 text-zinc-400 ring-1 ring-white/10'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={done ? 'text-zinc-200 line-through decoration-white/20' : 'text-zinc-200'}>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {typeof onMarkDone === 'function' && typeof onMarkRest === 'function' ? (
          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row">
            <Link
              to="/plan"
              className="rounded-2xl border border-white/15 bg-white/5 py-2.5 text-center text-xs font-bold text-zinc-300 transition hover:bg-white/10 sm:hidden"
            >
              Edit week
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={onMarkDone}
              className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-accent py-3 text-sm font-extrabold text-black shadow-lg shadow-emerald-500/10 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              Mark workout done
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onMarkRest}
              className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-extrabold text-zinc-100 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
            >
              Rest day
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
