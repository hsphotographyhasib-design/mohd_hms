import { create } from 'zustand';

interface PresenceState {
  /** Map of userId → isOnline (optimistic real-time state) */
  onlineStatus: Record<string, boolean>;
  /** Update a user's online status */
  setStatus: (userId: string, isOnline: boolean) => void;
  /** Remove a user from the presence map (e.g., user deleted) */
  removeUser: (userId: string) => void;
  /** Clear all presence data */
  clearAll: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineStatus: {},
  setStatus: (userId, isOnline) =>
    set((state) => ({
      onlineStatus: { ...state.onlineStatus, [userId]: isOnline },
    })),
  removeUser: (userId) =>
    set((state) => {
      const next = { ...state.onlineStatus };
      delete next[userId];
      return { onlineStatus: next };
    }),
  clearAll: () => set({ onlineStatus: {} }),
}));