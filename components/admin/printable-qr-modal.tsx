'use client';

import React from 'react';
import { TableRow } from '@/lib/types/database.types';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Printer, X, UtensilsCrossed, Camera } from 'lucide-react';

interface PrintableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableRow[];
  baseUrl: string;
  title?: string;
}

export const PrintableQrModal: React.FC<PrintableQrModalProps> = ({
  isOpen,
  onClose,
  tables,
  baseUrl,
  title = 'Print Table QR Cards',
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl space-y-4">
        {/* Header - Hidden during window.print() via no-print class */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
          <div>
            <h3 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2">
              <Printer size={20} className="text-amber-400" /> {title} ({tables.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ready-to-print physical stand cards for restaurant tables.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="amber" size="sm" onClick={handlePrint}>
              <Printer size={15} /> Print Now
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-6 print-area">
          <div className="printable-qr-grid grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tables.map((table) => {
              const qrUrl = `${baseUrl}/order?t=${table.qr_token}`;

              return (
                <div
                  key={table.id}
                  className="printable-qr-stand bg-white text-slate-950 rounded-2xl p-6 border-2 border-dashed border-slate-300 flex flex-col items-center justify-between text-center space-y-4 shadow-sm"
                >
                  {/* Brand Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                      <UtensilsCrossed size={18} />
                    </div>
                    <span className="text-lg font-extrabold tracking-tight font-display text-slate-950">
                      Order<span className="text-amber-600">Ezz</span>
                    </span>
                  </div>

                  {/* Table Number Badge */}
                  <div className="bg-slate-950 text-white rounded-xl px-6 py-2">
                    <span className="text-xs uppercase font-bold tracking-widest block text-slate-400">
                      Dine-In
                    </span>
                    <span className="text-2xl font-extrabold font-display">
                      TABLE {table.table_number}
                    </span>
                  </div>

                  {/* QR Code SVG */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-inner">
                    <QRCodeSVG
                      value={qrUrl}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1 text-slate-700">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      <Camera size={13} className="text-amber-600" />
                      Scan Phone Camera to Order
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      View full menu • Place order live • Pay at counter
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
