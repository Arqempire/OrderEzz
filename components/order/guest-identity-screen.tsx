'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, ChevronRight, Utensils, Sparkles } from 'lucide-react';

interface GuestInfo {
  name: string;
  phone: string;
}

interface GuestIdentityScreenProps {
  tableNumber: number | string;
  tableToken: string;
  onContinue: (guest: GuestInfo) => void;
}

const GUEST_STORAGE_KEY = (token: string) => `orderezz_guest_${token}`;

export function GuestIdentityScreen({ tableNumber, tableToken, onContinue }: GuestIdentityScreenProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Pre-fill from localStorage if returning guest
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY(tableToken));
      if (stored) {
        const parsed: GuestInfo = JSON.parse(stored);
        if (parsed.name) setName(parsed.name);
        if (parsed.phone) setPhone(parsed.phone);
      }
    } catch {
      // ignore
    }
  }, [tableToken]);

  const handleSkip = () => {
    onContinue({ name: '', phone: '' });
  };

  const handleContinue = () => {
    let valid = true;

    if (name.trim() && name.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      valid = false;
    } else {
      setNameError('');
    }

    if (phone.trim() && !/^[0-9+\-\s()]{7,15}$/.test(phone.trim())) {
      setPhoneError('Please enter a valid phone number.');
      valid = false;
    } else {
      setPhoneError('');
    }

    if (!valid) return;

    const guest: GuestInfo = { name: name.trim(), phone: phone.trim() };

    // Persist to localStorage for return visits
    try {
      localStorage.setItem(GUEST_STORAGE_KEY(tableToken), JSON.stringify(guest));
    } catch {
      // ignore
    }

    onContinue(guest);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleContinue();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 relative overflow-y-auto">

      {/* Ambient glow background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-400/4 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm my-auto space-y-5 sm:space-y-6 animate-fade-in py-4">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-xl shadow-amber-500/10 mb-3 sm:mb-4">
            <Utensils size={26} className="text-amber-400" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest font-mono">
              Table {tableNumber}
            </span>
            <Sparkles size={12} className="text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
            Welcome! 👋
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Share your details to personalize your dining experience — or continue as a guest.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xl">

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={11} className="text-amber-400" /> Your Name
              <span className="text-slate-600 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Arjun"
              autoComplete="given-name"
              className={`w-full bg-slate-800 border rounded-2xl px-4 py-3 text-base sm:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-amber-500/60 ${nameError ? 'border-red-500/60' : 'border-slate-700 focus:border-amber-500/40'}`}
            />
            {nameError && <p className="text-[11px] text-red-400">{nameError}</p>}
          </div>

          {/* Phone Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={11} className="text-amber-400" /> Phone Number
              <span className="text-slate-600 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. +91 98765 43210"
              autoComplete="tel"
              inputMode="tel"
              className={`w-full bg-slate-800 border rounded-2xl px-4 py-3 text-base sm:text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:ring-1 focus:ring-amber-500/60 ${phoneError ? 'border-red-500/60' : 'border-slate-700 focus:border-amber-500/40'}`}
            />
            {phoneError && <p className="text-[11px] text-red-400">{phoneError}</p>}
          </div>

          {/* Privacy note */}
          <p className="text-[11px] text-slate-600 text-center">
            🔒 Details are used only for this dining session.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleContinue}
            className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Save & Continue to Menu <ChevronRight size={18} />
          </button>
          <button
            onClick={handleSkip}
            className="w-full bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 active:scale-95 text-xs font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Continue as Guest
          </button>
        </div>

      </div>
    </div>
  );
}

export type { GuestInfo };
