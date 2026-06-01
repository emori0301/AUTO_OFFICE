import { useEffect, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import type { AvatarConfig } from '../types/avatar';
import { DEFAULT_AVATAR } from '../types/avatar';
import { useOfficeStore } from '../store/useOfficeStore';
import { MANUAL_WORKSTYLE_OPTIONS } from '../constants/workStyle';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

type ProfileQuestion = { id: string; question: string; order: number };

type ProfileData = {
  displayName: string;
  jobTitle: string | null;
  birthDate: string | null;
  joinDate: string | null;
  avatarConfig: AvatarConfig | null;
  workStyle: string;
  manualWorkStyle: string | null;
  profiles: { questionId: string; question: string; answer: string }[];
};

// ────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────


const SKIN_TONES: { value: 'pale' | 'medium'; label: string; color: string }[] = [
  { value: 'pale',   label: '白め', color: '#FFD7B3' },
  { value: 'medium', label: '普通', color: '#E8A87C' },
];

const HAIR_COLORS = [
  '#3D2817', '#1a1a1a', '#5c3317', '#8B4513', '#D2691E',
  '#DAA520', '#C0C0C0', '#808080', '#FF6B6B', '#4169E1',
];

// ────────────────────────────────────────────────
// Avatar Preview (placeholder colored blocks)
// ────────────────────────────────────────────────

function AvatarPreview({ config }: { config: AvatarConfig }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-20 flex flex-col items-center">
        {/* Hair */}
        <div
          className="w-10 h-4 rounded-t-full"
          style={{ backgroundColor: config.hairColor }}
        />
        {/* Head */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: config.skinTone === 'pale' ? '#FFD7B3' : '#E8A87C' }}
        >
          {/* Eyes */}
          <div className="flex gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
          </div>
        </div>
        {/* Body (top) */}
        <div
          className="w-12 h-6 rounded-b-sm"
          style={{ backgroundColor: `hsl(${(config.topId * 37) % 360},60%,50%)` }}
        />
      </div>
      <span className="text-[10px] text-gray-500">プレビュー</span>
    </div>
  );
}

// ────────────────────────────────────────────────
// Number selector row
// ────────────────────────────────────────────────

