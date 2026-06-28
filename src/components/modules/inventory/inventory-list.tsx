'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryDashboard } from './inventory-dashboard';
import { InventoryItems } from './inventory-items';
import { InventoryCategories } from './inventory-categories';
import { InventoryWarehouses } from './inventory-warehouses';
import { InventoryStockMovements } from './inventory-stock';
import { InventorySuppliers } from './inventory-suppliers';
import { InventoryPriceBooks } from './inventory-price-books';
import {
  Package, LayoutDashboard, FolderTree, Warehouse, ArrowLeftRight, Users, BookOpen,
} from 'lucide-react';

const token = () => localStorage.getItem('cmms_token') || '';

export function InventoryList() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory Master</h1>
            <p className="text-sm text-muted-foreground">Enterprise Item Catalog & Stock Management</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Item Master</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5">
            <Warehouse className="h-4 w-4" />
            <span className="hidden sm:inline">Warehouses</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="price-books" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Price Books</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><InventoryDashboard token={token()} onNavigate={setActiveTab} /></TabsContent>
        <TabsContent value="items"><InventoryItems token={token()} /></TabsContent>
        <TabsContent value="categories"><InventoryCategories token={token()} /></TabsContent>
        <TabsContent value="warehouses"><InventoryWarehouses token={token()} /></TabsContent>
        <TabsContent value="stock"><InventoryStockMovements token={token()} /></TabsContent>
        <TabsContent value="suppliers"><InventorySuppliers token={token()} /></TabsContent>
        <TabsContent value="price-books"><InventoryPriceBooks token={token()} /></TabsContent>
      </Tabs>
    </div>
  );
}