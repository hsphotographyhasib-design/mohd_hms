'use client';

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Slider } from '@/shared/ui/slider';
import { Separator } from '@/shared/ui/separator';
import {
  ZoomIn,
  ZoomOut,
  Printer,
  FileDown,
  Mail,
  MessageCircle,
  RotateCcw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  QuotationA4Template,
  type QuotationA4TemplateProps,
} from './quotation-a4-template';

// ============ TYPES ============

interface QuotationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationA4TemplateProps['quotation'];
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onSendEmail?: () => void;
  onSendWhatsApp?: () => void;
}

// ============ COMPONENT ============

export function QuotationPreviewDialog({
  open,
  onOpenChange,
  quotation,
  onPrint,
  onDownloadPdf,
  onSendEmail,
  onSendWhatsApp,
}: QuotationPreviewDialogProps) {
  const [zoom, setZoom] = useState(100);
  const templateRef = useRef<HTMLDivElement>(null);

  // -- Zoom controls --

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(200, z + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(25, z - 10));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(100);
  }, []);

  // -- Action handlers --

  const handlePrint = useCallback(() => {
    if (onPrint) {
      onPrint();
      return;
    }

    // Fallback: open a new window with the template and trigger print
    const templateEl = templateRef.current;
    if (!templateEl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print window. Please allow popups.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation Print</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { display: flex; justify-content: center; }
            @media print { body { margin: 0; } }
          </style>
          ${Array.from(templateEl.querySelectorAll('style')).map(
            (s) => `<style>${s.textContent}</style>`
          ).join('')}
        </head>
        <body>${templateEl.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to render, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }, [onPrint]);

  const handleDownloadPdf = useCallback(() => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else {
      toast.info('PDF generation requires server connection');
    }
  }, [onDownloadPdf]);

  const handleSendEmail = useCallback(() => {
    onSendEmail?.();
  }, [onSendEmail]);

  const handleSendWhatsApp = useCallback(() => {
    onSendWhatsApp?.();
  }, [onSendWhatsApp]);

  // Reset zoom when dialog opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) setZoom(100);
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTitle className="sr-only">Quotation Preview</DialogTitle>
      <DialogContent
        showCloseButton={false}
        className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 m-0 overflow-hidden flex flex-col rounded-none"
      >
        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between gap-3 border-b bg-white px-3 py-2 shrink-0">
          {/* Left — Close */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close preview"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </Button>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Center — Zoom controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom out"
              onClick={handleZoomOut}
            >
              <ZoomOut className="size-4" />
            </Button>

            <div className="flex items-center gap-2 w-40 sm:w-52">
              <Slider
                value={[zoom]}
                min={25}
                max={200}
                step={5}
                onValueChange={([val]) => setZoom(val)}
                aria-label="Zoom level"
                className="w-full"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom in"
              onClick={handleZoomIn}
            >
              <ZoomIn className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Reset zoom to 100%"
              onClick={handleResetZoom}
              disabled={zoom === 100}
            >
              <RotateCcw className="size-4" />
            </Button>

            <span className="text-sm font-medium tabular-nums w-12 text-center select-none">
              {zoom}%
            </span>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Right — Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button
              variant="outline"
              size="sm"
              aria-label="Print quotation"
              onClick={handlePrint}
              className="hidden sm:inline-flex"
            >
              <Printer className="size-4" />
              Print
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Print quotation"
              onClick={handlePrint}
              className="sm:hidden"
            >
              <Printer className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              aria-label="Download as PDF"
              onClick={handleDownloadPdf}
              className="hidden sm:inline-flex"
            >
              <FileDown className="size-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Download as PDF"
              onClick={handleDownloadPdf}
              className="sm:hidden"
            >
              <FileDown className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Send via email"
              onClick={handleSendEmail}
              disabled={!onSendEmail}
            >
              <Mail className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Send via WhatsApp"
              onClick={handleSendWhatsApp}
              disabled={!onSendWhatsApp}
            >
              <MessageCircle className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Content Area ── */}
        <div className="overflow-auto flex-1 bg-gray-100">
          <div className="flex justify-center py-6 px-4 min-h-full">
            <div
              ref={templateRef}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
              className="transition-transform duration-150"
            >
              <QuotationA4Template quotation={quotation} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { QuotationPreviewDialogProps };