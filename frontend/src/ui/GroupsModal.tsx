import { useEffect, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useOfficeStore, loadUserInfos } from '../store/useOfficeStore';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

type GroupMember = {
  userId: string;
  displayName: string;
  jobTitle: string | null;
  role: string | null;
  assignRate: number | null;
};

type Group = {
  id: string;
  name: string;
  category: string;
  assignType: string | null;
  isActive: boolean;
  memberCount: number;
  members: GroupMember[];
};

type Category = 'project' | 'team' | 'club';

const CATEGORY_LABELS: Record<Category, string> = {
  project: '案件',
  team:    'チーム',
  club:    '部活',
};

const ASSIGN_TYPE_LABELS: Record<string, string> = {
  client:  '受託',
  inhouse: '自社',
};

const ASSIGN_TYPE_COLORS: Record<string, string> = {
  client:  'bg-blue-900/60 text-blue-300 border-blue-700',
  inhouse: 'bg-orange-900/60 text-orange-300 border-orange-700',
};

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

async function apiGroups(category?: string): Promise<Group[]> {
  const url = category ? `/api/groups?category=${category}` : '/api/groups';
  const res = await fetch(url);
  return res.json() as Promise<Group[]>;
}

async function apiCreateGroup(payload: {
  name: string;
  category: string;
  assignType?: string | null;
}): Promise<Group> {
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<Group>;
}

