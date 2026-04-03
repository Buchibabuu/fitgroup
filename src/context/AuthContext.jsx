import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../services/firebase';
import { ensureUserRecord, fetchUserById } from '../services/users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setReady(true);
        return;
      }
      setLoadingProfile(true);
      try {
        let row = await fetchUserById(user.uid);
        if (!row) row = await ensureUserRecord(user);
        setProfile(row);
      } catch (e) {
        console.error(e);
        toast.error(e?.message || 'Could not load profile.');
        setProfile(null);
      } finally {
        setLoadingProfile(false);
        setReady(true);
      }
    });
    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      ready,
      loadingProfile,
      async login(email, password) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signup(email, password, name) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user) return;
        const display = name?.trim() || cred.user.email?.split('@')[0] || 'Athlete';
        await updateProfile(cred.user, { displayName: display });
        const row = await ensureUserRecord(cred.user, display);
        setProfile(row);
      },
      async logout() {
        await signOut(auth);
      },
      async refreshProfile() {
        if (!firebaseUser) return;
        const row = await fetchUserById(firebaseUser.uid);
        setProfile(row);
      },
    }),
    [firebaseUser, profile, ready, loadingProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
