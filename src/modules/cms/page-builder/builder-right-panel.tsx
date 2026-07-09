'use client';

import { usePageBuilderStore } from '@/modules/cms/page-builder/store';
import { cn } from '@/core/utils/utils';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { Slider } from '@/shared/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import { Settings, Palette, Code2, X, Trash2, Plus, MousePointerClick } from 'lucide-react';
import type { WidgetNode, WidgetStyles, WidgetType } from '@/modules/cms/page-builder/types';
import { useState } from 'react';

// ============ HELPERS ============

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1, unit = 'px' }: {
  label: string; value: number | undefined; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="h-7 text-xs bg-gray-700/50 border-gray-600 text-white"
        />
        {unit && <span className="text-[10px] text-gray-500 w-6">{unit}</span>}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-gray-600 bg-transparent"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-7 text-xs bg-gray-700/50 border-gray-600 text-white flex-1"
        />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  const Comp = multiline ? Textarea : Input;
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <Comp
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('bg-gray-700/50 border-gray-600 text-white text-xs', multiline ? 'min-h-[80px]' : 'h-7')}
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs bg-gray-700/50 border-gray-600 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-gray-200 text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-[11px] text-gray-400">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} className="data-[state=checked]:bg-emerald-600" />
    </div>
  );
}

// ============ CONTENT EDITORS PER WIDGET TYPE ============

function HeadingEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <TextField label="Text" value={(content.text as string) || ''} onChange={(v) => update(sectionId, widgetId, { text: v })} placeholder="Enter heading..." />
      <SelectField label="Level" value={(content.level as string) || 'h2'} onChange={(v) => update(sectionId, widgetId, { level: v, htmlTag: v })} options={[
        { value: 'h1', label: 'H1' }, { value: 'h2', label: 'H2' }, { value: 'h3', label: 'H3' },
        { value: 'h4', label: 'H4' }, { value: 'h5', label: 'H5' }, { value: 'h6', label: 'H6' },
      ]} />
      <TextField label="Link URL" value={(content.linkUrl as string) || ''} onChange={(v) => update(sectionId, widgetId, { linkUrl: v })} placeholder="https://..." />
    </div>
  );
}

function TextEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <TextField label="Text" value={(content.text as string) || ''} onChange={(v) => update(sectionId, widgetId, { text: v })} placeholder="Enter text..." multiline />
    </div>
  );
}

function ButtonEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <TextField label="Text" value={(content.text as string) || ''} onChange={(v) => update(sectionId, widgetId, { text: v })} />
      <TextField label="URL" value={(content.url as string) || ''} onChange={(v) => update(sectionId, widgetId, { url: v })} placeholder="https://..." />
      <SelectField label="Variant" value={(content.variant as string) || 'primary'} onChange={(v) => update(sectionId, widgetId, { variant: v })} options={[
        { value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' },
        { value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }, { value: 'link', label: 'Link' },
      ]} />
      <SelectField label="Size" value={(content.size as string) || 'md'} onChange={(v) => update(sectionId, widgetId, { size: v })} options={[
        { value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' },
      ]} />
      <SwitchField label="Full Width" value={(content.fullWidth as boolean) || false} onChange={(v) => update(sectionId, widgetId, { fullWidth: v })} />
      <SwitchField label="Open in New Tab" value={(content.newTab as boolean) || false} onChange={(v) => update(sectionId, widgetId, { newTab: v })} />
    </div>
  );
}

function ImageEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <TextField label="Image URL" value={(content.src as string) || ''} onChange={(v) => update(sectionId, widgetId, { src: v })} placeholder="/images/..." />
      {(content.src as string) && (
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <img src={content.src as string} alt="Preview" className="w-full h-32 object-cover" />
        </div>
      )}
      <TextField label="Alt Text" value={(content.alt as string) || ''} onChange={(v) => update(sectionId, widgetId, { alt: v })} />
      <TextField label="Link URL" value={(content.linkUrl as string) || ''} onChange={(v) => update(sectionId, widgetId, { linkUrl: v })} placeholder="Optional link..." />
      <SelectField label="Object Fit" value={(content.objectFit as string) || 'cover'} onChange={(v) => update(sectionId, widgetId, { objectFit: v })} options={[
        { value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Fill' }, { value: 'none', label: 'None' },
      ]} />
      <NumberField label="Border Radius" value={(content.borderRadius as number) ?? 8} onChange={(v) => update(sectionId, widgetId, { borderRadius: v })} min={0} max={100} />
      <TextField label="Aspect Ratio" value={(content.aspectRatio as string) || '16/9'} onChange={(v) => update(sectionId, widgetId, { aspectRatio: v })} placeholder="16/9" />
    </div>
  );
}

function VideoEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <TextField label="Video URL" value={(content.url as string) || ''} onChange={(v) => update(sectionId, widgetId, { url: v })} placeholder="YouTube/Vimeo URL or .mp4" />
      <SelectField label="Type" value={(content.type as string) || 'youtube'} onChange={(v) => update(sectionId, widgetId, { type: v })} options={[
        { value: 'youtube', label: 'YouTube' }, { value: 'vimeo', label: 'Vimeo' }, { value: 'mp4', label: 'MP4' }, { value: 'embed', label: 'Embed' },
      ]} />
      <SwitchField label="Autoplay" value={(content.autoplay as boolean) || false} onChange={(v) => update(sectionId, widgetId, { autoplay: v })} />
      <SwitchField label="Muted" value={(content.muted as boolean) || false} onChange={(v) => update(sectionId, widgetId, { muted: v })} />
      <SwitchField label="Show Controls" value={(content.controls as boolean) ?? true} onChange={(v) => update(sectionId, widgetId, { controls: v })} />
      <TextField label="Aspect Ratio" value={(content.aspectRatio as string) || '16/9'} onChange={(v) => update(sectionId, widgetId, { aspectRatio: v })} />
    </div>
  );
}

function SpacerEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <NumberField label="Height" value={(content.height as number) || 40} onChange={(v) => update(sectionId, widgetId, { height: v })} min={0} max={500} step={5} />
      <SelectField label="Unit" value={(content.unit as string) || 'px'} onChange={(v) => update(sectionId, widgetId, { unit: v })} options={[
        { value: 'px', label: 'Pixels' }, { value: 'rem', label: 'Rem' }, { value: '%', label: 'Percent' },
      ]} />
      <SwitchField label="Hide on Mobile" value={(content.hideOnMobile as boolean) || false} onChange={(v) => update(sectionId, widgetId, { hideOnMobile: v })} />
    </div>
  );
}

function DividerEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <SelectField label="Style" value={(content.style as string) || 'solid'} onChange={(v) => update(sectionId, widgetId, { style: v })} options={[
        { value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'double', label: 'Double' },
      ]} />
      <ColorField label="Color" value={(content.color as string) || '#e5e7eb'} onChange={(v) => update(sectionId, widgetId, { color: v })} />
      <NumberField label="Weight" value={(content.weight as number) || 1} onChange={(v) => update(sectionId, widgetId, { weight: v })} min={1} max={10} />
      <SelectField label="Alignment" value={(content.align as string) || 'center'} onChange={(v) => update(sectionId, widgetId, { align: v })} options={[
        { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
      ]} />
    </div>
  );
}

function IconEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <TextField label="Icon Name" value={(content.name as string) || ''} onChange={(v) => update(sectionId, widgetId, { name: v })} placeholder="Star, Heart, ArrowRight..." />
      <NumberField label="Size" value={(content.size as number) || 24} onChange={(v) => update(sectionId, widgetId, { size: v })} min={12} max={128} />
      <ColorField label="Color" value={(content.color as string) || '#00A76F'} onChange={(v) => update(sectionId, widgetId, { color: v })} />
      <SelectField label="Background Shape" value={(content.bgShape as string) || 'none'} onChange={(v) => update(sectionId, widgetId, { bgShape: v })} options={[
        { value: 'none', label: 'None' }, { value: 'circle', label: 'Circle' }, { value: 'square', label: 'Square' }, { value: 'rounded', label: 'Rounded' },
      ]} />
      {(content.bgShape as string) !== 'none' && (
        <ColorField label="Background Color" value={(content.bgColor as string) || '#00A76F'} onChange={(v) => update(sectionId, widgetId, { bgColor: v })} />
      )}
      <NumberField label="Rotation" value={(content.rotation as number) || 0} onChange={(v) => update(sectionId, widgetId, { rotation: v })} min={0} max={360} />
    </div>
  );
}

function CardEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  return (
    <div className="space-y-3">
      <TextField label="Image URL" value={(content.image as string) || ''} onChange={(v) => update(sectionId, widgetId, { image: v })} placeholder="/images/..." />
      <SelectField label="Image Position" value={(content.imagePosition as string) || 'top'} onChange={(v) => update(sectionId, widgetId, { imagePosition: v })} options={[
        { value: 'top', label: 'Top' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'bottom', label: 'Bottom' }, { value: 'background', label: 'Background' },
      ]} />
      <TextField label="Title" value={(content.title as string) || ''} onChange={(v) => update(sectionId, widgetId, { title: v })} />
      <TextField label="Description" value={(content.description as string) || ''} onChange={(v) => update(sectionId, widgetId, { description: v })} multiline />
      <TextField label="Button Text" value={(content.buttonText as string) || ''} onChange={(v) => update(sectionId, widgetId, { buttonText: v })} />
      <TextField label="Button URL" value={(content.buttonUrl as string) || ''} onChange={(v) => update(sectionId, widgetId, { buttonUrl: v })} />
      <SelectField label="Variant" value={(content.variant as string) || 'default'} onChange={(v) => update(sectionId, widgetId, { variant: v })} options={[
        { value: 'default', label: 'Default' }, { value: 'glass', label: 'Glass' }, { value: 'bordered', label: 'Bordered' },
        { value: 'shadow', label: 'Shadow' }, { value: 'outline', label: 'Outline' },
      ]} />
      <SelectField label="Hover Effect" value={(content.hoverEffect as string) || 'none'} onChange={(v) => update(sectionId, widgetId, { hoverEffect: v })} options={[
        { value: 'none', label: 'None' }, { value: 'lift', label: 'Lift' }, { value: 'scale', label: 'Scale' }, { value: 'glow', label: 'Glow' },
      ]} />
    </div>
  );
}

function CounterEditor({ sectionId, widgetId, content }: { sectionId: string; widgetId: string; content: Record<string, unknown> }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);
  const items = (content.items as Array<Record<string, unknown>>) || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Counter Items</Label>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 gap-1" onClick={() => {
          const newItems = [...items, { label: 'Counter', value: 100, suffix: '+', prefix: '', icon: 'Hash' }];
          update(sectionId, widgetId, { items: newItems });
        }}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-lg p-2 space-y-2 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Item {idx + 1}</span>
            <button onClick={() => {
              const newItems = items.filter((_, i) => i !== idx);
              update(sectionId, widgetId, { items: newItems });
            }} className="text-gray-500 hover:text-rose-400"><Trash2 className="h-3 w-3" /></button>
          </div>
          <TextField label="Label" value={(item.label as string) || ''} onChange={(v) => {
            const newItems = [...items]; newItems[idx] = { ...newItems[idx], label: v }; update(sectionId, widgetId, { items: newItems });
          }} />
          <NumberField label="Value" value={(item.value as number) || 0} onChange={(v) => {
            const newItems = [...items]; newItems[idx] = { ...newItems[idx], value: v }; update(sectionId, widgetId, { items: newItems });
          }} />
          <TextField label="Suffix" value={(item.suffix as string) || ''} onChange={(v) => {
            const newItems = [...items]; newItems[idx] = { ...newItems[idx], suffix: v }; update(sectionId, widgetId, { items: newItems });
          }} placeholder="+" />
          <TextField label="Icon" value={(item.icon as string) || ''} onChange={(v) => {
            const newItems = [...items]; newItems[idx] = { ...newItems[idx], icon: v }; update(sectionId, widgetId, { items: newItems });
          }} placeholder="Briefcase" />
        </div>
      ))}
      <SelectField label="Layout" value={(content.layout as string) || 'grid'} onChange={(v) => update(sectionId, widgetId, { layout: v })} options={[
        { value: 'grid', label: 'Grid' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'stacked', label: 'Stacked' },
      ]} />
      <NumberField label="Columns" value={(content.columns as number) || 4} onChange={(v) => update(sectionId, widgetId, { columns: v })} min={1} max={6} />
    </div>
  );
}

