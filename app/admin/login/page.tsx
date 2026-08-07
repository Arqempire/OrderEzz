'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchStaffProfile } from '@/lib/queries/staff';
import { ShieldCheck, Lock, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin/analytics';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Auto-redirect if already logged in as Admin
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await fetchStaffProfile(user.id);
          if (profile?.role === 'admin') {
            toast.success('Active admin session restored');
            router.replace(redirectTo);
            return;
          }
        }
      } catch (e) {
        console.error('Error checking active admin session:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkActiveSession();
  }, [redirectTo, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !authData?.user) {
        toast.error(error?.message || 'Invalid admin credentials');
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;
      const profile = await fetchStaffProfile(userId);

      if (!profile || profile.role !== 'admin') {
        // Reject non-admin user
        await supabase.auth.signOut();
        toast.error('Access denied. Admin role privileges required.');
        setIsLoading(false);
        return;
      }

      toast.success('Admin authentication successful!');
      router.replace(redirectTo);
    } catch (err: any) {
      console.error('Exception during admin login:', err);
      toast.error(err.message || 'An error occurred during sign in');
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Verifying admin session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Glow ambient background elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 shadow-2xl relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-bold mb-3 shadow-lg shadow-amber-500/20">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-2xl font-extrabold font-display text-slate-100">Admin Portal Login</h1>
          <p className="text-xs text-slate-400 mt-1">Management, Analytics & System Settings</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
              <input
                type="email"
                required
                className="admin-input !pl-10"
                placeholder="admin@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
              <input
                type="password"
                required
                className="admin-input !pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Authenticating…
              </>
            ) : (
              'Sign In to Admin Portal'
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <Link
            href="/staff/login"
            className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 font-semibold"
          >
            Kitchen Staff Login
          </Link>
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={13} /> Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <AdminLoginForm />
    </Suspense>
  );
}
