import { useCallback, useEffect, useRef, useState } from 'react';
import { useOfficeStore, sendWs } from '../store/useOfficeStore';

type RoomMember = {
  userId: string;
  user: { id: string; displayName: string };
};

type ChatRoom = {
  id: string;
  name: string | null;
  type: string;
  members: RoomMember[];
  messages: { body: string }[];
};

export function ChatPanel() {
  const currentUserId    = useOfficeStore(s => s.currentUserId);
  const chatPanelOpen    = useOfficeStore(s => s.chatPanelOpen);
  const activeChatRoomId = useOfficeStore(s => s.activeChatRoomId);
  const chatMessages     = useOfficeStore(s => s.chatMessages);
  const userInfos        = useOfficeStore(s => s.userInfos);
  const setChatPanelOpen    = useOfficeStore(s => s.setChatPanelOpen);
  const setActiveChatRoomId = useOfficeStore(s => s.setActiveChatRoomId);
  const setChatMessages     = useOfficeStore(s => s.setChatMessages);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingLoading, setCreatingLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(() => {
    if (!currentUserId) return;
    fetch(`/api/chat/rooms?userId=${encodeURIComponent(currentUserId)}`)
      .then(r => r.json())
      .then((data: ChatRoom[]) => setRooms(data))
      .catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    if (!chatPanelOpen) return;
    loadRooms();
  }, [chatPanelOpen, loadRooms]);

  // Load message history when entering a room
  useEffect(() => {
    if (!activeChatRoomId) return;
    fetch(`/api/chat/rooms/${activeChatRoomId}/messages`)
      .then(r => r.json())
      .then((msgs: { id: string; roomId: string; senderId: string; body: string; createdAt: string }[]) => {
        setChatMessages(activeChatRoomId, msgs);
      })
      .catch(() => {});
  }, [activeChatRoomId, setChatMessages]);

  const messages = activeChatRoomId ? (chatMessages[activeChatRoomId] ?? []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function getRoomLabel(room: ChatRoom): string {
    if (room.name) return room.name;
    if (room.type === 'direct') {
      const other = room.members.find(m => m.userId !== currentUserId);
      return other?.user.displayName ?? 'ダイレクト';
    }
    return 'グループ';
  }

  function sendMessage() {
    if (!input.trim() || !activeChatRoomId) return;
    sendWs({ type: 'CHAT_SEND', roomId: activeChatRoomId, body: input.trim() });
    setInput('');
  }

  function toggleMember(uid: string) {
    setSelectedMemberIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid],
    );
  }

  async function createGroupRoom() {
    if (!currentUserId || selectedMemberIds.length < 1) return;
    setCreatingLoading(true);
    try {
      const memberIds = [currentUserId, ...selectedMemberIds];
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: groupName.trim() || null,
          memberIds,
        }),
      });
      const room = await res.json() as { id: string };
      setCreating(false);
      setGroupName('');
      setSelectedMemberIds([]);
      loadRooms();
      setActiveChatRoomId(room.id);
    } catch (err) {
      console.error('[ChatPanel] createGroupRoom error:', err);
    } finally {
      setCreatingLoading(false);
    }
  }

  function cancelCreating() {
    setCreating(false);
    setGroupName('');
    setSelectedMemberIds([]);
  }

  const activeRoom = rooms.find(r => r.id === activeChatRoomId);

  // Others = all users except self
  const otherUsers = userInfos.filter(u => u.id !== currentUserId);

  // Toggle button when closed
  if (!chatPanelOpen) {
    return (
      <button
        onClick={() => setChatPanelOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-lg flex items-center justify-center transition-colors"
        title="チャットを開く"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-[480px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        {activeChatRoomId ? (
          <button
            onClick={() => setActiveChatRoomId(null)}
            className="flex items-center gap-2 text-sm font-medium text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {activeRoom ? getRoomLabel(activeRoom) : 'チャット'}
          </button>
        ) : creating ? (
          <button
            onClick={cancelCreating}
            className="flex items-center gap-2 text-sm font-medium text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            グループチャット作成
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">チャット</span>
            <button
              onClick={() => setCreating(true)}
              className="w-5 h-5 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white text-xs transition-colors"
              title="グループチャット作成"
            >
              ＋
            </button>
          </div>
        )}
        <button
          onClick={() => { setChatPanelOpen(false); setCreating(false); }}
          className="text-gray-400 hover:text-white text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      {/* Group creation form */}
      {creating && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto">
            <div>
              <label className="text-xs text-gray-400 block mb-1">グループ名（省略可）</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="例: ECサイトチーム"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                メンバーを選択（{selectedMemberIds.length}名選択中）
              </label>
              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                {otherUsers.map(u => {
                  const selected = selectedMemberIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleMember(u.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selected
                          ? 'bg-indigo-900/60 border border-indigo-600'
                          : 'bg-gray-800 border border-transparent hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'
                      }`}>
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{u.displayName}</div>
                        {u.jobTitle && (
                          <div className="text-[10px] text-gray-500 truncate">{u.jobTitle}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="px-3 pb-3 shrink-0">
            <button
              onClick={createGroupRoom}
              disabled={selectedMemberIds.length < 1 || creatingLoading}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {creatingLoading ? '作成中...' : `グループを作成（${selectedMemberIds.length + 1}名）`}
            </button>
          </div>
        </div>
      )}

      {/* Room list */}
      {!activeChatRoomId && !creating && (
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-10 px-4">
              アバターをクリックして1対1チャット、<br />
              <span className="text-gray-600">または「＋」でグループ作成</span>
            </div>
          ) : (
            rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveChatRoomId(room.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-left border-b border-gray-800 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                  room.type === 'group' ? 'bg-purple-700' : 'bg-indigo-700'
                }`}>
                  {getRoomLabel(room).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white truncate">{getRoomLabel(room)}</span>
                    {room.type === 'group' && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-purple-900 text-purple-300 shrink-0">G</span>
                    )}
                  </div>
                  {room.messages[0] && (
                    <div className="text-xs text-gray-500 truncate">{room.messages[0].body}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Message view */}
      {activeChatRoomId && !creating && (
        <>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 text-xs mt-4">まだメッセージがありません</div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  msg.senderId === currentUserId ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-xl text-sm leading-snug ${
                    msg.senderId === currentUserId
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-[10px] text-gray-600 mt-0.5">
                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-700 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="メッセージを入力..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
