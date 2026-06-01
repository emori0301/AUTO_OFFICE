import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useOfficeStore } from '../store/useOfficeStore';
import { AREAS } from '../scenes/officeAreas';
import type { AreaDef } from '../scenes/officeAreas';

// ─── Types ──────────────────────────────────────────────────────────

type Branch = { id: string; name: string };
type Group  = { id: string; name: string; category: string };
type ProfileQuestion = { id: string; question: string; order: number; isActive: boolean };
type PointHistory = { id: string; grantedBy: string; targetType: string; targetId: string; amount: number; reason: string | null; createdAt: string };
type LayoutObject = { type: string; label: string | null; x: number; y: number; width: number; height: number };

// ─── Points Tab ─────────────────────────────────────────────────────

function PointsTab() {
  const userInfos = useOfficeStore(s => s.userInfos);
  const currentUserId = useOfficeStore(s => s.currentUserId);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups,   setGroups]   = useState<Group[]>([]);
  const [history,  setHistory]  = useState<PointHistory[]>([]);

  const [targetType, setTargetType] = useState<'user' | 'branch' | 'group'>('user');
  const [targetId,   setTargetId]   = useState('');
  const [amount,     setAmount]     = useState('');
  const [reason,     setReason]     = useState('');
  const [saving,     setSaving]     = useState(false);
  const [savedMsg,   setSavedMsg]   = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/branches').then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/admin/points/history').then(r => r.json()),
    ]).then(([b, g, h]: [Branch[], Group[], PointHistory[]]) => {
      setBranches(b);
      setGroups(g);
      setHistory(h);
    }).catch(() => {});
  }, []);

  const targetOptions = useMemo(() => {
    if (targetType === 'user')   return userInfos.map(u => ({ id: u.id, label: u.displayName }));
    if (targetType === 'branch') return branches.map(b => ({ id: b.id, label: b.name }));
    return groups.map(g => ({ id: g.id, label: g.name }));
  }, [targetType, userInfos, branches, groups]);

  async function grant() {
    if (!currentUserId || !targetId || !amount) return;
    const n = parseInt(amount, 10);
    if (!n || n <= 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/points/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantedBy: currentUserId, targetType, targetId, amount: n, reason: reason || undefined }),
      });
      const data = await res.json() as { ok: boolean; grantedTo: number };
      if (data.ok) {
        setSavedMsg(`${data.grantedTo}名に${n}pt付与しました`);
        setTimeout(() => setSavedMsg(''), 3000);
        setAmount(''); setReason('');
        fetch('/api/admin/points/history').then(r => r.json()).then(setHistory).catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  }

  const TARGET_LABELS: Record<string, string> = { user: 'ユーザー', branch: '拠点', group: 'グループ' };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {/* Target type */}
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">付与対象</label>
          <div className="flex gap-2">
            {(['user', 'branch', 'group'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTargetType(t); setTargetId(''); }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  targetType === t
                    ? 'border-indigo-500 bg-indigo-900/40 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {TARGET_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Target selector */}
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">{TARGET_LABELS[targetType]}を選択</label>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- 選択してください --</option>
            {targetOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        {/* Amount + reason */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 block mb-1.5">ポイント数</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="例: 100"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 block mb-1.5">理由（省略可）</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="例: 月間MVP"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={grant}
            disabled={saving || !targetId || !amount}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-medium text-white transition-colors"
          >
            {saving ? '付与中...' : 'ポイントを付与'}
          </button>
          {savedMsg && <span className="text-xs text-green-400">{savedMsg}</span>}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">付与履歴（直近50件）</h3>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-xs">
                <span className="text-yellow-400 font-bold">+{h.amount}pt</span>
                <span className="text-gray-300">{TARGET_LABELS[h.targetType]}</span>
                {h.reason && <span className="text-gray-500 truncate flex-1">— {h.reason}</span>}
                <span className="text-gray-600 shrink-0">
                  {new Date(h.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Questions Tab ───────────────────────────────────────────────────

function QuestionsTab() {
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  async function reload() {
    const qs: ProfileQuestion[] = await fetch('/api/admin/questions').then(r => r.json());
    setQuestions(qs);
  }

  useEffect(() => { reload(); }, []);

  async function addQuestion() {
    if (!newText.trim()) return;
    setAdding(true);
    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: newText.trim() }),
    });
    setNewText('');
    setAdding(false);
    reload();
  }

  async function toggleActive(q: ProfileQuestion) {
    await fetch(`/api/admin/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !q.isActive }),
    });
    reload();
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: editText.trim() }),
    });
    setEditingId(null);
    reload();
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...questions];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setQuestions(newOrder);
    await fetch('/api/admin/questions/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newOrder.map(q => q.id) }),
    });
    reload();
  }

  async function moveDown(index: number) {
    if (index === questions.length - 1) return;
    const newOrder = [...questions];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setQuestions(newOrder);
    await fetch('/api/admin/questions/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newOrder.map(q => q.id) }),
    });
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addQuestion(); }}
          placeholder="新しい質問を入力..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={addQuestion}
          disabled={adding || !newText.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-colors"
        >
          追加
        </button>
      </div>

      {/* Question list */}
      <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${q.isActive ? 'bg-gray-800' : 'bg-gray-900 opacity-60'}`}
          >
            {/* Order buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => moveUp(i)} disabled={i === 0} className="text-gray-600 hover:text-gray-300 disabled:opacity-30 text-xs leading-none">▲</button>
              <button onClick={() => moveDown(i)} disabled={i === questions.length - 1} className="text-gray-600 hover:text-gray-300 disabled:opacity-30 text-xs leading-none">▼</button>
            </div>

            {/* Question text */}
            <div className="flex-1 min-w-0">
              {editingId === q.id ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(q.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
                  />
                  <button onClick={() => saveEdit(q.id)} className="text-xs text-green-400 hover:text-green-300">保存</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-300">取消</button>
                </div>
              ) : (
                <span className="text-sm text-white truncate block">{q.question}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setEditingId(q.id); setEditText(q.question); }}
                className="text-xs text-gray-500 hover:text-gray-300 px-1.5 py-1 rounded hover:bg-gray-700 transition-colors"
              >
                編集
              </button>
              <button
                onClick={() => toggleActive(q)}
                className={`text-xs px-1.5 py-1 rounded transition-colors ${
                  q.isActive
                    ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:text-green-400 hover:bg-gray-700'
                }`}
              >
                {q.isActive ? '無効化' : '有効化'}
              </button>
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-6">質問がありません</div>
        )}
      </div>
    </div>
  );
}

