'use client';

import React, { useEffect, useState } from 'react';
import { TableRow } from '@/lib/types/database.types';
import { fetchAllTables, createNewTable } from '@/lib/queries/tables';
import { QrCodeCard } from '@/components/admin/qr-code-card';
import { PrintableQrModal } from '@/components/admin/printable-qr-modal';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, QrCode, ArrowLeft, Printer, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminTablesPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  const loadTables = async () => {
    setIsLoading(true);
    const data = await fetchAllTables();
    setTables(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTables();
    setBaseUrl(window.location.origin);
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newTableNumber);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid table number.');
      return;
    }

    setIsCreating(true);
    const created = await createNewTable(num);
    setIsCreating(false);

    if (created) {
      toast.success(`Table ${num} created!`);
      setNewTableNumber('');
      loadTables();
    } else {
      toast.error('Failed to create table. Table number might already exist.');
    }
  };

  return (
    <main className="admin-container space-y-8">
      {/* Top Navbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
            <QrCode size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">
              Table & QR Code Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate, download, print stand cards, and rotate secure UUID QR tokens for tables
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/analytics"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <BarChart3 size={14} /> Analytics
          </Link>

          <Button
            variant="amber"
            onClick={() => setIsBatchPrintOpen(true)}
            disabled={tables.length === 0}
          >
            <Printer size={16} /> Batch Print All Cards
          </Button>

          <Link
            href="/admin/staff"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Users size={14} /> Staff Accounts
          </Link>

          <Link
            href="/admin/menu"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
          >
            Manage Menu Items
          </Link>
          <Link
            href="/staff/orders"
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Staff Kanban
          </Link>
        </div>
      </header>

      {/* Add New Table Form */}
      <section className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 max-w-xl">
        <h2 className="text-base font-bold text-slate-100 font-display">Add New Restaurant Table</h2>
        
        <form onSubmit={handleCreateTable} className="flex items-center gap-3">
          <input
            type="number"
            placeholder="Table number (e.g. 6)"
            required
            className="admin-input flex-1"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
          />
          <Button type="submit" variant="amber" isLoading={isCreating}>
            <Plus size={16} /> Add Table
          </Button>
        </form>
      </section>

      {/* Tables Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200 font-display">
            Active Restaurant Tables ({tables.length})
          </h2>
          <button
            onClick={loadTables}
            className="text-slate-400 hover:text-amber-400 text-xs font-semibold flex items-center gap-1"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh List
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-sm">
            No tables configured yet. Create your first table above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => (
              <QrCodeCard
                key={table.id}
                table={table}
                baseUrl={baseUrl}
                onTableUpdated={loadTables}
              />
            ))}
          </div>
        )}
      </section>

      {/* Batch Print All Tables Modal */}
      <PrintableQrModal
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
        tables={tables}
        baseUrl={baseUrl}
        title="Print All Table QR Stand Cards"
      />
    </main>
  );
}
