import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error('Use a valid email and password (6+ chars).');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back.');
      } else {
        await signup(email, password, name);
        toast.success('Account ready.');
      }
    } catch (err) {
      toast.error(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-[#0b0b10] px-4">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">FitGroup</h1>
          <p className="mt-1 text-sm text-zinc-500">Train. Track. Stay accountable.</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface-card p-6 shadow-xl transition-all">
          <div className="mb-6 flex rounded-xl bg-[#12121a] p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-surface-elevated text-white' : 'text-zinc-500'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-surface-elevated text-white' : 'text-zinc-500'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Name</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#12121a] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/50"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-white/10 bg-[#12121a] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/50"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-[#12121a] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-accent py-3 text-sm font-extrabold text-black shadow-lg shadow-emerald-500/10 transition will-change-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
