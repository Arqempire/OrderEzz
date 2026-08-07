'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface AdminLogoutButtonProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function AdminLogoutButton({ className = '', variant = 'default' }: AdminLogoutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Signed out of Admin Panel');
      window.location.href = '/admin/login';
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
      setIsSigningOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isSigningOut}
      className={`bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${className}`}
      title="Sign out of Admin Panel"
    >
      <LogOut size={14} className={isSigningOut ? 'animate-spin' : ''} />
      {isSigningOut ? 'Signing out…' : 'Sign Out'}
    </button>
  );
}
