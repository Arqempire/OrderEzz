'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface StaffLogoutButtonProps {
  className?: string;
}

export function StaffLogoutButton({ className = '' }: StaffLogoutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Signed out of Staff Dashboard');
      window.location.href = '/staff/login';
    } catch (error: any) {
      console.error('Error signing out staff:', error);
      toast.error('Failed to sign out');
      window.location.href = '/staff/login';
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isSigningOut}
      className={`bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${className}`}
      title="Sign out of Staff Dashboard"
    >
      <LogOut size={14} className={isSigningOut ? 'animate-spin' : ''} />
      {isSigningOut ? 'Signing out…' : 'Exit'}
    </button>
  );
}
