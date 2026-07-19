import type { BrandingData, BrandConfig } from './branding-types';

// ─── Auth helper ────────────────────────────────────────────────────────

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('cmms_token') || '' : '');

// ─── API base ───────────────────────────────────────────────────────────

const BRANDING_API = '/api/branding';

// ─── Types ──────────────────────────────────────────────────────────────

interface UploadAssetParams {
  type: string;
  file: File;
}

// ─── Branding Service ───────────────────────────────────────────────────

export const brandingService = {
  /**
   * Fetch the full branding data (config + assets).
   * Works for authenticated users. Unauthenticated calls will
   * return a 401 — the hook layer handles this gracefully.
   */
  async fetchBranding(): Promise<BrandingData> {
    const res = await fetch(BRANDING_API, {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch branding: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<BrandingData>;
  },

  /**
   * Upload a brand asset.
   */
  async uploadAsset(params: UploadAssetParams): Promise<void> {
    const formData = new FormData();
    formData.append('type', params.type);
    formData.append('file', params.file);

    const res = await fetch(`${BRANDING_API}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token()}`,
      },
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload asset: ${res.status} ${res.statusText}`);
    }
  },

  /**
   * Update brand configuration fields.
   */
  async updateConfig(config: Partial<BrandConfig>): Promise<void> {
    const res = await fetch(BRANDING_API, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      throw new Error(`Failed to update brand config: ${res.status} ${res.statusText}`);
    }
  },

  /**
   * Delete a brand asset by ID.
   */
  async deleteAsset(assetId: string): Promise<void> {
    const res = await fetch(`${BRANDING_API}/assets/${assetId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to delete asset: ${res.status} ${res.statusText}`);
    }
  },

  /**
   * Invalidate the server-side branding cache (if supported).
   */
  async invalidateCache(): Promise<void> {
    try {
      await fetch(`${BRANDING_API}/invalidate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      });
    } catch {
      // Non-critical — swallow errors
    }
  },
};