// ─── Layout Tab ──────────────────────────────────────────────────────

const SCALE = 0.48;

function toNum(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

type LocalArea = AreaDef & { key: string };

function LayoutTab() {
  const layoutOverride  = useOfficeStore(s => s.layoutOverride);
  const setLayoutOverride = useOfficeStore(s => s.setLayoutOverride);

  const [floorId,   setFloorId]   = useState<string | null>(null);
  const [localAreas, setLocalAreas] = useState<Record<string, LocalArea>>({});
  const [saving,    setSaving]    = useState(false);
  const [savedMsg,  setSavedMsg]  = useState('');

  const dragging = useRef<{ key: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Build initial local state from store override + AREAS defaults
  const buildLocal = useMemo(() => {
    const result: Record<string, LocalArea> = {};
    for (const [key, area] of Object.entries(AREAS)) {
      const ov = layoutOverride?.[key];
      result[key] = {
        ...area,
        ...(ov ?? {}),
        key,
      };
    }
    return result;
  }, [layoutOverride]);

  // Fetch floorId on mount
  useEffect(() => {
    fetch('/api/admin/layout')
      .then(r => r.json())
      .then((d: { floorId: string | null; objects: LayoutObject[] }) => {
        setFloorId(d.floorId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLocalAreas(buildLocal);
  }, [buildLocal]);

  function onMouseDown(e: React.MouseEvent, key: string) {
    e.preventDefault();
    dragging.current = {
      key,
      startX: e.clientX,
      startY: e.clientY,
      origX: localAreas[key].x,
      origY: localAreas[key].y,
    };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const { key, startX, startY, origX, origY } = dragging.current;
    const dx = (e.clientX - startX) / SCALE;
    const dy = (e.clientY - startY) / SCALE;
    setLocalAreas(prev => ({
      ...prev,
      [key]: { ...prev[key], x: Math.round(origX + dx), y: Math.round(origY + dy) },
    }));
  }

  function onMouseUp() {
    dragging.current = null;
  }

  function resetToDefaults() {
    const reset: Record<string, LocalArea> = {};
    for (const [k, a] of Object.entries(AREAS)) reset[k] = { ...a, key: k };
    setLocalAreas(reset);
  }

  async function save() {
    if (!floorId) return;
    setSaving(true);
    try {
      const objects: LayoutObject[] = Object.entries(localAreas).map(([type, a]) => ({
        type,
        label: a.label,
        x: a.x,
        y: a.y,
        width: a.w,
        height: a.h,
      }));
      await fetch('/api/admin/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floorId, objects }),
      });
      // Update store → triggers OfficeScene redraw
      const override: Record<string, { x: number; y: number; w: number; h: number }> = {};
      for (const [key, a] of Object.entries(localAreas)) {
        override[key] = { x: a.x, y: a.y, w: a.w, h: a.h };
      }
      setLayoutOverride(override);
      setSavedMsg('保存しました。マップが更新されました。');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={resetToDefaults}
          className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          デフォルトに戻す
        </button>
        <button
          onClick={save}
          disabled={saving || !floorId}
          className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
        >
          {saving ? '保存中...' : '保存してマップ更新'}
        </button>
        {savedMsg && <span className="text-xs text-green-400">{savedMsg}</span>}
      </div>

      <div
        className="relative border border-gray-700 rounded-lg overflow-hidden select-none"
        style={{ width: 960 * SCALE, height: 640 * SCALE, background: '#080c14', cursor: 'default' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {Object.entries(localAreas).map(([key, area]: [string, LocalArea]) => (
          <div
            key={key}
            onMouseDown={e => onMouseDown(e, key)}
            style={{
              position: 'absolute',
              left:   area.x * SCALE,
              top:    area.y * SCALE,
              width:  area.w * SCALE,
              height: area.h * SCALE,
              backgroundColor: toNum(area.fill),
              border: `1px solid ${toNum(area.border)}`,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: 9, color: '#aaaaaa', userSelect: 'none' }}>{area.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6 text-xs text-gray-600">
        <span>キャンバス: 960×640 px ({Math.round(SCALE * 100)}% 表示)</span>
        <span>ドラッグでエリアを移動</span>
        {!floorId && <span className="text-yellow-600">フロアデータがDBに存在しません</span>}
      </div>

      {/* Current positions table */}
      <details className="text-xs">
        <summary className="text-gray-600 cursor-pointer hover:text-gray-400">エリア座標（詳細）</summary>
        <table className="mt-2 w-full text-gray-500">
          <thead><tr className="text-gray-600">{['エリア','x','y','w','h'].map(h => <th key={h} className="text-left pr-3 font-normal">{h}</th>)}</tr></thead>
          <tbody>
            {Object.entries(localAreas).map(([key, a]: [string, LocalArea]) => (
              <tr key={key}>
                <td className="pr-3 text-gray-400">{a.label}</td>
                <td className="pr-3">{a.x}</td>
                <td className="pr-3">{a.y}</td>
                <td className="pr-3">{a.w}</td>
                <td className="pr-3">{a.h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ─── Demo Tab ────────────────────────────────────────────────────────

const MEETING_EMAILS = new Set(['tanaka@example.com', 'suzuki@example.com', 'yamada@example.com', 'takahashi@example.com']);
const REMOTE_EMAILS  = new Set(['kato@example.com', 'yoshida@example.com']);

function DemoTab() {
  const users  = useOfficeStore(s => s.users);
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState('');

  async function applyOverrides(entries: { id: string; ws: string }[]) {
    await Promise.all(entries.map(({ id, ws }) =>
      fetch('/api/status/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, workStyle: ws }),
      }),
    ));
    await fetch('/api/status/sync', { method: 'POST' });
  }

  async function startMeeting() {
    setBusy(true);
    setMsg('');
    try {
      const meeting = users.filter(u => MEETING_EMAILS.has(u.email)).map(u => ({ id: u.id, ws: 'in_meeting' }));
      const remote  = users.filter(u => REMOTE_EMAILS.has(u.email)).map(u => ({ id: u.id, ws: 'remote' }));
      await applyOverrides([...meeting, ...remote]);
      setMsg(`会議中 ${meeting.length}名 / 在宅 ${remote.length}名 をセットしました`);
    } catch {
      setMsg('エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    setBusy(true);
    setMsg('');
    try {
      await Promise.all(users.map(u => fetch(`/api/status/override/${u.id}`, { method: 'DELETE' })));
      await fetch('/api/status/sync', { method: 'POST' });
      setMsg('全員リセット完了（カレンダー連動に戻りました）');
    } catch {
      setMsg('エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">カレンダーに関わらず任意のタイミングでデモ状態を再現します。</p>

      <div className="p-4 rounded-lg bg-gray-800 space-y-2">
        <p className="text-sm font-medium text-white">朝会シナリオ（会議室 竹）</p>
        <p className="text-xs text-gray-500">田中・鈴木・山田・高橋 → 会議中 / 加藤・吉田 → 在宅</p>
        <button
          onClick={startMeeting}
          disabled={busy}
          className="w-full py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors font-medium"
        >
          {busy ? '設定中…' : '朝会シナリオ開始'}
        </button>
      </div>

      <button
        onClick={resetAll}
        disabled={busy}
        className="w-full py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
      >
        {busy ? 'リセット中…' : '全員リセット（カレンダー連動に戻す）'}
      </button>

      {msg && <p className="text-xs text-green-400 mt-1">{msg}</p>}
    </div>
  );
}

// ─── AdminModal ──────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminModal({ open, onClose }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                     w-[580px] max-h-[88vh] bg-gray-900 border border-gray-700 rounded-xl
                     shadow-2xl text-white flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
            <Dialog.Title className="text-base font-bold">管理者パネル</Dialog.Title>
            <Dialog.Close className="text-gray-500 hover:text-white transition-colors text-lg leading-none">×</Dialog.Close>
          </div>

          <Tabs.Root defaultValue="points" className="flex flex-col flex-1 overflow-hidden">
            <Tabs.List className="flex border-b border-gray-800 px-6 gap-0 shrink-0">
              {[
                { value: 'points',    label: 'ポイント付与' },
                { value: 'questions', label: '質問管理' },
                { value: 'layout',    label: 'レイアウト' },
                { value: 'demo',      label: 'デモ' },
              ].map(t => (
                <Tabs.Trigger
                  key={t.value}
                  value={t.value}
                  className="px-4 py-3 text-sm text-gray-400 border-b-2 border-transparent
                             data-[state=active]:text-white data-[state=active]:border-indigo-500
                             transition-colors hover:text-gray-200"
                >
                  {t.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="flex-1 overflow-y-auto">
              <Tabs.Content value="points"    className="p-6"><PointsTab /></Tabs.Content>
              <Tabs.Content value="questions" className="p-6"><QuestionsTab /></Tabs.Content>
              <Tabs.Content value="layout"    className="p-6"><LayoutTab /></Tabs.Content>
              <Tabs.Content value="demo"      className="p-6"><DemoTab /></Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
