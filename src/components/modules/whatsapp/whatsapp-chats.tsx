'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Search, Send, Paperclip, ArrowLeft, User, MoreVertical,
  Check, CheckCheck, Clock, ImageIcon, FileIcon,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { toast } from 'sonner';
import type {
  ConversationThreadData,
  WhatsAppMessageData,
  WhatsAppSessionData,
  WhatsAppMessageDirection,
} from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
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

function formatMessageTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getInitials(name: string | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============ MOCK DATA ============

const MOCK_THREADS: ConversationThreadData[] = [
  { id: '1', tenantId: 't1', sessionId: 's1', subject: 'AC not cooling', status: 'active', assignedToName: 'Admin', lastMessageAt: new Date(Date.now() - 60000).toISOString(), messageCount: 15, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), customerName: 'Ahmad Razak', customerPhone: '+6012345678', lastMessage: 'My air conditioning is still not working properly.' },
  { id: '2', tenantId: 't1', sessionId: 's2', subject: 'Leaking pipe', status: 'active', lastMessageAt: new Date(Date.now() - 300000).toISOString(), messageCount: 8, createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(), customerName: 'Sarah Lee', customerPhone: '+6012345679', lastMessage: 'The leak is getting worse, please help urgently.' },
  { id: '3', tenantId: 't1', sessionId: 's3', subject: 'Equipment check', status: 'resolved', assignedToName: 'Tech A', lastMessageAt: new Date(Date.now() - 900000).toISOString(), messageCount: 22, createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date().toISOString(), customerName: 'Kumar Nair', customerPhone: '+6012345680', lastMessage: 'Thank you, the issue has been resolved.' },
  { id: '4', tenantId: 't1', sessionId: 's4', subject: 'Invoice inquiry', status: 'active', lastMessageAt: new Date(Date.now() - 1800000).toISOString(), messageCount: 5, createdAt: new Date(Date.now() - 43200000).toISOString(), updatedAt: new Date().toISOString(), customerName: 'Lim Wei Ming', customerPhone: '+6012345681', lastMessage: 'Can you send me the invoice for last month?' },
  { id: '5', tenantId: 't1', sessionId: 's5', subject: 'Emergency power outage', status: 'active', lastMessageAt: new Date(Date.now() - 3600000).toISOString(), messageCount: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), customerName: 'Omar Hassan', customerPhone: '+6012345683', lastMessage: 'We have a complete power outage at building B!' },
  { id: '6', tenantId: 't1', sessionId: 's6', subject: 'Service feedback', status: 'resolved', lastMessageAt: new Date(Date.now() - 7200000).toISOString(), messageCount: 6, createdAt: new Date(Date.now() - 345600000).toISOString(), updatedAt: new Date().toISOString(), customerName: 'Priya Sharma', customerPhone: '+6012345682', lastMessage: 'Great service! Rating: 5/5' },
  { id: '7', tenantId: 't1', sessionId: 's7', subject: 'Maintenance request', status: 'active', lastMessageAt: new Date(Date.now() - 14400000).toISOString(), messageCount: 11, createdAt: new Date(Date.now() - 518400000).toISOString(), updatedAt: new Date().toISOString(), customerName: 'Tan Mei Ling', customerPhone: '+6012345684', lastMessage: 'When can the technician come for the annual maintenance?' },
  { id: '8', tenantId: 't1', sessionId: 's8', subject: 'General inquiry', status: 'active', lastMessageAt: new Date(Date.now() - 28800000).toISOString(), messageCount: 2, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), customerName: 'Nurul Aisyah', customerPhone: '+6012345686', lastMessage: 'Hi, what are your operating hours?' },
];

