'use client';

import React, { useState } from 'react';
import { TableRow } from '@/lib/types/database.types';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Download, Printer, Power } from 'lucide-react';
import { regenerateTableQrToken, toggleTableActiveState } from '@/lib/queries/tables';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PrintableQrModal } from './printable-qr-modal';

interface QrCodeCardProps {
  table: TableRow;
  baseUrl: string;
  onTableUpdated: () => void;
}

export const QrCodeCard: React.FC<QrCodeCardProps> = ({ table, baseUrl, onTableUpdated }) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const qrUrl = `${baseUrl}/order?t=${table.qr_token}`;

  const handleRegenerateToken = async () => {
    if (confirm(`Regenerate QR token for Table ${table.table_number}? The old QR code printed/photographed will stop working.`)) {
      setIsRegenerating(true);
      const newToken = await regenerateTableQrToken(table.id);
      setIsRegenerating(false);

      if (newToken) {
        toast.success(`QR token rotated for Table ${table.table_number}!`);
        onTableUpdated();
      } else {
        toast.error('Failed to regenerate token.');
      }
    }
  };

  const handleToggleActive = async () => {
    const success = await toggleTableActiveState(table.id, !table.is_active);
    if (success) {
      toast.info(`Table ${table.table_number} is now ${!table.is_active ? 'Active' : 'Inactive'}`);
      onTableUpdated();
    }
  };

  const downloadQrSvg = () => {
    const svgElement = document.getElementById(`qr-svg-${table.id}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `table-${table.table_number}-qr.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <>
      <div className="table-card group">
        {/* Table Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-slate-100 font-display">
              Table {table.table_number}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">
              Token: {table.qr_token.slice(0, 8)}...
            </p>
          </div>

          <button
            onClick={handleToggleActive}
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
              table.is_active
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            <Power size={12} />
            {table.is_active ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center my-2 shadow-inner">
          <QRCodeSVG
            id={`qr-svg-${table.id}`}
            value={qrUrl}
            size={160}
            level="H"
            includeMargin={true}
          />
          <span className="text-[10px] font-bold text-slate-800 tracking-wider uppercase mt-1">
            Scan to Order — Table {table.table_number}
          </span>
        </div>

        {/* Card Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <Button
            variant="amber"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setIsPrintModalOpen(true)}
          >
            <Printer size={13} /> Print Card
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={downloadQrSvg}
          >
            <Download size={13} /> SVG
          </Button>

          <Button
            variant="danger"
            size="sm"
            className="text-xs px-2.5"
            isLoading={isRegenerating}
            onClick={handleRegenerateToken}
            title="Regenerate QR Token"
          >
            <RefreshCw size={13} />
          </Button>
        </div>
      </div>

      {/* Single Table Print Modal */}
      <PrintableQrModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        tables={[table]}
        baseUrl={baseUrl}
        title={`Print Table ${table.table_number} QR Card`}
      />
    </>
  );
};
