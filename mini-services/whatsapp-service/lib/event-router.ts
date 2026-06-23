import type { LogEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

class EventRouter {
  private webhookUrl: string = '';
  private retryCount: number = 3;
  private logs: LogEntry[] = [];

  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }

  getWebhookUrl(): string {
    return this.webhookUrl;
  }

  async forwardMessage(message: Record<string, unknown>): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('[EventRouter] No webhook URL configured — message not forwarded');
      return false;
    }

    const payload = {
      event: 'message',
      type: 'message',
      data: message,
      timestamp: new Date().toISOString(),
    };

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const res = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          this.log('success', 'Message forwarded', { messageId: message.id });
          return true;
        }
        this.log('warn', `Webhook returned ${res.status}`, { attempt, messageId: message.id });
      } catch (err) {
        this.log('error', `Webhook attempt ${attempt} failed`, {
          error: err instanceof Error ? err.message : String(err),
          messageId: message.id,
        });
      }
      if (attempt < this.retryCount) {
        await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
      }
    }
    return false;
  }

  async forwardEvent(event: string, data: Record<string, unknown>): Promise<boolean> {
    if (!this.webhookUrl) return false;

    const payload = { event, data, timestamp: new Date().toISOString() };
    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private log(level: LogEntry['level'], event: string, data?: Record<string, unknown>): void {
    this.logs.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      event,
      message: event,
      data,
    });
  }
}

export { EventRouter };