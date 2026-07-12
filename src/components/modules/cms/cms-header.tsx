'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PanelTop, Loader2, Save, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface HeaderData {
  companyName: string;
  logoUrl: string;
  contactNumber: string;
  email: string;
  whatsappNumber: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  customerPortalLink: string;
  employeeLoginLink: string;
  menuItems: string;
  enableCustomerPortal: boolean;
  enableEmployeeLogin: boolean;
}

// ============ CONSTANTS ============

const EMPTY_FORM: HeaderData = {
  companyName: '',
  logoUrl: '',
  contactNumber: '',
  email: '',
  whatsappNumber: '',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  customerPortalLink: '',
  employeeLoginLink: '',
  menuItems: '',
  enableCustomerPortal: false,
  enableEmployeeLogin: false,
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

// ============ COMPONENT ============

export function CmsHeader() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HeaderData>({ ...EMPTY_FORM });

  // ============ FETCH ============

  useEffect(() => {
    async function fetchHeader() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch('/api/cms/settings?category=header', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        const data = json.data || json;
        setForm({
          companyName: data.companyName || '',
          logoUrl: data.logoUrl || '',
          contactNumber: data.contactNumber || '',
          email: data.email || '',
          whatsappNumber: data.whatsappNumber || '',
          facebookUrl: data.facebookUrl || '',
          instagramUrl: data.instagramUrl || '',
          linkedinUrl: data.linkedinUrl || '',
          twitterUrl: data.twitterUrl || '',
          youtubeUrl: data.youtubeUrl || '',
          customerPortalLink: data.customerPortalLink || '',
          employeeLoginLink: data.employeeLoginLink || '',
          menuItems: typeof data.menuItems === 'string' ? data.menuItems : JSON.stringify(data.menuItems || [], null, 2),
          enableCustomerPortal: data.enableCustomerPortal ?? false,
          enableEmployeeLogin: data.enableEmployeeLogin ?? false,
        });
      } catch {
        setError(true);
        toast.error('Failed to load header settings');
      } finally {
        setLoading(false);
      }
    }
    fetchHeader();
  }, []);

  // ============ SAVE ============

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, category: 'header' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Header settings saved');
    } catch {
      toast.error('Failed to save header settings');
    } finally {
      setSaving(false);
    }
  };

  // ============ RENDER ============

  const setField = (field: keyof HeaderData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <PanelTop className="h-5 w-5 text-emerald-600" />
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
            <PanelTop className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Header Management</h1>
            <p className="text-sm text-muted-foreground">Configure website header and navigation</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Header
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-rose-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load header settings. Try refreshing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Company Identity Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  className="mt-1"
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  className="mt-1"
                  value={form.logoUrl}
                  onChange={(e) => setField('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Number</Label>
                  <Input
                    className="mt-1"
                    value={form.contactNumber}
                    onChange={(e) => setField('contactNumber', e.target.value)}
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
                <Label>WhatsApp Number</Label>
                <Input
                  className="mt-1"
                  value={form.whatsappNumber}
                  onChange={(e) => setField('whatsappNumber', e.target.value)}
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
                  <Label>Facebook URL</Label>
                  <Input
                    className="mt-1"
                    value={form.facebookUrl}
                    onChange={(e) => setField('facebookUrl', e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <Label>Instagram URL</Label>
                  <Input
                    className="mt-1"
                    value={form.instagramUrl}
                    onChange={(e) => setField('instagramUrl', e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>LinkedIn URL</Label>
                  <Input
                    className="mt-1"
                    value={form.linkedinUrl}
                    onChange={(e) => setField('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/..."
                  />
                </div>
                <div>
                  <Label>Twitter URL</Label>
                  <Input
                    className="mt-1"
                    value={form.twitterUrl}
                    onChange={(e) => setField('twitterUrl', e.target.value)}
                    placeholder="https://twitter.com/..."
                  />
                </div>
              </div>
              <div>
                <Label>YouTube URL</Label>
                <Input
                  className="mt-1"
                  value={form.youtubeUrl}
                  onChange={(e) => setField('youtubeUrl', e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Portals Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Portals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="font-medium">Customer Portal</Label>
                  <p className="text-xs text-muted-foreground">Enable customer portal link</p>
                </div>
                <Switch
                  checked={form.enableCustomerPortal}
                  onCheckedChange={(checked) => setField('enableCustomerPortal', checked)}
                />
              </div>
              {form.enableCustomerPortal && (
                <div>
                  <Label>Customer Portal Link</Label>
                  <Input
                    className="mt-1"
                    value={form.customerPortalLink}
                    onChange={(e) => setField('customerPortalLink', e.target.value)}
                    placeholder="https://portal.company.com"
                  />
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="font-medium">Employee Login</Label>
                  <p className="text-xs text-muted-foreground">Enable employee login link</p>
                </div>
                <Switch
                  checked={form.enableEmployeeLogin}
                  onCheckedChange={(checked) => setField('enableEmployeeLogin', checked)}
                />
              </div>
              {form.enableEmployeeLogin && (
                <div>
                  <Label>Employee Login Link</Label>
                  <Input
                    className="mt-1"
                    value={form.employeeLoginLink}
                    onChange={(e) => setField('employeeLoginLink', e.target.value)}
                    placeholder="https://hr.company.com"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Menu Items Card - full width */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Menu Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Menu Items (JSON array)</Label>
                <Textarea
                  className="mt-1 font-mono text-sm"
                  value={form.menuItems}
                  onChange={(e) => setField('menuItems', e.target.value)}
                  placeholder={'[{"label": "Home", "href": "/", "order": 1, "enabled": true}]'}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Array of {`{label, href, order, enabled}`} objects
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}