const MOCK_MESSAGES: WhatsAppMessageData[] = [
  { id: '1', tenantId: 't1', sessionId: 's1', direction: 'inbound', messageType: 'text', content: 'Hi, I need help with my AC unit at level 3.', fromNumber: '+6012345678', status: 'read', isFromBot: false, isTemplate: false, createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', tenantId: 't1', sessionId: 's1', direction: 'outbound', messageType: 'text', content: 'Hello Ahmad! I\'ll help you with your AC unit. Can you describe the issue?', toNumber: '+6012345678', status: 'read', isFromBot: true, isTemplate: false, createdAt: new Date(Date.now() - 3500000).toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', tenantId: 't1', sessionId: 's1', direction: 'inbound', messageType: 'text', content: 'It\'s making a loud noise and not cooling properly. The room temperature is not going below 28°C.', fromNumber: '+6012345678', status: 'read', isFromBot: false, isTemplate: false, createdAt: new Date(Date.now() - 3400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', tenantId: 't1', sessionId: 's1', direction: 'outbound', messageType: 'text', content: 'I understand, a technician has been assigned. Your complaint #CMP-2024-089 has been created. Technician Raj will contact you within 2 hours.', toNumber: '+6012345678', status: 'delivered', isFromBot: true, isTemplate: false, createdAt: new Date(Date.now() - 3300000).toISOString(), updatedAt: new Date().toISOString() },
  { id: '5', tenantId: 't1', sessionId: 's1', direction: 'inbound', messageType: 'text', content: 'Thank you! How long will it take?', fromNumber: '+6012345678', status: 'read', isFromBot: false, isTemplate: false, createdAt: new Date(Date.now() - 3200000).toISOString(), updatedAt: new Date().toISOString() },
  { id: '6', tenantId: 't1', sessionId: 's1', direction: 'outbound', messageType: 'text', content: 'Estimated arrival time is within 2 hours. You\'ll receive updates via WhatsApp.', toNumber: '+6012345678', status: 'read', isFromBot: true, isTemplate: false, createdAt: new Date(Date.now() - 3100000).toISOString(), updatedAt: new Date().toISOString() },
  { id: '7', tenantId: 't1', sessionId: 's1', direction: 'inbound', messageType: 'image', content: null, mediaUrl: '/placeholder.jpg', mediaType: 'image/jpeg', caption: 'This is the noise it makes', fromNumber: '+6012345678', status: 'read', isFromBot: false, isTemplate: false, createdAt: new Date(Date.now() - 3000000).toISOString(), updatedAt: new Date().toISOString() },
  { id: '8', tenantId: 't1', sessionId: 's1', direction: 'inbound', messageType: 'text', content: 'My air conditioning is still not working properly. The technician came but the issue persists.', fromNumber: '+6012345678', status: 'delivered', isFromBot: false, isTemplate: false, createdAt: new Date(Date.now() - 60000).toISOString(), updatedAt: new Date().toISOString() },
];

// ============ SUB-COMPONENTS ============

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'blocked', label: 'Blocked' },
] as const;

type FilterTab = typeof FILTER_TABS[number]['value'];

