'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchStaffProfile } from '@/lib/queries/staff';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Lock, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || 'Invalid staff credentials');
      return;
    }

    const userId = authData?.user?.id;
    if (userId) {
      let isAlreadyChanged = false;
      try {
        isAlreadyChanged = localStorage.getItem(`orderezz_pwd_changed_${userId}`) === 'true';
      } catch (e) {}

      if (!isAlreadyChanged) {
        const profile = await fetchStaffProfile(userId);
        if (profile?.must_change_password) {
          toast.info('First-time login detected. Please set a new password.');
          router.push('/staff/change-password');
          return;
        }
      }
    }

    toast.success('Signed in successfully!');
    window.location.href = '/staff/orders';
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-bold mb-3 shadow-lg shadow-amber-500/20">
            <UtensilsCrossed size={28} />
          </div>
          <h1 className="text-2xl font-extrabold font-display">Staff Portal Login</h1>
          <p className="text-xs text-slate-400 mt-1">Kitchen & Server Order Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Staff Email</label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
              <input
                type="email"
                required
                className="admin-input !pl-10"
                placeholder="staff@restaurant.com"
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

          <Button type="submit" variant="amber" className="w-full" isLoading={isLoading}>
            Sign In to Dashboard
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <Link
            href="/admin/login"
            className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 font-semibold"
          >
            <ShieldCheck size={14} /> Admin Portal Login
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
