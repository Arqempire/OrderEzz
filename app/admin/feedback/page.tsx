'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { CustomerFeedback } from '@/lib/types/feedback.types';
import { fetchAllCustomerFeedbacks } from '@/lib/queries/feedback';
import {
  MessageSquare,
  Star,
  RefreshCw,
  ArrowLeft,
  Filter,
  AlertCircle,
  ThumbsUp,
  Table as TableIcon,
  Tag,
  Clock,
  BarChart3,
  Utensils,
  UtensilsCrossed,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { AdminLogoutButton } from '@/components/admin/admin-logout-button';

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');

  const loadFeedbacks = async () => {
    setIsLoading(true);
    const data = await fetchAllCustomerFeedbacks();
    setFeedbacks(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    if (ratingFilter === 'all') return feedbacks;
    return feedbacks.filter((f) => f.rating === ratingFilter);
  }, [feedbacks, ratingFilter]);

  const metrics = useMemo(() => {
    if (feedbacks.length === 0) {
      return { avgRating: 0, total: 0, fiveStarCount: 0, lowRatingCount: 0 };
    }
    const sum = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = sum / feedbacks.length;
    const fiveStarCount = feedbacks.filter((f) => f.rating === 5).length;
    const lowRatingCount = feedbacks.filter((f) => f.rating <= 2).length;

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      total: feedbacks.length,
      fiveStarCount,
      lowRatingCount,
    };
  }, [feedbacks]);

  return (
    <main className="admin-container space-y-8">
      {/* Header Navigation */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">
              Admin Customer Reviews & Feedback
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review diner ratings, experience tags, and custom chef notes submitted at table checkout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/analytics"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <BarChart3 size={14} /> Analytics Dashboard
          </Link>
          <Link
            href="/admin/menu"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Utensils size={14} /> Manage Menu
          </Link>
          <Link
            href="/admin/tables"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Settings size={14} /> Manage Tables
          </Link>
          <Link
            href="/staff/orders"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <UtensilsCrossed size={14} /> Staff Dashboard
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      {/* Summary Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Rating */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Star size={20} className="fill-amber-400" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Average Rating</span>
          <div className="text-2xl font-extrabold text-slate-100 font-display flex items-baseline gap-1">
            {metrics.avgRating} <span className="text-xs font-medium text-slate-500">/ 5.0</span>
          </div>
          <p className="text-[11px] text-amber-400 font-medium">Overall diner satisfaction</p>
        </div>

        {/* Total Feedbacks */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <MessageSquare size={20} />
          </div>
          <span className="text-xs font-semibold text-slate-400">Total Reviews</span>
          <div className="text-2xl font-extrabold text-slate-100 font-display">
            {metrics.total}
          </div>
          <p className="text-[11px] text-slate-400">Submitted by diners</p>
        </div>

        {/* 5-Star Reviews */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <ThumbsUp size={20} />
          </div>
          <span className="text-xs font-semibold text-slate-400">5-Star Reviews</span>
          <div className="text-2xl font-extrabold text-slate-100 font-display">
            {metrics.fiveStarCount}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">Top rating compliments</p>
        </div>

        {/* Low Ratings Alert */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
            <AlertCircle size={20} />
          </div>
          <span className="text-xs font-semibold text-slate-400">Needs Attention (1-2 Stars)</span>
          <div className="text-2xl font-extrabold text-slate-100 font-display">
            {metrics.lowRatingCount}
          </div>
          <p className="text-[11px] text-slate-400">Low ratings requiring review</p>
        </div>
      </section>

      {/* Filter Bar & Feedbacks List */}
      <section className="space-y-4">
        <div className="glass-panel rounded-3xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-2">
              <Filter size={14} className="text-amber-400" /> Filter by Rating:
            </span>
            <button
              onClick={() => setRatingFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                ratingFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All Ratings ({feedbacks.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = feedbacks.filter((f) => f.rating === star).length;
              return (
                <button
                  key={star}
                  onClick={() => setRatingFilter(star)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                    ratingFilter === star
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{star}</span> <Star size={12} className="fill-current" /> ({count})
                </button>
              );
            })}
          </div>

          <button
            onClick={loadFeedbacks}
            className="text-slate-400 hover:text-amber-400 text-xs font-semibold flex items-center gap-1.5 self-end md:self-auto"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Reviews
          </button>
        </div>

        {/* Feedback Review Cards Grid */}
        {filteredFeedbacks.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-500 text-sm space-y-2">
            <MessageSquare size={36} className="mx-auto text-slate-600" />
            <p className="font-bold text-slate-300">No Customer Reviews Found</p>
            <p className="text-xs max-w-sm mx-auto">
              {ratingFilter === 'all'
                ? 'No customer reviews submitted yet. Reviews submitted by diners on the completed order page will display here.'
                : `No reviews found for ${ratingFilter}-star rating filter.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFeedbacks.map((fb, idx) => (
              <div
                key={fb.id || `fb-admin-${idx}`}
                className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3 relative overflow-hidden"
              >
                {/* Header row: Table & Stars */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <TableIcon size={13} /> Table {fb.table_number || 'N/A'}
                    </span>
                    {fb.order_id && (
                      <span className="text-[11px] font-mono text-slate-400">
                        #{fb.order_id.slice(0, 8)}
                      </span>
                    )}
                  </div>

                  {/* Star Rating Display */}
                  <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={
                          s <= fb.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {fb.tags && fb.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {fb.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-900 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1"
                      >
                        <Tag size={10} className="text-amber-400" /> {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Custom Note */}
                {fb.note ? (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 leading-relaxed italic">
                    "{fb.note}"
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No custom note provided.</p>
                )}

                {/* Footer Timestamp */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {new Date(fb.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
