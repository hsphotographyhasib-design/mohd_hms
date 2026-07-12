'use client';

import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export function InventoryDetail() {
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('inventory')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Inventory Detail</h1>
      </div>

      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Inventory detail view is under construction.
        </CardContent>
      </Card>
    </div>
  );
}