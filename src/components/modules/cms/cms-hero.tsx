'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  LayoutTemplate, Loader2, Save, Eye, AlertCircle, Plus,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface HeroData {
  id?: string;
  headline: string;
  subheadline: string;
  backgroundImage: string;
  backgroundVideo: string;
  cta1Text: string;
  cta1Link: string;
  cta2Text: string;
  cta2Link: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  chipText: string;
  chipSubtext: string;
  isActive: boolean;
}

// ============ CONSTANTS ============

const EMPTY_FORM: HeroData = {
  headline: '',
  subheadline: '',
  backgroundImage: '',
  backgroundVideo: '',
  cta1Text: '',
  cta1Link: '',
  cta2Text: '',
  cta2Link: '',
  stat1Value: '',
  stat1Label: '',
  stat2Value: '',
  stat2Label: '',
  stat3Value: '',
  stat3Label: '',
  chipText: '',
  chipSubtext: '',
  isActive: true,
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

// ============ COMPONENT ============

export function CmsHero() {
  const [hero, setHero] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HeroData>({ ...EMPTY_FORM });

  // ============ FETCH ============

  useEffect(() => {
    async function fetchHero() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch('/api/cms/hero', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setHero(json);
        setForm({
          headline: json.headline || '',
          subheadline: json.subheadline || '',
          backgroundImage: json.backgroundImage || '',
          backgroundVideo: json.backgroundVideo || '',
          cta1Text: json.cta1Text || '',
          cta1Link: json.cta1Link || '',
          cta2Text: json.cta2Text || '',
          cta2Link: json.cta2Link || '',
          stat1Value: json.stat1Value || '',
          stat1Label: json.stat1Label || '',
          stat2Value: json.stat2Value || '',
          stat2Label: json.stat2Label || '',
          stat3Value: json.stat3Value || '',
          stat3Label: json.stat3Label || '',
          chipText: json.chipText || '',
          chipSubtext: json.chipSubtext || '',
          isActive: json.isActive ?? true,
        });
      } catch {
        setError(true);
        toast.error('Failed to load hero section');
      } finally {
        setLoading(false);
      }
    }
    fetchHero();
  }, []);

  // ============ SAVE ============

  const handleSave = async () => {
    if (!form.headline) {
      toast.error('Headline is required');
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!hero?.id;
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/cms/hero/${hero.id}` : '/api/cms/hero';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Hero updated' : 'Hero created');
      const updated = await res.json();
      setHero(updated);
    } catch {
      toast.error('Failed to save hero section');
    } finally {
      setSaving(false);
    }
  };

  // ============ RENDER HELPERS ============

  const setField = (field: keyof HeroData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const hasStats = form.stat1Value || form.stat2Value || form.stat3Value;

  // ============ EMPTY STATE ============

  if (!loading && !error && !hero) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <LayoutTemplate className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hero Section</h1>
              <p className="text-sm text-muted-foreground">Manage the main hero banner</p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Create Your First Hero Section</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Design your website&apos;s hero banner with headline, subheadline, CTA buttons, and stats.
            </p>
            <Button
              onClick={() => setHero({ ...EMPTY_FORM })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Hero Section
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ LOADING STATE ============

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-36 mt-1" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ MAIN RENDER ============

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Hero Section</h1>
            <p className="text-sm text-muted-foreground">Manage the main hero banner</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Hero
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-rose-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load hero section. Try refreshing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Headline *</Label>
                  <Input
                    className="mt-1"
                    value={form.headline}
                    onChange={(e) => setField('headline', e.target.value)}
                    placeholder="Main headline"
                  />
                </div>
                <div>
                  <Label>Subheadline</Label>
                  <Input
                    className="mt-1"
                    value={form.subheadline}
                    onChange={(e) => setField('subheadline', e.target.value)}
                    placeholder="Supporting text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Chip Text</Label>
                    <Input
                      className="mt-1"
                      value={form.chipText}
                      onChange={(e) => setField('chipText', e.target.value)}
                      placeholder="Badge label"
                    />
                  </div>
                  <div>
                    <Label>Chip Subtext</Label>
                    <Input
                      className="mt-1"
                      value={form.chipSubtext}
                      onChange={(e) => setField('chipSubtext', e.target.value)}
                      placeholder="Badge subtext"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Background</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Background Image URL</Label>
                  <Input
                    className="mt-1"
                    value={form.backgroundImage}
                    onChange={(e) => setField('backgroundImage', e.target.value)}
                    placeholder="https://example.com/hero-bg.jpg"
                  />
                </div>
                <div>
                  <Label>Background Video URL</Label>
                  <Input
                    className="mt-1"
                    value={form.backgroundVideo}
                    onChange={(e) => setField('backgroundVideo', e.target.value)}
                    placeholder="https://example.com/hero-video.mp4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">CTA Buttons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CTA 1 Text</Label>
                    <Input
                      className="mt-1"
                      value={form.cta1Text}
                      onChange={(e) => setField('cta1Text', e.target.value)}
                      placeholder="Get Started"
                    />
                  </div>
                  <div>
                    <Label>CTA 1 Link</Label>
                    <Input
                      className="mt-1"
                      value={form.cta1Link}
                      onChange={(e) => setField('cta1Link', e.target.value)}
                      placeholder="/contact"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CTA 2 Text</Label>
                    <Input
                      className="mt-1"
                      value={form.cta2Text}
                      onChange={(e) => setField('cta2Text', e.target.value)}
                      placeholder="Learn More"
                    />
                  </div>
                  <div>
                    <Label>CTA 2 Link</Label>
                    <Input
                      className="mt-1"
                      value={form.cta2Link}
                      onChange={(e) => setField('cta2Link', e.target.value)}
                      placeholder="/about"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stat 1 Value</Label>
                    <Input
                      className="mt-1"
                      value={form.stat1Value}
                      onChange={(e) => setField('stat1Value', e.target.value)}
                      placeholder="500+"
                    />
                  </div>
                  <div>
                    <Label>Stat 1 Label</Label>
                    <Input
                      className="mt-1"
                      value={form.stat1Label}
                      onChange={(e) => setField('stat1Label', e.target.value)}
                      placeholder="Projects Completed"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stat 2 Value</Label>
                    <Input
                      className="mt-1"
                      value={form.stat2Value}
                      onChange={(e) => setField('stat2Value', e.target.value)}
                      placeholder="98%"
                    />
                  </div>
                  <div>
                    <Label>Stat 2 Label</Label>
                    <Input
                      className="mt-1"
                      value={form.stat2Label}
                      onChange={(e) => setField('stat2Label', e.target.value)}
                      placeholder="Client Satisfaction"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stat 3 Value</Label>
                    <Input
                      className="mt-1"
                      value={form.stat3Value}
                      onChange={(e) => setField('stat3Value', e.target.value)}
                      placeholder="25+"
                    />
                  </div>
                  <div>
                    <Label>Stat 3 Label</Label>
                    <Input
                      className="mt-1"
                      value={form.stat3Label}
                      onChange={(e) => setField('stat3Label', e.target.value)}
                      placeholder="Years Experience"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Show this hero on the website</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setField('isActive', checked)}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-base">Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 min-h-[300px] relative overflow-hidden">
                  {form.chipText && (
                    <div className="mb-4">
                      <span className="inline-block rounded-full bg-emerald-600 text-white text-xs font-medium px-3 py-1">
                        {form.chipText}
                        {form.chipSubtext && (
                          <span className="opacity-80 ml-1">{form.chipSubtext}</span>
                        )}
                      </span>
                    </div>
                  )}
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {form.headline || 'Your Headline Here'}
                  </h2>
                  {form.subheadline && (
                    <p className="text-gray-600 mb-6">{form.subheadline}</p>
                  )}

                  {(form.cta1Text || form.cta2Text) && (
                    <div className="flex flex-wrap gap-3 mb-6">
                      {form.cta1Text && (
                        <span className="inline-flex items-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2">
                          {form.cta1Text}
                        </span>
                      )}
                      {form.cta2Text && (
                        <span className="inline-flex items-center rounded-lg border border-emerald-600 text-emerald-600 text-sm font-medium px-4 py-2">
                          {form.cta2Text}
                        </span>
                      )}
                    </div>
                  )}

                  {hasStats && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex flex-wrap gap-6">
                        {form.stat1Value && (
                          <div className="text-center">
                            <p className="text-xl font-bold text-emerald-700">{form.stat1Value}</p>
                            <p className="text-xs text-gray-500">{form.stat1Label}</p>
                          </div>
                        )}
                        {form.stat2Value && (
                          <div className="text-center">
                            <p className="text-xl font-bold text-emerald-700">{form.stat2Value}</p>
                            <p className="text-xs text-gray-500">{form.stat2Label}</p>
                          </div>
                        )}
                        {form.stat3Value && (
                          <div className="text-center">
                            <p className="text-xl font-bold text-emerald-700">{form.stat3Value}</p>
                            <p className="text-xs text-gray-500">{form.stat3Label}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}