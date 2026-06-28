'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Package, DollarSign, AlertTriangle, Clock, CheckCircle, Warehouse, Users, FolderTree, TrendingUp, TrendingDown, ArrowRight,
} from 'lucide-react';

const fmt = (n: number) => `B$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ITEM_TYPE_COLORS: Record<string, string> = {
  inventory: 'bg-emerald-500', spare_part: 'bg-blue-500', consumable: 'bg-amber-500',
  service: 'bg-purple-500', manpower: 'bg-teal-500', equipment_package: 'bg-indigo-500',
  supply_only: 'bg-gray-500', supply_install: 'bg-orange-500', rental: 'bg-cyan-500',
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  inventory: 'Inventory', spare_part: 'Spare Parts', consumable: 'Consumables',
  service: 'Services', manpower: 'Manpower', equipment_package: 'Service Packages',
  supply_only: 'Supply Only', supply_install: 'Supply & Install', rental: 'Rental',
};

interface Stats {
  totalItems: number; activeItems: number; lowStockCount: number; outOfStockItems: number;
  pendingApproval: number; totalCategories: number; totalWarehouses: number; totalSuppliers: number;
  totalValue: number; totalStock: number;
  itemsByType: { type: string; count: number }[];
  itemsByStatus: { status: string; count: number }[];
  itemsByCategory: { id: string; name: string; code: string; color: string; count: number }[];
  recentMovements: { id: string; type: string; quantity: number; reason: string; createdAt: string; item: { name: string; itemCode: string; unit: string } | null; warehouse: { name: string } | null }[];
  lowStockItems: { id: string; name: string; itemCode: string; quantity: number; minStock: number; unit: string; category: { name: string } | null }[];
}

export function InventoryDashboard({ token, onNavigate }: { token: string; onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/inventory/stats', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch {}
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <DashboardSkeleton />;

  const s = stats!;
  const maxTypeCount = Math.max(...(s.itemsByType.map(t => t.count)), 1);
  const maxCatCount = Math.max(...(s.itemsByCategory.map(c => c.count)), 1);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={Package} label="Total Items" value={s.totalItems} color="emerald" />
        <KPICard icon={DollarSign} label="Total Value" value={fmt(s.totalValue)} color="emerald" />
        <KPICard icon={AlertTriangle} label="Low Stock" value={s.lowStockCount} color="rose" />
        <KPICard icon={Clock} label="Pending Approval" value={s.pendingApproval} color="amber" />
        <KPICard icon={CheckCircle} label="Active Items" value={s.activeItems} color="teal" />
        <KPICard icon={Warehouse} label="Warehouses" value={s.totalWarehouses} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Items by Type */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-4">Items by Type</h3>
            <div className="space-y-2.5">
              {s.itemsByType.length === 0 && <p className="text-xs text-muted-foreground">No items yet</p>}
              {s.itemsByType.map(t => (
                <div key={t.type} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${ITEM_TYPE_COLORS[t.type] || 'bg-gray-400'}`} />
                  <span className="text-xs w-28 truncate">{ITEM_TYPE_LABELS[t.type] || t.type}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div className={`h-2 rounded-full ${ITEM_TYPE_COLORS[t.type] || 'bg-gray-400'}`} style={{ width: `${(t.count / maxTypeCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{t.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-4">Stock Status Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <StockStatCard label="In Stock" count={s.activeItems - s.lowStockItems - s.outOfStockItems} total={s.totalItems} color="bg-emerald-500" />
              <StockStatCard label="Low Stock" count={s.lowStockItems} total={s.totalItems} color="bg-amber-500" />
              <StockStatCard label="Out of Stock" count={s.outOfStockItems} total={s.totalItems} color="bg-rose-500" />
              <StockStatCard label="Pending Approval" count={s.pendingApproval} total={s.totalItems} color="bg-blue-500" />
            </div>
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Items by Category</h4>
              <div className="space-y-2">
                {s.itemsByCategory.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || '#10b981' }} />
                    <span className="text-xs flex-1 truncate">{c.name}</span>
                    <span className="text-xs font-medium">{c.count}</span>
                  </div>
                ))}
                {s.itemsByCategory.length === 0 && <p className="text-xs text-muted-foreground">No categories</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Stock Movements */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Recent Stock Movements</h3>
              <button onClick={() => onNavigate('stock')} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {s.recentMovements.length === 0 && <p className="text-xs text-muted-foreground">No movements yet</p>}
              {s.recentMovements.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.type === 'stock_in' ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{m.item?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <Badge variant="outline" className="text-[10px] px-1.5">{m.type.replace('_', ' ')}</Badge>
                    <p className={`text-xs font-medium ${m.type === 'stock_in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.type === 'stock_in' ? '+' : '-'}{m.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Items
              </h3>
              <button onClick={() => onNavigate('items')} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {s.lowStockItems.length === 0 && <p className="text-xs text-muted-foreground">All stock levels are healthy</p>}
              {s.lowStockItems.map(i => (
                <div key={i.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{i.name}</p>
                    <p className="text-[10px] text-muted-foreground">{i.itemCode} · {i.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-bold text-rose-600">{i.quantity} <span className="font-normal text-muted-foreground">/ {i.minStock} {i.unit}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    teal: 'border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  };
  return (
    <Card className={colorMap[color] || colorMap.emerald}>
      <CardContent className="p-3">
        <Icon className="h-4 w-4 mb-1 opacity-70" />
        <p className="text-[10px] font-medium opacity-75">{label}</p>
        <p className="text-lg font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function StockStatCard({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold">{count}</p>
      <div className="mt-1.5 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}