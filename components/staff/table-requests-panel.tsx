'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TableRequest, RequestStatus } from '@/lib/types/table-request.types';
import { fetchPendingTableRequests, updateTableRequestStatus } from '@/lib/queries/table-requests';
import { createClient } from '@/lib/supabase/client';
import { Bell, Droplet, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const TableRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<TableRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const data = await fetchPendingTableRequests();
    setRequests(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();

    // Supabase Realtime Subscription on table_requests table
    const supabase = createClient();
    const channel = supabase
      .channel('staff-live-table-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_requests',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.info('New table assistance request received!', {
              description: 'Check top requests panel',
            });
          }
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const handleUpdateStatus = async (requestId: string, status: RequestStatus, tableNum?: number) => {
    const success = await updateTableRequestStatus(requestId, status);
    if (success) {
      if (status === 'acknowledged') {
        toast.info(tableNum ? `Acknowledged request for Table ${tableNum}` : 'Request acknowledged');
      } else if (status === 'resolved') {
        toast.success(tableNum ? `Resolved Table ${tableNum} request` : 'Request resolved');
      }
      loadRequests();
    } else {
      toast.error('Failed to update request status');
    }
  };

  const getTimeAgo = (createdAt: string) => {
    const elapsedMins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (elapsedMins < 1) return { text: 'Just now', isUrgent: false };
    if (elapsedMins >= 4) return { text: `${elapsedMins}m ago`, isUrgent: true };
    return { text: `${elapsedMins}m ago`, isUrgent: false };
  };

  if (requests.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="mb-6 glass-panel rounded-3xl p-5 border border-amber-500/30 shadow-2xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Bell size={18} className="animate-bounce" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-100 font-display flex items-center gap-2">
              Live Table Assistance Requests
              <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">
                {requests.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Longest waiting table requests first</p>
          </div>
        </div>

        <button
          onClick={loadRequests}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
        >
          Sync Now
        </button>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
        {requests.map((req) => {
          const { text: timeText, isUrgent } = getTimeAgo(req.created_at);
          const tableNum = req.table?.table_number;

          return (
            <div
              key={req.id}
              className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-3 transition-all ${
                req.status === 'acknowledged'
                  ? 'bg-slate-900/60 border-slate-700/60'
                  : isUrgent
                  ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/10'
                  : 'bg-slate-900/90 border-amber-500/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold text-slate-100 font-display">
                    {tableNum ? `Table ${tableNum}` : 'Table Request'}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isUrgent
                        ? 'bg-red-500 text-slate-950 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Clock size={10} />
                    {timeText}
                  </span>
                </div>

                {/* Request Type Badge */}
                <div className="mt-2">
                  {req.type === 'waiter' ? (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5">
                      <Bell size={13} /> Call Waiter
                    </span>
                  ) : (
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5">
                      <Droplet size={13} /> Request Water
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                {req.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(req.id, 'acknowledged', tableNum)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-1.5 px-2 rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check size={12} /> Ack
                  </button>
                )}

                <button
                  onClick={() => handleUpdateStatus(req.id, 'resolved', tableNum)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-1.5 px-2 rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck size={13} /> Resolve
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