// Generic editor for complex widgets (faq, testimonial, team, service-cards, gallery, contact-form, carousel, timeline, charts, html-block, qr-code, map)
function GenericEditor({ sectionId, widgetId, content, widgetType }: { sectionId: string; widgetId: string; content: Record<string, unknown>; widgetType: string }) {
  const update = usePageBuilderStore((s) => s.updateWidgetContent);

  // For simple types, just show key content fields
  if (widgetType === 'html-block') {
    return (
      <div className="space-y-3">
        <TextField label="HTML Code" value={(content.html as string) || ''} onChange={(v) => update(sectionId, widgetId, { html: v })} multiline placeholder="<div>Custom HTML</div>" />
        <SwitchField label="Enable JavaScript" value={(content.enableJs as boolean) || false} onChange={(v) => update(sectionId, widgetId, { enableJs: v })} />
      </div>
    );
  }

  if (widgetType === 'qr-code') {
    return (
      <div className="space-y-3">
        <TextField label="Data / URL" value={(content.data as string) || ''} onChange={(v) => update(sectionId, widgetId, { data: v })} placeholder="https://..." />
        <NumberField label="Size" value={(content.size as number) || 200} onChange={(v) => update(sectionId, widgetId, { size: v })} min={64} max={512} step={16} />
        <ColorField label="Foreground" value={(content.fgColor as string) || '#000000'} onChange={(v) => update(sectionId, widgetId, { fgColor: v })} />
        <ColorField label="Background" value={(content.bgColor as string) || '#ffffff'} onChange={(v) => update(sectionId, widgetId, { bgColor: v })} />
        <SelectField label="Error Correction" value={(content.errorCorrectionLevel as string) || 'M'} onChange={(v) => update(sectionId, widgetId, { errorCorrectionLevel: v })} options={[
          { value: 'L', label: 'Low (7%)' }, { value: 'M', label: 'Medium (15%)' }, { value: 'Q', label: 'Quartile (25%)' }, { value: 'H', label: 'High (30%)' },
        ]} />
      </div>
    );
  }

  if (widgetType === 'map') {
    return (
      <div className="space-y-3">
        <TextField label="Address" value={(content.address as string) || ''} onChange={(v) => update(sectionId, widgetId, { address: v })} placeholder="Bandar Seri Begawan, Brunei" />
        <NumberField label="Latitude" value={(content.latitude as number) || 4.8903} onChange={(v) => update(sectionId, widgetId, { latitude: v })} step={0.0001} />
        <NumberField label="Longitude" value={(content.longitude as number) || 114.9421} onChange={(v) => update(sectionId, widgetId, { longitude: v })} step={0.0001} />
        <NumberField label="Zoom" value={(content.zoom as number) || 15} onChange={(v) => update(sectionId, widgetId, { zoom: v })} min={1} max={20} />
        <NumberField label="Height" value={(content.height as number) || 400} onChange={(v) => update(sectionId, widgetId, { height: v })} min={200} max={800} step={50} />
        <SelectField label="Style" value={(content.style as string) || 'standard'} onChange={(v) => update(sectionId, widgetId, { style: v })} options={[
          { value: 'standard', label: 'Standard' }, { value: 'satellite', label: 'Satellite' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' },
        ]} />
      </div>
    );
  }

  if (widgetType === 'charts') {
    return (
      <div className="space-y-3">
        <TextField label="Title" value={(content.title as string) || ''} onChange={(v) => update(sectionId, widgetId, { title: v })} />
        <SelectField label="Chart Type" value={(content.chartType as string) || 'bar'} onChange={(v) => update(sectionId, widgetId, { chartType: v })} options={[
          { value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'pie', label: 'Pie' },
          { value: 'doughnut', label: 'Doughnut' }, { value: 'area', label: 'Area' }, { value: 'radar', label: 'Radar' },
        ]} />
        <NumberField label="Height" value={(content.height as number) || 300} onChange={(v) => update(sectionId, widgetId, { height: v })} min={150} max={600} step={50} />
        <SwitchField label="Show Legend" value={(content.showLegend as boolean) ?? true} onChange={(v) => update(sectionId, widgetId, { showLegend: v })} />
        <SwitchField label="Show Grid" value={(content.showGrid as boolean) ?? true} onChange={(v) => update(sectionId, widgetId, { showGrid: v })} />
      </div>
    );
  }

  if (widgetType === 'faq') {
    const items = (content.items as Array<Record<string, string>>) || [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">FAQ Items</Label>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 gap-1" onClick={() => {
            update(sectionId, widgetId, { items: [...items, { question: 'Question?', answer: 'Answer here.' }] });
          }}><Plus className="h-3 w-3" /> Add</Button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="bg-gray-800/50 rounded-lg p-2 space-y-2 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Q{idx + 1}</span>
              <button onClick={() => update(sectionId, widgetId, { items: items.filter((_, i) => i !== idx) })} className="text-gray-500 hover:text-rose-400"><Trash2 className="h-3 w-3" /></button>
            </div>
            <TextField label="Question" value={item.question || ''} onChange={(v) => { const n = [...items]; n[idx] = { ...n[idx], question: v }; update(sectionId, widgetId, { items: n }); }} />
            <TextField label="Answer" value={item.answer || ''} onChange={(v) => { const n = [...items]; n[idx] = { ...n[idx], answer: v }; update(sectionId, widgetId, { items: n }); }} multiline />
          </div>
        ))}
        <SwitchField label="Allow Multiple Open" value={(content.allowMultiple as boolean) || false} onChange={(v) => update(sectionId, widgetId, { allowMultiple: v })} />
      </div>
    );
  }

  if (widgetType === 'carousel') {
    return (
      <div className="space-y-3">
        <SwitchField label="Autoplay" value={(content.autoplay as boolean) ?? true} onChange={(v) => update(sectionId, widgetId, { autoplay: v })} />
        <NumberField label="Interval (ms)" value={(content.interval as number) || 5000} onChange={(v) => update(sectionId, widgetId, { interval: v })} min={1000} max={20000} step={500} />
        <SwitchField label="Show Dots" value={(content.showDots as boolean) ?? true} onChange={(v) => update(sectionId, widgetId, { showDots: v })} />
        <SwitchField label="Show Arrows" value={(content.showArrows as boolean) ?? true} onChange={(v) => update(sectionId, widgetId, { showArrows: v })} />
        <SelectField label="Transition" value={(content.transition as string) || 'slide'} onChange={(v) => update(sectionId, widgetId, { transition: v })} options={[
          { value: 'slide', label: 'Slide' }, { value: 'fade', label: 'Fade' }, { value: 'zoom', label: 'Zoom' },
        ]} />
      </div>
    );
  }

  if (widgetType === 'contact-form') {
    return (
      <div className="space-y-3">
        <SelectField label="Form Type" value={(content.formType as string) || 'contact'} onChange={(v) => update(sectionId, widgetId, { formType: v })} options={[
          { value: 'contact', label: 'Contact' }, { value: 'quote', label: 'Get Quote' }, { value: 'complaint', label: 'Complaint' },
          { value: 'service-request', label: 'Service Request' }, { value: 'newsletter', label: 'Newsletter' },
          { value: 'job-application', label: 'Job Application' }, { value: 'custom', label: 'Custom' },
        ]} />
        <TextField label="Submit Text" value={(content.submitText as string) || ''} onChange={(v) => update(sectionId, widgetId, { submitText: v })} />
        <TextField label="Success Message" value={(content.successMessage as string) || ''} onChange={(v) => update(sectionId, widgetId, { successMessage: v })} multiline />
      </div>
    );
  }

  if (widgetType === 'timeline') {
    return (
      <div className="space-y-3">
        <SelectField label="Layout" value={(content.layout as string) || 'vertical'} onChange={(v) => update(sectionId, widgetId, { layout: v })} options={[
          { value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'alternating', label: 'Alternating' },
        ]} />
        <SelectField label="Alignment" value={(content.align as string) || 'left'} onChange={(v) => update(sectionId, widgetId, { align: v })} options={[
          { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
        ]} />
      </div>
    );
  }

  // Fallback: show raw JSON for unsupported complex types
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400">Content editor for <span className="text-emerald-400">{widgetType}</span></p>
      <Textarea
        value={JSON.stringify(content, null, 2)}
        onChange={(e) => { try { update(sectionId, widgetId, JSON.parse(e.target.value)); } catch {} }}
        className="min-h-[200px] bg-gray-700/50 border-gray-600 text-white text-[10px] font-mono"
      />
    </div>
  );
}

