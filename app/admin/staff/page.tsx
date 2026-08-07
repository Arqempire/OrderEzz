'use client';

import React, { useEffect, useState } from 'react';
import { StaffUser, StaffRole } from '@/lib/types/database.types';
import { fetchAllStaffUsers } from '@/lib/queries/staff';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, Mail, Lock, User, Shield, RefreshCw, ArrowLeft, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminStaffPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('kitchen');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStaff = async () => {
    setIsLoading(true);
    setFetchError(null);
    const { data, error } = await fetchAllStaffUsers();
    
    if (error) {
      setFetchError(error);
    } else {
      setStaffUsers(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      toast.error('Temporary password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();
      setIsSubmitting(false);

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to create staff user.');
        return;
      }

      toast.success(`Staff user "${fullName}" created successfully in Supabase!`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('kitchen');

      await loadStaff();
    } catch (err: any) {
      console.error('Error creating staff:', err);
      toast.error('An error occurred while creating staff user.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-container space-y-8">
      {/* Header Navbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">
              Staff Account Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Provision kitchen & admin accounts with temporary passwords & mandatory first-login password reset
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/menu"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
          >
            Manage Menu
          </Link>
          <Link
            href="/admin/tables"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
          >
            Manage Tables
          </Link>
          <Link
            href="/staff/orders"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Staff Dashboard
          </Link>
        </div>
      </header>

      {/* Database Error Alert if Migration Not Run */}
      {fetchError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-300 text-xs">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Supabase Query Notice: {fetchError}</p>
            <p className="text-slate-400">
              Please ensure migration files <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400 font-mono">006_staff_profiles_update.sql</code> and <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400 font-mono">007_auto_create_staff_profile.sql</code> have been executed in your Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {/* Form: Add New Staff Member */}
      <section className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 max-w-2xl">
        <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
          <UserPlus size={18} className="text-amber-400" /> Create Staff Account (Admin Only)
        </h2>

        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  required
                  className="admin-input !pl-9"
                  placeholder="E.g. Marcus Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Staff Email *</label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
                <input
                  type="email"
                  required
                  className="admin-input !pl-9"
                  placeholder="chef@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Temporary Password *</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="admin-input !pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Staff Role *</label>
              <div className="relative flex items-center">
                <Shield size={16} className="absolute left-3 text-slate-400 z-10 pointer-events-none" />
                <select
                  required
                  className="admin-input !pl-9 bg-slate-950 text-slate-100"
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                >
                  <option value="kitchen">Kitchen Staff / Server</option>
                  <option value="admin">Restaurant Admin</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="amber" isLoading={isSubmitting}>
              <UserPlus size={16} /> Create Staff Account
            </Button>
          </div>
        </form>
      </section>

      {/* Staff Accounts List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200 font-display">
            Active Staff Accounts ({staffUsers.length})
          </h2>
          <button
            onClick={loadStaff}
            className="text-slate-400 hover:text-amber-400 text-xs font-semibold flex items-center gap-1"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh List
          </button>
        </div>

        {staffUsers.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-sm">
            No staff accounts found in Supabase. Create your first staff account above or run migration 007 in Supabase SQL editor to sync existing auth.users!
          </div>
        ) : (
          <div className="glass-card rounded-2xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4">Staff Name</th>
                  <th className="py-3.5 px-4">Email Address</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Password Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {staffUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-bold text-slate-100">
                      {user.full_name || 'Staff Member'}
                    </td>
                    <td className="p-4 text-slate-300 font-mono">
                      {user.email}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.must_change_password ? (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <KeyRound size={12} /> Reset Required on Next Login
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 size={13} /> Active & Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
