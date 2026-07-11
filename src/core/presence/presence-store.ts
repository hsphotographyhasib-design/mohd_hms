import { create } from 'zustand';

interface PresenceState {
  /** Map of userId → isOnline (real-time state from WebSocket) */
  onlineStatus: Record<string, boolean>;
  /** Whether the WebSocket connection to the presence service is established */
  isConnected: boolean;
  /** Update a user's online status (from individual status-change event) */
  setStatus: (userId: string, isOnline: boolean) => void;
  /** Set the full online user map (from presence:snapshot) */
  setFromSnapshot: (users: { userId: string; isOnline: boolean }[]) => void;
  /** Remove a user from the presence map (e.g., user deleted) */
  removeUser: (userId: string) => void;
  /** Clear all presence data */
  clearAll: () => void;
  /** Mark WebSocket as connected/disconnected */
  setConnected: (connected: boolean) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineStatus: {},
  isConnected: false,
  setStatus: (userId, isOnline) =>
    set((state) => ({
      onlineStatus: { ...state.onlineStatus, [userId]: isOnline },
    })),
  setFromSnapshot: (users) =>
    set(() => {
      const onlineStatus: Record<string, boolean> = {};
      for (const u of users) {
        onlineStatus[u.userId] = u.isOnline;
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