// ============ CONTENT EDITOR ROUTER ============
function ContentEditor({ sectionId, widgetId, widget }: { sectionId: string; widgetId: string; widget: WidgetNode }) {
  const content = (widget as unknown as Record<string, unknown>).content as Record<string, unknown> || {};
  const t = widget.type;

  const editors: Record<string, React.ComponentType<{ sectionId: string; widgetId: string; content: Record<string, unknown> }>> = {
    heading: HeadingEditor,
    text: TextEditor,
    button: ButtonEditor,
    image: ImageEditor,
    video: VideoEditor,
    spacer: SpacerEditor,
    divider: DividerEditor,
    icon: IconEditor,
    card: CardEditor,
    counter: CounterEditor,
  };

  const SpecificEditor = editors[t];
  if (SpecificEditor) return <SpecificEditor sectionId={sectionId} widgetId={widgetId} content={content} />;
  return <GenericEditor sectionId={sectionId} widgetId={widgetId} content={content} widgetType={t} />;
}

// ============ STYLE EDITOR ============
function StyleEditor({ sectionId, widgetId }: { sectionId: string; widgetId: string }) {
  const sections = usePageBuilderStore((s) => s.sections);
  const updateWidgetStyles = usePageBuilderStore((s) => s.updateWidgetStyles);
  const viewport = usePageBuilderStore((s) => s.viewport);

  const section = sections.find((s) => s.id === sectionId);
  const widget = section?.widgets.find((w) => w.id === widgetId);
  if (!widget) return null;

  const styles = widget.styles?.desktop || {};
  const update = (s: Partial<WidgetStyles>) => updateWidgetStyles(sectionId, widgetId, viewport, s);

  return (
    <div className="space-y-4">
      {/* Responsive toggle */}
      <FieldGroup label="Responsive Mode">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          {(['desktop', 'tablet', 'mobile'] as const).map((vp) => (
            <button
              key={vp}
              onClick={() => usePageBuilderStore.getState().setViewport(vp)}
              className={cn(
                'flex-1 py-1 text-[10px] font-medium rounded-md capitalize transition-all',
                viewport === vp ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {vp}
            </button>
          ))}
        </div>
      </FieldGroup>

      <Separator className="bg-gray-700/50" />

      {/* Typography */}
      <FieldGroup label="Typography">
        <div className="space-y-2">
          <SelectField label="Text Align" value={styles.textAlign || 'left'} onChange={(v) => update({ textAlign: v as WidgetStyles['textAlign'] })} options={[
            { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }, { value: 'justify', label: 'Justify' },
          ]} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Font Size" value={styles.fontSize} onChange={(v) => update({ fontSize: v })} min={8} max={120} />
            <NumberField label="Font Weight" value={styles.fontWeight} onChange={(v) => update({ fontWeight: v })} min={100} max={900} step={100} />
          </div>
          <NumberField label="Line Height" value={styles.lineHeight} onChange={(v) => update({ lineHeight: v })} min={1} max={3} step={0.1} />
          <ColorField label="Text Color" value={styles.color || '#000000'} onChange={(v) => update({ color: v })} />
        </div>
      </FieldGroup>

      <Separator className="bg-gray-700/50" />

      {/* Spacing */}
      <FieldGroup label="Padding">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Top" value={styles.padding?.top} onChange={(v) => update({ padding: { ...styles.padding, top: v } })} min={0} max={200} />
          <NumberField label="Right" value={styles.padding?.right} onChange={(v) => update({ padding: { ...styles.padding, right: v } })} min={0} max={200} />
          <NumberField label="Bottom" value={styles.padding?.bottom} onChange={(v) => update({ padding: { ...styles.padding, bottom: v } })} min={0} max={200} />
          <NumberField label="Left" value={styles.padding?.left} onChange={(v) => update({ padding: { ...styles.padding, left: v } })} min={0} max={200} />
        </div>
      </FieldGroup>

      <FieldGroup label="Margin">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Top" value={styles.margin?.top as number | undefined} onChange={(v) => update({ margin: { ...styles.margin, top: v } })} min={-100} max={200} />
          <NumberField label="Right" value={styles.margin?.right as number | undefined} onChange={(v) => update({ margin: { ...styles.margin, right: v } })} min={-100} max={200} />
          <NumberField label="Bottom" value={styles.margin?.bottom as number | undefined} onChange={(v) => update({ margin: { ...styles.margin, bottom: v } })} min={-100} max={200} />
          <NumberField label="Left" value={styles.margin?.left as number | undefined} onChange={(v) => update({ margin: { ...styles.margin, left: v } })} min={-100} max={200} />
        </div>
      </FieldGroup>

      <Separator className="bg-gray-700/50" />

      {/* Border */}
      <FieldGroup label="Border">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width" value={styles.border?.width} onChange={(v) => update({ border: { ...styles.border, width: v } })} min={0} max={10} />
          <NumberField label="Radius" value={styles.border?.radius} onChange={(v) => update({ border: { ...styles.border, radius: v } })} min={0} max={100} />
        </div>
        <SelectField label="Style" value={styles.border?.style || 'solid'} onChange={(v) => update({ border: { ...styles.border, style: v as 'solid' } })} options={[
          { value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'none', label: 'None' },
        ]} />
        <ColorField label="Color" value={styles.border?.color || '#e5e7eb'} onChange={(v) => update({ border: { ...styles.border, color: v } })} />
      </FieldGroup>

      <Separator className="bg-gray-700/50" />

      {/* Shadow */}
      <FieldGroup label="Box Shadow">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={styles.shadow?.x} onChange={(v) => update({ shadow: { ...styles.shadow, x: v } })} min={-50} max={50} />
          <NumberField label="Y" value={styles.shadow?.y} onChange={(v) => update({ shadow: { ...styles.shadow, y: v } })} min={-50} max={50} />
          <NumberField label="Blur" value={styles.shadow?.blur} onChange={(v) => update({ shadow: { ...styles.shadow, blur: v } })} min={0} max={100} />
          <NumberField label="Spread" value={styles.shadow?.spread} onChange={(v) => update({ shadow: { ...styles.shadow, spread: v } })} min={-50} max={50} />
        </div>
        <ColorField label="Color" value={styles.shadow?.color || '#000000'} onChange={(v) => update({ shadow: { ...styles.shadow, color: v } })} />
      </FieldGroup>

      <Separator className="bg-gray-700/50" />

      {/* Background */}
      <FieldGroup label="Background">
        <SelectField label="Type" value={styles.background?.type || 'solid'} onChange={(v) => update({ background: { ...styles.background, type: v as 'solid' } })} options={[
          { value: 'solid', label: 'Solid Color' }, { value: 'gradient', label: 'Gradient' }, { value: 'image', label: 'Image' },
        ]} />
        {(!styles.background?.type || styles.background.type === 'solid') && (
          <ColorField label="Color" value={styles.background?.color || '#ffffff'} onChange={(v) => update({ background: { ...styles.background, type: 'solid', color: v } })} />
        )}
        {styles.background?.type === 'gradient' && (
          <TextField label="CSS Gradient" value={styles.background.gradient || ''} onChange={(v) => update({ background: { ...styles.background, gradient: v } })} placeholder="linear-gradient(135deg, #00A76F, #123B2B)" />
        )}
        {styles.background?.type === 'image' && (
          <>
            <TextField label="Image URL" value={styles.background.imageUrl || ''} onChange={(v) => update({ background: { ...styles.background, imageUrl: v } })} />
            <SelectField label="Size" value={styles.background.size || 'cover'} onChange={(v) => update({ background: { ...styles.background, size: v as 'cover' } })} options={[
              { value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'auto', label: 'Auto' },
            ]} />
          </>
        )}
      </FieldGroup>
    </div>
  );
}

// ============ ADVANCED EDITOR ============
function AdvancedEditor({ sectionId, widgetId }: { sectionId: string; widgetId: string }) {
  const sections = usePageBuilderStore((s) => s.sections);
  const updateWidget = usePageBuilderStore((s) => s.updateWidget);
  const section = sections.find((s) => s.id === sectionId);
  const widget = section?.widgets.find((w) => w.id === widgetId);
  if (!widget) return null;

  return (
    <div className="space-y-4">
      <FieldGroup label="Widget ID">
        <div className="flex items-center gap-2">
          <code className="text-[11px] text-emerald-400 bg-gray-800 px-2 py-1 rounded flex-1">{widget.id}</code>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { navigator.clipboard.writeText(widget.id); }}>
            Copy
          </Button>
        </div>
      </FieldGroup>

      <FieldGroup label="Widget Type">
        <code className="text-[11px] text-gray-300 bg-gray-800 px-2 py-1 rounded">{widget.type}</code>
      </FieldGroup>

      <FieldGroup label="Custom CSS">
        <Textarea
          value={(widget.styles?.desktop as Record<string, unknown>)?.customCss as string || ''}
          onChange={(e) => updateWidget(sectionId, widgetId, {
            styles: {
              ...widget.styles,
              desktop: { ...widget.styles?.desktop, customCss: e.target.value },
            },
          } as Partial<WidgetNode>)}
          placeholder=".my-class { color: red; }"
          className="min-h-[120px] bg-gray-700/50 border-gray-600 text-white text-[11px] font-mono"
        />
      </FieldGroup>

      <SwitchField
        label="Hidden"
        value={widget.hidden || false}
        onChange={(v) => updateWidget(sectionId, widgetId, { hidden: v } as Partial<WidgetNode>)}
      />
    </div>
  );
}

// ============ SECTION EDITOR ============
function SectionEditor({ sectionId }: { sectionId: string }) {
  const section = usePageBuilderStore((s) => s.sections.find((s) => s.id === sectionId));
  const updateSection = usePageBuilderStore((s) => s.updateSection);
  if (!section) return null;

  return (
    <div className="space-y-4">
      <FieldGroup label="Section Label">
        <Input
          value={section.label || ''}
          onChange={(e) => updateSection(sectionId, { label: e.target.value })}
          className="h-8 text-xs bg-gray-700/50 border-gray-600 text-white"
          placeholder="Section name"
        />
      </FieldGroup>
      <FieldGroup label="Section Type">
        <code className="text-[11px] text-emerald-400 bg-gray-800 px-2 py-1 rounded">{section.type}</code>
      </FieldGroup>
      <NumberField label="Columns" value={section.columns} onChange={(v) => updateSection(sectionId, { columns: v })} min={1} max={6} />
      <SwitchField label="Hidden" value={section.hidden || false} onChange={(v) => updateSection(sectionId, { hidden: v })} />
    </div>
  );
}

// ============ RIGHT PANEL ============
export function RightPanel() {
  const rightPanelOpen = usePageBuilderStore((s) => s.rightPanelOpen);
  const rightPanelTab = usePageBuilderStore((s) => s.rightPanelTab);
  const setRightPanelTab = usePageBuilderStore((s) => s.setRightPanelTab);
  const selectedSectionId = usePageBuilderStore((s) => s.selectedSectionId);
  const selectedWidgetId = usePageBuilderStore((s) => s.selectedWidgetId);
  const sections = usePageBuilderStore((s) => s.sections);

  if (!rightPanelOpen) return null;

  const section = sections.find((s) => s.id === selectedSectionId);
  const widget = section?.widgets.find((w) => w.id === selectedWidgetId);
  const isSectionOnly = selectedSectionId && !selectedWidgetId;

  return (
    <div className="w-[300px] bg-gray-900 border-l border-gray-700 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 flex items-center px-3 border-b border-gray-700 shrink-0">
        {widget ? (
          <span className="text-xs font-medium text-white flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 text-emerald-400" />
            {widget.label || widget.type}
          </span>
        ) : isSectionOnly ? (
          <span className="text-xs font-medium text-white flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 text-emerald-400" />
            Section: {section?.label || section?.type}
          </span>
        ) : (
          <span className="text-xs text-gray-500">Select a widget or section</span>
        )}
      </div>

      {/* Tabs - only for widget editing */}
      {widget ? (
        <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as 'content' | 'style' | 'advanced')} className="flex flex-col h-full">
          <TabsList className="bg-gray-800 mx-2 mt-2 mb-0 h-8 p-0.5">
            <TabsTrigger value="content" className="text-[10px] h-6 data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400 px-2.5 gap-1">
              <Settings className="h-3 w-3" /> Content
            </TabsTrigger>
            <TabsTrigger value="style" className="text-[10px] h-6 data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400 px-2.5 gap-1">
              <Palette className="h-3 w-3" /> Style
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-[10px] h-6 data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-400 text-gray-400 px-2.5 gap-1">
              <Code2 className="h-3 w-3" /> Advanced
            </TabsTrigger>
          </TabsList>
          <Separator className="bg-gray-700/50 mt-1" />
          <ScrollArea className="flex-1 px-3 py-3">
            <TabsContent value="content" className="mt-0">
              <ContentEditor sectionId={selectedSectionId!} widgetId={selectedWidgetId!} widget={widget} />
            </TabsContent>
            <TabsContent value="style" className="mt-0">
              <StyleEditor sectionId={selectedSectionId!} widgetId={selectedWidgetId!} />
            </TabsContent>
            <TabsContent value="advanced" className="mt-0">
              <AdvancedEditor sectionId={selectedSectionId!} widgetId={selectedWidgetId!} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      ) : isSectionOnly ? (
        <ScrollArea className="flex-1 px-3 py-3">
          <SectionEditor sectionId={selectedSectionId!} />
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <MousePointerClick className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-xs text-gray-500">Click on a widget or section to edit its properties</p>
          </div>
        </div>
      )}
    </div>
  );
}