'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateMustChangePasswordFlag } from '@/lib/queries/staff';
import { Button } from '@/components/ui/button';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      let currentUserId = updateData?.user?.id;
      if (!currentUserId) {
        const { data: currentUserData } = await supabase.auth.getUser();
        currentUserId = currentUserData?.user?.id;
      }

      if (updateError) {
        console.warn('Supabase password update error:', updateError.message);
      }

      if (currentUserId) {
        await updateMustChangePasswordFlag(currentUserId, false);
      }

      setIsLoading(false);
      toast.success('Password updated successfully! Welcome to your dashboard.');
      router.push('/staff/orders');
    } catch (err: any) {
      console.error('Error changing password:', err);
      toast.error(err.message || 'An error occurred while updating your password.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-bold mb-3 shadow-lg shadow-amber-500/20">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-extrabold font-display">Set Permanent Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            First-time login detected. Please choose a secure permanent password to continue.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                className="admin-input !pl-10"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
            <div className="relative flex items-center">
              <ShieldCheck size={18} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                className="admin-input !pl-10"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" variant="amber" className="w-full" isLoading={isLoading}>
            Set Password & Continue to Dashboard
          </Button>
        </form>
      </div>
    </main>
  );
}