function NumberSelector({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400 w-28">{label}</span>
      <div className="flex items-center gap-2">
        <button
          className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center"
          onClick={() => onChange(Math.max(min, value - 1))}
        >−</button>
        <span className="text-sm w-6 text-center">{value}</span>
        <button
          className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-sm flex items-center justify-center"
          onClick={() => onChange(Math.min(max, value + 1))}
        >+</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Main SettingsModal
// ────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const currentUserId = useOfficeStore(s => s.currentUserId);
  const userInfos = useOfficeStore(s => s.userInfos);
  const setCurrentUser = useOfficeStore(s => s.setCurrentUser);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [manualWs, setManualWs] = useState<string>('');

  // 基本情報フォーム
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [joinDate, setJoinDate] = useState('');

  const showSaved = (msg = '保存しました') => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const [profRes, qRes] = await Promise.all([
        fetch(`/api/profile/${uid}`),
        fetch('/api/profile/questions'),
      ]);
      const prof: ProfileData = await profRes.json();
      const qs: ProfileQuestion[] = await qRes.json();
      setProfile(prof);
      setDisplayName(prof.displayName);
      setJobTitle(prof.jobTitle ?? '');
      setBirthDate(prof.birthDate ? prof.birthDate.slice(0, 10) : '');
      setJoinDate(prof.joinDate ? prof.joinDate.slice(0, 10) : '');
      const av = prof.avatarConfig ?? DEFAULT_AVATAR;
      setAvatar(av);
      setQuestions(qs);
      const initAns: Record<string, string> = {};
      prof.profiles.forEach(p => { initAns[p.questionId] = p.answer; });
      qs.forEach(q => { if (!initAns[q.id]) initAns[q.id] = ''; });
      setAnswers(initAns);
      setManualWs(prof.manualWorkStyle ?? '');
    } catch (err) {
      console.error('[settings] load error:', err);
    }
  }, []);

  useEffect(() => {
    if (open && currentUserId) loadProfile(currentUserId);
  }, [open, currentUserId, loadProfile]);

  // ── 基本情報保存 ──
  async function saveBasicInfo() {
    if (!currentUserId) return;
    setSaving(true);
    try {
      await fetch(`/api/profile/${currentUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, jobTitle: jobTitle || null, birthDate: birthDate || null, joinDate: joinDate || null }),
      });
      showSaved();
    } finally {
      setSaving(false);
    }
  }

  // ── アバター保存 ──
  async function saveAvatar() {
    if (!currentUserId) return;
    setSaving(true);
    try {
      await fetch(`/api/profile/${currentUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarConfig: avatar }),
      });
      showSaved();
    } finally {
      setSaving(false);
    }
  }

  // ── プロフィール回答保存 ──
  async function saveAnswers() {
    if (!currentUserId) return;
    setSaving(true);
    try {
      const payload = Object.entries(answers)
        .filter(([, v]) => v.trim())
        .map(([questionId, answer]) => ({ questionId, answer }));
      await fetch(`/api/profile/${currentUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      showSaved();
    } finally {
      setSaving(false);
    }
  }

  // ── 在籍形態保存 ──
  async function saveWorkStyle() {
    if (!currentUserId) return;
    setSaving(true);
    try {
      if (manualWs) {
        await fetch(`/api/profile/${currentUserId}/workstyle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workStyle: manualWs }),
        });
      } else {
        await fetch(`/api/profile/${currentUserId}/workstyle`, { method: 'DELETE' });
      }
      showSaved('在籍形態を更新しました');
    } finally {
      setSaving(false);
    }
  }

  // ── カレントユーザー未選択 ──
  if (!currentUserId) {
    return (
      <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl text-white p-6">
            <Dialog.Title className="text-base font-bold mb-4">自分のアカウントを選択</Dialog.Title>
            <p className="text-sm text-gray-400 mb-4">設定を編集するには、まず自分のアカウントを選んでください。</p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {userInfos.map(u => (
                <button
                  key={u.id}
                  onClick={() => setCurrentUser(u.id)}
                  className="text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <div className="text-sm font-medium">{u.displayName}</div>
                  <div className="text-xs text-gray-500">{u.jobTitle ?? '役職未設定'} · {u.branchName}</div>
                </button>
              ))}
            </div>
            <Dialog.Close className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-lg">×</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  const currentUserInfo = userInfos.find(u => u.id === currentUserId);

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                     w-[560px] max-h-[85vh] bg-gray-900 border border-gray-700 rounded-xl
                     shadow-2xl text-white flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div>
              <Dialog.Title className="text-base font-bold">設定</Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">{currentUserInfo?.displayName}</p>
            </div>
            <div className="flex items-center gap-3">
              {savedMsg && <span className="text-xs text-green-400">{savedMsg}</span>}
              <button
                onClick={() => setCurrentUser(null)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                切替
              </button>
              <Dialog.Close className="text-gray-500 hover:text-white transition-colors text-lg leading-none">×</Dialog.Close>
            </div>
          </div>

          {/* Tabs */}
          <Tabs.Root defaultValue="basic" className="flex flex-col flex-1 overflow-hidden">
            <Tabs.List className="flex border-b border-gray-800 px-6 gap-0 shrink-0">
              {[
                { value: 'basic',     label: '基本情報' },
                { value: 'avatar',    label: 'アバター' },
                { value: 'profile',   label: 'プロフィール' },
                { value: 'workstyle', label: '在籍形態' },
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
              {/* ── 基本情報 ── */}
              <Tabs.Content value="basic" className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">表示名</label>
                  <input
                    className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700 focus:border-indigo-500 outline-none"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">役職</label>
                  <input
                    className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700 focus:border-indigo-500 outline-none"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="例: エンジニア"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-xs text-gray-400">生年月日</label>
                    <input
                      type="date"
                      className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700 focus:border-indigo-500 outline-none"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-xs text-gray-400">入社日</label>
                    <input
                      type="date"
                      className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700 focus:border-indigo-500 outline-none"
                      value={joinDate}
                      onChange={e => setJoinDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">times連携</label>
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-500">Slack times連携（Phase 2 実装予定）</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">準備中</span>
                  </div>
                </div>
                <button
                  onClick={saveBasicInfo}
                  disabled={saving || !displayName.trim()}
                  className="mt-2 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </Tabs.Content>

              {/* ── アバター ── */}
              <Tabs.Content value="avatar" className="p-6 flex flex-col gap-4">
                <div className="flex gap-6">
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <AvatarPreview config={avatar} />
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Skin tone */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5">肌色</label>
                      <div className="flex gap-2">
                        {SKIN_TONES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setAvatar(a => ({ ...a, skinTone: s.value }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                              avatar.skinTone === s.value
                                ? 'border-indigo-500 bg-indigo-900/30'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                          >
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hair color */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5">髪色</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {HAIR_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setAvatar(a => ({ ...a, hairColor: c }))}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              avatar.hairColor === c ? 'border-white scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          value={avatar.hairColor}
                          onChange={e => setAvatar(a => ({ ...a, hairColor: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                          title="カスタム色"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Part selectors */}
                <div className="flex flex-col gap-3 mt-2">
                  <NumberSelector label="目タイプ"   value={avatar.eyeType}     min={1} max={10} onChange={v => setAvatar(a => ({ ...a, eyeType: v }))} />
                  <NumberSelector label="口タイプ"   value={avatar.mouthType}   min={1} max={10} onChange={v => setAvatar(a => ({ ...a, mouthType: v }))} />
                  <NumberSelector label="眉タイプ"   value={avatar.eyebrowType} min={1} max={10} onChange={v => setAvatar(a => ({ ...a, eyebrowType: v }))} />
                  <NumberSelector label="髪型"       value={avatar.hairStyle}   min={1} max={20} onChange={v => setAvatar(a => ({ ...a, hairStyle: v }))} />
                  <NumberSelector label="トップス"   value={avatar.topId}       min={1} max={20} onChange={v => setAvatar(a => ({ ...a, topId: v }))} />
                  <NumberSelector label="ボトムス"   value={avatar.bottomId}    min={1} max={20} onChange={v => setAvatar(a => ({ ...a, bottomId: v }))} />
                  <NumberSelector label="シューズ"   value={avatar.shoeId}      min={1} max={10} onChange={v => setAvatar(a => ({ ...a, shoeId: v }))} />
                </div>

                <button
                  onClick={saveAvatar}
                  disabled={saving}
                  className="mt-2 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {saving ? '保存中...' : 'アバターを保存'}
                </button>
              </Tabs.Content>

              {/* ── プロフィール ── */}
              <Tabs.Content value="profile" className="p-6 flex flex-col gap-4">
                {questions.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-8">
                    プロフィール質問が設定されていません。<br />
                    管理者に質問の追加を依頼してください。
                  </div>
                ) : (
                  <>
                    {questions.map(q => (
                      <div key={q.id} className="flex flex-col gap-1.5">
                        <label className="text-xs text-gray-400">{q.question}</label>
                        <textarea
                          className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white border border-gray-700 focus:border-indigo-500 outline-none resize-none"
                          rows={2}
                          value={answers[q.id] ?? ''}
                          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          placeholder="回答を入力..."
                        />
                      </div>
                    ))}
                    <button
                      onClick={saveAnswers}
                      disabled={saving}
                      className="mt-2 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {saving ? '保存中...' : '回答を保存'}
                    </button>
                  </>
                )}
              </Tabs.Content>

              {/* ── 在籍形態 ── */}
              <Tabs.Content value="workstyle" className="p-6 flex flex-col gap-4">
                <div>
                  <p className="text-sm text-gray-300 mb-1">今日の在籍形態を手動で上書きします。</p>
                  <p className="text-xs text-gray-500">翌0時に自動でリセットされます。「早退」を選ぶとアバターがマップから退場します。</p>
                </div>

                {profile && (
                  <div className="text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
                    カレンダー判定: <span className="text-gray-300">{profile.workStyle}</span>
                    {profile.manualWorkStyle && (
                      <> → 手動上書き: <span className="text-yellow-400">{profile.manualWorkStyle}</span></>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setManualWs('')}
                    className={`py-2.5 rounded-lg text-sm border transition-colors ${
                      !manualWs
                        ? 'border-indigo-500 bg-indigo-900/40 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    自動判定（解除）
                  </button>
                  {MANUAL_WORKSTYLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setManualWs(opt.value)}
                      className={`py-2.5 rounded-lg text-sm border transition-colors ${
                        manualWs === opt.value
                          ? 'border-indigo-500 bg-indigo-900/40 text-white'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={saveWorkStyle}
                  disabled={saving}
                  className="py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {saving ? '更新中...' : '在籍形態を更新'}
                </button>
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
