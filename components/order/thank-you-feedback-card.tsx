'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types/database.types';
import { Star, Heart, MessageSquare, CheckCircle2, Utensils, Sparkles, Download, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { saveCustomerFeedback } from '@/lib/queries/feedback';
import { CustomerBillReceiptModal } from '@/components/order/customer-bill-receipt-modal';
import { clearTableSession } from '@/lib/utils/order-session';

interface ThankYouFeedbackCardProps {
  order: Order;
}

const FEEDBACK_TAGS = [
  'Delicious Food',
  'Quick Service',
  'Great Ambience',
  'Friendly Staff',
  'Fresh Ingredients',
  'Clean Table',
];

export const ThankYouFeedbackCard: React.FC<ThankYouFeedbackCardProps> = ({ order }) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Delicious Food', 'Quick Service']);
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const tableQrToken = order.table?.qr_token;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await saveCustomerFeedback(
      order.id,
      order.table?.table_number ?? null,
      rating,
      selectedTags,
      customNote
    );

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Thank you! Your feedback has been submitted to the restaurant team.');
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Hero Thank You Card */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-bold mb-4 shadow-xl shadow-amber-500/20 animate-bounce">
          <Sparkles size={32} />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-100 font-display tracking-tight">
          Thank You for Dining With Us!
        </h1>
        {(() => {
          const isTakeaway =
            !order.table_id ||
            order.table?.table_number === 0 ||
            order.table?.table_number === 999 ||
            (order.table?.table_number as unknown) === 'Takeaway' ||
            order.order_items?.some((i) => i.notes?.includes('[Takeaway]'));

          return (
            <p className="text-xs text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
              Your {isTakeaway ? 'takeaway order' : <>order for <span className="font-bold text-amber-400">Table {order.table?.table_number ?? ''}</span></>} is complete and settled. We hope you had a memorable culinary experience!
            </p>
          );
        })()}

        {/* Action Buttons & QR Scan Prompt */}
        <div className="flex flex-col items-center justify-center gap-3.5 pt-6">
          <button
            onClick={() => setIsReceiptOpen(true)}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Download size={16} /> Download Bill / Print Receipt
          </button>

          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl px-4 py-3 max-w-sm text-center shadow-lg">
            <p className="text-xs font-bold text-amber-300 flex items-center justify-center gap-2">
              <QrCode size={16} className="text-amber-400 flex-shrink-0 animate-pulse" />
              <span>To place a new order, please scan your table QR code </span>
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
          <Heart size={18} className="text-red-400" /> Share Your Experience & Feedback
        </h2>

        {!isSubmitted ? (
          <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
            {/* Star Rating Picker */}
            <div className="text-center py-2 space-y-1 bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
              <label className="block text-slate-300 font-semibold mb-2">How was your meal today?</label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      size={28}
                      className={
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                          : 'text-slate-600'
                      }
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-400 block pt-1">
                {rating === 5
                  ? 'Outstanding! 🌟'
                  : rating === 4
                    ? 'Very Good! 😊'
                    : rating === 3
                      ? 'Average 👌'
                      : 'Needs Improvement 🙁'}
              </span>
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold">What did you enjoy most?</label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${isSelected
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                        }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Note Input */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                <MessageSquare size={14} className="text-amber-400" /> Custom Note / Chef Compliment
              </label>
              <textarea
                rows={3}
                className="admin-input !text-xs !p-3"
                placeholder="E.g. The Wagyu Smash Burger was cooked to perfection! Special thanks to the kitchen team..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
              />
            </div>

            <Button type="submit" variant="amber" className="w-full" isLoading={isSubmitting}>
              Send Feedback to Restaurant
            </Button>
          </form>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 font-bold mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-100 font-display">Feedback Received!</h3>
            <p className="text-xs text-slate-300">
              Thank you for sharing your thoughts! Your review has been submitted to the management team.
            </p>
            {customNote && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left text-xs text-slate-300 italic">
                "{customNote}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settled Receipt Summary */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 font-display border-b border-slate-800 pb-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span>Settled Order Receipt</span>
            {order.created_at && (
              <span className="text-[10px] text-slate-400 font-normal font-mono" suppressHydrationWarning>
                Placed: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Paid & Closed
          </span>
        </h3>

        <div className="divide-y divide-slate-800/60">
          {order.order_items?.map((item) => (
            <div key={item.id} className="py-2.5 flex items-start justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-200">
                  <span className="text-amber-400 font-bold mr-1.5">{item.quantity}x</span>
                  {item.menu_item?.name || 'Item'}
                </div>
                {item.notes && <p className="text-slate-400 italic text-[11px] mt-0.5">Note: {item.notes}</p>}
              </div>
              <span className="font-bold text-slate-300 font-display">
                ₹{(item.price_at_order * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
          <span className="font-semibold text-slate-400">Total Settled</span>
          <span className="text-lg font-extrabold text-amber-400 font-display">
            ₹{order.total.toFixed(2)}
          </span>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setIsReceiptOpen(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Printer size={14} className="text-amber-400" /> View & Print Itemized Bill Receipt
          </button>
        </div>
      </div>

      {/* Customer Printable Bill Receipt Modal */}
      <CustomerBillReceiptModal
        order={order}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
