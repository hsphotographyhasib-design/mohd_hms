'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Separator } from '@/shared/ui/separator';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Mail,
  MailOpen,
  MailX,
  MailWarning,
  Clock,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Filter,
  Inbox,
} from 'lucide-react';

// ============ TYPES ============

interface EmailLogEntry {
  id: string;
  subject: string;
  sender: string | null;
  senderName: string | null;
  recipient: string;
  recipientName: string | null;
  cc: string | null;
  bcc: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  status: string;
  module: string | null;
  createdAt: string;
  sentAt: string | null;
  openedAt: string | null;
  deliveredAt: string | null;
  attachmentCount: number;
  priority: string;
}

type StatusFilter = 'all' | 'delivered' | 'opened' | 'failed' | 'bounced' | 'scheduled';

// ============ HELPERS ============

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Mail },
  opened: { label: 'Opened', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: MailOpen },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-200', icon: MailX },
  queued: { label: 'Queued', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  bounced: { label: 'Bounced', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: MailWarning },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Clock },
  sending: { label: 'Sending', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Mail },
  clicked: { label: 'Clicked', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: MailOpen },
  spam: { label: 'Spam', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: MailWarning },
  unsubscribed: { label: 'Unsubscribed', color: 'bg-stone-100 text-stone-700 border-stone-200', icon: Mail },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseJsonStringArray(str: string | null): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatModule(mod: string | null): string {
  if (!mod) return 'Manual';
  return mod
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============ FILTER TABS ============

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'opened', label: 'Opened' },
  { value: 'failed', label: 'Failed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'scheduled', label: 'Scheduled' },
];

// ============ SKELETON LOADER ============

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="h-9 w-9 rounded-full" />
            {i < 3 && <Skeleton className="w-0.5 flex-1 mt-1" />}
          </div>
          <div className="flex-1 space-y-2 pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ EMAIL ENTRY ============

function EmailEntry({ email, isExpanded, onToggle }: { email: EmailLogEntry; isExpanded: boolean; onToggle: () => void }) {
  const statusCfg = STATUS_CONFIG[email.status] || STATUS_CONFIG.queued;
  const StatusIcon = statusCfg.icon;
  const ccList = parseJsonStringArray(email.cc);
  const bccList = parseJsonStringArray(email.bcc);
  const hasAttachments = email.attachmentCount > 0;

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center border shrink-0 ${
            email.status === 'failed' || email.status === 'bounced'
              ? 'bg-red-50 border-red-200 text-red-500'
              : email.status === 'opened' || email.status === 'clicked'
                ? 'bg-sky-50 border-sky-200 text-sky-500'
                : email.status === 'delivered'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-500'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}
        >
          <StatusIcon className="h-4 w-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg p-2 -m-2"
          aria-expanded={isExpanded}
        >
          {/* Row 1: Subject, badges, chevron */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm truncate max-w-[280px] sm:max-w-[400px] lg:max-w-[500px]">
                  {email.subject || '(No Subject)'}
                </span>
                <Badge variant="outline" className={`text-[11px] px-1.5 py-0 font-medium shrink-0 ${statusCfg.color}`}>
                  {statusCfg.label}
                </Badge>
                {email.module && (
                  <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-medium shrink-0">
                    {formatModule(email.module)}
                  </Badge>
                )}
                {hasAttachments && (
                  <span className="text-muted-foreground shrink-0" title={`${email.attachmentCount} attachment(s)`}>
                    <Paperclip className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 mt-0.5">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </div>
          </div>

          {/* Row 2: Sender and time */}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="truncate">
              {email.senderName || email.sender || 'System'}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="shrink-0">{relativeTime(email.createdAt)}</span>
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-2 ml-1">
            <Card className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Recipient details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs font-medium">From</span>
                    <p className="mt-0.5">{email.senderName ? `${email.senderName} <${email.sender}>` : (email.sender || 'System')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs font-medium">To</span>
                    <p className="mt-0.5">{email.recipientName ? `${email.recipientName} <${email.recipient}>` : email.recipient}</p>
                  </div>
                  {ccList.length > 0 && (
                    <div>
                      <span className="text-muted-foreground text-xs font-medium">CC</span>
                      <p className="mt-0.5">{ccList.join(', ')}</p>
                    </div>
                  )}
                  {bccList.length > 0 && (
                    <div>
                      <span className="text-muted-foreground text-xs font-medium">BCC</span>
                      <p className="mt-0.5">{bccList.join(', ')}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Email body */}
                <div className="text-sm">
                  <span className="text-muted-foreground text-xs font-medium block mb-2">Email Body</span>
                  {email.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none rounded-md border bg-muted/30 p-3 overflow-auto max-h-80 text-xs leading-relaxed
                        [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto
                        [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_th]:border [&_th]:border-border [&_th]:p-1.5 [&_th]:bg-muted/50"
                      dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                    />
                  ) : email.bodyText ? (
                    <div className="rounded-md border bg-muted/30 p-3 overflow-auto max-h-80 whitespace-pre-wrap text-xs leading-relaxed">
                      {email.bodyText}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs italic">No body content available</p>
                  )}
                </div>

                {/* Footer meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  {email.sentAt && (
                    <span>Sent: {new Date(email.sentAt).toLocaleString()}</span>
                  )}
                  {email.deliveredAt && (
                    <span>Delivered: {new Date(email.deliveredAt).toLocaleString()}</span>
                  )}
                  {email.openedAt && (
                    <span>Opened: {new Date(email.openedAt).toLocaleString()}</span>
                  )}
                  {hasAttachments && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {email.attachmentCount} attachment{email.attachmentCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function CustomerEmailTimeline({ customerId }: { customerId: string }) {
  const [emails, setEmails] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('cmms_token') || '';
      const res = await fetch(
        `/api/email/customer-history?customerId=${encodeURIComponent(customerId)}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch email history (${res.status})`);
      }
      const data = await res.json();
      setEmails(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const filteredEmails = useMemo(() => {
    if (activeFilter === 'all') return emails;
    return emails.filter((e) => e.status === activeFilter);
  }, [emails, activeFilter]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: emails.length,
      delivered: 0,
      opened: 0,
      failed: 0,
      bounced: 0,
      scheduled: 0,
    };
    for (const e of emails) {
      if (e.status in counts) {
        counts[e.status as StatusFilter]++;
      }
    }
    return counts;
  }, [emails]);

  // ---- Loading ----
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-44" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
          ))}
        </div>
        <TimelineSkeleton />
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MailX className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchEmails}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
          <Filter className="h-4 w-4 text-rose-600" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Email Communication</h3>
          <p className="text-xs text-muted-foreground">
            {emails.length} email{emails.length !== 1 ? 's' : ''} sent to this customer
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.value;
          const count = statusCounts[tab.value];
          return (
            <Button
              key={tab.value}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={`shrink-0 text-xs h-8 rounded-full px-3 transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setActiveFilter(tab.value)}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 text-[10px] font-semibold tabular-nums ${
                    isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Timeline content */}
      {filteredEmails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {activeFilter === 'all'
              ? 'No emails sent to this customer yet'
              : `No ${activeFilter} emails found`}
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-1">
            {filteredEmails.map((email) => (
              <EmailEntry
                key={email.id}
                email={email}
                isExpanded={expandedIds.has(email.id)}
                onToggle={() => toggleExpand(email.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}