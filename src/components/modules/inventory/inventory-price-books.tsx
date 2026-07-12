'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, BookOpen, Pencil, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => `B$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PriceBook { id: string; name: string; code?: string; description?: string; isDefault: boolean; _count?: { entries: number } }
interface PriceBookEntry { id: string; itemId: string; price: number; discount: number; currency: string; item?: { id: string; name: string; itemCode?: string } }

export function InventoryPriceBooks({ token }: { token: string }) {
  const [books, setBooks] = useState<PriceBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<PriceBookEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Book dialog
  const [bookDialog, setBookDialog] = useState(false);
  const [bookEdit, setBookEdit] = useState<PriceBook | null>(null);
  const [bookForm, setBookForm] = useState({ name: '', code: '', description: '' });
  const [bookSubmitting, setBookSubmitting] = useState(false);

  // Entry dialog
  const [entryDialog, setEntryDialog] = useState(false);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryForm, setEntryForm] = useState({ itemId: '', price: '', discount: '0' });
  const [items, setItems] = useState<{ id: string; name: string; itemCode?: string; sellingPrice: number }[]>([]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/price-books', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setBooks(json.data || json || []); }
    } catch { toast.error('Failed to load price books'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const fetchEntries = useCallback(async (bookId: string) => {
    setEntriesLoading(true);
    try {
      const res = await fetch(`/api/inventory/price-books/${bookId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setEntries(json.entries || []); }
    } catch {}
    finally { setEntriesLoading(false); }
  }, [token]);

  useEffect(() => {
    if (selectedId) fetchEntries(selectedId);
    else setEntries([]);
  }, [selectedId, fetchEntries]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/inventory?pageSize=500', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const json = await res.json(); setItems((json.data || []).map((i: any) => ({ id: i.id, name: i.name, itemCode: i.itemCode, sellingPrice: i.sellingPrice }))); }
      } catch {}
    })();
  }, [token]);

  const openBookCreate = () => { setBookEdit(null); setBookForm({ name: '', code: '', description: '' }); setBookDialog(true); };
  const openBookEdit = (b: PriceBook) => { setBookEdit(b); setBookForm({ name: b.name, code: b.code || '', description: b.description || '' }); setBookDialog(true); };

  const submitBook = async () => {
    if (!bookForm.name) { toast.error('Name is required'); return; }
    setBookSubmitting(true);
    try {
      const url = bookEdit ? `/api/inventory/price-books/${bookEdit.id}` : '/api/inventory/price-books';
      const method = bookEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(bookForm) });
      if (!res.ok) throw new Error();
      toast.success(bookEdit ? 'Price book updated' : 'Price book created');
      setBookDialog(false);
      fetchBooks();
    } catch { toast.error('Failed to save price book'); }
    finally { setBookSubmitting(false); }
  };

  const deleteBook = async (id: string) => {
    if (!confirm('Delete this price book?')) return;
    try {
      const res = await fetch(`/api/inventory/price-books/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Price book deleted'); fetchBooks(); if (selectedId === id) setSelectedId(null); }
    } catch { toast.error('Failed to delete'); }
  };

  const submitEntry = async () => {
    if (!entryForm.itemId || !entryForm.price || !selectedId) { toast.error('Item and price required'); return; }
    setEntrySubmitting(true);
    try {
      const res = await fetch(`/api/inventory/price-books/${selectedId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...entryForm, price: parseFloat(entryForm.price), discount: parseFloat(entryForm.discount) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success('Entry added');
      setEntryDialog(false);
      setEntryForm({ itemId: '', price: '', discount: '0' });
      fetchEntries(selectedId);
      fetchBooks();
    } catch { toast.error('Failed to add entry'); }
    finally { setEntrySubmitting(false); }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const res = await fetch(`/api/inventory/price-books/${selectedId}/entries/${entryId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Entry removed'); fetchEntries(selectedId!); fetchBooks(); }
    } catch {}
  };

  const bf = (field: string, value: string) => setBookForm(prev => ({ ...prev, [field]: value }));
  const ef = (field: string, value: string) => setEntryForm(prev => ({ ...prev, [field]: value }));

  const selectedBook = books.find(b => b.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Price Books</h2>
        <Button size="sm" onClick={openBookCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" /> Price Book</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Price Books List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : books.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No price books yet</p></CardContent></Card>
            : books.map(b => (
              <Card
                key={b.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedId === b.id ? 'ring-2 ring-emerald-500 border-emerald-300' : ''}`}
                onClick={() => setSelectedId(selectedId === b.id ? null : b.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold">{b.name}</p>
                          {b.isDefault && <Badge className="text-[9px] px-1 bg-emerald-100 text-emerald-700">Default</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{b.code || '—'} · {b._count?.entries || 0} items</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openBookEdit(b); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={e => { e.stopPropagation(); deleteBook(b.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Entries */}
        <Card className="lg:col-span-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{selectedBook ? `${selectedBook.name} — Entries` : 'Select a price book'}</h3>
              {selectedId && <Button size="sm" variant="outline" onClick={() => { setEntryForm({ itemId: '', price: '', discount: '0' }); setEntryDialog(true); }} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Entry</Button>}
            </div>
            {!selectedId ? (
              <div className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a price book to view entries</p>
              </div>
            ) : entriesLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              : entries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm">No entries yet</p>
                  <Button size="sm" variant="outline" onClick={() => setEntryDialog(true)} className="mt-2"><Plus className="h-3 w-3 mr-1" /> Add Entry</Button>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white dark:bg-gray-950"><TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs text-right">Price</TableHead>
                      <TableHead className="text-xs text-right">Discount</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {entries.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm font-medium">{e.item?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(e.price)}</TableCell>
                          <TableCell className="text-right text-sm">{e.discount > 0 ? `${e.discount}%` : '—'}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => deleteEntry(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Book Dialog */}
      <Dialog open={bookDialog} onOpenChange={setBookDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{bookEdit ? 'Edit Price Book' : 'New Price Book'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input className="mt-1 h-9" value={bookForm.name} onChange={e => bf('name', e.target.value)} /></div>
            <div><Label className="text-xs">Code</Label><Input className="mt-1 h-9" placeholder="e.g. RETAIL" value={bookForm.code} onChange={e => bf('code', e.target.value)} /></div>
            <div><Label className="text-xs">Description</Label><Textarea className="mt-1 text-sm min-h-[50px]" value={bookForm.description} onChange={e => bf('description', e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialog(false)}>Cancel</Button>
            <Button onClick={submitBook} disabled={bookSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">{bookEdit ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Dialog */}
      <Dialog open={entryDialog} onOpenChange={setEntryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Price Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Item *</Label>
              <Select value={entryForm.itemId} onValueChange={v => ef('itemId', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.itemCode ? `[${i.itemCode}] ` : ''}{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Price (BND) *</Label><Input type="number" className="mt-1 h-9" value={entryForm.price} onChange={e => ef('price', e.target.value)} /></div>
              <div><Label className="text-xs">Discount (%)</Label><Input type="number" className="mt-1 h-9" value={entryForm.discount} onChange={e => ef('discount', e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialog(false)}>Cancel</Button>
            <Button onClick={submitEntry} disabled={entrySubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {entrySubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}