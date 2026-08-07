'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Droplet, Check, Loader2 } from 'lucide-react';
import { createTableRequest } from '@/lib/queries/table-requests';
import { toast } from 'sonner';

interface TableRequestButtonsProps {
  tableId: string;
  tableNumber?: number;
}

export const TableRequestButtons: React.FC<TableRequestButtonsProps> = ({
  tableId,
  tableNumber,
}) => {
  const [waiterCooldown, setWaiterCooldown] = useState<number>(0);
  const [waterCooldown, setWaterCooldown] = useState<number>(0);
  const [isSubmittingWaiter, setIsSubmittingWaiter] = useState(false);
  const [isSubmittingWater, setIsSubmittingWater] = useState(false);

  // Cooldown timer interval
  useEffect(() => {
    if (waiterCooldown === 0 && waterCooldown === 0) return;

    const timer = setInterval(() => {
      setWaiterCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setWaterCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [waiterCooldown, waterCooldown]);

  const handleCallWaiter = async () => {
    if (waiterCooldown > 0 || isSubmittingWaiter) return;

    setIsSubmittingWaiter(true);
    const result = await createTableRequest(tableId, 'waiter');
    setIsSubmittingWaiter(false);

    if (result) {
      toast.success(
        tableNumber ? `Waiter called for Table ${tableNumber} ✓` : 'Waiter request sent ✓'
      );
      setWaiterCooldown(30);
    } else {
      toast.error('Failed to call waiter. Please try again.');
    }
  };

  const handleRequestWater = async () => {
    if (waterCooldown > 0 || isSubmittingWater) return;

    setIsSubmittingWater(true);
    const result = await createTableRequest(tableId, 'water');
    setIsSubmittingWater(false);

    if (result) {
      toast.success(
        tableNumber ? `Water requested for Table ${tableNumber} ✓` : 'Water request sent ✓'
      );
      setWaterCooldown(30);
    } else {
      toast.error('Failed to request water. Please try again.');
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Call Waiter Button */}
      <button
        onClick={handleCallWaiter}
        disabled={waiterCooldown > 0 || isSubmittingWaiter}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          waiterCooldown > 0
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
        }`}
        title="Call a waiter to your table"
      >
        {isSubmittingWaiter ? (
          <Loader2 size={13} className="animate-spin" />
        ) : waiterCooldown > 0 ? (
          <>
            <Check size={13} />
            Sent ({waiterCooldown}s)
          </>
        ) : (
          <>
            <Bell size={13} />
            Call Waiter
          </>
        )}
      </button>

      {/* Request Water Button */}
      <button
        onClick={handleRequestWater}
        disabled={waterCooldown > 0 || isSubmittingWater}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          waterCooldown > 0
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 active:scale-95'
        }`}
        title="Request water for your table"
      >
        {isSubmittingWater ? (
          <Loader2 size={13} className="animate-spin" />
        ) : waterCooldown > 0 ? (
          <>
            <Check size={13} />
            Sent ({waterCooldown}s)
          </>
        ) : (
          <>
            <Droplet size={13} />
            Water
          </>
        )}
      </button>
    </div>
  );
};
