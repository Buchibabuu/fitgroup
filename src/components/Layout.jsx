import { NavLink, Outlet } from 'react-router-dom';
import FitGroupLogo from './FitGroupLogo';
import { useAuth } from '../hooks/useAuth';
import { getStoredAvatarDataUrl } from '../lib/avatarStorage';

const itemClass = ({ isActive }) =>
  [
    'flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-bold transition will-change-transform sm:text-xs',
    isActive
      ? 'scale-105 text-white shadow-[0_0_22px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/35'
      : 'text-zinc-500 hover:text-zinc-200 active:scale-95',
    isActive ? 'bg-gradient-to-b from-white/12 to-white/5' : 'hover:bg-white/5',
  ].join(' ');

export default function Layout() {
  const { profile, firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;
  const storedAvatar = getStoredAvatarDataUrl(uid);
  const avatarSrc = storedAvatar || profile?.avatar_url || null;

  return (
    <div className="min-h-dvh pb-32">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b10]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-fuchsia-500/10 text-[14px] font-black text-amber-200">
                  👤
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[13px] font-black tracking-tight text-white">FitGroup</p>
              <p className="truncate text-[10.5px] text-zinc-500">{profile?.email}</p>
            </div>
          </div>
          <div className="w-8" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0b0b10]/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-2 sm:gap-1 sm:px-2">
          <NavLink to="/" end className={itemClass} title="Home">
            <span className="text-base leading-none transition-transform sm:text-lg">🏠</span>
            <span className="max-w-[3.5rem] truncate sm:max-w-none">Home</span>
          </NavLink>
          <NavLink to="/plan" className={itemClass} title="Plan">
            <span className="text-base leading-none transition-transform sm:text-lg">📅</span>
            <span className="max-w-[3.5rem] truncate sm:max-w-none">Plan</span>
          </NavLink>
          <NavLink to="/run" className={itemClass} title="Run">
            <span className="text-base leading-none transition-transform sm:text-lg">🏃</span>
            <span className="max-w-[3.5rem] truncate sm:max-w-none">Run</span>
          </NavLink>
          <NavLink to="/group" className={itemClass} title="Squad">
            <span className="text-base leading-none transition-transform sm:text-lg">👥</span>
            <span className="max-w-[3.5rem] truncate sm:max-w-none">Squad</span>
          </NavLink>
          <NavLink to="/profile" className={itemClass} title="Profile">
            <span className="text-base leading-none transition-transform sm:text-lg">👤</span>
            <span className="max-w-[3.5rem] truncate sm:max-w-none">Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