function ThreadItem({
  thread,
  isSelected,
  hasUnread,
  onClick,
}: {
  thread: ConversationThreadData;
  isSelected: boolean;
  hasUnread: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-start gap-3 p-3 text-left transition-colors rounded-lg',
          isSelected
            ? 'bg-emerald-50 border border-emerald-200'
            : 'hover:bg-muted/50 border border-transparent'
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 bg-emerald-600">
            <AvatarFallback className="text-white text-xs font-medium">
              {getInitials(thread.customerName)}
            </AvatarFallback>
          </Avatar>
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {thread.customerName || thread.customerPhone}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(thread.lastMessageAt)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{thread.lastMessage || 'No messages'}</p>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] px-1.5 py-0',
                thread.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {thread.status}
            </Badge>
            {thread.subject && (
              <span className="text-[10px] text-muted-foreground truncate">{thread.subject}</span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: WhatsAppMessageData }) {
  const isOutbound = message.direction === 'outbound';
  const isBot = message.isFromBot;
  const isMedia = message.messageType !== 'text' && message.messageType !== 'sticker';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('flex gap-2 max-w-[80%]', isOutbound ? 'ml-auto flex-row-reverse' : 'mr-auto')}
    >
      <div className="space-y-1">
        {isBot && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
            🤖 Bot
          </span>
        )}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 relative',
            isOutbound
              ? 'bg-emerald-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          )}
        >
          {isMedia && message.mediaType?.startsWith('image') && (
            <div className="mb-2 rounded-lg overflow-hidden bg-gray-200">
              <div className="w-48 h-36 flex items-center justify-center text-gray-400">
                <ImageIcon className="h-8 w-8" />
              </div>
            </div>
          )}
          {isMedia && !message.mediaType?.startsWith('image') && (
            <div className="mb-2 flex items-center gap-2 text-sm opacity-80">
              <FileIcon className="h-4 w-4" />
              <span>{message.messageType}</span>
            </div>
          )}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {message.caption && (
            <p className="text-xs opacity-80 mt-1">{message.caption}</p>
          )}
        </div>
        <div className={cn('flex items-center gap-1 text-[10px] text-muted-foreground', isOutbound ? 'justify-end mr-1' : 'ml-1')}>
          <Clock className="h-3 w-3" />
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOutbound && (
            <>
              {message.status === 'sent' && <Check className="h-3 w-3" />}
              {message.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
              {message.status === 'read' && <CheckCheck className="h-3 w-3 text-emerald-500" />}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============ MAIN COMPONENT ============

export function WhatsAppChats() {
  const { viewParams, setView } = useAppStore();
  const [threads, setThreads] = useState<ConversationThreadData[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessageData[]>([]);
  const [selectedThread, setSelectedThread] = useState<ConversationThreadData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch threads
  useEffect(() => {
    async function fetchThreads() {
      setIsLoadingThreads(true);
      try {
        const token = getToken();
        const statusParam = filterTab === 'all' ? 'active' : filterTab;
        const res = await fetch(`/api/whatsapp/threads?status=${statusParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setThreads(Array.isArray(data) ? data : data.data || []);
        } else {
          setThreads(MOCK_THREADS);
        }
      } catch {
        setThreads(MOCK_THREADS);
      } finally {
        setIsLoadingThreads(false);
      }
    }
    fetchThreads();
  }, [filterTab]);

  // Fetch messages for selected thread
  const fetchMessages = useCallback(async (thread: ConversationThreadData) => {
    setIsLoadingMessages(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/whatsapp/sessions/${thread.sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : data.data || []);
      } else {
        setMessages(MOCK_MESSAGES);
      }
    } catch {
      setMessages(MOCK_MESSAGES);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Select thread from param or first thread
  useEffect(() => {
    if (viewParams?.sessionId && threads.length > 0) {
      const t = threads.find((th) => th.sessionId === viewParams.sessionId);
      if (t) {
        setSelectedThread(t);
        fetchMessages(t);
      }
    }
  }, [viewParams, threads, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectThread = (thread: ConversationThreadData) => {
    setSelectedThread(thread);
    setView('whatsapp-chats', { sessionId: thread.sessionId });
    fetchMessages(thread);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedThread || isSending) return;
    setIsSending(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/whatsapp/sessions/${selectedThread.sessionId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: messageInput.trim(), messageType: 'text' }),
      });
      if (res.ok) {
        setMessageInput('');
        // Optimistically add message
        const newMsg: WhatsAppMessageData = {
          id: `temp-${Date.now()}`,
          tenantId: '',
          sessionId: selectedThread.sessionId,
          direction: 'outbound',
          messageType: 'text',
          content: messageInput.trim(),
          status: 'sent',
          isFromBot: false,
          isTemplate: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMsg]);
      } else {
        toast.error('Failed to send message');
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Filter threads
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      (t.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customerPhone || '').includes(searchQuery) ||
      (t.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterTab === 'all' ||
      (filterTab === 'active' && t.status === 'active') ||
      (filterTab === 'resolved' && t.status === 'resolved');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2">
          <Send className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Chats</h1>
          <p className="text-sm text-muted-foreground">Live conversations with customers</p>
        </div>
      </div>

      {/* Split Panel */}
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left Panel - Thread List */}
          <div className="w-full md:w-1/3 border-r border-border flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-border">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterTab(tab.value)}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                    filterTab === tab.value
                      ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Thread List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoadingThreads ? (
                  <div className="space-y-3 p-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No conversations found
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      isSelected={selectedThread?.id === thread.id}
                      hasUnread={thread.status === 'active' && thread.id !== selectedThread?.id}
                      onClick={() => handleSelectThread(thread)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Messages */}
          <div className="flex-1 flex flex-col">
            {selectedThread ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8"
                      onClick={() => setSelectedThread(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-9 w-9 bg-emerald-600">
                      <AvatarFallback className="text-white text-xs font-medium">
                        {getInitials(selectedThread.customerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{selectedThread.customerName || selectedThread.customerPhone}</p>
                      <p className="text-xs text-muted-foreground">{selectedThread.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        selectedThread.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {selectedThread.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <User className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Message List */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {isLoadingMessages ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                            <Skeleton className="h-16 w-48 rounded-2xl" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => (
                          <div key={msg.id}>
                            {/* New messages separator */}
                            {idx === 5 && (
                              <div className="flex items-center gap-3 my-4">
                                <Separator className="flex-1" />
                                <span className="text-xs text-muted-foreground bg-background px-2">New</span>
                                <Separator className="flex-1" />
                              </div>
                            )}
                            <MessageBubble message={msg} />
                          </div>
                        ))}
                      </AnimatePresence>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={handleTextareaInput}
                        onKeyDown={handleTextareaKeyDown}
                        className="min-h-[36px] max-h-[120px] resize-none pr-12 py-2 text-sm rounded-xl"
                        rows={1}
                      />
                    </div>
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isSending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="rounded-full bg-emerald-100 p-4 mb-4">
                  <Send className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Select a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Choose a conversation from the list to view and respond to messages
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
