'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuImportItem } from '@/lib/types/database.types';
import { confirmImportBatch, discardImportBatch } from '@/lib/queries/import';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminMenuImportPage() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [batchId, setBatchId] = useState<string | null>(null);
  const [stagingItems, setStagingItems] = useState<MenuImportItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleStartExtraction = async () => {
    if (!selectedFile) {
      toast.error('Please select a menu image or document file.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/menu/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setIsAnalyzing(false);

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to extract menu data.');
        return;
      }

      setBatchId(data.batchId);
      setStagingItems(data.items);
      toast.success('AI Vision Extraction Complete! Please review the staging table below.');
    } catch (err) {
      console.error('Error uploading for menu extraction:', err);
      toast.error('An error occurred during menu processing.');
      setIsAnalyzing(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof MenuImportItem, value: any) => {
    const updated = [...stagingItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setStagingItems(updated);
  };

  const handleAddStagingRow = () => {
    if (!batchId) return;
    const newRow: MenuImportItem = {
      id: `temp-${Date.now()}`,
      batch_id: batchId,
      category_name: 'General',
      item_name: 'New Custom Dish',
      description: '',
      price: 10.0,
      confidence_flag: null,
    };
    setStagingItems([...stagingItems, newRow]);
  };

  const handleDeleteStagingRow = (index: number) => {
    const updated = stagingItems.filter((_, i) => i !== index);
    setStagingItems(updated);
  };

  const handleConfirmImport = async () => {
    if (!batchId || stagingItems.length === 0) {
      toast.error('No items to confirm.');
      return;
    }

    setIsSubmitting(true);

    const formattedPayload = stagingItems.map((item) => ({
      category_name: item.category_name.trim() || 'General',
      item_name: item.item_name.trim() || 'Unnamed Item',
      description: item.description ? item.description.trim() : null,
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price as any) || 0.0,
    }));

    const success = await confirmImportBatch(batchId, formattedPayload);
    setIsSubmitting(false);

    if (success) {
      toast.success('Staging menu imported successfully to Live Menu!');
      router.push('/admin/menu');
    } else {
      toast.error('Failed to publish staging batch to live menu.');
    }
  };

  const handleDiscardImport = async () => {
    if (confirm('Are you sure you want to discard this staging batch? Extracted items will be deleted.')) {
      if (batchId) {
        await discardImportBatch(batchId);
      }
      toast.info('Staging batch discarded.');
      setBatchId(null);
      setStagingItems([]);
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  return (
    <main className="admin-container space-y-8">
      {/* Navbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-slate-100">
              AI Menu Import (Vision LLM)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Scan physical menus into structured items. All items land in staging for admin review before going live.
            </p>
          </div>
        </div>

        <Link
          href="/admin/menu"
          className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 self-start md:self-auto"
        >
          <ArrowLeft size={14} /> Back to Live Menu
        </Link>
      </header>

      {/* Step 1: Upload Menu Photo / PDF */}
      {!batchId && (
        <section className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 max-w-2xl mx-auto text-center">
          <div className="border-2 border-dashed border-slate-700/80 rounded-2xl p-8 bg-slate-900/50 hover:bg-slate-900 transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer relative">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <UploadCloud size={32} />
            </div>

            <div>
              <h3 className="font-bold text-slate-100 text-base font-display">
                {selectedFile ? selectedFile.name : 'Upload Menu Photo or PDF'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Drag & drop or click to select JPG, PNG, WEBP or PDF file
              </p>
            </div>

            {filePreview && (
              <div className="relative w-48 h-36 rounded-xl overflow-hidden border border-slate-700 shadow-md">
                <img src={filePreview} alt="Menu preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <Button
            variant="amber"
            size="lg"
            className="w-full"
            isLoading={isAnalyzing}
            onClick={handleStartExtraction}
            disabled={!selectedFile}
          >
            <Sparkles size={18} />
            Extract Structured Menu via AI Vision
          </Button>
        </section>
      )}

      {/* Step 2: Staging Review & Edit Table */}
      {batchId && (
        <section className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display text-slate-100">
                  Staging Review Table
                </h2>
                <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Pending Confirmation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Review and edit extracted items. High confidence items are verified. Nothing reaches your live menu until confirmed below.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleAddStagingRow}>
                <Plus size={14} /> Add Item Row
              </Button>
              <Button variant="danger" size="sm" onClick={handleDiscardImport}>
                <XCircle size={14} /> Discard Batch
              </Button>
            </div>
          </div>

          {/* Staging Items Table */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Item Name</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 w-28">Price (₹)</th>
                  <th className="py-3.5 px-4">Status / Flag</th>
                  <th className="py-3.5 px-4 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {stagingItems.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <input
                        type="text"
                        className="admin-input py-1.5 text-xs"
                        value={item.category_name}
                        onChange={(e) => handleUpdateItem(index, 'category_name', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        className="admin-input py-1.5 text-xs font-bold text-slate-100"
                        value={item.item_name}
                        onChange={(e) => handleUpdateItem(index, 'item_name', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        className="admin-input py-1.5 text-xs"
                        value={item.description || ''}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        className="admin-input py-1.5 text-xs font-bold text-amber-400"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-3">
                      {item.confidence_flag ? (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold px-2 py-1 rounded inline-flex items-center gap-1">
                          <AlertTriangle size={11} /> {item.confidence_flag}
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteStagingRow(index)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confirm Footer */}
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-slate-400 font-medium">
              Total {stagingItems.length} items ready to publish to live menu
            </span>

            <Button
              variant="amber"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleConfirmImport}
            >
              <CheckCircle2 size={18} /> Confirm & Publish to Live Menu
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
