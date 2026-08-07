'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className="bottom-sheet-overlay"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="bottom-sheet-content">
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-4" />
        
        {title && (
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-slate-100 font-display">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};
