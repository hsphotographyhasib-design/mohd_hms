'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Package, Wrench, Box, FolderTree, Users, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InventoryDashboard } from './inventory-dashboard';
import { InventoryList } from './inventory-list';
import { ServiceItems } from './service-items';
import { ServicePackages } from './service-packages';
import { ServiceCategories } from './service-categories';
import { LabourRates } from './labour-rates';
import { PriceBook } from './price-book';

const getToken = () => typeof localStorage !== 'undefined' ? (localStorage.getItem('cmms_token') || '') : '';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'service-items', label: 'Service Items', icon: Wrench },
  { id: 'service-packages', label: 'Service Packages', icon: Box },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'labour-rates', label: 'Labour Rates', icon: Users },
  { id: 'price-book', label: 'Price Book', icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function InventoryModule() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="relative">
        <div className="flex overflow-x-auto gap-1 pb-px scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && <InventoryDashboard token={getToken()} onNavigate={() => {}} />}
        {activeTab === 'materials' && <InventoryList />}
        {activeTab === 'service-items' && <ServiceItems />}
        {activeTab === 'service-packages' && <ServicePackages />}
        {activeTab === 'categories' && <ServiceCategories />}
        {activeTab === 'labour-rates' && <LabourRates />}
        {activeTab === 'price-book' && <PriceBook />}
      </div>
    </div>
  );
}