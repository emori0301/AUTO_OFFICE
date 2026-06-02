import { useState, useEffect } from 'react';
import { useOfficeStore } from './store/useOfficeStore';
import { LoginPage } from './ui/LoginPage';
import PhaserMap from './ui/PhaserMap';
import { Sidebar } from './ui/Sidebar';
import { UserDetailCard } from './ui/UserDetailCard';
import { ProfilePanel } from './ui/ProfilePanel';
import { SettingsModal } from './ui/SettingsModal';
import { GroupsModal } from './ui/GroupsModal';
import { ChatPanel } from './ui/ChatPanel';
import { AdminModal } from './ui/AdminModal';
import { ShopModal } from './ui/ShopModal';

// ─── Island Menu ────────────────────────────────────────────────────────────

function IslandMenu({
  currentUserId,
  currentUser,
  onOpenChat,
  onOpenShop,
  onOpenProfile,
}: {
  currentUserId: string;
  currentUser: { displayName: string; points: number } | undefined;
  onOpenChat: () => void;
  onOpenShop: () => void;
  onOpenProfile: () => void;
}) {
  const [timesLoading, setTimesLoading] = useState(false);
  const [timesDone, setTimesDone]       = useState(false);

  async function handleTimesRefresh() {
    if (timesLoading) return;
    setTimesLoading(true);
    setTimesDone(false);
    try {
      await fetch(`/api/slack/times/${encodeURIComponent(currentUserId)}`);
    } catch {
      // silently ignore
    } finally {
      setTimesLoading(false);
      setTimesDone(true);
      setTimeout(() => setTimesDone(false), 2000);
    }
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2)
    : '?';

  return (
    <div
      className="fixed bottom-6 z-50 flex items-center gap-1 px-2 py-2 rounded-2xl
                 bg-gray-900/80 backdrop-blur border border-gray-700/60 shadow-2xl"
      style={{ left: 'calc(7rem + 50%)', transform: 'translateX(-50%)' }}
    >
      {/* Chat */}
      <IslandBtn onClick={onOpenChat} title="チャット">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </IslandBtn>

      {/* Times refresh */}
      <IslandBtn onClick={handleTimesRefresh} title="times 更新">
        {timesLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        ) : timesDone ? (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
          </svg>
        )}
      </IslandBtn>

      {/* Shop */}
      <IslandBtn onClick={onOpenShop} title="ショップ">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </IslandBtn>

      {/* Divider */}
      <div className="w-px h-7 bg-gray-700 mx-1" />

      {/* Profile (Google avatar) */}
      <button
        onClick={onOpenProfile}
        title="プロフィール"
        className="w-9 h-9 rounded-xl flex items-center justify-center
                   bg-indigo-700 hover:bg-indigo-600 transition-colors
                   text-white text-sm font-bold select-none shrink-0"
      >
        {initials}
      </button>
    </div>
  );
}

function IslandBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300
                 hover:bg-white/10 hover:text-white transition-colors shrink-0"
    >
      {children}
    </button>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const users = useOfficeStore((s) => s.users);
  const wsConnected = useOfficeStore((s) => s.wsConnected);
  const currentUserId = useOfficeStore((s) => s.currentUserId);
  const userInfos = useOfficeStore((s) => s.userInfos);
  const setCurrentUser = useOfficeStore((s) => s.setCurrentUser);
  const setChatPanelOpen = useOfficeStore((s) => s.setChatPanelOpen);
  const theme           = useOfficeStore((s) => s.theme);
  const setTheme        = useOfficeStore((s) => s.setTheme);
  const branches        = useOfficeStore((s) => s.branches);
  const currentBranchId = useOfficeStore((s) => s.currentBranchId);
  const setCurrentBranchId = useOfficeStore((s) => s.setCurrentBranchId);
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // OAuth後のリダイレクト: URLのuserIdパラメータを処理
  const [loginError, setLoginError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const error = params.get('login_error');
    if (userId) {
      setCurrentUser(userId);
      window.history.replaceState({}, '', '/');
    } else if (error) {
      setLoginError(error);
      window.history.replaceState({}, '', '/');
    }
  }, [setCurrentUser]);

  if (!currentUserId) {
    return <LoginPage error={loginError} />;
  }

  const [profileOpen, setProfileOpen]   = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen]     = useState(false);
  const [adminOpen, setAdminOpen]       = useState(false);
  const [shopOpen, setShopOpen]         = useState(false);

  const isAdmin     = userInfos.find(u => u.id === currentUserId)?.role === 'admin';
  const currentUser = userInfos.find(u => u.id === currentUserId);

  function handleOpenProfile(userId: string) {
    setProfileUserId(userId);
    setProfileOpen(true);
  }

  function handleOpenOwnProfile() {
    setProfileUserId(currentUserId);
    setProfileOpen(true);
  }

  const currentUserName = currentUser?.displayName;

  return (
    <div className={`flex flex-col h-screen text-white ${isDark ? 'bg-[#080c14]' : 'bg-slate-200'}`}>
      <header className={`flex items-center justify-between px-5 py-2.5 border-b shrink-0 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <h1 className={`text-sm font-bold tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>AUTO OFFICE</h1>
          {branches.length > 0 ? (
            <select
              value={currentBranchId ?? ''}
              onChange={e => setCurrentBranchId(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-gray-500">読込中...</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          {/* ステータス */}
          {currentUser && (
            <button
              onClick={() => setShopOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-700/50 transition-colors text-yellow-400 text-xs font-bold"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v3H6a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V5z" clipRule="evenodd"/>
              </svg>
              {currentUser.points.toLocaleString()} pt
            </button>
          )}
          <span className="px-2 text-gray-600">{users.length} 名</span>
          <span className="flex items-center gap-1.5 px-2">
            <span className={`inline-block w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-gray-600">{wsConnected ? 'Live' : '…'}</span>
          </span>

          <div className="w-px h-4 bg-gray-700/80 mx-1" />

          {/* ナビゲーション */}
          {isAdmin && (
            <button
              onClick={() => setAdminOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-900/60 hover:bg-yellow-900 border border-yellow-700/50 transition-colors text-yellow-300 text-xs"
            >
              管理者
            </button>
          )}
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200 text-xs"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            カレンダー
          </a>
          <button
            onClick={() => setGroupsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200 text-xs"
          >
            グループ
          </button>

          <div className="w-px h-4 bg-gray-700/80 mx-1" />

          {/* ユーザー操作 */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200 text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {currentUserName ?? '設定'}
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-300"
            title={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}
          >
            {isDark ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              </svg>
            )}
          </button>
          <button
            onClick={() => setCurrentUser(null)}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-600 hover:text-gray-300"
            title="ログアウト"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <PhaserMap />
        </main>
      </div>

      {/* Island menu */}
      <IslandMenu
        currentUserId={currentUserId}
        currentUser={currentUser}
        onOpenChat={() => setChatPanelOpen(true)}
        onOpenShop={() => setShopOpen(true)}
        onOpenProfile={handleOpenOwnProfile}
      />

      <UserDetailCard onOpenProfile={handleOpenProfile} />
      <ProfilePanel
        open={profileOpen}
        userId={profileUserId}
        onClose={() => setProfileOpen(false)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GroupsModal open={groupsOpen} onClose={() => setGroupsOpen(false)} />
      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      <ShopModal open={shopOpen} onClose={() => setShopOpen(false)} />
      <ChatPanel />
    </div>
  );
}
