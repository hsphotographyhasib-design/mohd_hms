'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PanelBottom, Loader2, Save, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface FooterData {
  id?: string;
  companyDescription: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  copyrightText: string;
  privacyPolicyLink: string;
  termsLink: string;
  menuLinks: string;
}

// ============ CONSTANTS ============

const EMPTY_FORM: FooterData = {
  companyDescription: '',
  address: '',
  phone: '',
  email: '',
  whatsapp: '',
  facebook: '',
  instagram: '',
  linkedin: '',
  twitter: '',
  youtube: '',
  copyrightText: '',
  privacyPolicyLink: '',
  termsLink: '',
  menuLinks: '',
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

// ============ COMPONENT ============

export function CmsFooter() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FooterData>({ ...EMPTY_FORM });
  const [footerId, setFooterId] = useState<string | null>(null);

  // ============ FETCH ============

  useEffect(() => {
    async function fetchFooter() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch('/api/cms/footer', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        const data = json.data || json;
        setFooterId(data.id || null);
        setForm({
          companyDescription: data.companyDescription || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          whatsapp: data.whatsapp || '',
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          linkedin: data.linkedin || '',
          twitter: data.twitter || '',
          youtube: data.youtube || '',
          copyrightText: data.copyrightText || '',
          privacyPolicyLink: data.privacyPolicyLink || '',
          termsLink: data.termsLink || '',
          menuLinks: typeof data.menuLinks === 'string' ? data.menuLinks : JSON.stringify(data.menuLinks || [], null, 2),
        });
      } catch {
        setError(true);
        toast.error('Failed to load footer settings');
      } finally {
        setLoading(false);
      }
    }
    fetchFooter();
  }, []);

  // ============ SAVE ============

  const handleSave = async () => {
    setSaving(true);
    try {
      const isEdit = !!footerId;
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/cms/footer/${footerId}` : '/api/cms/footer';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Footer settings saved');
      if (!footerId) {
        const updated = await res.json();
        setFooterId(updated.id || updated.data?.id || null);
      }
    } catch {
      toast.error('Failed to save footer settings');
    } finally {
      setSaving(false);
    }
  };

  // ============ RENDER ============

  const setField = (field: keyof FooterData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <PanelBottom className="h-5 w-5 text-emerald-600" />
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
                <Skeleton className="h-10 w-full" />
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
            <PanelBottom className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Footer Management</h1>
            <p className="text-sm text-muted-foreground">Configure website footer content</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Footer
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-rose-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load footer settings. Try refreshing.</p>
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
                  placeholder="Brief company description for the footer"
                  rows={3}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  className="mt-1"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder="123 Main Street, City, Country"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="info@company.com"
                  />
                </div>
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  className="mt-1"
                  value={form.whatsapp}
                  onChange={(e) => setField('whatsapp', e.target.value)}
                  placeholder="+1 234 567 890"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facebook</Label>
                  <Input
                    className="mt-1"
                    value={form.facebook}
                    onChange={(e) => setField('facebook', e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input
                    className="mt-1"
                    value={form.instagram}
                    onChange={(e) => setField('instagram', e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>LinkedIn</Label>
                  <Input
                    className="mt-1"
                    value={form.linkedin}
                    onChange={(e) => setField('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/..."
                  />
                </div>
                <div>
                  <Label>Twitter</Label>
                  <Input
                    className="mt-1"
                    value={form.twitter}
                    onChange={(e) => setField('twitter', e.target.value)}
                    placeholder="https://twitter.com/..."
                  />
                </div>
              </div>
              <div>
                <Label>YouTube</Label>
                <Input
                  className="mt-1"
                  value={form.youtube}
                  onChange={(e) => setField('youtube', e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Legal Links Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Legal &amp; Copyright</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Copyright Text</Label>
                <Input
                  className="mt-1"
                  value={form.copyrightText}
                  onChange={(e) => setField('copyrightText', e.target.value)}
                  placeholder="© 2025 Your Company. All rights reserved."
                />
              </div>
              <div>
                <Label>Privacy Policy Link</Label>
                <Input
                  className="mt-1"
                  value={form.privacyPolicyLink}
                  onChange={(e) => setField('privacyPolicyLink', e.target.value)}
                  placeholder="/privacy-policy"
                />
              </div>
              <div>
                <Label>Terms Link</Label>
                <Input
                  className="mt-1"
                  value={form.termsLink}
                  onChange={(e) => setField('termsLink', e.target.value)}
                  placeholder="/terms-of-service"
                />
              </div>
            </CardContent>
          </Card>

          {/* Menu Links Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Footer Menu Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Menu Links (JSON array)</Label>
                <Textarea
                  className="mt-1 font-mono text-sm"
                  value={form.menuLinks}
                  onChange={(e) => setField('menuLinks', e.target.value)}
                  placeholder={'[{"label": "About Us", "href": "/about"}]'}
                  rows={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Array of {`{label, href}`} objects
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}