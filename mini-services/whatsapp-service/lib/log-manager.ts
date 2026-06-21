import { v4 as uuidv4 } from 'uuid';
import type { LogEntry } from './types';

const MAX_LOGS = 500;

class LogManager {
  private logs: LogEntry[] = [];

  log(level: LogEntry['level'], event: string, data?: Record<string, unknown>, session?: string): void {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      event,
      session,
      message: this.formatMessage(event, data),
      data,
    };
    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }
    // Console output
    const prefix = `[${entry.timestamp.split('T')[1].split('.')[0]}]`;
    const sessionTag = session ? ` [${session}]` : '';
    switch (level) {
      case 'error': console.error(`${prefix}${sessionTag} [ERROR] ${event}`, data || ''); break;
      case 'warn': console.warn(`${prefix}${sessionTag} [WARN] ${event}`, data || ''); break;
      case 'debug': console.debug(`${prefix}${sessionTag} [DEBUG] ${event}`, data || ''); break;
      default: console.log(`${prefix}${sessionTag} [INFO] ${event}`, data || ''); break;
    }
  }

  getLogs(limit?: number, session?: string): LogEntry[] {
    let filtered = this.logs;
    if (session) filtered = filtered.filter(l => l.session === session);
    return filtered.slice(-(limit || 50)).reverse();
  }

  count(): number {
    return this.logs.length;
  }

  clear(): void {
    this.logs = [];
  }

  private formatMessage(event: string, data?: Record<string, unknown>): string {
    if (!data) return event;
    const parts = [event];
    if (data.error) parts.push(`Error: ${data.error}`);
    if (data.from) parts.push(`From: ${data.from}`);
    if (data.chatId) parts.push(`Chat: ${data.chatId}`);
    return parts.join(' | ');
  }
}

export { LogManager };