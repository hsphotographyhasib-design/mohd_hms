'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, Loader2, Save, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface AboutData {
  mission: string;
  vision: string;
  coreValues: string;
  companyDescription: string;
  ceoMessage: string;
  image: string;
  timeline: string;
  certificates: string;
}

// ============ CONSTANTS ============

const EMPTY_FORM: AboutData = {
  mission: '',
  vision: '',
  coreValues: '',
  companyDescription: '',
  ceoMessage: '',
  image: '',
  timeline: '',
  certificates: '',
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

// ============ COMPONENT ============

export function CmsAbout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AboutData>({ ...EMPTY_FORM });

  // ============ FETCH ============

  useEffect(() => {
    async function fetchAbout() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch('/api/cms/about', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        const data = json.data || json;
        setForm({
          mission: data.mission || '',
          vision: data.vision || '',
          coreValues: data.coreValues || '',
          companyDescription: data.companyDescription || '',
          ceoMessage: data.ceoMessage || '',
          image: data.image || '',
          timeline: data.timeline || '',
          certificates: data.certificates || '',
        });
      } catch {
        setError(true);
        toast.error('Failed to load about section');
      } finally {
        setLoading(false);
      }
    }
    fetchAbout();
  }, []);

  // ============ SAVE ============

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms/about', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('About section saved');
    } catch {
      toast.error('Failed to save about section');
    } finally {
      setSaving(false);
    }
  };

  // ============ RENDER ============

  const setField = (field: keyof AboutData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-36 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">About Section</h1>
            <p className="text-sm text-muted-foreground">Manage company about information</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save About
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-rose-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load about section. Try refreshing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Company Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Description</Label>
                <Textarea
                  className="mt-1"
                  value={form.companyDescription}
                  onChange={(e) => setField('companyDescription', e.target.value)}
                  placeholder="Brief company description"
                  rows={4}
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  className="mt-1"
                  value={form.image}
                  onChange={(e) => setField('image', e.target.value)}
                  placeholder="https://example.com/about-image.jpg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Mission & Vision Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mission &amp; Vision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Mission</Label>
                <Textarea
                  className="mt-1"
                  value={form.mission}
                  onChange={(e) => setField('mission', e.target.value)}
                  placeholder="Company mission statement"
                  rows={4}
                />
              </div>
              <div>
                <Label>Vision</Label>
                <Textarea
                  className="mt-1"
                  value={form.vision}
                  onChange={(e) => setField('vision', e.target.value)}
                  placeholder="Company vision statement"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Core Values & CEO Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Values &amp; Leadership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Core Values</Label>
                <Textarea
                  className="mt-1"
                  value={form.coreValues}
                  onChange={(e) => setField('coreValues', e.target.value)}
                  placeholder="Company core values"
                  rows={4}
                />
              </div>
              <div>
                <Label>CEO Message</Label>
                <Textarea
                  className="mt-1"
                  value={form.ceoMessage}
                  onChange={(e) => setField('ceoMessage', e.target.value)}
                  placeholder="Message from the CEO"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Structured Data Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Structured Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Timeline (JSON array)</Label>
                <Textarea
                  className="mt-1 font-mono text-sm"
                  value={form.timeline}
                  onChange={(e) => setField('timeline', e.target.value)}
                  placeholder={'[{"year": "2000", "title": "Founded", "description": "..."}]'}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Array of {`{year, title, description}`} objects
                </p>
              </div>
              <div>
                <Label>Certificates (JSON array)</Label>
                <Textarea
                  className="mt-1 font-mono text-sm"
                  value={form.certificates}
                  onChange={(e) => setField('certificates', e.target.value)}
                  placeholder={'[{"name": "ISO 9001", "issuer": "...", "year": "2020"}]'}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Array of {`{name, issuer, year}`} objects
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}