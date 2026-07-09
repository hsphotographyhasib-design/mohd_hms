export interface LabelTemplate {
  id: string;
  name: string;
  category: string;
  size: 'small' | 'medium' | 'large' | 'sticker' | 'metal';
  width: number; // mm
  height: number; // mm
  fields: string[]; // which fields to include
  showLogo: boolean;
  showQr: boolean;
  showEmergency: boolean;
  accentColor: string;
}

export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'industrial-standard',
    name: 'Industrial Standard',
    category: 'Mechanical',
    size: 'large',
    width: 100,
    height: 60,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'building',
      'room',
      'brand',
      'model',
      'installDate',
      'customerName',
      'customerPhone',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: false,
    accentColor: '#1e293b',
  },
  {
    id: 'hvac-label',
    name: 'HVAC Equipment Label',
    category: 'HVAC',
    size: 'medium',
    width: 80,
    height: 50,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'building',
      'room',
      'brand',
      'model',
      'installDate',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: false,
    accentColor: '#0f766e',
  },
  {
    id: 'electrical-label',
    name: 'Electrical Panel Label',
    category: 'Electrical',
    size: 'medium',
    width: 75,
    height: 50,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'building',
      'room',
      'brand',
      'model',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: true,
    accentColor: '#b45309',
  },
  {
    id: 'pump-label',
    name: 'Pump System Label',
    category: 'Plumbing',
    size: 'medium',
    width: 80,
    height: 50,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'building',
      'room',
      'brand',
      'model',
      'installDate',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: false,
    accentColor: '#0369a1',
  },
  {
    id: 'generator-label',
    name: 'Generator Label',
    category: 'Generator',
    size: 'large',
    width: 100,
    height: 60,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'building',
      'room',
      'brand',
      'model',
      'installDate',
      'customerName',
      'customerPhone',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: true,
    accentColor: '#7c2d12',
  },
  {
    id: 'fire-protection-label',
    name: 'Fire Protection Label',
    category: 'FireProtection',
    size: 'large',
    width: 100,
    height: 60,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'building',
      'room',
      'brand',
      'model',
      'installDate',
      'customerName',
      'customerPhone',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: true,
    accentColor: '#dc2626',
  },
  {
    id: 'small-sticker',
    name: 'Small Sticker',
    category: 'General',
    size: 'sticker',
    width: 50,
    height: 30,
    fields: ['name', 'assetNumber', 'qrId'],
    showLogo: false,
    showQr: true,
    showEmergency: false,
    accentColor: '#475569',
  },
  {
    id: 'metal-nameplate',
    name: 'Metal Nameplate',
    category: 'General',
    size: 'metal',
    width: 120,
    height: 80,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'building',
      'room',
      'brand',
      'model',
      'installDate',
      'customerName',
      'customerPhone',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: false,
    accentColor: '#334155',
  },
  {
    id: 'compact-tag',
    name: 'Compact Tag',
    category: 'General',
    size: 'small',
    width: 60,
    height: 40,
    fields: ['name', 'assetNumber', 'qrId', 'category', 'location'],
    showLogo: false,
    showQr: true,
    showEmergency: false,
    accentColor: '#475569',
  },
  {
    id: 'custom-template',
    name: 'Custom Label',
    category: 'General',
    size: 'medium',
    width: 80,
    height: 50,
    fields: [
      'name',
      'assetNumber',
      'qrId',
      'serialNumber',
      'category',
      'location',
      'brand',
      'model',
    ],
    showLogo: true,
    showQr: true,
    showEmergency: false,
    accentColor: '#6366f1',
  },
];

/**
 * Get a template by its ID
 */
export function getTemplateById(id: string): LabelTemplate | undefined {
  return LABEL_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates for a specific category
 */
export function getTemplatesByCategory(category: string): LabelTemplate[] {
  return LABEL_TEMPLATES.filter(
    (t) => t.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get templates by size
 */
export function getTemplatesBySize(
  size: LabelTemplate['size']
): LabelTemplate[] {
  return LABEL_TEMPLATES.filter((t) => t.size === size);
}