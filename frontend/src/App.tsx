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

export default function App() {
  const users = useOfficeStore((s) => s.users);
  const wsConnected = useOfficeStore((s) => s.wsConnected);
  const currentUserId = useOfficeStore((s) => s.currentUserId);
  const userInfos = useOfficeStore((s) => s.userInfos);
  const setCurrentUser = useOfficeStore((s) => s.setCurrentUser);

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

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const isAdmin = userInfos.find(u => u.id === currentUserId)?.role === 'admin';

  function handleOpenProfile(userId: string) {
    setProfileUserId(userId);
    setProfileOpen(true);
  }

  const currentUserName = userInfos.find(u => u.id === currentUserId)?.displayName;

  return (
    <div className="flex flex-col h-screen bg-[#080c14] text-white">
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-widest text-white">AUTO OFFICE</h1>
          <span className="text-xs text-gray-500">札幌本社</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{users.length} 名</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                wsConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
              }`}
            />
            {wsConnected ? 'Connected' : 'Connecting…'}
          </span>
          {isAdmin && (
            <button
              onClick={() => setAdminOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-900/60 hover:bg-yellow-900 border border-yellow-700/50 transition-colors text-yellow-300 text-xs"
            >
              管理者
            </button>
          )}
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 text-xs"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            カレンダー
          </a>
          <button
            onClick={() => setGroupsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 text-xs"
          >
            グループ
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {currentUserName ?? '設定'}
          </button>
          <button
            onClick={() => setCurrentUser(null)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-300 text-xs"
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

      <UserDetailCard onOpenProfile={handleOpenProfile} />
      <ProfilePanel
        open={profileOpen}
        userId={profileUserId}
        onClose={() => setProfileOpen(false)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GroupsModal open={groupsOpen} onClose={() => setGroupsOpen(false)} />
      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      <ChatPanel />
    </div>
  );
}