async function apiAddMember(groupId: string, payload: {
  userId: string;
  role?: string | null;
  assignRate?: number | null;
}): Promise<void> {
  await fetch(`/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function apiRemoveMember(groupId: string, userId: string): Promise<void> {
  await fetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
}

async function apiDeleteGroup(groupId: string): Promise<void> {
  await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
}

// ────────────────────────────────────────────────
// CreateGroupForm
// ────────────────────────────────────────────────

function CreateGroupForm({
  category,
  onCreated,
}: {
  category: Category;
  onCreated: (g: Group) => void;
}) {
  const [name, setName] = useState('');
  const [assignType, setAssignType] = useState<'client' | 'inhouse'>('client');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const g = await apiCreateGroup({
        name: name.trim(),
        category,
        assignType: category === 'project' ? assignType : null,
      });
      setName('');
      onCreated(g);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 bg-gray-900 rounded-lg border border-gray-700">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{CATEGORY_LABELS[category]}を作成</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="グループ名"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        {category === 'project' && (
          <select
            value={assignType}
            onChange={e => setAssignType(e.target.value as 'client' | 'inhouse')}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="client">受託</option>
            <option value="inhouse">自社</option>
          </select>
        )}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-xs text-white transition-colors"
        >
          作成
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────
// GroupDetail (メンバー管理)
// ────────────────────────────────────────────────

function GroupDetail({
  group,
  onBack,
  onRefresh,
}: {
  group: Group;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const userInfos = useOfficeStore(s => s.userInfos);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState('');
  const [assignRate, setAssignRate] = useState('');
  const [busy, setBusy] = useState(false);

  const memberIds = new Set(group.members.map(m => m.userId));
  const nonMembers = userInfos.filter(u => !memberIds.has(u.id));

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setBusy(true);
    try {
      await apiAddMember(group.id, {
        userId: selectedUserId,
        role: role.trim() || null,
        assignRate: assignRate ? parseInt(assignRate, 10) : null,
      });
      setSelectedUserId('');
      setRole('');
      setAssignRate('');
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    await apiRemoveMember(group.id, userId);
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-xs transition-colors flex items-center gap-1"
        >
          ← 戻る
        </button>
        <h3 className="text-sm font-semibold text-white">{group.name}</h3>
        {group.category === 'project' && group.assignType && (
          <span className={`px-2 py-0.5 rounded text-[10px] border ${ASSIGN_TYPE_COLORS[group.assignType] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
            {ASSIGN_TYPE_LABELS[group.assignType] ?? group.assignType}
          </span>
        )}
      </div>

      {/* メンバー追加フォーム */}
      {nonMembers.length > 0 && (
        <form onSubmit={handleAddMember} className="flex flex-col gap-2 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">メンバーを追加</p>
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">ユーザーを選択</option>
              {nonMembers.map(u => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
          </div>
          {group.category === 'project' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="ロール（PM・エンジニア等）"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                value={assignRate}
                onChange={e => setAssignRate(e.target.value)}
                placeholder="稼働率%"
                min={0}
                max={100}
                className="w-24 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !selectedUserId}
            className="self-end px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-xs text-white transition-colors"
          >
            追加
          </button>
        </form>
      )}

      {/* メンバー一覧 */}
      {group.members.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">メンバーがいません</p>
      ) : (
        <div className="flex flex-col gap-1">
          {group.members.map(m => (
            <div
              key={m.userId}
              className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
            >
              <div className="flex flex-col">
                <span className="text-xs text-white font-medium">{m.displayName}</span>
                <span className="text-[11px] text-gray-400">
                  {m.jobTitle ?? '—'}
                  {m.role && <> ・ <span className="text-indigo-400">{m.role}</span></>}
                  {m.assignRate != null && <> ・ <span className="text-green-400">{m.assignRate}%</span></>}
                </span>
              </div>
              <button
                onClick={() => handleRemoveMember(m.userId)}
                className="text-gray-600 hover:text-red-400 transition-colors text-xs ml-2"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// GroupCard
// ────────────────────────────────────────────────

function GroupCard({
  group,
  onClick,
  onDelete,
}: {
  group: Group;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-white font-medium truncate">{group.name}</span>
        {group.category === 'project' && group.assignType && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] border flex-shrink-0 ${ASSIGN_TYPE_COLORS[group.assignType] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
            {ASSIGN_TYPE_LABELS[group.assignType] ?? group.assignType}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] text-gray-500">{group.memberCount}名</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
        >
          削除
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// GroupsModal
// ────────────────────────────────────────────────

export function GroupsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<Category>('project');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGroups();
      setGroups(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadGroups();
      setSelectedGroup(null);
    }
  }, [open, loadGroups]);

  async function handleRefreshGroup() {
    await loadGroups();
    if (selectedGroup) {
      const fresh = (await apiGroups()).find(g => g.id === selectedGroup.id);
      setSelectedGroup(fresh ?? null);
    }
    void loadUserInfos();
  }

  async function handleDelete(groupId: string) {
    await apiDeleteGroup(groupId);
    setGroups(gs => gs.filter(g => g.id !== groupId));
    void loadUserInfos();
  }

  function handleGroupCreated(g: Group) {
    setGroups(prev => [...prev, g]);
    void loadUserInfos();
  }

  function handleSelectGroup(g: Group) {
    const fresh = groups.find(x => x.id === g.id) ?? g;
    setSelectedGroup(fresh);
  }

  const tabGroups = groups.filter(g => g.category === activeTab);

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[640px] max-w-[95vw] max-h-[85vh] flex flex-col
                     bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 shrink-0">
            <Dialog.Title className="text-sm font-semibold text-white">グループ管理</Dialog.Title>
            <Dialog.Close className="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {selectedGroup ? (
              <GroupDetail
                group={selectedGroup}
                onBack={() => setSelectedGroup(null)}
                onRefresh={handleRefreshGroup}
              />
            ) : (
              <Tabs.Root value={activeTab} onValueChange={v => setActiveTab(v as Category)}>
                <Tabs.List className="flex gap-1 mb-4 bg-gray-900 p-1 rounded-lg">
                  {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([cat, label]) => (
                    <Tabs.Trigger
                      key={cat}
                      value={cat}
                      className="flex-1 px-3 py-1.5 rounded text-xs transition-all
                        data-[state=active]:bg-indigo-600 data-[state=active]:text-white
                        data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-200"
                    >
                      {label}
                      <span className="ml-1.5 text-[10px] opacity-70">
                        {groups.filter(g => g.category === cat).length}
                      </span>
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
                  <Tabs.Content key={cat} value={cat} className="flex flex-col gap-3">
                    <CreateGroupForm category={cat} onCreated={handleGroupCreated} />

                    {loading ? (
                      <p className="text-xs text-gray-500 text-center py-4">読み込み中…</p>
                    ) : tabGroups.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">
                        {CATEGORY_LABELS[cat]}はまだありません
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {tabGroups.map(g => (
                          <GroupCard
                            key={g.id}
                            group={g}
                            onClick={() => handleSelectGroup(g)}
                            onDelete={() => handleDelete(g.id)}
                          />
                        ))}
                      </div>
                    )}
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
