'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/app-shell/store';
import { useBrandingStore, type BrandAssetType, type BrandConfig, type BrandAsset } from '@/core/branding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Palette,
  Image,
  Monitor,
  Mail,
  FileText,
  Smartphone,
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  Loader2,
  Check,
  RefreshCw,
  Building2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface AssetTypeDef {
  type: BrandAssetType;
  label: string;
  desc: string;
  accept: string;
  maxSize: number;
}

// ============ CONSTANTS ============

const ASSET_TYPES: AssetTypeDef[] = [
  { type: 'primary_logo', label: 'Primary Logo', desc: 'Full logo used in headers and sidebar', accept: '.png,.svg,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
  { type: 'compact_logo', label: 'Compact Logo', desc: 'Small logo for tight spaces', accept: '.png,.svg,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
  { type: 'dark_logo', label: 'Dark Theme Logo', desc: 'Logo variant for dark mode', accept: '.png,.svg,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
  { type: 'light_logo', label: 'Light Theme Logo', desc: 'Logo variant for light mode', accept: '.png,.svg,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
  { type: 'favicon', label: 'Favicon', desc: 'Browser tab icon (.ico/.png/.svg)', accept: '.png,.svg,.ico', maxSize: 5 * 1024 * 1024 },
  { type: 'icon_192', label: 'Mobile Icon (192\u00D7192)', desc: 'PWA / Android icon', accept: '.png,.webp', maxSize: 5 * 1024 * 1024 },
  { type: 'icon_512', label: 'Mobile Icon (512\u00D7512)', desc: 'PWA / high-res icon', accept: '.png,.webp', maxSize: 5 * 1024 * 1024 },
  { type: 'apple_touch_icon', label: 'Apple Touch Icon', desc: 'iOS home screen icon', accept: '.png', maxSize: 5 * 1024 * 1024 },
  { type: 'notification_icon', label: 'Notification Icon', desc: 'Push notification icon', accept: '.png,.webp', maxSize: 5 * 1024 * 1024 },
  { type: 'login_logo', label: 'Login Logo', desc: 'Logo shown on login page', accept: '.png,.svg,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
  { type: 'splash_logo', label: 'Splash Logo', desc: 'App splash screen logo', accept: '.png,.svg,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
  { type: 'pdf_header_logo', label: 'PDF Header Logo', desc: 'Logo in PDF reports', accept: '.png,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
  { type: 'email_header_logo', label: 'Email Header Logo', desc: 'Logo in email templates', accept: '.png,.jpg,.webp', maxSize: 2 * 1024 * 1024 },
];

const ICON_ONLY_TYPES: BrandAssetType[] = ['favicon', 'icon_192', 'icon_512', 'apple_touch_icon', 'notification_icon'];

const EMPTY_CONFIG: BrandConfig = {
  brand_name: '',
  brand_short_name: '',
  brand_tagline: '',
  brand_address: '',
  brand_phone: '',
  brand_email: '',
  brand_website: '',
  brand_tax_number: '',
  brand_reg_number: '',
  brand_primary_color: '#0B5E3C',
  brand_accent_color: '#059669',
  brand_theme_color: '#0B5E3C',
  brand_bg_color: '#FFFFFF',
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============ COMPONENT ============

export function CmsBranding() {
  const setView = useAppStore((s) => s.setView);
  const brandingStore = useBrandingStore();

  // Data state
  const [config, setConfig] = useState<BrandConfig>({ ...EMPTY_CONFIG });
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Saving state
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pwaUpdating, setPwaUpdating] = useState(false);

  // Form dirty tracking
  const [configDirty, setConfigDirty] = useState(false);

  // File input refs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ============ FETCH DATA ============

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/branding', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig(data.config || { ...EMPTY_CONFIG });
      setAssets(data.assets || []);
      brandingStore.setBranding(data);
    } catch {
      setError(true);
      toast.error('Failed to load branding data');
    } finally {
      setLoading(false);
    }
  }, [brandingStore]);

  useEffect(() => {
    fetchBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ CONFIG HELPERS ============

  const handleConfigChange = (key: keyof BrandConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setConfigDirty(true);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success('Company information saved successfully');
      setConfigDirty(false);
      brandingStore.invalidate();
      fetchBranding();
    } catch {
      toast.error('Failed to save company information');
    } finally {
      setSavingConfig(false);
    }
  };

  // ============ ASSET HELPERS ============

  const getActiveAsset = (type: BrandAssetType): BrandAsset | undefined => {
    return assets.find((a) => a.type === type && a.isActive);
  };

  const getAssetUrl = (type: BrandAssetType): string => {
    const asset = getActiveAsset(type);
    if (asset) return `/api/branding/serve/${asset.url}`;
    return '';
  };

  // ============ UPLOAD ============

  const handleUpload = async (type: BrandAssetType, file: File) => {
    const assetDef = ASSET_TYPES.find((a) => a.type === type);
    if (!assetDef) return;

    if (file.size > assetDef.maxSize) {
      toast.error(`File too large. Maximum size: ${formatFileSize(assetDef.maxSize)}`);
      return;
    }

    setUploadingType(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await fetch('/api/branding/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      toast.success('Logo updated successfully');
      brandingStore.invalidate();
      fetchBranding();
    } catch {
      toast.error('Failed to upload asset');
    } finally {
      setUploadingType(null);
    }
  };

  // ============ DELETE ============

  const handleDeleteAsset = async (assetId: string) => {
    setDeletingId(assetId);
    try {
      const res = await fetch(`/api/branding/assets/${assetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Asset deleted successfully');
      brandingStore.invalidate();
      fetchBranding();
    } catch {
      toast.error('Failed to delete asset');
    } finally {
      setDeletingId(null);
    }
  };

  // ============ PWA UPDATE ============

  const handleUpdatePwa = async () => {
    setPwaUpdating(true);
    try {
      // Trigger a re-fetch of branding which updates the store
      brandingStore.invalidate();
      await fetchBranding();
      toast.success('PWA manifest refreshed');
    } catch {
      toast.error('Failed to update PWA');
    } finally {
      setPwaUpdating(false);
    }
  };

  // ============ DOWNLOAD ============

  const handleDownload = (asset: BrandAsset) => {
    const url = `/api/branding/serve/${asset.url}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = asset.fileName;
    link.click();
  };

  // ============ COLOR HELPERS ============

  const colorFields: { key: keyof BrandConfig; label: string; desc: string }[] = [
    { key: 'brand_primary_color', label: 'Primary Color', desc: 'Main brand color used for buttons and accents' },
    { key: 'brand_accent_color', label: 'Accent Color', desc: 'Secondary highlight color' },
    { key: 'brand_theme_color', label: 'Theme Color', desc: 'Browser/PWA theme color' },
    { key: 'brand_bg_color', label: 'Background Color', desc: 'Default background color' },
  ];

  // ============ RENDER: LOADING ============

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('cms-dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Branding</h1>
            <p className="text-sm text-muted-foreground">Failed to load branding data</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-rose-600">
              <Info className="h-5 w-5" />
              <p>Could not load branding data. Please try again.</p>
            </div>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={fetchBranding}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ RENDER: MAIN ============

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('cms-dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Palette className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Branding Management</h1>
            <p className="text-sm text-muted-foreground">Customize your brand identity and assets</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
          {assets.filter((a) => a.isActive).length} active assets
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logos" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 hidden sm:block" />
            Company
          </TabsTrigger>
          <TabsTrigger value="logos">
            <Image className="h-4 w-4 hidden sm:block" />
            Logos
          </TabsTrigger>
          <TabsTrigger value="icons">
            <Smartphone className="h-4 w-4 hidden sm:block" />
            Icons
          </TabsTrigger>
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 hidden sm:block" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="pwa">
            <Monitor className="h-4 w-4 hidden sm:block" />
            PWA
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 hidden sm:block" />
            Email
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <FileText className="h-4 w-4 hidden sm:block" />
            PDF
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Company Information ── */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                Company Information
              </CardTitle>
              <CardDescription>
                Manage your company details used across the application, emails, and PDFs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Company Name *</Label>
                  <Input
                    className="mt-1"
                    value={config.brand_name}
                    onChange={(e) => handleConfigChange('brand_name', e.target.value)}
                    placeholder="MOHD.HMS ENTERPRISE"
                  />
                </div>
                <div>
                  <Label>Short Name</Label>
                  <Input
                    className="mt-1"
                    value={config.brand_short_name}
                    onChange={(e) => handleConfigChange('brand_short_name', e.target.value)}
                    placeholder="MOHD.HMS"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Tagline</Label>
                  <Input
                    className="mt-1"
                    value={config.brand_tagline}
                    onChange={(e) => handleConfigChange('brand_tagline', e.target.value)}
                    placeholder="Smart Facility Maintenance & Engineering"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    className="mt-1"
                    value={config.brand_address}
                    onChange={(e) => handleConfigChange('brand_address', e.target.value)}
                    placeholder="Full business address"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1"
                    value={config.brand_phone}
                    onChange={(e) => handleConfigChange('brand_phone', e.target.value)}
                    placeholder="+60 12-345 6789"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    value={config.brand_email}
                    onChange={(e) => handleConfigChange('brand_email', e.target.value)}
                    placeholder="info@mohdhms.com"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    className="mt-1"
                    value={config.brand_website}
                    onChange={(e) => handleConfigChange('brand_website', e.target.value)}
                    placeholder="https://mohdhms.com"
                  />
                </div>
                <div>
                  <Label>Tax Number</Label>
                  <Input
                    className="mt-1"
                    value={config.brand_tax_number}
                    onChange={(e) => handleConfigChange('brand_tax_number', e.target.value)}
                    placeholder="Tax registration number"
                  />
                </div>
                <div>
                  <Label>Registration Number</Label>
                  <Input
                    className="mt-1"
                    value={config.brand_reg_number}
                    onChange={(e) => handleConfigChange('brand_reg_number', e.target.value)}
                    placeholder="SSM / business registration number"
                  />
                </div>
              </div>
              <Separator className="my-6" />
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveConfig}
                  disabled={savingConfig || !configDirty}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : configDirty ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {savingConfig ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Logo Management ── */}
        <TabsContent value="logos">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Upload and manage all brand logos and icons. Click a slot to upload a new file.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ASSET_TYPES.map((assetDef) => (
                <AssetUploadSlot
                  key={assetDef.type}
                  assetDef={assetDef}
                  asset={getActiveAsset(assetDef.type)}
                  assetUrl={getAssetUrl(assetDef.type)}
                  uploading={uploadingType === assetDef.type}
                  deleting={deletingId === getActiveAsset(assetDef.type)?.id}
                  fileInputRef={(el) => { fileInputRefs.current[assetDef.type] = el; }}
                  onUpload={(file) => handleUpload(assetDef.type, file)}
                  onDelete={() => {
                    const asset = getActiveAsset(assetDef.type);
                    if (asset) handleDeleteAsset(asset.id);
                  }}
                  onDownload={() => {
                    const asset = getActiveAsset(assetDef.type);
                    if (asset) handleDownload(asset);
                  }}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 3: Icons ── */}
        <TabsContent value="icons">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Manage app icons for PWA, mobile, and notification use cases.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ASSET_TYPES.filter((a) => ICON_ONLY_TYPES.includes(a.type)).map((assetDef) => (
                <AssetUploadSlot
                  key={assetDef.type}
                  assetDef={assetDef}
                  asset={getActiveAsset(assetDef.type)}
                  assetUrl={getAssetUrl(assetDef.type)}
                  uploading={uploadingType === assetDef.type}
                  deleting={deletingId === getActiveAsset(assetDef.type)?.id}
                  fileInputRef={(el) => { fileInputRefs.current[assetDef.type] = el; }}
                  onUpload={(file) => handleUpload(assetDef.type, file)}
                  onDelete={() => {
                    const asset = getActiveAsset(assetDef.type);
                    if (asset) handleDeleteAsset(asset.id);
                  }}
                  onDownload={() => {
                    const asset = getActiveAsset(assetDef.type);
                    if (asset) handleDownload(asset);
                  }}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 4: Theme Colors ── */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                Theme Colors
              </CardTitle>
              <CardDescription>
                Define the color palette used across the application, PWA, and email templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {colorFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.desc}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="relative">
                        <input
                          type="color"
                          value={config[field.key] || '#000000'}
                          onChange={(e) => handleConfigChange(field.key, e.target.value)}
                          className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                        />
                      </div>
                      <Input
                        value={config[field.key] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                            handleConfigChange(field.key, val);
                          }
                        }}
                        placeholder="#000000"
                        className="font-mono w-32"
                        maxLength={7}
                      />
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0"
                        style={{ backgroundColor: config[field.key] || '#000000' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-6" />
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveConfig}
                  disabled={savingConfig || !configDirty}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : configDirty ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {savingConfig ? 'Saving...' : 'Save Colors'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 5: PWA Settings ── */}
        <TabsContent value="pwa">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-emerald-600" />
                  PWA Configuration
                </CardTitle>
                <CardDescription>
                  Progressive Web App settings and manifest preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium text-muted-foreground">App Name</span>
                    <span className="text-sm font-medium">{config.brand_name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium text-muted-foreground">Short Name</span>
                    <span className="text-sm font-medium">{config.brand_short_name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium text-muted-foreground">Theme Color</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded border border-gray-200"
                        style={{ backgroundColor: config.brand_theme_color || '#0B5E3C' }}
                      />
                      <span className="text-sm font-mono">{config.brand_theme_color || '#0B5E3C'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium text-muted-foreground">Background Color</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded border border-gray-200"
                        style={{ backgroundColor: config.brand_bg_color || '#FFFFFF' }}
                      />
                      <span className="text-sm font-mono">{config.brand_bg_color || '#FFFFFF'}</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <Button
                  onClick={handleUpdatePwa}
                  disabled={pwaUpdating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {pwaUpdating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Update PWA Manifest
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PWA Icons Preview</CardTitle>
                <CardDescription>Icons that will be used by the PWA installation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {(['icon_192', 'icon_512', 'apple_touch_icon'] as const).map((type) => {
                    const asset = getActiveAsset(type);
                    const url = getAssetUrl(type);
                    const def = ASSET_TYPES.find((a) => a.type === type);
                    return (
                      <div key={type} className="text-center space-y-2">
                        <div className="mx-auto w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                          {url ? (
                            <img src={url} alt={def?.label} className="w-full h-full object-contain p-2" />
                          ) : (
                            <Image className="h-8 w-8 text-gray-300" />
                          )}
                        </div>
                        <p className="text-xs font-medium">{def?.label}</p>
                        {asset && (
                          <p className="text-xs text-muted-foreground">
                            {asset.width && asset.height ? `${asset.width}\u00D7${asset.height}` : '—'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Separator className="my-4" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>PWA icons must be PNG or WebP format for best compatibility.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 6: Email Branding ── */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                Email Branding Preview
              </CardTitle>
              <CardDescription>
                Preview how your branding appears in email templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-lg mx-auto border rounded-xl overflow-hidden shadow-sm">
                {/* Email Header */}
                <div className="p-6 text-center" style={{ backgroundColor: config.brand_primary_color || '#0B5E3C' }}>
                  {getAssetUrl('email_header_logo') ? (
                    <img
                      src={getAssetUrl('email_header_logo')}
                      alt="Logo"
                      className="h-12 mx-auto mb-3 object-contain"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  ) : (
                    <div className="h-12 mb-3 flex items-center justify-center">
                      <span className="text-white/80 text-lg font-semibold">LOGO</span>
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-white">
                    {config.brand_name || 'MOHD.HMS ENTERPRISE'}
                  </h2>
                  {config.brand_tagline && (
                    <p className="text-sm text-white/80 mt-1">{config.brand_tagline}</p>
                  )}
                </div>

                {/* Theme Color Bar */}
                <div className="h-1" style={{ backgroundColor: config.brand_accent_color || '#059669' }} />

                {/* Email Body Preview */}
                <div className="p-6 bg-white">
                  <p className="text-sm text-muted-foreground mb-4">
                    Dear Customer,
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    This is a preview of how your email templates will look with the configured branding.
                    The header logo, company name, and theme colors will be automatically applied to all
                    system-generated emails.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <p className="text-xs text-muted-foreground">
                      Email content area — notifications, invoices, reports, etc.
                    </p>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="h-1" style={{ backgroundColor: config.brand_accent_color || '#059669' }} />
                <div className="px-6 py-4 bg-gray-50 text-center">
                  <p className="text-sm font-medium text-gray-800">
                    {config.brand_name || 'MOHD.HMS ENTERPRISE'}
                  </p>
                  {config.brand_address && (
                    <p className="text-xs text-muted-foreground mt-1">{config.brand_address}</p>
                  )}
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    {config.brand_phone && <span>{config.brand_phone}</span>}
                    {config.brand_email && <span>{config.brand_email}</span>}
                    {config.brand_website && <span>{config.brand_website}</span>}
                  </div>
                  {config.brand_reg_number && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reg: {config.brand_reg_number}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 7: PDF Branding ── */}
        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                PDF Branding Preview
              </CardTitle>
              <CardDescription>
                Preview how your branding appears in PDF reports and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl mx-auto border rounded-xl overflow-hidden shadow-sm bg-white">
                {/* PDF Header */}
                <div className="p-6 border-b" style={{ borderBottomColor: config.brand_primary_color || '#0B5E3C' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {getAssetUrl('pdf_header_logo') ? (
                        <img
                          src={getAssetUrl('pdf_header_logo')}
                          alt="Logo"
                          className="h-14 object-contain"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Image className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {config.brand_name || 'MOHD.HMS ENTERPRISE'}
                        </h2>
                        {config.brand_tagline && (
                          <p className="text-xs text-muted-foreground">{config.brand_tagline}</p>
                        )}
                        {config.brand_address && (
                          <p className="text-xs text-muted-foreground mt-0.5">{config.brand_address}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{config.brand_phone || '+60 XX-XXX XXXX'}</p>
                      <p>{config.brand_email || 'info@company.com'}</p>
                      {config.brand_website && <p>{config.brand_website}</p>}
                    </div>
                  </div>
                </div>

                {/* Color Accent Bar */}
                <div className="h-1" style={{ backgroundColor: config.brand_primary_color || '#0B5E3C' }} />

                {/* Sample Report Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">INVOICE #INV-2024-001</h3>
                      <p className="text-xs text-muted-foreground">Date: January 15, 2024</p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Paid</Badge>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-600">Qty</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-2">HVAC Maintenance Service</td>
                          <td className="text-right px-4 py-2">1</td>
                          <td className="text-right px-4 py-2">RM 2,500.00</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-2">Spare Parts Replacement</td>
                          <td className="text-right px-4 py-2">3</td>
                          <td className="text-right px-4 py-2">RM 450.00</td>
                        </tr>
                        <tr className="border-t bg-gray-50 font-medium">
                          <td className="px-4 py-2" colSpan={2}>Total</td>
                          <td className="text-right px-4 py-2">RM 2,950.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PDF Footer */}
                <div className="h-1" style={{ backgroundColor: config.brand_primary_color || '#0B5E3C' }} />
                <div className="px-6 py-3 bg-gray-50 flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    <p>{config.brand_name || 'MOHD.HMS ENTERPRISE'}</p>
                    {config.brand_reg_number && <p>Reg: {config.brand_reg_number}</p>}
                  </div>
                  <div className="text-right">
                    {config.brand_tax_number && <p>Tax: {config.brand_tax_number}</p>}
                    <p>Page 1 of 1</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ SUB-COMPONENT: Asset Upload Slot ============

function AssetUploadSlot({
  assetDef,
  asset,
  assetUrl,
  uploading,
  deleting,
  fileInputRef,
  onUpload,
  onDelete,
  onDownload,
}: {
  assetDef: AssetTypeDef;
  asset?: BrandAsset;
  assetUrl: string;
  uploading: boolean;
  deleting: boolean;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const localInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Label & Version */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium leading-tight">{assetDef.label}</p>
            <p className="text-xs text-muted-foreground leading-tight">{assetDef.desc}</p>
          </div>
          {asset && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              v{asset.version}
            </Badge>
          )}
        </div>

        {/* Preview Area */}
        <div
          className="relative w-full h-28 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
          onClick={() => localInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
              <span className="text-xs text-emerald-600">Uploading...</span>
            </div>
          ) : assetUrl ? (
            <img
              src={assetUrl}
              alt={assetDef.label}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Upload className="h-6 w-6" />
              <span className="text-xs">Click to upload</span>
            </div>
          )}
        </div>

        {/* File Info */}
        {asset && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="truncate">{asset.fileName}</p>
            <div className="flex items-center gap-2">
              <span>{formatFileSize(asset.fileSize)}</span>
              {asset.width && asset.height && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>{asset.width}&times;{asset.height}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <input
            ref={(el) => { localInputRef.current = el; fileInputRef(el); }}
            type="file"
            accept={assetDef.accept}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => localInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3 w-3 mr-1" />
            Upload
          </Button>
          {asset && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onDownload}
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                onClick={onDelete}
                disabled={deleting}
                title="Delete"
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}