'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QrScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan?: (data: string) => void;
}

type ScannerState = 'initializing' | 'scanning' | 'permission-denied' | 'error';

export function QrScannerModal({ open, onOpenChange, onScan }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [scannerState, setScannerState] = useState<ScannerState>('initializing');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        // ignore
      }
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    setScannerState('initializing');
    setErrorMsg('');
    setTorchOn(false);
    setTorchSupported(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
        },
      });

      streamRef.current = stream;

      // Check for torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any);
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Lazily import @zxing/library
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      setScannerState('scanning');

      const scanFrame = () => {
        if (!videoRef.current || !readerRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          try {
            const result = readerRef.current.decodeFromImageElement(undefined, imageData);
            if (result && result.getText()) {
              const data = result.getText();
              stopCamera();
              onScan?.(data);
              onOpenChange(false);
              return;
            }
          } catch {
            // No QR code found in this frame — continue scanning
          }
        }

        animFrameRef.current = requestAnimationFrame(scanFrame);
      };

      animFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      stopCamera();
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError'
      ) {
        setScannerState('permission-denied');
        setErrorMsg('Camera access was denied. Please allow camera permission to scan QR codes.');
      } else {
        setScannerState('error');
        setErrorMsg(err?.message || 'Failed to start camera. Please try again.');
      }
    }
  }, [onScan, onOpenChange, stopCamera]);

  // Handle open/close
  useEffect(() => {
    if (open) {
      startScanning();
    } else {
      stopCamera();
      setScannerState('initializing');
      setErrorMsg('');
      setTorchOn(false);
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const newTorch = !torchOn;
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: newTorch } as any],
      });
      setTorchOn(newTorch);
    } catch {
      // Torch not supported or failed
    }
  }, [torchOn]);

  const handleOpenSettings = useCallback(() => {
    // Try to use the Permissions API to request camera
    if ((navigator.permissions as any)?.request) {
      (navigator.permissions as any).request({ name: 'camera' })
        .then(() => {
          startScanning();
        })
        .catch(() => {
          // If request fails, direct user to settings
          // Most mobile browsers don't support this, but we try
        });
    }
    // Fallback: close so user can manually go to settings
  }, [startScanning]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
        >
          {/* Hidden video element */}
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            playsInline
            muted
          />

          {/* Hidden canvas for frame processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Semi-transparent overlay with viewfinder cutout */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            {/* Dark overlay - using a box-shadow approach for the cutout */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at center, transparent 120px, rgba(0,0,0,0.6) 121px)',
              }}
            />

            {/* Viewfinder square with animated green corners */}
            <div className="relative" style={{ width: 240, height: 240 }}>
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 h-8 w-8 border-l-[3px] border-t-[3px] border-emerald-400 rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 h-8 w-8 border-r-[3px] border-t-[3px] border-emerald-400 rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-sm" />

              {/* Animated scan line */}
              <motion.div
                className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                animate={{ top: [8, 228, 8] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.5,
                  ease: 'easeInOut',
                }}
              />
            </div>
          </div>

          {/* Close button — top right */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 flex size-12 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm active:bg-black/50"
            aria-label="Close scanner"
          >
            <X className="size-6" />
          </button>

          {/* Torch toggle — top left */}
          {torchSupported && scannerState === 'scanning' && (
            <button
              onClick={toggleTorch}
              className={cn(
                'absolute top-4 left-4 z-20 flex size-12 items-center justify-center rounded-full backdrop-blur-sm active:scale-95 transition-all',
                torchOn
                  ? 'bg-amber-500/80 text-white'
                  : 'bg-black/30 text-white',
              )}
              aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
            >
              <Zap className="size-5" />
            </button>
          )}

          {/* Bottom section */}
          <div className="absolute bottom-20 left-0 right-0 z-20 flex flex-col items-center gap-3">
            {/* Scanning text */}
            {scannerState === 'scanning' && (
              <motion.p
                className="text-sm font-medium text-white/80"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                Scanning...
              </motion.p>
            )}

            {/* Initializing */}
            {scannerState === 'initializing' && (
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="text-sm text-white/70">Initializing camera...</p>
              </div>
            )}

            {/* Permission denied */}
            {scannerState === 'permission-denied' && (
              <div className="mx-8 flex flex-col items-center gap-4 rounded-2xl bg-white/10 p-6 text-center backdrop-blur-md">
                <div className="flex size-14 items-center justify-center rounded-full bg-red-500/20">
                  <AlertCircle className="size-7 text-red-400" />
                </div>
                <p className="max-w-[260px] text-sm leading-relaxed text-white/90">
                  {errorMsg}
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={handleOpenSettings}
                    className="flex min-h-[48px] min-w-[48px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700"
                  >
                    Open Settings
                  </button>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="flex min-h-[48px] min-w-[48px] flex-1 items-center justify-center rounded-xl bg-white/15 px-4 text-sm font-semibold text-white active:bg-white/25"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Generic error */}
            {scannerState === 'error' && (
              <div className="mx-8 flex flex-col items-center gap-4 rounded-2xl bg-white/10 p-6 text-center backdrop-blur-md">
                <div className="flex size-14 items-center justify-center rounded-full bg-red-500/20">
                  <AlertCircle className="size-7 text-red-400" />
                </div>
                <p className="max-w-[260px] text-sm leading-relaxed text-white/90">
                  {errorMsg}
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={startScanning}
                    className="flex min-h-[48px] min-w-[48px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="flex min-h-[48px] min-w-[48px] flex-1 items-center justify-center rounded-xl bg-white/15 px-4 text-sm font-semibold text-white active:bg-white/25"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}