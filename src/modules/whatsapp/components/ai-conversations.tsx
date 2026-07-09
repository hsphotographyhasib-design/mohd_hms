'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import {
  Search, ArrowLeft, Bot, User, UserCheck, Phone,
  Wrench, AlertTriangle, Clock, ChevronLeft,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { toast } from 'sonner';

// ============ HELPERS ============

function getToken(): string {
  return useAuthStore.getState().token || localStorage.getItem('cmms_token') || '';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return then.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function languageBadge(lang: string) {
  const map: Record<string, string> = {
    en: 'bg-sky-100 text-sky-700',
    ms: 'bg-emerald-100 text-emerald-700',
    bn: 'bg-orange-100 text-orange-700',
    ar: 'bg-red-100 text-red-700',
    mixed: 'bg-purple-100 text-purple-700',
  };
  const labels: Record<string, string> = {
    en: 'EN', ms: 'MS', bn: 'BN', ar: 'AR', mixed: 'Mixed',
  };
  return (
    <Badge variant="secondary" className={map[lang] || 'bg-gray-100 text-gray-700'}>
      {labels[lang] || lang}
    </Badge>
  );
}

function intentBadge(intent: string) {
  const map: Record<string, string> = {
    complaint: 'bg-red-100 text-red-700',
    status: 'bg-sky-100 text-sky-700',
    quotation: 'bg-amber-100 text-amber-700',
    service: 'bg-emerald-100 text-emerald-700',
    payment: 'bg-green-100 text-green-700',
    feedback: 'bg-purple-100 text-purple-700',
    general: 'bg-gray-100 text-gray-700',
    emergency: 'bg-rose-100 text-rose-700',
  };
  const labels: Record<string, string> = {
    complaint: 'Complaint', status: 'Status', quotation: 'Quotation',
    service: 'Service', payment: 'Payment', feedback: 'Feedback',
    general: 'General', emergency: 'Emergency',
  };
  return (
    <Badge variant="secondary" className={map[intent] || 'bg-gray-100 text-gray-700'}>
      {labels[intent] || intent}
    </Badge>
  );
}

// ============ TYPES ============

interface ConversationItem {
  id: string;
  sessionId: string;
  phoneNumber: string;
  customerName?: string;
  lastMessage?: string;
  language?: string;
  intent?: string;
  confidence?: number;
  responseTimeMs?: number;
  status: string;
  lastMessageAt: string;
  unreadCount?: number;
  isActive: boolean;
}

interface MessageBubble {
  id: string;
  direction: string;
  messageType: string;
  content?: string;
  mediaUrl?: string;
  isFromBot: boolean;
  createdAt: string;
  // AI metadata from AiConversationLog
  detectedIntent?: string;
  detectedLanguage?: string;
  confidence?: number;
  responseTimeMs?: number;
}

interface ConversationDetail {
  session: {
    id: string;
    phoneNumber: string;
    customerName?: string;
    language?: string;
    intent?: string;
    isActive: boolean;
    createdAt: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    companyName?: string;
    equipmentCount: number;
    openComplaints: number;
  };
  messages: MessageBubble[];
}

// ============ CONVERSATION LIST ITEM ============

function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: ConversationItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border-b transition-colors hover:bg-emerald-50/50 ${
        isSelected ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {conversation.customerName || conversation.phoneNumber}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{conversation.phoneNumber}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-muted-foreground">{formatRelativeTime(conversation.lastMessageAt)}</span>
          {conversation.unreadCount && conversation.unreadCount > 0 ? (
            <span className="h-5 w-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-medium">
              {conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 pl-10">
        {conversation.lastMessage || 'No messages yet'}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5 pl-10">
        {conversation.intent && intentBadge(conversation.intent)}
        {conversation.language && languageBadge(conversation.language)}
        {conversation.confidence != null && (
          <span className="text-xs text-muted-foreground">
            {Math.round(conversation.confidence * 100)}%
          </span>
        )}
      </div>
    </button>
  );
}

// ============ MESSAGE BUBBLE ============

function MessageBubble({ message }: { message: MessageBubble }) {
  const isOutbound = message.direction === 'outbound';
  const isAi = message.isFromBot;

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] sm:max-w-[70%]`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isOutbound
              ? 'bg-emerald-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="Media"
              className="rounded-lg max-h-48 mb-1.5"
            />
          )}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
        {/* AI metadata */}
        {(message.detectedIntent || message.detectedLanguage || message.responseTimeMs) && (
          <div className={`flex items-center gap-1.5 mt-1 flex-wrap ${isOutbound ? 'justify-end' : 'justify-start'}`}>
            {isAi && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Bot className="h-3 w-3 text-emerald-500" /> AI
              </span>
            )}
            {message.detectedIntent && intentBadge(message.detectedIntent)}
            {message.detectedLanguage && languageBadge(message.detectedLanguage)}
            {message.responseTimeMs != null && (
              <span className="text-[10px] text-muted-foreground">
                {formatResponseTime(message.responseTimeMs)}
              </span>
            )}
            {message.confidence != null && (
              <span className="text-[10px] text-muted-foreground">
                {Math.round(message.confidence * 100)}%
              </span>
            )}
          </div>
        )}
        <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOutbound ? 'text-right' : ''}`}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ============ CUSTOMER INFO SIDEBAR ============

function CustomerInfoSidebar({ customer }: { customer: ConversationDetail['customer'] }) {
  if (!customer) return null;

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm">Customer Info</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{customer.name}</p>
            {customer.companyName && (
              <p className="text-xs text-muted-foreground">{customer.companyName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-mono">{customer.phone}</p>
        </div>
        <Separator />
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm">{customer.equipmentCount} Equipment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${customer.openComplaints > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-sm">{customer.openComplaints} Open Complaints</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function AiConversationsViewer() {
  const { setView } = useAppStore();

  // List state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIntent, setFilterIntent] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Detail state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch conversation list
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingList(true);
      try {
        const token = getToken();
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filterIntent !== 'all') params.set('intent', filterIntent);
        if (filterLanguage !== 'all') params.set('language', filterLanguage);
        params.set('page', '1');
        params.set('pageSize', '50');

        const res = await fetch(`/api/whatsapp/ai-conversations?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setConversations(Array.isArray(data) ? data : data.data || []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setIsLoadingList(false);
    };
    load();
    return () => { cancelled = true; };
  }, [searchQuery, filterIntent, filterLanguage]);

  // Fetch conversation detail
  const fetchDetail = useCallback(async (sessionId: string) => {
    setSelectedId(sessionId);
    setIsLoadingDetail(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/whatsapp/ai-conversations/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch { /* ignore */ }
    setIsLoadingDetail(false);
  }, []);

  const handleTakeOver = async () => {
    if (!selectedId) return;
    toast.success('Conversation handed over to human agent');
  };

  // Mobile: show list or detail
  const showDetail = selectedId !== null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('whatsapp')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="rounded-lg bg-emerald-100 p-2">
          <Bot className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Conversations</h1>
          <p className="text-sm text-muted-foreground">View and manage AI-assisted conversations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_260px] gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Left Panel: Conversation List */}
        <Card className={`flex flex-col overflow-hidden ${showDetail ? 'hidden lg:flex' : 'flex'}`}>
          <CardHeader className="p-3 pb-0 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filterIntent} onValueChange={setFilterIntent}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intents</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="quotation">Quotation</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ms">Malay</SelectItem>
                  <SelectItem value="bn">Bengali</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {isLoadingList ? (
              <div className="p-3 space-y-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No conversations found
              </div>
            ) : (
              <ScrollArea className="h-full">
                {conversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedId === conv.sessionId}
                    onClick={() => fetchDetail(conv.sessionId)}
                  />
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Center Panel: Conversation Detail */}
        <Card className={`flex flex-col overflow-hidden ${!showDetail ? 'hidden lg:flex' : 'flex'}`}>
          {showDetail && (
            <CardHeader className="p-3 border-b flex flex-row items-center gap-2 lg:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedId(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium truncate">
                {detail?.session?.customerName || detail?.session?.phoneNumber || 'Conversation'}
              </span>
              <div className="ml-auto">
                <Button size="sm" variant="outline" onClick={handleTakeOver} className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Take Over
                </Button>
              </div>
            </CardHeader>
          )}
          {isLoadingDetail ? (
            <div className="flex-1 p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <Skeleton className={`h-16 w-${i % 2 === 0 ? '3/4' : '1/2'} rounded-2xl`} />
                </div>
              ))}
            </div>
          ) : detail ? (
            <>
              {/* Desktop Header */}
              <div className="hidden lg:flex p-3 border-b items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{detail.session.customerName || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{detail.session.phoneNumber}</p>
                  </div>
                  {detail.session.language && <span className="ml-1">{languageBadge(detail.session.language)}</span>}
                  {detail.session.intent && <span className="ml-1">{intentBadge(detail.session.intent)}</span>}
                </div>
                <Button size="sm" variant="outline" onClick={handleTakeOver} className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Take Over
                </Button>
              </div>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {detail.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No messages in this conversation
                  </div>
                ) : (
                  detail.messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </Card>

        {/* Right Panel: Customer Info (desktop only) */}
        <Card className="hidden lg:flex flex-col overflow-hidden">
          {detail?.customer ? (
            <CustomerInfoSidebar customer={detail.customer} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground text-center">
              Select a conversation to view customer details
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}