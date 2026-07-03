/**
 * Storage Provider - Filesystem-based implementation
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '@/core/config';

export interface StorageProvider {
  writeChunk(sessionId: string, chunkIndex: number, data: Buffer): Promise<string>;
  readChunk(sessionId: string, chunkIndex: number): Promise<Buffer>;
  assembleChunks(sessionId: string, totalChunks: number): Promise<Buffer>;
  writeFile(storagePath: string, data: Buffer): Promise<void>;
  readFile(storagePath: string): Promise<Buffer>;
  deleteFile(storagePath: string): Promise<void>;
  fileExists(storagePath: string): Promise<boolean>;
  cleanChunks(sessionId: string, totalChunks: number): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private getChunksDir(sessionId: string): string {
    const dir = path.join(env.storageRoot, 'chunks', sessionId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private getFullPath(storagePath: string): string {
    return path.join(env.storageRoot, storagePath);
  }

  async writeChunk(sessionId: string, chunkIndex: number, data: Buffer): Promise<string> {
    const dir = this.getChunksDir(sessionId);
    const chunkPath = path.join(dir, `chunk_${chunkIndex}`);
    await fs.promises.writeFile(chunkPath, data);
    return chunkPath;
  }

  async readChunk(sessionId: string, chunkIndex: number): Promise<Buffer> {
    const dir = this.getChunksDir(sessionId);
    const chunkPath = path.join(dir, `chunk_${chunkIndex}`);
    return fs.promises.readFile(chunkPath);
  }

  async assembleChunks(sessionId: string, totalChunks: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunk = await this.readChunk(sessionId, i);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async writeFile(storagePath: string, data: Buffer): Promise<void> {
    const fullPath = this.getFullPath(storagePath);
    const dir = path.dirname(fullPath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, data);
  }

  async readFile(storagePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(storagePath);
    return fs.promises.readFile(fullPath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = this.getFullPath(storagePath);
    try {
      await fs.promises.unlink(fullPath);
    } catch {
      // File may not exist, ignore
    }
  }

  async fileExists(storagePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(storagePath);
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async cleanChunks(sessionId: string, _totalChunks: number): Promise<void> {
    const dir = path.join(env.storageRoot, 'chunks', sessionId);
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_provider) {
    _provider = new LocalStorageProvider();
  }
  return _provider;
}

/**
 * Calculate SHA256 checksum of a buffer
 */
export async function calculateFileChecksum(data: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a unique storage path for a document
 * Format: tenants/{tenantId}/{module}/{folder}/{uuid}{ext}
 */
export function generateStoragePath(
  tenantId: string,
  module: string,
  folder: string,
  originalName: string
): string {
  const ext = getFileExtension(originalName);
  const uuid = crypto.randomUUID();
  const safeModule = module || 'general';
  const safeFolder = folder || 'general';
  return `tenants/${tenantId}/${safeModule}/${safeFolder}/${uuid}${ext}`;
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file extension including the dot
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot);
}

/**
 * Check if a file type is allowed based on MIME type and extension
 */
export function isFileTypeAllowed(mimeType: string, fileName: string): { allowed: boolean; reason?: string } {
  const ext = getFileExtension(fileName).toLowerCase();

  // Check blocked extensions
  const blockedExtensions: string[] = ['.exe', '.bat', '.cmd', '.ps1', '.php', '.jsp', '.sh', '.dll', '.scr', '.msi'];
  if (blockedExtensions.includes(ext)) {
    return { allowed: false, reason: `File extension '${ext}' is not allowed` };
  }

  // Also allow image/* and video/* broadly
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    return { allowed: true };
  }

  return { allowed: false, reason: `MIME type '${mimeType}' is not allowed` };
}