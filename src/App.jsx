import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import WorkoutPlanPage from './pages/WorkoutPlanPage';
import GroupPage from './pages/GroupPage';
import ProfilePage from './pages/ProfilePage';
import RunPage from './pages/RunPage';
import Layout from './components/Layout';

const SPLASH_MS = 1600;

function Protected({ children }) {
  const { ready, firebaseUser, loadingProfile } = useAuth();
  if (!ready) return null;
  if (!firebaseUser) return <Navigate to="/auth" replace />;
  if (loadingProfile) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b0b10] text-zinc-400">
        Syncing profile…
      </div>
    );
  }
  return children;
}

function AppRoutes() {
  const { ready, firebaseUser } = useAuth();
  if (!ready) return null;

  return (
    <Routes>
      <Route path="/auth" element={firebaseUser ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="plan" element={<WorkoutPlanPage />} />
        <Route path="run" element={<RunPage />} />
        <Route path="group" element={<GroupPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { ready } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone || !ready) {
    return <SplashScreen />;
  }

  return <AppRoutes />;
}
