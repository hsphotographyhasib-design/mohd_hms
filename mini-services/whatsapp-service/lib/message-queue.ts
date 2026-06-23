import { v4 as uuidv4 } from 'uuid';
import type { QueueItem } from './types';

class MessageQueue {
  private queue: QueueItem[] = [];
  private processing = false;

  enqueue(
    session: string,
    chatId: string,
    content: string,
    type: QueueItem['type'],
    options: Record<string, unknown> = {},
    priority: QueueItem['priority'] = 'normal',
  ): QueueItem {
    const item: QueueItem = {
      id: uuidv4(),
      session,
      chatId,
      content,
      type,
      options,
      retries: 0,
      maxRetries: 3,
      priority,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    // Insert in priority order
    if (priority === 'high') {
      this.queue.unshift(item);
    } else if (priority === 'low') {
      this.queue.push(item);
    } else {
      // Insert before low priority items
      const firstLow = this.queue.findIndex(q => q.priority === 'low');
      if (firstLow >= 0) {
        this.queue.splice(firstLow, 0, item);
      } else {
        this.queue.push(item);
      }
    }
    this.processNext();
    return item;
  }

  getStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(q => q.status === 'pending').length,
      processing: this.queue.filter(q => q.status === 'processing').length,
      failed: this.queue.filter(q => q.status === 'failed').length,
      items: this.queue.slice(0, 20),
    };
  }

  async processNext(): Promise<void> {
    if (this.processing) return;
    const item = this.queue.find(q => q.status === 'pending');
    if (!item) return;

    this.processing = true;
    item.status = 'processing';

    try {
      // Get the session-manager send function from global
      const { sendMessage: send } = await import('./session-manager');
      const result = await send(item.session, item.chatId, item.content, item.type, item.options);
      if (result.success) {
        item.status = 'sent';
      } else {
        await this.handleFailure(item, result.error || 'Unknown error');
      }
    } catch (error) {
      await this.handleFailure(item, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.processing = false;
      // Clean up sent/failed items older than 5 minutes
      this.cleanup();
      // Process next if any
      if (this.queue.some(q => q.status === 'pending')) {
        this.processNext();
      }
    }
  }

  private async handleFailure(item: QueueItem, error: string): Promise<void> {
    item.retries++;
    item.lastError = error;
    if (item.retries >= item.maxRetries) {
      item.status = 'failed';
      console.error(`[Queue] Message ${item.id} failed permanently after ${item.maxRetries} retries: ${error}`);
    } else {
      item.status = 'pending'; // Will be retried
      console.warn(`[Queue] Message ${item.id} retry ${item.retries}/${item.maxRetries}: ${error}`);
      // Delay before retry
      setTimeout(() => this.processNext(), 2000 * item.retries);
    }
  }

  private cleanup(): void {
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 minutes
    this.queue = this.queue.filter(q =>
      q.status === 'pending' || q.status === 'processing' || new Date(q.createdAt).getTime() > cutoff
    );
  }
}

export { MessageQueue };