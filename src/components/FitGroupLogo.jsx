import { useId } from 'react';

export default function FitGroupLogo({ className = '', size = 36 }) {
  const gid = useId().replace(/:/g, '');

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-accent to-lime-300 p-[2px] shadow-lg shadow-emerald-500/20 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0b0b10]">
        <svg viewBox="0 0 32 32" className="h-[55%] w-[55%]" fill="none" aria-hidden>
          <path
            d="M8 22c4-9 12-9 16 0"
            stroke={`url(#fg-${gid})`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="16" cy="11" r="3" fill={`url(#fg-${gid})`} />
          <defs>
            <linearGradient id={`fg-${gid}`} x1="8" y1="8" x2="26" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34d399" />
              <stop offset="1" stopColor="#a3e635" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="sr-only">FitGroup</span>
    </div>
  );
}
