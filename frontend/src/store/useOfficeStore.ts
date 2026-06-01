import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UserState, UserInfo, WorkStyle, DotColor } from '../types/userState';
import {
  type FilterState,
  EMPTY_FILTER,
  toggleWorkStyle,
  toggleAssignDot,
  toggleGroupName,
} from '../utils/filter';

export type AreaOverride = { x: number; y: number; w: number; h: number };

export type ChatMsg = {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

interface OfficeState {
  users: UserState[];
  wsConnected: boolean;
  selectedUserId: string | null;
  userInfos: UserInfo[];
  filter: FilterState;
  currentUserId: string | null;

  // layout
  layoutOverride: Record<string, AreaOverride> | null;
  setLayoutOverride: (o: Record<string, AreaOverride> | null) => void;

  // chat
  chatPanelOpen: boolean;
  activeChatRoomId: string | null;
  chatMessages: Record<string, ChatMsg[]>;

  setUsers: (users: UserState[]) => void;
  updateUser: (user: UserState) => void;
  setWsConnected: (v: boolean) => void;
  setSelectedUser: (id: string | null) => void;
  setUserInfos: (infos: UserInfo[]) => void;
  setFilterText: (text: string) => void;
  toggleFilterWorkStyle: (ws: WorkStyle) => void;
  toggleFilterAssignDot: (dot: DotColor) => void;
  toggleFilterGroupName: (name: string) => void;
  clearFilters: () => void;
  setCurrentUser: (id: string | null) => void;

  // chat actions
  setChatPanelOpen: (open: boolean) => void;
  setActiveChatRoomId: (id: string | null) => void;
  addChatMessage: (roomId: string, msg: ChatMsg) => void;
  setChatMessages: (roomId: string, msgs: ChatMsg[]) => void;
}

const CURRENT_USER_KEY = 'auto_office_current_user';

export const useOfficeStore = create<OfficeState>()(
  subscribeWithSelector((set) => ({
    users: [],
    wsConnected: false,
    selectedUserId: null,
    userInfos: [],
    filter: EMPTY_FILTER,
    currentUserId: localStorage.getItem(CURRENT_USER_KEY) ?? null,

    layoutOverride: null,
    setLayoutOverride: (o) => set({ layoutOverride: o }),

    chatPanelOpen: false,
    activeChatRoomId: null,
    chatMessages: {},

    setUsers: (users) => set({ users }),
    updateUser: (user) =>
      set((s) => {
        const exists = s.users.some((u) => u.id === user.id);
        return {
          users: exists
            ? s.users.map((u) => (u.id === user.id ? user : u))
            : [...s.users, user],
        };
      }),
    setWsConnected: (wsConnected) => set({ wsConnected }),
    setSelectedUser: (id) => set({ selectedUserId: id }),
    setUserInfos: (infos) => set({ userInfos: infos }),
    setFilterText: (text) =>
      set((s) => ({ filter: { ...s.filter, filterText: text } })),
    toggleFilterWorkStyle: (ws) =>
      set((s) => ({ filter: toggleWorkStyle(s.filter, ws) })),
    toggleFilterAssignDot: (dot) =>
      set((s) => ({ filter: toggleAssignDot(s.filter, dot) })),
    toggleFilterGroupName: (name) =>
      set((s) => ({ filter: toggleGroupName(s.filter, name) })),
    clearFilters: () => set({ filter: EMPTY_FILTER }),
    setCurrentUser: (id) => {
      if (id) localStorage.setItem(CURRENT_USER_KEY, id);
      else localStorage.removeItem(CURRENT_USER_KEY);
      set({ currentUserId: id });
      // Reconnect WS so server knows who we are
      disconnectWs();
      if (id) setTimeout(connectWs, 100);
    },

    setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
    setActiveChatRoomId: (id) => set({ activeChatRoomId: id }),
    addChatMessage: (roomId, msg) =>
      set((s) => ({
        chatMessages: {
          ...s.chatMessages,
          [roomId]: [...(s.chatMessages[roomId] ?? []), msg],
        },
      })),
    setChatMessages: (roomId, msgs) =>
      set((s) => ({ chatMessages: { ...s.chatMessages, [roomId]: msgs } })),
  }))
);

const WS_BASE = 'ws://localhost:3001';
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWs(): void {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  const userId = useOfficeStore.getState().currentUserId;
  const url = userId ? `${WS_BASE}?userId=${encodeURIComponent(userId)}` : WS_BASE;
  ws = new WebSocket(url);

  ws.onopen = () => {
    useOfficeStore.getState().setWsConnected(true);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
      const { setUsers, updateUser, addChatMessage } = useOfficeStore.getState();
      if (msg.type === 'INIT') setUsers(msg.payload as UserState[]);
      if (msg.type === 'STATE_CHANGE') updateUser(msg.payload as UserState);
      if (msg.type === 'CHAT_MESSAGE') {
        const roomId = msg.roomId as string;
        const message = msg.message as ChatMsg;
        addChatMessage(roomId, message);
      }
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    useOfficeStore.getState().setWsConnected(false);
    reconnectTimer = setTimeout(connectWs, 3000);
  };

  ws.onerror = () => ws?.close();
}

export function disconnectWs(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
}

export function sendWs(msg: object): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export async function loadUserInfos(): Promise<void> {
  try {
    const res = await fetch('/api/users');
    const data = await res.json() as UserInfo[];
    useOfficeStore.getState().setUserInfos(data);
  } catch (err) {
    console.error('[store] loadUserInfos error:', err);
  }
}

export async function loadLayout(): Promise<void> {
  try {
    const res = await fetch('/api/admin/layout');
    const data = await res.json() as {
      floorId: string | null;
      objects: Array<{ type: string; x: number; y: number; width: number; height: number }>;
    };
    if (!data.objects || data.objects.length === 0) return;
    const override: Record<string, AreaOverride> = {};
    for (const obj of data.objects) {
      override[obj.type] = { x: obj.x, y: obj.y, w: obj.width, h: obj.height };
    }
    useOfficeStore.getState().setLayoutOverride(override);
  } catch {
    // use hardcoded defaults
  }
}

export async function openChatWithUser(otherUserId: string): Promise<void> {
  const { currentUserId, setChatPanelOpen, setActiveChatRoomId } = useOfficeStore.getState();
  if (!currentUserId) return;
  try {
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'direct', memberIds: [currentUserId, otherUserId] }),
    });
    const room = await res.json() as { id: string };
    setActiveChatRoomId(room.id);
    setChatPanelOpen(true);
  } catch (err) {
    console.error('[store] openChatWithUser error:', err);
  }
}
