'use client';

import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import IrmsLayout from '@/modules/irms/components/irms-layout';

function IrmApp() {
  // Auto-seed on first load
  useEffect(() => {
    const seeded = localStorage.getItem('irms_seeded');
    if (!seeded) {
      fetch('/api/irms/seed', { method: 'POST' })
        .then((r) => r.json())
        .then(() => localStorage.setItem('irms_seeded', '1'))
        .catch(() => {});
    }
  }, []);

  return (
    <>
      <IrmsLayout />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default function Home() {
  return <IrmApp />;
}