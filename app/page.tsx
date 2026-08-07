import Link from 'next/link';
import { QrCode, LayoutDashboard, Settings, UtensilsCrossed, ArrowRight, BarChart3, MessageSquare, ChefHat } from 'lucide-react';
import { fetchAllTables } from '@/lib/queries/tables';

export const revalidate = 0;

export default async function Home() {
  const tables = await fetchAllTables();
  const activeTables = tables.filter((t) => t.is_active).slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Glow background effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        {/* Brand Logo Header */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-2xl shadow-amber-500/20 mb-2">
          <UtensilsCrossed size={32} />
        </div>

        <div>
          <h1 className="text-4xl font-extrabold font-display text-slate-100 tracking-tight">
            Order<span className="text-amber-400">Ezz</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
            Mobile-first real-time dine-in table ordering experience. No app download required.
          </p>
        </div>

        {/* Demo Navigation Cards */}
        <div className="space-y-4 text-left">
          {/* Customer View Launcher */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <QrCode size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-display">Customer Order View</h3>
                <p className="text-xs text-slate-400">Simulate scanning a table QR code</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {activeTables.map((t) => (
                <Link
                  key={t.id}
                  href={`/order?t=${t.qr_token}`}
                  className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-800 hover:border-amber-400 transition-all flex items-center justify-between group"
                >
                  <span>Table {t.table_number}</span>
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
              {activeTables.length === 0 && (
                <p className="col-span-3 text-xs text-slate-500 py-1">No active tables found</p>
              )}
            </div>
          </div>

          {/* Staff Dashboard Launcher */}
          <Link
            href="/staff/orders"
            className="glass-panel rounded-3xl p-5 border border-slate-800 flex items-center justify-between hover:border-amber-500/40 transition-all group block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-display">Staff Dashboard</h3>
                <p className="text-xs text-slate-400">Real-time Kanban for kitchen & servers</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          {/* Admin Executive Analytics Launcher */}
          <Link
            href="/admin/analytics"
            className="glass-panel rounded-3xl p-5 border border-slate-800 flex items-center justify-between hover:border-amber-500/40 transition-all group block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-display">Executive Analytics</h3>
                <p className="text-xs text-slate-400">Revenue, AOV, kitchen speed & table turnover</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          {/* Staff Customer Reviews & Feedback Launcher */}
          <Link
            href="/staff/feedback"
            className="glass-panel rounded-3xl p-5 border border-slate-800 flex items-center justify-between hover:border-amber-500/40 transition-all group block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-display">Staff Customer Reviews</h3>
                <p className="text-xs text-slate-400">Diner ratings, experience tags & chef compliments</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          {/* Admin Management Launcher */}
          <Link
            href="/admin/analytics"
            className="glass-panel rounded-3xl p-5 border border-slate-800 flex items-center justify-between hover:border-amber-500/40 transition-all group block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-display">Admin Panel</h3>
                <p className="text-xs text-slate-400">Analytics, menu, staff accounts & table QR codes</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          {/* Place Order on Behalf Launcher */}
          <Link
            href="/admin/place-order"
            className="glass-panel rounded-3xl p-5 border border-amber-500/20 flex items-center justify-between hover:border-amber-500/50 transition-all group block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ChefHat size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-display">Place Order on Behalf</h3>
                <p className="text-xs text-slate-400">Admin places order for a table directly</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>
        </div>
      </div>
    </main>
  );
}
