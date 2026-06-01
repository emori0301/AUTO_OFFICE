import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useOfficeStore, openChatWithUser } from '../store/useOfficeStore';
import { WORKSTYLE_LABEL, WORKSTYLE_COLOR_CSS } from '../constants/workStyle';

const ASSIGN_TYPE_LABEL: Record<string, string> = {
  client:  '受託',
  inhouse: '自社',
};

type Project = {
  groupId: string;
  groupName: string;
  assignType: string | null;
  role: string | null;
  assignRate: number | null;
};

type CalEvent = {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  isActive: boolean;
};

type UserDetail = {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  branchName: string;
  workStyle: string;
  projects: Project[];
  todayEvents: CalEvent[];
};

type TimesPost = {
  text: string;
  postedAt: string;
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface Props {
  onOpenProfile: (userId: string) => void;
}

export function UserDetailCard({ onOpenProfile }: Props) {
  const selectedUserId = useOfficeStore(s => s.selectedUserId);
  const setSelectedUser = useOfficeStore(s => s.setSelectedUser);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [timesPost, setTimesPost] = useState<TimesPost | null>(null);

  useEffect(() => {
    if (!selectedUserId) { setDetail(null); setTimesPost(null); return; }
    setLoading(true);
    setTimesPost(null);
    fetch(`/api/users/${selectedUserId}/detail`)
      .then(r => r.json())
      .then((d: UserDetail) => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/slack/times/${selectedUserId}`)
      .then(r => r.json())
      .then((d: { post: TimesPost | null }) => setTimesPost(d.post))
      .catch(() => {});
  }, [selectedUserId]);

  const open = !!selectedUserId;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) setSelectedUser(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                     w-[420px] max-h-[80vh] overflow-y-auto
                     bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
                     text-white p-6 flex flex-col gap-4"
        >
          {loading && (
            <div className="text-gray-400 text-sm text-center py-8">読み込み中...</div>
          )}

          {!loading && detail && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <Dialog.Title className="text-lg font-bold">{detail.displayName}</Dialog.Title>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {detail.jobTitle ?? '役職未設定'} · {detail.branchName}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-gray-800 ${WORKSTYLE_COLOR_CSS[detail.workStyle as keyof typeof WORKSTYLE_COLOR_CSS] ?? 'text-gray-400'}`}>
                  {WORKSTYLE_LABEL[detail.workStyle] ?? detail.workStyle}
                </span>
              </div>

              {/* Projects */}
              {detail.projects.length > 0 && (
                <section>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">アサイン案件</h3>
                  <div className="flex flex-col gap-2">
                    {detail.projects.map(p => (
                      <div key={p.groupId} className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{p.groupName}</span>
                          <div className="flex items-center gap-2">
                            {p.assignType && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                {ASSIGN_TYPE_LABEL[p.assignType] ?? p.assignType}
                              </span>
                            )}
                            {p.role && (
                              <span className="text-[10px] text-gray-400">{p.role}</span>
                            )}
                          </div>
                        </div>
                        {p.assignRate !== null && (
                          <div>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                              <span>アサイン率</span>
                              <span>{p.assignRate}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${p.assignRate}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {detail.projects.length === 0 && (
                <section>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">アサイン案件</h3>
                  <div className="text-sm text-gray-500 bg-gray-800 rounded-lg p-3">アサインなし</div>
                </section>
              )}

              {/* Calendar */}
              {detail.todayEvents.length > 0 && (
                <section>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">今日の予定</h3>
                  <div className="flex flex-col gap-1.5">
                    {detail.todayEvents.map((ev, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                          ev.isActive ? 'bg-red-950 border border-red-800' : 'bg-gray-800'
                        }`}
                      >
                        {ev.isActive && (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                        )}
                        <span className={ev.isActive ? 'text-red-300' : 'text-gray-300'}>
                          {ev.summary}
                        </span>
                        {!ev.allDay && (
                          <span className="ml-auto text-[10px] text-gray-500 flex-shrink-0">
                            {formatTime(ev.start)}–{formatTime(ev.end)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Slack times */}
              {timesPost && (
                <section>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    最新 times
                    <span className="ml-2 normal-case text-gray-600">
                      {new Date(timesPost.postedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </h3>
                  <div className="bg-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {timesPost.text}
                  </div>
                </section>
              )}

              {/* Action buttons */}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => { const uid = detail.id; setSelectedUser(null); onOpenProfile(uid); }}
                  className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  プロフィールを見る
                </button>
                <button
                  onClick={() => { const uid = detail.id; setSelectedUser(null); openChatWithUser(uid); }}
                  className="flex-1 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition-colors text-sm font-medium"
                >
                  チャットを開く
                </button>
              </div>
            </>
          )}

          <Dialog.Close className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-lg leading-none">
            ×
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
