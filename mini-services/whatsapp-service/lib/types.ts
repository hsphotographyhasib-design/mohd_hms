export interface WAMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: number;
  hasMedia: boolean;
  mediaUrl?: string;
  mimetype?: string;
  caption?: string;
  location?: { lat: number; lng: number; address?: string };
  fileName?: string;
  fileSize?: number;
  chatId: string;
  chatName?: string;
  senderName?: string;
  isGroupMsg: boolean;
}

export interface SessionState {
  id: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR' | 'QR_READY';
  client: any; // wa-automate client instance
  qrCode: string | null;
  phoneInfo: {
    phoneNumber?: string;
    pushName?: string;
    platform?: string;
    os?: string;
  } | null;
  connectedAt: string | null;
  lastHeartbeat: string | null;
  messageCount: number;
  errorCount: number;
  lastError?: string;
}

export interface SendMessageResult {
  success: boolean;
  id?: string;
  error?: string;
  timestamp: string;
}

export interface QueueItem {
  id: string;
  session: string;
  chatId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  options: Record<string, unknown>;
  retries: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  lastError?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  session?: string;
  message: string;
  data?: Record<string, unknown>;
}