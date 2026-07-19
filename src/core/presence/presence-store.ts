import { create } from 'zustand';

export type UserPresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresenceInfo {
  isOnline: boolean;
  status: UserPresenceStatus;
  lastSeen: string | null; // ISO string
}

/** Snapshot entry includes userId for keyed storage */
export type UserPresenceSnapshotItem = UserPresenceInfo & { userId: string };

interface PresenceState {
  /** Map of userId → presence info */
  onlineStatus: Record<string, UserPresenceInfo>;
  /** Whether the WebSocket connection to the presence service is established */
  isConnected: boolean;
  /** Update a user's status (from individual status-change event) */
  setStatus: (userId: string, info: UserPresenceInfo) => void;
  /** Set the full presence map (from presence:snapshot) */
  setFromSnapshot: (users: UserPresenceSnapshotItem[]) => void;
  /** Remove a user from the presence map */
  removeUser: (userId: string) => void;
  /** Clear all presence data */
  clearAll: () => void;
  /** Mark WebSocket as connected/disconnected */
  setConnected: (connected: boolean) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineStatus: {},
  isConnected: false,

  setStatus: (userId, info) =>
    set((state) => {
      const existing = state.onlineStatus[userId];
      return {
        onlineStatus: {
          ...state.onlineStatus,
          [userId]: {
            ...info,
            // Keep existing lastSeen if the new one is null
            lastSeen: info.lastSeen ?? existing?.lastSeen ?? null,
          },
        },
      };
    }),

  setFromSnapshot: (users) =>
    set(() => {
      const onlineStatus: Record<string, UserPresenceInfo> = {};
      for (const u of users) {
        const info: UserPresenceInfo = {
          isOnline: u.isOnline,
          status: u.status,
          lastSeen: u.lastSeen,
        };
        onlineStatus[u.userId] = info;
      }
      return { onlineStatus };
    }),

  removeUser: (userId) =>
    set((state) => {
      const next = { ...state.onlineStatus };
      delete next[userId];
      return { onlineStatus: next };
    }),

  clearAll: () => set({ onlineStatus: {} }),

  setConnected: (connected) => set({ isConnected: connected }),
}));